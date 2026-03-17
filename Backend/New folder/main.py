import os
import uuid
import json
import re
from typing import List, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from dotenv import load_dotenv
import google.generativeai as genai
import io

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash") # Or "gemini-1.5-pro" for better reasoning

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
    id: str = "" # Added ID
    company: str = ""
    role: str = ""
    location: str = ""
    startDate: str = ""
    endDate: str = ""
    description: str = ""

class Education(BaseModel):
    id: str = "" # Added ID
    school: str = ""
    degree: str = ""
    field: str = ""
    startDate: str = ""
    endDate: str = ""
    grade: str = ""

class Project(BaseModel):
    id: str = "" # Added ID
    name: str = ""
    techStack: str = ""
    link: str = ""
    description: str = ""

class Certification(BaseModel):
    id: str = "" # Added ID
    name: str = ""
    issuer: str = ""
    date: str = ""
    url: str = ""

class Language(BaseModel):
    id: str = "" # Added ID
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

# --- NEW: Request Model for Tailoring ---
class TailorRequest(BaseModel):
    jobDescription: str
    masterProfile: Dict[str, Any]

# ---------------- PDF TEXT EXTRACTOR ----------------

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

# ---------------- JSON EXTRACTOR ----------------

def extract_json_from_response(text: str):
    try:
        # Remove markdown code blocks if present
        text = re.sub(r"```json|```", "", text).strip()
        # Find the first opening brace and last closing brace
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            return parsed
    except Exception as e:
        print("JSON Extraction Error:", e)
    return {}

# ---------------- FIELD NORMALIZER ----------------

def normalize_data(data: dict):
    safe_structure = ResumeSchema().model_dump()

    # Ensure top-level keys exist
    for key in safe_structure:
        if key not in data:
            data[key] = safe_structure[key]

    # Skills normalization
    if not isinstance(data.get("skills"), dict):
        if isinstance(data.get("skills"), list):
             # If AI returns a list, join it into technical string
             data["skills"] = {"technical": ", ".join(data["skills"]), "soft": ""}
        else:
             data["skills"] = {"technical": str(data.get("skills", "")), "soft": ""}

    # Helper function to flatten lists to strings (for descriptions)
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

# ---------------- CONTENT LIMIT ENFORCER (SAFETY NET) ----------------

def enforce_content_limits(data: dict) -> dict:
    """Hard-cap content to prevent template overflow, even if AI ignores prompt limits."""
    
    MAX_SKILLS = 12
    MAX_EXPERIENCE = 4
    MAX_EXP_BULLETS = 4
    MAX_PROJECTS = 3
    MAX_PROJ_BULLETS = 3
    MAX_EDUCATION = 3
    MAX_CERTIFICATIONS = 4
    MAX_LANGUAGES = 4
    MAX_BULLET_WORDS = 25  # Soft cap — truncate very long bullets

    # Cap skills
    skills = data.get("skills", {})
    if isinstance(skills, dict):
        tech = skills.get("technical", "")
        if isinstance(tech, str) and tech:
            skill_list = [s.strip() for s in tech.split(",") if s.strip()]
            if len(skill_list) > MAX_SKILLS:
                skill_list = skill_list[:MAX_SKILLS]
            skills["technical"] = ", ".join(skill_list)
        data["skills"] = skills

    # Cap experience entries and bullets
    exp_list = data.get("experience", [])
    if len(exp_list) > MAX_EXPERIENCE:
        exp_list = exp_list[:MAX_EXPERIENCE]
    for exp in exp_list:
        desc = exp.get("description", "")
        if isinstance(desc, list) and len(desc) > MAX_EXP_BULLETS:
            exp["description"] = desc[:MAX_EXP_BULLETS]
        elif isinstance(desc, str):
            lines = [l.strip() for l in desc.split("\n") if l.strip()]
            exp["description"] = lines[:MAX_EXP_BULLETS]
    data["experience"] = exp_list

    # Cap projects entries and bullets
    proj_list = data.get("projects", [])
    if len(proj_list) > MAX_PROJECTS:
        proj_list = proj_list[:MAX_PROJECTS]
    for proj in proj_list:
        desc = proj.get("description", "")
        if isinstance(desc, list) and len(desc) > MAX_PROJ_BULLETS:
            proj["description"] = desc[:MAX_PROJ_BULLETS]
        elif isinstance(desc, str):
            lines = [l.strip() for l in desc.split("\n") if l.strip()]
            proj["description"] = lines[:MAX_PROJ_BULLETS]
    data["projects"] = proj_list

    # Cap education
    edu_list = data.get("education", [])
    if len(edu_list) > MAX_EDUCATION:
        data["education"] = edu_list[:MAX_EDUCATION]

    # Cap certifications
    cert_list = data.get("certifications", [])
    if len(cert_list) > MAX_CERTIFICATIONS:
        data["certifications"] = cert_list[:MAX_CERTIFICATIONS]

    # Cap languages
    lang_list = data.get("languages", [])
    if len(lang_list) > MAX_LANGUAGES:
        data["languages"] = lang_list[:MAX_LANGUAGES]

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


