import os
import uuid
import json
import re
import math
import io
from collections import Counter
from typing import List, Dict, Any

# Third-party imports
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from dotenv import load_dotenv
import google.generativeai as genai

# ML Imports
from sentence_transformers import CrossEncoder, SentenceTransformer, util
import torch
import spacy
from keybert import KeyBERT
import fitz  # PyMuPDF
import nltk
nltk.download('wordnet', quiet=True)
nltk.download('punkt_tab', quiet=True)

# ---------------- CONFIGURATION ----------------

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash") # changed to 1.5-flash as 2.5 isn't standard yet, or stick to your working model

app = FastAPI()

# ---------------- PRELOAD ML MODELS ----------------
print("Loading ATS Models...")
try:
    nlp = spacy.load("en_core_web_sm")
    kw_model = KeyBERT()
    semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
    # Download NLTK data for sentence/word tokenization
    nltk.download('punkt_tab', quiet=True)
    nltk.download('averaged_perceptron_tagger_eng', quiet=True)
    print("ATS Models Loaded Successfully.")
except Exception as e:
    print(f"Warning: ATS Models failed to load on startup: {e}")

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
    atsReport: Any = None

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

def _repair_json_string(raw: str) -> str:
    """Attempt to fix the most common AI JSON formatting errors."""
    # 1. Remove markdown fences
    raw = re.sub(r"```json|```", "", raw).strip()
    
    # 2. Replace smart/curly quotes with straight quotes
    raw = raw.replace("\u2018", "'").replace("\u2019", "'")
    raw = raw.replace("\u201c", "'").replace("\u201d", "'")
    
    # 3. Strip null bytes / control chars that break parsers
    raw = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", raw)
    
    # 4. Fix unescaped double-quotes inside JSON string values.
    #    E.g.  "soft": "..., "AI-first" thinking, ..."
    #    Strategy: scan character-by-character inside string values and escape
    #    stray quotes. This is intentionally conservative.
    def fix_inner_quotes(m: re.Match) -> str:
        inner = m.group(1)
        # Replace any " that is not preceded by a backslash with an escaped version
        # but only if it's not at the start/end of the captured group
        inner = re.sub(r'(?<!\\)"', "'", inner)
        return '"' + inner + '"'

    # Only apply to string values that are longer than 30 chars (skill lists etc.)
    raw = re.sub(r'"([^"\\\n]{30,})"', fix_inner_quotes, raw)

    return raw


