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
    userSkills: List[str] = []

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

# ---------------- MATCH SCORE MODEL & API ----------------

from sentence_transformers import SentenceTransformer, util

# Global Model Loader
match_model = None

def get_match_model():
    global match_model
    if match_model is None:
        print("Loading Match Score Model (Local: all-MiniLM-L6-v2)...")
        # Switch to Bi-Encoder for document similarity instead of QA CrossEncoder
        match_model = SentenceTransformer('all-MiniLM-L6-v2') 
        print("Model Loaded Successfully.")
    return match_model

# Initialize on startup
try:
    get_match_model()
except Exception as e:
    print(f"Warning: Model failed to load on startup: {e}")

@app.post("/api/score-job")
async def score_job(payload: ScoreRequest):
    try:
        # 1. Skill-Based Keyword Extraction
        jd_clean = payload.jobDescription.lower()
        user_skills_clean = [s.strip().lower() for s in payload.userSkills if s.strip()]

        # A robust list of common technical skills to hunt for in the JD
        COMMON_TECH_SKILLS = {
            "python", "sql", "java", "c++", "c#", "javascript", "typescript", "html", "css", 
            "react", "angular", "vue", "node.js", "express", "django", "flask", "spring", 
            "docker", "kubernetes", "aws", "azure", "gcp", "git", "linux", "agile", "scrum",
            "machine learning", "data science", "nlp", "artificial intelligence", "genai", 
            "deep learning", "pytorch", "tensorflow", "pandas", "numpy", "react native", 
            "flutter", "swift", "kotlin", "ruby", "php", "go", "rust", "mysql", "postgresql", 
            "mongodb", "redis", "elasticsearch", "kafka", "rabbitmq", "graphql", "rest api", 
            "ci/cd", "jenkins", "github actions", "terraform", "ansible", "bash", "jira",
            "figma", "ui/ux", "seo", "marketing", "salesforce", "excel", "powerbi", "tableau",
            "communication", "leadership", "problem solving", "project management", "nosql",
            "graphql", "bash", "shell", "c", "unix", "ubuntu", "macos", "windows", "devops"
        }

        # Combine common skills with the user's explicit skills
        # This ensures we don't miss niche skills the user has if they appear in the JD
        hunt_list = COMMON_TECH_SKILLS.union(set(user_skills_clean))

        jd_skills_found = set()
        # Use regex word boundaries to avoid partial matches (e.g. "go" matching "good")
        for skill in hunt_list:
            # Escape to handle skills like c++, c#
            escaped_skill = re.escape(skill)
            if re.search(r'\b' + escaped_skill + r'\b', jd_clean):
                jd_skills_found.add(skill)

        matched_keywords = []
        missing_keywords = []

        for skill in jd_skills_found:
            # A skill is matched if the user has it explicitly
            if skill in user_skills_clean:
                matched_keywords.append(skill)
            else:
                missing_keywords.append(skill)

        total_jd_skills = len(jd_skills_found)
        match_count = len(matched_keywords)

        if total_jd_skills == 0:
            # Fallback if no specific skills are found: assume Keyword score is OK
            keyword_score = 50
        else:
            raw_percentage = match_count / total_jd_skills
            # We don't need a massive multiplier anymore because we are strictly matching skills
            # But we can still be slightly forgiving (e.g., getting 75% of requested skills is amazing)
            keyword_score = min(raw_percentage * 1.5 * 100, 100)

        # 6. Semantic Scoring (Sentence Transformer Cosine Similarity)
        try:
            model = get_match_model()
            # Generate embeddings for JD and Profile
            embeddings1 = model.encode(payload.jobDescription, convert_to_tensor=True)
            embeddings2 = model.encode(payload.userProfile, convert_to_tensor=True)
            
            # Compute cosine-similarities
            cosine_scores = util.cos_sim(embeddings1, embeddings2)
            similarity = cosine_scores.item() # Returns a value typically between 0 and 1
            
            # Scale similarity: 0.3 is usually quite distinct, 0.7+ is very similar in STS
            # Map [0.2, 0.7] to [0, 100] to be generous
            if similarity <= 0.2:
                semantic_score = 0
            elif similarity >= 0.7:
                semantic_score = 100
            else:
                semantic_score = ((similarity - 0.2) / 0.5) * 100
                
        except Exception as e:
            print(f"Semantic Scoring Failed: {e}")
            semantic_score = 0

        # 7. Hybrid Score Calculation
        # Weighted: 40% Keywords, 60% Semantic
        # Semantic mapping handles "related theory/concepts" much better
        if semantic_score > 0:
            final_score = (0.4 * keyword_score) + (0.6 * semantic_score)
        else:
            final_score = keyword_score

        # Cap at 100 and round
        final_score = min(int(final_score), 100)
        semantic_int = min(int(semantic_score), 100)
        keyword_int = min(int(keyword_score), 100)

        # 8. Return Structure
        return {
            "score": final_score,
            "breakdown": {
                "semantic": semantic_int, 
                "keyword": keyword_int, 
                
                # Extra data for debugging & frontend features
                "match_count": match_count,
                "total_unique_jd_words": total_jd_skills,
                "matching_keywords": list(matched_keywords)[:15],
                "missing_keywords": list(missing_keywords)[:15]
            }
        }

    except Exception as e:
        print("Scoring Error:", e)
        return {"score": 0, "breakdown": {"semantic": 0, "keyword": 0}, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)