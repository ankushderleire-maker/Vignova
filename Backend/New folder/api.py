import os
import uuid
import json
import re
import math
import io
from typing import List, Dict, Any

# Third-party imports
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from dotenv import load_dotenv
import google.generativeai as genai

# ML Imports
from sentence_transformers import CrossEncoder
import torch


import math
import re
from fastapi import HTTPException
from sentence_transformers import CrossEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
# ---------------- CONFIGURATION ----------------

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash") # changed to 1.5-flash as 2.5 isn't standard yet, or stick to your working model

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- SAFE MODELS ----------------

class Skills(BaseModel):
    technical: str = ""
    soft: str = ""

class Experience(BaseModel):
    id: str = ""
    company: str = ""
    role: str = ""
    location: str = ""
    startDate: str = ""
    endDate: str = ""
    description: Any = "" # Changed to Any to handle string or list during parsing

class Education(BaseModel):
    id: str = ""
    school: str = ""
    degree: str = ""
    field: str = ""
    startDate: str = ""
    endDate: str = ""
    grade: str = ""

class Project(BaseModel):
    id: str = ""
    name: str = ""
    techStack: str = ""
    link: str = ""
    description: Any = "" # Changed to Any

class Certification(BaseModel):
    id: str = ""
    name: str = ""
    issuer: str = ""
    date: str = ""
    url: str = ""

class Language(BaseModel):
    id: str = ""
    name: str = ""
    proficiency: str = ""

class ResumeSchema(BaseModel):
    fullName: str = ""
    jobTitle: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    website: str = ""
    linkedin: str = ""
    github: str = ""
    summary: str = ""
    skills: Skills = Skills()
    experience: List[Experience] = []
    education: List[Education] = []
    projects: List[Project] = []
    certifications: List[Certification] = []
    languages: List[Language] = []

class TailorRequest(BaseModel):
    jobDescription: str
    masterProfile: Dict[str, Any]

class ScoreRequest(BaseModel):
    userProfile: str
    jobDescription: str

# ---------------- UTILITIES ----------------

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text
    except Exception as e:
        print("PDF Extraction Error:", e)
        return ""

def extract_json_from_response(text: str):
    try:
        # Remove markdown code blocks if present
        text = re.sub(r"```json|```", "", text).strip()
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            return parsed
    except Exception as e:
        print("JSON Extraction Error:", e)
    return {}

def normalize_data(data: dict):
    safe_structure = ResumeSchema().model_dump()

    # Ensure top-level keys exist
    for key in safe_structure:
        if key not in data:
            data[key] = safe_structure[key]

    # Skills normalization
    if not isinstance(data.get("skills"), dict):
        if isinstance(data.get("skills"), list):
             data["skills"] = {"technical": ", ".join(data["skills"]), "soft": ""}
        else:
             data["skills"] = {"technical": str(data.get("skills", "")), "soft": ""}

    def flatten_description(desc):
        if isinstance(desc, list):
            return "\n".join([str(item) for item in desc])
        return str(desc) if desc else ""

    # Normalize Experience
    normalized_exp = []
    for exp in data.get("experience", []):
        normalized_exp.append({
            "id": exp.get("id", str(uuid.uuid4())),
            "company": exp.get("company", ""),
            "role": exp.get("role", exp.get("title", "")),
            "location": exp.get("location", ""),
            "startDate": exp.get("startDate", ""),
            "endDate": exp.get("endDate", ""),
            "description": flatten_description(exp.get("description", "")),
        })
    data["experience"] = normalized_exp

    # Normalize Education
    normalized_edu = []
    for edu in data.get("education", []):
        normalized_edu.append({
            "id": edu.get("id", str(uuid.uuid4())),
            "school": edu.get("school", edu.get("institution", "")),
            "degree": edu.get("degree", ""),
            "field": edu.get("field", edu.get("major", "")),
            "startDate": edu.get("startDate", ""),
            "endDate": edu.get("endDate", ""),
            "grade": edu.get("grade", ""),
        })
    data["education"] = normalized_edu
    
    # Normalize Projects
    normalized_proj = []
    for proj in data.get("projects", []):
        normalized_proj.append({
            "id": proj.get("id", str(uuid.uuid4())),
            "name": proj.get("name", ""),
            "techStack": proj.get("techStack", ""),
            "link": proj.get("link", ""),
            "description": flatten_description(proj.get("description", "")),
        })
    data["projects"] = normalized_proj

    # Normalize Certifications
    normalized_certs = []
    for cert in data.get("certifications", []):
        if isinstance(cert, str):
             normalized_certs.append({
                "id": str(uuid.uuid4()),
                "name": cert,
                "issuer": "",
                "date": "",
                "url": ""
            })
        elif isinstance(cert, dict):
            normalized_certs.append({
                "id": cert.get("id", str(uuid.uuid4())),
                "name": cert.get("name", ""),
                "issuer": cert.get("issuer", ""),
                "date": cert.get("date", ""),
                "url": cert.get("url", "")
            })
    data["certifications"] = normalized_certs

    # Normalize Languages
    normalized_langs = []
    for lang in data.get("languages", []):
        if isinstance(lang, str):
             normalized_langs.append({
                "id": str(uuid.uuid4()),
                "name": lang,
                "proficiency": ""
            })
        elif isinstance(lang, dict):
            normalized_langs.append({
                "id": lang.get("id", str(uuid.uuid4())),
                "name": lang.get("name", ""),
                "proficiency": lang.get("proficiency", "")
            })
    data["languages"] = normalized_langs

    return data