def extract_json_from_response(text: str):
    """Extract and parse a JSON object from an AI response, with multi-stage repair."""
    stages = [
        lambda t: t,                         # Stage 0: raw (maybe already clean)
        _repair_json_string,                  # Stage 1: apply all repairs
        lambda t: _repair_json_string(t),     # Stage 2: second pass after strip
    ]

    for i, prepare in enumerate(stages):
        try:
            cleaned = prepare(text)
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                return json.loads(match.group())
        except json.JSONDecodeError as e:
            if i == len(stages) - 1:
                print("JSON Extraction Error (all stages failed):", e)
                print("--- RAW TEXT THAT FAILED TO PARSE ---")
                print(text[:2000])  # limit log size
                print("-------------------------------------")
        except Exception as e:
            print(f"JSON Extraction Error (stage {i}):", e)

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

    ats_context = ""
    if payload.atsReport:
        ats_context = f"\n\n=== REFINING PREVIOUS ATS SCORE ===\n" \
                      f"The candidate previously scored poorly in ATS due to these issues:\n" \
                      f"{json.dumps(payload.atsReport, indent=2)}\n" \
                      f"PAY SPECIAL ATTENTION to the 'Improvements', 'Missing Keywords', and 'Content Quality' metrics from this report. Fix these exact issues in the new resume.\n"

    prompt = f"""You are an Expert Resume Writer and ATS Optimization Specialist.
Your goal is to tailor the candidate's MASTER PROFILE to the provided JOB DESCRIPTION, resulting in a professional, natural-sounding resume that passes ATS systems without looking artificially "keyword-stuffed".

=== TASK ===
Output STRICT JSON only — no markdown, no explanation, no wrapping.
DO NOT use markdown formatting like **bold** in any of your text output. Keep it plain text.
CRITICAL JSON RULE: NEVER place double-quote characters (") inside JSON string values. If you need to quote a term, use single quotes or just write it without quotes. For example write AI-first thinking NOT "AI-first" thinking. Violating this breaks JSON parsing.

=== SECTION GUIDELINES ===

1. **CONTACT INFO**
   - Preserve all existing contact information from the master profile.

2. **SUMMARY** 
   - Write a professional summary (approx. 40-60 words).
   - Clearly state the candidate's years of experience, core expertise, and value proposition.
   - Weave in 4-6 highly relevant keywords from the JD naturally.
   - Mention the company name (from the JD) and the exact job title to show alignment.
   - Do NOT just write a list of sentences; make it flow professionally as a cohesive paragraph.

3. **SKILLS**
   - technical: A comprehensive comma-separated list of technologies, tools, and languages mentioned in the JD that the candidate has (plus their existing skills). Use exact JD phrasing (e.g., "Power BI" not "PowerBI").
   - soft: Comma-separated list of relevant soft skills (e.g., "Agile Methodology, Stakeholder Communication").

4. **EXPERIENCE**
   - Preserve the candidate's actual companies, roles, and dates.
   - Write 4-5 bullet points per role, keeping them concise (10-20 words).
   - Start bullets with strong action verbs (Led, Architected, Developed, Streamlined, etc.).
   - Integrate keywords from the JD naturally into the bullet points.
   - Include quantified achievements (metrics, %, $) ONLY where they make sense and align with the master profile. Do NOT force fake metrics into every single bullet if it makes the sentence clunky.
   - NEVER use passive voice ("Responsible for", "Involved in").

5. **PROJECTS**
   - Rewrite project descriptions to emphasize alignment with the JD.
   - Mention the tech stack explicitly using exact JD terminology.
   - 2-3 bullets per project, highlighting impact and technical design.

6. **EDUCATION, CERTIFICATIONS, LANGUAGES**
   - Copy exactly from the master profile. Never fabricate degrees or certifications.

=== KEYWORD INJECTION RULE (HIGHEST PRIORITY) ===
Before writing any section:
1. Extract the top 20 most important technical keywords / tools / methodologies from the JD below (e.g., "Docker", "Git", "CI/CD", "AWS Bedrock", "Semantic Search", "vLLM").
2. Confirm which ones are already in the Master Profile.
3. For ANY keyword NOT in the Master Profile: if it is a technology the candidate could reasonably have exposure to given their background, INSERT it verbatim into:
   - skills.technical (always)
   - The techStack of the most relevant project (if applicable)
   - One bullet in experience or projects (e.g., "Utilised Docker for containerisation of AI services")
4. EVERY keyword you extracted in step 1 MUST appear verbatim at least once (case-insensitive) in the final resume text.

=== CRITICAL RULES ===
- NEVER fabricate companies, roles, degrees, or certifications the candidate does NOT have.
- DO NOT use any markdown inside the JSON values (No `**` or `__`).
- Ensure all top JD keywords appear verbatim in the output — prioritise skills.technical as the main inclusion point.{ats_context}

JOB DESCRIPTION:
{job_description}

MASTER PROFILE:
{master_profile_str}

JSON STRUCTURE:
{{
"fullName": "exact from profile", "jobTitle": "exact JD job title", "email": "exact from profile", "phone": "exact from profile", "linkedin": "exact from profile", "location": "from profile", "website": "from profile", "github": "from profile",
"summary": "Professional summary paragraph mentioning company name, job title, and key JD skills...",
"skills": {{ "technical": "Python, SQL, TensorFlow... (exact JD terms)", "soft": "Agile, Communication..." }},
"experience": [ {{ "company": "...", "role": "...", "startDate": "...", "endDate": "...", "location": "...", "description": ["[Action verb] [task] using [JD tech], resulting in [impact]", "bullet 2"] }} ],
"projects": [ {{ "name": "...", "techStack": "...", "link": "...", "description": ["[Action verb] [what] using [JD tech]", "bullet 2"] }} ],
"education": [ {{ "school": "...", "degree": "...", "field": "...", "startDate": "...", "endDate": "...", "grade": "..." }} ],
"certifications": [ {{ "name": "...", "issuer": "...", "date": "...", "url": "..." }} ],
"languages": [ {{ "name": "...", "proficiency": "..." }} ]
}}"""

    try:
        resume_gen_model = os.getenv("RESUME_GENERATION_MODEL", "GEMINI").upper()
        sarvam_api_key = os.getenv("SARVAM_API_KEY")
        
        response_text = ""
        
        if resume_gen_model == "SARVAM" and sarvam_api_key:
            print("Using Sarvam AI for Resume Generation...")
            from sarvamai import SarvamAI
            client = SarvamAI(api_subscription_key=sarvam_api_key)
            
            response = client.chat.completions(
                messages=[{"content": prompt, "role": "user"}],
                temperature=0.3,
                max_tokens=2500,
                n=1
            )
            print("response : \n",response)
            if hasattr(response, 'choices'):
                response_text = response.choices[0].message.content.strip()
            else:
                response_text = response['choices'][0]['message']['content'].strip()
                
        else:
            print("Using Gemini for Resume Generation...")
            response = model.generate_content(prompt)
            response_text = response.text
            
        parsed_json = extract_json_from_response(response_text)
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


# ───────────── ATS HELPER FUNCTIONS ─────────────

def chunk_text(text: str, max_words: int = 200, overlap: int = 50) -> list:
    """Split long text into overlapping chunks for the sentence transformer."""
    words = text.split()
    if len(words) <= max_words:
        return [text]
    chunks = []
    start = 0
    while start < len(words):
        end = start + max_words
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += max_words - overlap
    return chunks


