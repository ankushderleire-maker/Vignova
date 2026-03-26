import os
import json
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.config import model
from app.models.schemas import ResumeSchema, TailorRequest
from app.utils.pdf import extract_text_from_pdf
from app.utils.json_utils import extract_json_from_response
from app.utils.normalize import normalize_data, enforce_content_limits

router = APIRouter()
logger = logging.getLogger("resume")

# Max upload size: 5 MB
MAX_FILE_SIZE = 5 * 1024 * 1024




@router.post("/api/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {"data": ResumeSchema().model_dump()}

    content = await file.read()

    # Enforce file size limit
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB.")

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
        logger.info("Sending resume text to Gemini for parsing")
        response = model.generate_content(prompt)
        response_text = response.text

        parsed_json = extract_json_from_response(response_text)
        
        if not parsed_json:
            return {"data": ResumeSchema().model_dump()}

        normalized = normalize_data(parsed_json)
        validated = ResumeSchema(**normalized)
        
        return {"data": validated.model_dump()}

    except Exception as e:
        logger.error(f"Resume parsing error: {e}")
        return {"data": ResumeSchema().model_dump()}


@router.post("/api/generate-tailored-resume")
async def generate_tailored_resume(payload: TailorRequest):
    master_profile_str = json.dumps(payload.masterProfile, indent=2)
    job_description = payload.jobDescription

    # Input length validation
    if len(job_description) > 50000:
        raise HTTPException(status_code=400, detail="Job description too long. Maximum 50,000 characters.")
    if len(master_profile_str) > 100000:
        raise HTTPException(status_code=400, detail="Master profile data too large.")

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
            logger.info("Using Sarvam AI for Resume Generation")
            from sarvamai import SarvamAI
            client = SarvamAI(api_subscription_key=sarvam_api_key)
            
            response = client.chat.completions(
                messages=[{"content": prompt, "role": "user"}],
                temperature=0.3,
                max_tokens=2500,
                n=1
            )
            if hasattr(response, 'choices'):
                response_text = response.choices[0].message.content.strip()
            else:
                response_text = response['choices'][0]['message']['content'].strip()
                
        else:
            logger.info("Using Gemini for Resume Generation")
            response = model.generate_content(prompt)
            response_text = response.text
            
        parsed_json = extract_json_from_response(response_text)
        if not parsed_json:
            raise HTTPException(status_code=500, detail="Failed to parse AI response. Please try again.")

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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tailoring error: {e}")
        raise HTTPException(status_code=500, detail="Resume generation failed. Please try again.")