def enforce_content_limits(data: dict) -> dict:
    """Hard-cap content to prevent template overflow."""
    MAX_SKILLS = 12
    MAX_EXPERIENCE = 4
    MAX_EXP_BULLETS = 4
    MAX_PROJECTS = 3
    MAX_PROJ_BULLETS = 3
    MAX_EDUCATION = 3
    MAX_CERTIFICATIONS = 4
    MAX_LANGUAGES = 4

    skills = data.get("skills", {})
    if isinstance(skills, dict):
        tech = skills.get("technical", "")
        if isinstance(tech, str) and tech:
            skill_list = [s.strip() for s in tech.split(",") if s.strip()]
            if len(skill_list) > MAX_SKILLS:
                skills["technical"] = ", ".join(skill_list[:MAX_SKILLS])
        data["skills"] = skills

    exp_list = data.get("experience", [])
    if len(exp_list) > MAX_EXPERIENCE:
        exp_list = exp_list[:MAX_EXPERIENCE]
    for exp in exp_list:
        desc = exp.get("description", "")
        if isinstance(desc, list) and len(desc) > MAX_EXP_BULLETS:
            exp["description"] = desc[:MAX_EXP_BULLETS]
    data["experience"] = exp_list

    proj_list = data.get("projects", [])
    if len(proj_list) > MAX_PROJECTS:
        proj_list = proj_list[:MAX_PROJECTS]
    for proj in proj_list:
        desc = proj.get("description", "")
        if isinstance(desc, list) and len(desc) > MAX_PROJ_BULLETS:
            proj["description"] = desc[:MAX_PROJ_BULLETS]
    data["projects"] = proj_list

    return data

# ---------------- API ENDPOINTS ----------------