def calculate_semantic_score(jd_text: str, resume_text: str) -> float:
    """Chunked semantic similarity using SentenceTransformer."""
    jd_chunks = chunk_text(jd_text)
    resume_chunks = chunk_text(resume_text)

    jd_embeddings = semantic_model.encode(jd_chunks, convert_to_tensor=True)
    resume_embeddings = semantic_model.encode(resume_chunks, convert_to_tensor=True)

    # Compute all-pairs cosine similarity and take the mean of max similarities
    cos_scores = util.cos_sim(jd_embeddings, resume_embeddings)  # shape: (jd_n, res_n)

    # For each JD chunk, find the best matching resume chunk
    max_per_jd = cos_scores.max(dim=1).values  # best match for each JD chunk
    avg_similarity = max_per_jd.mean().item()

    # Map raw cosine similarity [0.15, 0.75] -> [0, 100]
    if avg_similarity <= 0.15:
        return 0.0
    elif avg_similarity >= 0.75:
        return 100.0
    else:
        return ((avg_similarity - 0.15) / 0.60) * 100.0


def calculate_keyword_score(jd_text: str, resume_text: str) -> dict:
    """
    Extract meaningful skills, technologies, and qualifications from JD using either Sarvam AI or Gemini.
    This guarantees clean, atomic skills (e.g., 'Python', 'Agile') instead of long NLP chunks.
    """
    import os
    import requests
    import google.generativeai as genai
    from nltk.stem import WordNetLemmatizer
    import json
    import re

    lemmatizer = WordNetLemmatizer()
    
    # ── Step 1: Extract keywords using Sarvam AI or Gemini ──
    prompt = f"""
    You are an expert ATS (Applicant Tracking System) keyword extractor.
    Analyze the following Job Description (JD) and extract the exact keywords an ATS would look for.
    
    RULES:
    1. Extract ATOMIC keywords only (e.g., "Python", "Agile", "Project Management"). DO NOT extract long phrases or sentences.
    2. Focus purely on: Hard Skills, Soft Skills, Tools, Technologies, and specific methodologies.
    3. Exclude ALL generic corporate jargon (e.g., "team player", "join us", "fast-paced", "competitive salary", "opportunity").
    4. Provide the list sorted by importance (most critical first).
    5. Limit the output to a maximum of 20 strictly relevant keywords.

    Return the output ONLY as a raw JSON array of strings. Do not include markdown formatting or backticks.
    
    JOB DESCRIPTION:
    {jd_text}
    """
    
    extracted_keywords = []
    
    try:
        ats_score_model = os.getenv("ATS_SCORE_MODEL", "GEMINI").upper()
        sarvam_api_key = os.getenv("SARVAM_API_KEY")
        
        if ats_score_model == "SARVAM" and sarvam_api_key:
            # --- SARVAM AI IMPLEMENTATION ---
            print("Using Sarvam AI for ATS Keyword Extraction...")
            from sarvamai import SarvamAI
            client = SarvamAI(api_subscription_key=sarvam_api_key)
            
            response = client.chat.completions(
                messages=[{"content": prompt, "role": "user"}]
            )
            
            # Extract text (handling both object and dict return types from the SDK)
            if hasattr(response, 'choices'):
                text_response = response.choices[0].message.content.strip()
            else:
                text_response = response['choices'][0]['message']['content'].strip()
            
        else:
            # --- GEMINI IMPLEMENTATION (Fallback/Default) ---
            print("Using Gemini for keyword extraction...")
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            text_response = response.text.strip()
            
        # Clean markdown if present
        if text_response.startswith('```json'):
            text_response = text_response[7:]
        if text_response.startswith('```'):
            text_response = text_response[3:]
        if text_response.endswith('```'):
            text_response = text_response[:-3]
            
        extracted_keywords = json.loads(text_response.strip())
        
        # Format into expected list of dicts with calculated relevance
        jd_keywords = []
        for i, kw in enumerate(extracted_keywords):
            # Degrading relevance based on order (most important first)
            relevance = max(0.4, 1.0 - (i * 0.03)) 
            jd_keywords.append({
                "keyword": str(kw).lower().strip(),
                "relevance": round(relevance, 3),
                "type": "skill"
            })
            
    except Exception as e:
        print(f"Error extracting keywords with AI: {e}")
        # Fallback to a very basic extraction if API fails
        jd_keywords = [{"keyword": w.lower(), "relevance": 0.5, "type": "term"} 
                       for w in jd_text.split() if len(w) > 5][:10]

    # Limit to top 20 just in case
    jd_keywords = jd_keywords[:20]
    
    # ── Step 2: Smart matching against resume ──
    resume_lower = resume_text.lower()
    resume_lemmas = None  # Lazy compute
    found = []
    missing = []

    for item in jd_keywords:
        kw = item["keyword"]
        
        # Strategy 1: Exact match
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, resume_lower):
            found.append(item)
            continue
        
        # Strategy 2: Lemmatized match
        kw_lemmas = ' '.join(lemmatizer.lemmatize(w) for w in kw.split())
        if resume_lemmas is None:
            resume_lemmas = ' '.join(lemmatizer.lemmatize(w) for w in resume_lower.split())
        pattern_lemma = r'\b' + re.escape(kw_lemmas) + r'\b'
        if kw_lemmas != kw and re.search(pattern_lemma, resume_lemmas):
            found.append(item)
            continue
            
        # Strategy 3: For multi-word phrases, check if all words appear in resume
        words = kw.split()
        if len(words) >= 2:
            all_found = all(
                re.search(r'\b' + re.escape(w) + r'\b', resume_lower) 
                for w in words if len(w) > 2
            )
            if all_found:
                partial_item = {**item, "relevance": round(item["relevance"] * 0.7, 3)}
                found.append(partial_item)
                continue
        
        # Strategy 4: Substring fallback for short single-word technical terms
        # e.g. 'docker' matches 'docker-compose', 'dockerfile', 'dockerised'
        if len(words) == 1 and len(kw) >= 3:
            if kw in resume_lower:  # simple substring (not word-boundary)
                partial_item = {**item, "relevance": round(item["relevance"] * 0.6, 3)}
                found.append(partial_item)
                continue

        missing.append(item)

    total = len(jd_keywords) if jd_keywords else 1
    score = (len(found) / total * 100)
    return {
        "score": round(score, 1),
        "found": found,
        "missing": missing,
        "found_keywords": [f["keyword"] for f in found],
        "missing_keywords": [m["keyword"] for m in missing],
    }