# ---------------- NEW ENDPOINT: TAILOR RESUME ----------------

@app.post("/api/generate-tailored-resume")
async def generate_tailored_resume(payload: TailorRequest):
    master_profile_str = json.dumps(payload.masterProfile, indent=2)
    
    # DEBUG LOG
    print("\n===== MASTER PROFILE RECEIVED =====")
    print("Keys:", payload.masterProfile.keys())
    projects = payload.masterProfile.get("projects", [])
    print(f"Projects count: {len(projects)}")
    if projects:
        print("First project:", projects[0])
    print("===================================\n")

    job_description = payload.jobDescription

    # 2. IMPROVED PROMPT — with strict content limits to prevent template overflow
    prompt = f"""
    You are a Senior Executive Resume Writer who writes HUMAN-LIKE, detailed, achievement-rich resumes.

    ━━━━━━━━━━ CORE OBJECTIVE ━━━━━━━━━━
    Transform the MASTER PROFILE into a HIGH-IMPACT, ATS-optimized, content-rich resume tailored to the JOB DESCRIPTION.

    IMPORTANT:
    • DO NOT change the candidate’s actual job titles or designations.
    • NEVER rename or modify the role to match the job description.
    • Use the exact designation from MASTER PROFILE.
    • Only tailor responsibilities and achievements — NOT titles.

    ━━━━━━━━━━ CONTENT DEPTH RULES ━━━━━━━━━━

    The resume must feel written by an experienced professional, not minimal AI output.

    1️⃣ SUMMARY
    • 60–80 words.
    • Strong positioning statement.
    • Mention years of experience, domain expertise, tools, and business impact.
    • Confident, executive tone.

    2️⃣ SKILLS
    • 12–18 relevant skills.
    • ATS-focused.
    • Extract keywords from JOB DESCRIPTION only if candidate actually has them.

    3️⃣ EXPERIENCE (MOST IMPORTANT SECTION)

    • 4–8 bullet points per role.
    • Each bullet 18–35 words.
    • Each bullet must include:
        - What was done
        - Tools/technologies used
        - Business impact OR purpose
    • Include architecture, ownership, collaboration, optimization, automation, scalability.
    • Use strong action verbs.
    • Avoid generic phrases like "Responsible for".

    Good Bullet Formula:
    Action Verb + Technical Implementation + Tools + Business Outcome

    Example Style:
    "Designed and implemented scalable ETL pipelines using AWS Glue and PySpark to process 5M+ daily records, improving reporting accuracy by 30%."

    4️⃣ PROJECTS
    • 3–5 bullets per project.
    • Focus on:
        - Problem
        - Tech used
        - Implementation detail
        - Result

    5️⃣ EDUCATION
    Keep factual.

    6️⃣ CERTIFICATIONS
    Keep concise.

    ━━━━━━━━━━ STYLE REQUIREMENTS ━━━━━━━━━━

    • Write like a human senior resume writer.
    • Avoid robotic short bullets.
    • Avoid fluff.
    • Avoid repeating same verb.
    • Vary sentence structure.
    • Include measurable impact wherever possible.
    • Make content feel substantial and credible.

    ━━━━━━━━━━ OUTPUT RULES ━━━━━━━━━━

    1. Output STRICT JSON only.
    2. description fields must be arrays of strings.
    3. Do not invent fake experience.
    4. Do not exaggerate metrics beyond what profile supports.
    5. Maintain single-page density (avoid essays).

    ━━━━━━━━━━ INPUT ━━━━━━━━━━
    JOB DESCRIPTION:
    {job_description}

    MASTER PROFILE:
    {master_profile_str}

    ━━━━━━━━━━ JSON STRUCTURE ━━━━━━━━━━
    {{
    "fullName": "...",
    "email": "...",
    "phone": "...",
    "linkedin": "...",
    "location": "...",
    "website": "...",
    "summary": "...",
    "skills": {{
        "technical": "...",
        "soft": ""
    }},
    "experience": [
        {{
        "company": "...",
        "role": "...",
        "startDate": "...",
        "endDate": "...",
        "location": "...",
        "description": [
            "Bullet 1",
            "Bullet 2",
            "Bullet 3"
        ]
        }}
    ],
    "projects": [
        {{
        "name": "...",
        "techStack": "...",
        "link": "...",
        "description": [
            "Bullet 1",
            "Bullet 2"
        ]
        }}
    ],
    "education": [],
    "certifications": [],
    "languages": []
    }}
    """

    try:
        response = model.generate_content(prompt)
        parsed_json = extract_json_from_response(response.text)
        
        if not parsed_json:
            raise HTTPException(status_code=500, detail="Failed to parse AI response")


        # Normalize logic (ensure description is always a list)
        normalized = normalize_data(parsed_json)
        
        # Double check description is list in python before sending
        for exp in normalized.get("experience", []):
            if isinstance(exp.get("description"), str):
                exp["description"] = [exp["description"]]
        
        for proj in normalized.get("projects", []):
             if isinstance(proj.get("description"), str):
                proj["description"] = [proj["description"]]

        # --- FALLBACK MECHANISM: Inject Master Data if AI returns empty ---
        # 1. Experience
        if not normalized.get("experience") and payload.masterProfile.get("experience"):
            print("Fallback: Injecting Master Profile Experience")
            normalized["experience"] = payload.masterProfile["experience"]

        # 2. Projects
        if not normalized.get("projects") and payload.masterProfile.get("projects"):
             print("Fallback: Injecting Master Profile Projects")
             normalized["projects"] = payload.masterProfile["projects"]

        # 3. Education
        if not normalized.get("education") and payload.masterProfile.get("education"):
             print("Fallback: Injecting Master Profile Education")
             normalized["education"] = payload.masterProfile["education"]

        # 4. Certifications
        if not normalized.get("certifications") and payload.masterProfile.get("certifications"):
             print("Fallback: Injecting Master Profile Certifications")
             # Ensure certifications match expected structure if needed
             normalized["certifications"] = payload.masterProfile["certifications"]

        # 5. Languages
        if not normalized.get("languages") and payload.masterProfile.get("languages"):
             print("Fallback: Injecting Master Profile Languages")
             normalized["languages"] = payload.masterProfile["languages"]
             
        # 6. Skills (if empty)
        skills = normalized.get("skills", {})
        if not skills.get("technical") and payload.masterProfile.get("skills"):
             print("Fallback: Injecting Master Profile Skills")
             mp_skills = payload.masterProfile["skills"]
             if isinstance(mp_skills, dict):
                 normalized["skills"] = mp_skills
             elif isinstance(mp_skills, list):
                 normalized["skills"] = {"technical": ", ".join(mp_skills), "soft": ""}
             elif isinstance(mp_skills, str):
                 normalized["skills"] = {"technical": mp_skills, "soft": ""}


        # SAFETY NET: Hard-cap all content (including fallback data) to prevent template overflow
        normalized = enforce_content_limits(normalized)
    
        return {"data": normalized}

    except Exception as e:
        print("Tailoring Error:", e)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)