@app.post("/api/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {"data": ResumeSchema().model_dump()}

    content = await file.read()
    raw_text = extract_text_from_pdf(content)

    if not raw_text:
        return {"data": ResumeSchema().model_dump()}

    prompt = f"""
    You are a resume parsing API.
    STRICT RULES:
    - Output ONLY valid JSON.
    - No markdown formatting.
    - Return the exact structure below.

    Structure:
    {{
      "fullName": "", "jobTitle": "", "email": "", "phone": "", "location": "",
      "website": "", "linkedin": "", "github": "", "summary": "",
      "skills": {{ "technical": "comma separated string", "soft": "" }},
      "experience": [ {{ "company": "", "role": "", "startDate": "", "endDate": "", "description": "" }} ],
      "education": [ {{ "school": "", "degree": "", "field": "", "startDate": "", "endDate": "" }} ],
      "projects": [ {{ "name": "", "techStack": "", "description": "" }} ],
      "certifications": [], "languages": []
    }}

    Resume Text:
    {raw_text}
    """

    try:
        response = model.generate_content(prompt)
        parsed_json = extract_json_from_response(response.text)
        
        if not parsed_json:
            return {"data": ResumeSchema().model_dump()}

        normalized = normalize_data(parsed_json)
        validated = ResumeSchema(**normalized)
        
        return {"data": validated.model_dump()}

    except Exception as e:
        print("Error:", e)
        return {"data": ResumeSchema().model_dump()}


@app.post("/api/generate-tailored-resume")
async def generate_tailored_resume(payload: TailorRequest):
    master_profile_str = json.dumps(payload.masterProfile, indent=2)
    job_description = payload.jobDescription

    prompt = f"""
    You are a Senior Executive Resume Writer who writes HUMAN-LIKE, detailed, achievement-rich resumes.
    
    TRANSFORM the MASTER PROFILE to match the JOB DESCRIPTION.
    Output STRICT JSON only.
    
    JOB DESCRIPTION:
    {job_description}

    MASTER PROFILE:
    {master_profile_str}

    JSON STRUCTURE:
    {{
    "fullName": "...", "email": "...", "phone": "...", "linkedin": "...", "location": "...", "website": "...", "summary": "...",
    "skills": {{ "technical": "...", "soft": "" }},
    "experience": [ {{ "company": "...", "role": "...", "startDate": "...", "endDate": "...", "location": "...", "description": ["Bullet 1", "Bullet 2"] }} ],
    "projects": [ {{ "name": "...", "techStack": "...", "link": "...", "description": ["Bullet 1", "Bullet 2"] }} ],
    "education": [], "certifications": [], "languages": []
    }}
    """

    try:
        response = model.generate_content(prompt)
        parsed_json = extract_json_from_response(response.text)
        
        if not parsed_json:
            raise HTTPException(status_code=500, detail="Failed to parse AI response")

        # Normalize logic 
        normalized = normalize_data(parsed_json)
        
        # Ensure description is list for tailoring
        for exp in normalized.get("experience", []):
            if isinstance(exp.get("description"), str):
                exp["description"] = [exp["description"]]
        
        for proj in normalized.get("projects", []):
             if isinstance(proj.get("description"), str):
                proj["description"] = [proj["description"]]

        # Fallback Mechanism
        if not normalized.get("experience") and payload.masterProfile.get("experience"):
            normalized["experience"] = payload.masterProfile["experience"]
        if not normalized.get("projects") and payload.masterProfile.get("projects"):
             normalized["projects"] = payload.masterProfile["projects"]
        if not normalized.get("education") and payload.masterProfile.get("education"):
             normalized["education"] = payload.masterProfile["education"]

        normalized = enforce_content_limits(normalized)
    
        return {"data": normalized}

    except Exception as e:
        print("Tailoring Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

match_model = None

def get_match_model():
    global match_model
    if match_model is None:
        print("Loading Match Score Model...")
        match_model = CrossEncoder(
            'cross-encoder/ms-marco-MiniLM-L-6-v2',
            max_length=512
        )
        print("Model Loaded Successfully.")
    return match_model


# ---------------- TF-IDF KEYWORD SCORE ---------------- #

def compute_keyword_score(profile_text: str, job_text: str) -> float:
    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),   # captures "machine learning"
            max_features=1500
        )

        tfidf_matrix = vectorizer.fit_transform([profile_text, job_text])

        similarity_matrix = cosine_similarity(
            tfidf_matrix[0:1],
            tfidf_matrix[1:2]
        )

        return float(similarity_matrix[0][0])

    except Exception as e:
        print("TF-IDF Error:", e)
        return 0.0


# ---------------- SCORE API ---------------- #

@app.post("/api/score-job")
async def score_job(payload: ScoreRequest):
    try:
        model = get_match_model()
        if not model:
            raise HTTPException(status_code=500, detail="Model not initialized")

        # Smart truncation (use most relevant sections)
        profile_text = payload.userProfile.strip()
        job_text = payload.jobDescription.strip()

        # Limit to 3000 chars but keep both start + end (important fix)
        profile_text = profile_text[:1500] + profile_text[-1500:]
        job_text = job_text[:1500] + job_text[-1500:]

        # ---------------- 1. SEMANTIC SCORE ---------------- #

        scores = model.predict([(profile_text, job_text)])
        logit_score = float(scores.item())

        semantic_score = 1 / (1 + math.exp(-logit_score))

        # ---------------- 2. KEYWORD SCORE (TF-IDF) ---------------- #

        keyword_score = compute_keyword_score(profile_text, job_text)

        # ---------------- 3. FINAL COMBINED SCORE ---------------- #

        # Adjusted weighting
        final_score_float = (semantic_score * 0.6) + (keyword_score * 0.4)

        # Clamp safely
        final_score_float = max(0.0, min(1.0, final_score_float))
        final_score = int(final_score_float * 100)

        # ---------------- 4. LABEL ---------------- #

        if final_score >= 80:
            level = "Excellent Match"
        elif final_score >= 65:
            level = "Strong Match"
        elif final_score >= 50:
            level = "Moderate Match"
        else:
            level = "Low Match"

        return {
            "score": final_score,
            "label": level,
            "breakdown": {
                "semantic": round(semantic_score * 100, 1),
                "keyword": round(keyword_score * 100, 1)
            }
        }

    except Exception as e:
        print("Scoring Error:", e)
        return {
            "score": 0,
            "label": "Error",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)