def calculate_section_score(resume_text: str) -> dict:
    """Detect presence of standard resume sections via regex patterns."""
    sections = {
        "has_summary": r'(?i)\b(summary|objective|about\s*me|profile|professional\s*summary)\b',
        "has_experience": r'(?i)\b(experience|work\s*history|employment|professional\s*experience)\b',
        "has_education": r'(?i)\b(education|academic|degree|university|college)\b',
        "has_skills": r'(?i)\b(skills|technologies|technical\s*skills|competencies|proficiencies)\b',
        "has_projects": r'(?i)\b(projects|portfolio|personal\s*projects|key\s*projects)\b',
    }

    feedback = {}
    detected_count = 0
    for key, pattern in sections.items():
        found = bool(re.search(pattern, resume_text))
        feedback[key] = found
        if found:
            detected_count += 1

    score = (detected_count / len(sections)) * 100
    return {"score": round(score, 1), "feedback": feedback}


def calculate_impact_score(resume_text: str) -> dict:
    """Score based on action verbs, quantified achievements, and metrics."""
    ACTION_VERBS = {
        "achieved", "improved", "developed", "managed", "created", "designed",
        "implemented", "increased", "reduced", "built", "led", "delivered",
        "launched", "optimized", "automated", "streamlined", "coordinated",
        "mentored", "resolved", "analyzed", "engineered", "architected",
        "spearheaded", "transformed", "accelerated", "generated", "established",
        "negotiated", "collaborated", "integrated", "migrated", "deployed",
        "scaled", "refactored", "orchestrated", "championed", "executed"
    }

    resume_lower = resume_text.lower()
    words = re.findall(r'\b[a-z]+\b', resume_lower)
    word_set = set(words)

    # Count action verbs found
    action_verbs_found = ACTION_VERBS.intersection(word_set)
    action_verb_score = min(len(action_verbs_found) / 8.0, 1.0) * 100  # 8+ verbs = perfect

    # Count quantified metrics: numbers, percentages, dollar amounts
    percentages = re.findall(r'\d+\s*%', resume_text)
    dollar_amounts = re.findall(r'\$[\d,]+', resume_text)
    plain_numbers = re.findall(r'\b\d{2,}\b', resume_text)  # numbers with 2+ digits

    total_metrics = len(percentages) + len(dollar_amounts) + len(plain_numbers)
    metric_score = min(total_metrics / 6.0, 1.0) * 100  # 6+ metrics = perfect

    combined_score = (0.5 * action_verb_score) + (0.5 * metric_score)

    details = {
        "action_verbs_found": sorted(list(action_verbs_found)),
        "action_verb_count": len(action_verbs_found),
        "percentages_count": len(percentages),
        "dollar_amounts_count": len(dollar_amounts),
        "numbers_count": len(plain_numbers),
        "total_metrics": total_metrics
    }

    return {"score": round(combined_score, 1), "details": details}


def calculate_readability_score(resume_text: str) -> dict:
    """Analyze sentence length, bullet density, and word count."""
    sentences = nltk.sent_tokenize(resume_text)
    words = resume_text.split()
    word_count = len(words)
    sentence_count = len(sentences) if sentences else 1

    # Average sentence length (ideal: 10–20 words per sentence for resumes)
    avg_sentence_len = word_count / sentence_count
    if 8 <= avg_sentence_len <= 22:
        sentence_len_score = 100
    elif avg_sentence_len < 8:
        sentence_len_score = max(0, avg_sentence_len / 8.0 * 100)
    else:
        sentence_len_score = max(0, 100 - (avg_sentence_len - 22) * 5)

    # Bullet density: count lines starting with bullets/dashes
    lines = resume_text.strip().split('\n')
    total_lines = len(lines) if lines else 1
    bullet_lines = sum(1 for line in lines if re.match(r'^\s*[\-•\*▸▹►]', line.strip()))
    bullet_ratio = bullet_lines / total_lines
    bullet_score = min(bullet_ratio / 0.3, 1.0) * 100  # 30%+ bullet lines = perfect

    # Word count (ideal resume: 300–800 words)
    if 300 <= word_count <= 800:
        length_score = 100
    elif word_count < 300:
        length_score = max(0, (word_count / 300) * 100)
    else:
        length_score = max(0, 100 - (word_count - 800) * 0.1)

    combined = (0.4 * sentence_len_score) + (0.3 * bullet_score) + (0.3 * length_score)

    details = {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_sentence_length": round(avg_sentence_len, 1),
        "bullet_line_ratio": round(bullet_ratio * 100, 1),
    }

    return {"score": round(min(combined, 100), 1), "details": details}


def calculate_format_score(resume_text: str) -> dict:
    """Check ATS formatting compatibility."""
    checks = {}
    
    # Check for contact info
    checks["has_email"] = bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', resume_text))
    checks["has_phone"] = bool(re.search(r'[\+]?[\d\s\-\(\)]{7,15}', resume_text))
    checks["has_linkedin"] = bool(re.search(r'(?i)linkedin\.com|linkedin', resume_text))
    
    # Check for problematic formatting
    special_chars = re.findall(r'[\u2018\u2019\u201c\u201d\u2013\u2014\u00a0\u2026]', resume_text)
    checks["no_smart_quotes"] = len(special_chars) < 5
    checks["no_tables"] = not bool(re.search(r'\|.*\|.*\|', resume_text))  # pipe-delimited tables
    
    # Check for consistent date formatting
    date_formats = re.findall(r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\b|\b\d{1,2}/\d{4}\b|\b\d{4}\s*[-–]\s*(?:Present|\d{4})\b', resume_text, re.IGNORECASE)
    checks["has_dates"] = len(date_formats) >= 2
    
    # Check file length (pages estimate: ~500 words per page)
    word_count = len(resume_text.split())
    estimated_pages = word_count / 500
    checks["good_length"] = 0.5 <= estimated_pages <= 2.5
    
    passed = sum(1 for v in checks.values() if v)
    total = len(checks)
    score = (passed / total) * 100
    
    return {"score": round(score, 1), "checks": checks, "passed": passed, "total": total}


def detect_experience_level(resume_text: str) -> dict:
    """Detect experience level from resume content."""
    resume_lower = resume_text.lower()
    
    # Year ranges detection
    year_ranges = re.findall(r'(\d{4})\s*[-–]\s*(\d{4}|present)', resume_lower)
    total_years = 0
    import datetime
    current_year = datetime.datetime.now().year
    for start, end in year_ranges:
        start_yr = int(start)
        end_yr = current_year if 'present' in end.lower() else int(end)
        total_years += max(0, end_yr - start_yr)
    
    # Seniority keywords
    senior_keywords = ['senior', 'lead', 'principal', 'staff', 'architect', 'manager', 'director', 'head', 'vp', 'chief']
    mid_keywords = ['mid', 'intermediate', 'associate', 'specialist']
    entry_keywords = ['junior', 'intern', 'entry', 'trainee', 'fresher', 'graduate', 'student']
    
    senior_count = sum(1 for kw in senior_keywords if re.search(r'\b' + kw + r'\b', resume_lower))
    mid_count = sum(1 for kw in mid_keywords if re.search(r'\b' + kw + r'\b', resume_lower))
    entry_count = sum(1 for kw in entry_keywords if re.search(r'\b' + kw + r'\b', resume_lower))
    
    # Determine level
    if total_years >= 8 or senior_count >= 2:
        level = "Senior"
        confidence = "High" if total_years >= 8 and senior_count >= 1 else "Medium"
    elif total_years >= 3 or mid_count >= 1 or (senior_count == 1 and total_years >= 2):
        level = "Mid-Level"
        confidence = "High" if total_years >= 4 else "Medium"
    elif entry_count >= 1 or total_years < 2:
        level = "Entry-Level"
        confidence = "High" if entry_count >= 1 else "Medium"
    else:
        level = "Mid-Level"
        confidence = "Low"
    
    return {
        "level": level,
        "confidence": confidence,
        "estimated_years": total_years,
        "seniority_signals": {
            "senior_keywords_found": senior_count,
            "mid_keywords_found": mid_count,
            "entry_keywords_found": entry_count,
        }
    }


# ───────────── CONTENT ANALYSIS ─────────────

VERB_SYNONYMS = {
    "designed": ["planned", "created", "devised", "formulated", "conceptualized"],
    "developed": ["built", "engineered", "constructed", "crafted", "established"],
    "implemented": ["executed", "deployed", "applied", "integrated", "operationalized"],
    "managed": ["oversaw", "coordinated", "directed", "supervised", "administered"],
    "created": ["produced", "generated", "originated", "invented", "initiated"],
    "improved": ["enhanced", "refined", "upgraded", "elevated", "strengthened"],
    "built": ["constructed", "engineered", "assembled", "developed", "established"],
    "led": ["spearheaded", "directed", "headed", "guided", "championed"],
    "utilized": ["leveraged", "employed", "applied", "harnessed", "adopted"],
    "participated": ["contributed", "engaged", "collaborated", "assisted", "supported"],
    "worked": ["collaborated", "partnered", "cooperated", "operated", "executed"],
    "used": ["leveraged", "employed", "utilized", "adopted", "applied"],
    "made": ["produced", "generated", "crafted", "established", "delivered"],
    "helped": ["facilitated", "assisted", "supported", "enabled", "contributed"],
    "analyzed": ["evaluated", "assessed", "examined", "investigated", "audited"],
    "optimized": ["streamlined", "refined", "enhanced", "fine-tuned", "accelerated"],
    "deployed": ["launched", "released", "rolled out", "shipped", "activated"],
    "automated": ["mechanized", "systematized", "streamlined", "digitized", "programmed"],
    "integrated": ["unified", "incorporated", "consolidated", "merged", "embedded"],
    "delivered": ["shipped", "provided", "produced", "completed", "presented"],
    "ensured": ["guaranteed", "verified", "confirmed", "validated", "maintained"],
    "conducted": ["performed", "executed", "carried out", "facilitated", "administered"],
    "established": ["founded", "initiated", "set up", "launched", "instituted"],
    "supported": ["assisted", "facilitated", "enabled", "maintained", "aided"],
    "provided": ["delivered", "supplied", "offered", "furnished", "presented"],
    "achieved": ["accomplished", "attained", "secured", "realized", "earned"],
    "reduced": ["decreased", "minimized", "cut", "lowered", "diminished"],
    "increased": ["boosted", "grew", "expanded", "elevated", "amplified"],
    "streamlined": ["simplified", "optimized", "consolidated", "refined", "automated"],
    "collaborated": ["partnered", "teamed up", "cooperated", "worked alongside", "co-developed"],
}


def calculate_content_analysis(resume_text: str) -> dict:
    """Analyze resume content for repeated words and section-level quality."""
    resume_lower = resume_text.lower()
    words = re.findall(r'\b[a-z]+\b', resume_lower)

    # ── Repeated action verbs ──
    verb_counts = Counter()
    action_verb_set = set(VERB_SYNONYMS.keys())
    for w in words:
        if w in action_verb_set:
            verb_counts[w] += 1

    repeated_words = []
    for verb, count in verb_counts.most_common():
        if count >= 2:
            synonyms = VERB_SYNONYMS.get(verb, [])[:3]
            repeated_words.append({
                "word": verb,
                "count": count,
                "synonyms": synonyms
            })

    # ── Section-level diagnostics ──
    section_patterns = {
        "Summary": r'(?i)(?:summary|objective|about\s*me|profile|professional\s*summary)\s*[:\n\-–]?\s*([\s\S]*?)(?=\n\s*(?:experience|education|skills|projects|certifications|languages)|$)',
        "Experience": r'(?i)(?:experience|work\s*history|employment|professional\s*experience)\s*[:\n\-–]?\s*([\s\S]*?)(?=\n\s*(?:education|skills|projects|certifications|languages)|$)',
        "Education": r'(?i)(?:education|academic)\s*[:\n\-–]?\s*([\s\S]*?)(?=\n\s*(?:skills|projects|certifications|languages|experience)|$)',
        "Skills": r'(?i)(?:skills|technologies|technical\s*skills|competencies)\s*[:\n\-–]?\s*([\s\S]*?)(?=\n\s*(?:experience|education|projects|certifications|languages)|$)',
        "Projects": r'(?i)(?:projects|portfolio|key\s*projects)\s*[:\n\-–]?\s*([\s\S]*?)(?=\n\s*(?:experience|education|skills|certifications|languages)|$)',
    }

    section_diagnostics = []
    for section_name, pattern in section_patterns.items():
        match = re.search(pattern, resume_text)
        if match:
            content = match.group(1).strip()
            lines = [l.strip() for l in content.split('\n') if l.strip()]
            bullet_lines = [l for l in lines if l.startswith(('•', '-', '·', '*', '–'))]
            word_count = len(content.split())
            avg_words = round(word_count / max(len(lines), 1), 1)

            # Quality assessment
            issues = []
            if section_name == "Summary":
                if word_count < 20:
                    issues.append("Summary is too short — aim for 40-60 words")
                elif word_count > 100:
                    issues.append("Summary is too long — keep under 80 words for ATS")
            elif section_name in ("Experience", "Projects"):
                if len(bullet_lines) < 2:
                    issues.append(f"Only {len(bullet_lines)} bullet(s) — add more detail")
                if avg_words > 25:
                    issues.append("Bullet points are too long — aim for 10-20 words each")
            elif section_name == "Skills":
                if word_count < 10:
                    issues.append("Skills section is sparse — list more technologies")

            status = "strong" if not issues else "needs_work"

            section_diagnostics.append({
                "section": section_name,
                "status": status,
                "line_count": len(lines),
                "bullet_count": len(bullet_lines),
                "word_count": word_count,
                "avg_words_per_line": avg_words,
                "issues": issues,
            })
        else:
            section_diagnostics.append({
                "section": section_name,
                "status": "missing",
                "line_count": 0,
                "bullet_count": 0,
                "word_count": 0,
                "avg_words_per_line": 0,
                "issues": [f"{section_name} section not found — add it for better ATS parsing"],
            })

    return {
        "repeated_words": repeated_words,
        "section_diagnostics": section_diagnostics,
    }


# ───────────── ATS ENDPOINT ─────────────

@app.post("/api/calculate-ats")
async def calculate_ats(
    jd_text: str = Form(...),
    resume_text: str = Form(""),
    resume_file: UploadFile = File(None)
):
    try:
        # ── Step 1: Text Extraction ──
        final_resume_text = resume_text
        if resume_file and resume_file.filename:
            content = await resume_file.read()
            if resume_file.content_type == "application/pdf":
                try:
                    doc = fitz.open(stream=content, filetype="pdf")
                    extracted_text = ""
                    for page in doc:
                        extracted_text += page.get_text() + "\n"
                    final_resume_text = extracted_text.strip()
                except Exception as e:
                    print(f"PyMuPDF Extraction Error: {e}")
                    final_resume_text = resume_text
            else:
                final_resume_text = resume_text

        if not final_resume_text:
            raise HTTPException(status_code=400, detail="No resume text or valid file provided.")

        # ── Step 2: Run all analyzers ──
        semantic_result = calculate_semantic_score(jd_text, final_resume_text)
        keyword_result = calculate_keyword_score(jd_text, final_resume_text)
        section_result = calculate_section_score(final_resume_text)
        impact_result = calculate_impact_score(final_resume_text)
        readability_result = calculate_readability_score(final_resume_text)
        format_result = calculate_format_score(final_resume_text)
        experience_info = detect_experience_level(final_resume_text)
        content_analysis = calculate_content_analysis(final_resume_text)

        # ── Step 3: Weighted overall score (7 dimensions) ──
        overall_ats_score = (
            0.25 * keyword_result["score"] +
            0.20 * semantic_result +
            0.15 * section_result["score"] +
            0.15 * impact_result["score"] +
            0.10 * readability_result["score"] +
            0.15 * format_result["score"]
        )

        # ── Step 4: Generate categorized improvements ──
        improvements = []

        # Keyword suggestions
        if keyword_result["missing"] and len(keyword_result["missing"]) > 0:
            top_missing = keyword_result["missing_keywords"][:5]
            improvements.append({
                "category": "Keywords",
                "severity": "high" if keyword_result["score"] < 40 else "medium",
                "message": f"Missing key terms: {', '.join(top_missing)}. Incorporate these if they match your experience."
            })

        # Section suggestions
        section_fb = section_result["feedback"]
        missing_sections = [k.replace("has_", "").replace("_", " ").title() for k, v in section_fb.items() if not v]
        if missing_sections:
            improvements.append({
                "category": "Structure",
                "severity": "high" if len(missing_sections) >= 3 else "medium",
                "message": f"Missing resume sections: {', '.join(missing_sections)}. Add these for better ATS parsing."
            })

        # Impact suggestions
        impact_details = impact_result["details"]
        if impact_details["action_verb_count"] < 5:
            improvements.append({
                "category": "Impact",
                "severity": "medium",
                "message": f"Only {impact_details['action_verb_count']} action verbs found. Use verbs like 'Implemented', 'Optimized', 'Delivered' to start bullet points."
            })
        if impact_details["total_metrics"] < 3:
            improvements.append({
                "category": "Impact",
                "severity": "high",
                "message": f"Only {impact_details['total_metrics']} quantified metrics found. Add numbers, percentages ($, %) to show measurable impact — aim for 6+."
            })

        # Readability suggestions
        read_details = readability_result["details"]
        if read_details["avg_sentence_length"] > 25:
            improvements.append({
                "category": "Readability",
                "severity": "medium",
                "message": f"Average sentence length is {read_details['avg_sentence_length']} words. Keep sentences under 20 words for ATS readability."
            })
        if read_details["word_count"] < 250:
            improvements.append({
                "category": "Readability",
                "severity": "high",
                "message": f"Resume is only {read_details['word_count']} words. Expand descriptions to at least 300 words."
            })
        if read_details["word_count"] > 900:
            improvements.append({
                "category": "Readability",
                "severity": "low",
                "message": f"Resume is {read_details['word_count']} words — trim to 400–700 words for better focus."
            })

        # Format suggestions
        fmt_checks = format_result["checks"]
        if not fmt_checks.get("has_email"):
            improvements.append({"category": "Format", "severity": "high", "message": "No email address detected. Contact info is essential for ATS."})
        if not fmt_checks.get("has_phone"):
            improvements.append({"category": "Format", "severity": "medium", "message": "No phone number detected. Add a phone number for recruiter contact."})
        if not fmt_checks.get("no_smart_quotes"):
            improvements.append({"category": "Format", "severity": "low", "message": "Smart quotes/special characters detected — these can break ATS parsing. Use plain text."})
        if not fmt_checks.get("has_dates"):
            improvements.append({"category": "Format", "severity": "medium", "message": "Few date references found. Ensure all roles have clear start/end dates."})

        if not improvements:
            improvements.append({"category": "Overall", "severity": "low", "message": "Great job! Your resume is well-optimized for this job description."})

        # Sort by severity
        severity_order = {"high": 0, "medium": 1, "low": 2}
        improvements.sort(key=lambda x: severity_order.get(x.get("severity", "low"), 2))

        # ── Step 5: Return comprehensive result ──
        return {
            "overall_ats_score": round(min(overall_ats_score, 100), 1),
            "semantic_match_score": round(semantic_result, 1),
            "keyword_score": round(keyword_result["score"], 1),
            "section_score": round(section_result["score"], 1),
            "impact_score": round(impact_result["score"], 1),
            "readability_score": round(readability_result["score"], 1),
            "format_score": round(format_result["score"], 1),
            "found_skills": keyword_result["found"],
            "missing_skills": keyword_result["missing"],
            "found_keywords": keyword_result["found_keywords"],
            "missing_keywords": keyword_result["missing_keywords"],
            "section_feedback": section_result["feedback"],
            "impact_details": impact_result["details"],
            "readability_details": readability_result["details"],
            "format_checks": format_result["checks"],
            "experience_info": experience_info,
            "improvements": improvements,
            "content_analysis": content_analysis
        }

    except Exception as e:
        print("ATS Calculation Error:", e)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ───────────── ATS ENHANCEMENT ENDPOINT (LLM Report based on real scores) ─────────────

@app.post("/api/enhance-ats-report")
async def enhance_ats_report(
    jd_text: str = Form(...),
    resume_text: str = Form(...),
    ats_scores: str = Form(...),  # JSON string of the ATS results
):
    try:
        scores = json.loads(ats_scores)
        
        # Extract values before f-string to avoid {{}} issues
        found_kw = json.dumps(scores.get('found_keywords', []))
        missing_kw = json.dumps(scores.get('missing_keywords', []))
        section_fb = json.dumps(scores.get('section_feedback', {}))
        impact_det = json.dumps(scores.get('impact_details', {}))
        read_det = json.dumps(scores.get('readability_details', {}))
        fmt_checks = json.dumps(scores.get('format_checks', {}))
        improvements = json.dumps(scores.get('improvements', []))
        
        prompt = f"""You are an expert ATS analyst. A resume has been algorithmically scored against a job description using keyword matching, semantic similarity, section detection, impact analysis, readability checks, and format checks.

Your job is to provide DETAILED, ACTIONABLE expert insights based on these REAL scores. Do NOT recalculate scores — use the provided ones as ground truth.

=== ATS SCORES (use these exactly, do not override) ===
Overall Score: {scores.get('overall_ats_score', 0)}%
Keyword Score: {scores.get('keyword_score', 0)}%
Semantic Score: {scores.get('semantic_score', 0)}%
Section Score: {scores.get('section_score', 0)}%
Impact Score: {scores.get('impact_score', 0)}%
Readability Score: {scores.get('readability_score', 0)}%
Format Score: {scores.get('format_score', 0)}%

Found Keywords: {found_kw}
Missing Keywords: {missing_kw}
Section Feedback: {section_fb}
Impact Details: {impact_det}
Readability Details: {read_det}
Format Checks: {fmt_checks}
Existing Improvements: {improvements}

=== JOB DESCRIPTION ===
{jd_text}

=== RESUME TEXT ===
{resume_text}

=== INSTRUCTIONS ===
Based on the REAL scores above (not your own scoring), produce a detailed expert report. Be specific and reference actual content from the resume and JD.

Return JSON with this exact structure:
{{
  "executive_summary": "<2-3 sentence expert summary of the resume's fit. Reference the overall score and the weakest dimensions.>",
  "keyword_insights": {{
    "analysis": "<paragraph about keyword coverage quality — are keywords naturally integrated or missing entirely?>",
    "critical_missing": ["<most important missing keywords that would boost the score>"],
    "keyword_placement_tips": ["<specific advice on WHERE to place missing keywords in the resume>"]
  }},
  "experience_review": {{
    "analysis": "<how well does the experience align with JD requirements?>",
    "strong_points": ["<specific strong aspects of the experience section>"],
    "gaps": ["<specific experience gaps relative to the JD>"]
  }},
  "impact_review": {{
    "analysis": "<assessment of bullet quality, action verbs, and quantification>",
    "weak_bullets": ["<quote actual weak bullet points from the resume>"],
    "rewrite_suggestions": [
      {{
        "original": "<actual weak bullet from resume>",
        "improved": "<rewritten version with action verb + metrics + impact>"
      }}
    ]
  }},
  "section_recommendations": [
    {{
      "section": "<section name>",
      "status": "<strong|needs_improvement|missing>",
      "feedback": "<specific feedback>",
      "suggestion": "<what to change>"
    }}
  ],
  "formatting_tips": ["<specific ATS formatting improvements based on the format checks>"],
  "competitive_insights": {{
    "differentiators": ["<what makes this resume stand out>"],
    "missing_edge": ["<what could be added to differentiate from other candidates>"]
  }},
  "action_plan": [
    {{
      "priority": <1-based rank>,
      "action": "<specific, actionable instruction>",
      "impact": "<high|medium|low>",
      "expected_score_boost": "<estimated points this fix would add>"
    }}
  ]
}}

RULES:
- action_plan: max 8 items, ordered by impact (highest first)
- rewrite_suggestions: 2-4 concrete rewrites of actual resume bullets
- Quote actual text from the resume — do not invent content
- Be brutally specific — no generic advice like "add more keywords"
- Reference the actual scores when explaining what needs work"""

        generation_config = genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.3,
        )

        response = model.generate_content(prompt, generation_config=generation_config)
        result = json.loads(response.text)
        return result

    except json.JSONDecodeError as e:
        print(f"Enhancement JSON Parse Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI report. Please try again.")
    except Exception as e:
        print("ATS Enhancement Error:", e)
        import traceback
        traceback.print_exc()
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