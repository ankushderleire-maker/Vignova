import json
import logging
import os

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import model
from app.models.schemas import ResumeSchema, TailorRequest
from app.services.ats_helpers import (
    calculate_format_score,
    calculate_impact_score,
    calculate_keyword_score,
    calculate_readability_score,
    calculate_section_score,
    calculate_semantic_score,
    detect_experience_level,
)
from app.services.content_analysis import calculate_content_analysis
from app.services.resume_text import resume_data_to_text
from app.utils.json_utils import extract_json_from_response
from app.utils.normalize import enforce_content_limits, normalize_data
from app.utils.pdf import extract_text_from_pdf

router = APIRouter()
logger = logging.getLogger("resume")

MAX_FILE_SIZE = 5 * 1024 * 1024


def _to_skill_list(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [item.strip() for item in str(value).split(",") if item.strip()]


def merge_skills(master_profile: dict, resume_data: dict) -> dict:
    master_skills = master_profile.get("skills") or {}
    generated_skills = resume_data.get("skills") or {}

    master_technical = []
    master_soft = []
    if isinstance(master_skills, dict):
        master_technical = _to_skill_list(master_skills.get("technical"))
        master_soft = _to_skill_list(master_skills.get("soft"))
    else:
        master_technical = _to_skill_list(master_skills)

    generated_technical = []
    generated_soft = []
    if isinstance(generated_skills, dict):
        generated_technical = _to_skill_list(generated_skills.get("technical"))
        generated_soft = _to_skill_list(generated_skills.get("soft"))
    else:
        generated_technical = _to_skill_list(generated_skills)

    def dedupe(items: list[str]) -> list[str]:
        seen = set()
        result = []
        for item in items:
            key = item.lower()
            if key in seen:
                continue
            seen.add(key)
            result.append(item)
        return result

    resume_data["skills"] = {
        "technical": ", ".join(dedupe(master_technical + generated_technical)),
        "soft": ", ".join(dedupe(master_soft + generated_soft)),
    }
    return resume_data


def build_tailoring_prompt(master_profile: dict, job_description: str, ats_report=None) -> str:
    master_profile_str = json.dumps(master_profile, indent=2)

    ats_context = ""
    if ats_report:
        ats_context = (
            "\n\n=== REFINING PREVIOUS ATS SCORE ===\n"
            "The candidate previously scored poorly in ATS due to these issues:\n"
            f"{json.dumps(ats_report, indent=2)}\n"
            "PAY SPECIAL ATTENTION to the Improvements, Missing Keywords, and weaker scoring "
            "dimensions from this report. Fix these exact issues in the new resume.\n"
        )

    return f"""You are an Expert Resume Writer and ATS Optimization Specialist.
Your goal is to tailor the candidate's MASTER PROFILE to the provided JOB DESCRIPTION, resulting in a professional, natural-sounding resume that passes ATS systems without looking artificially keyword-stuffed.

=== TASK ===
Output STRICT JSON only - no markdown, no explanation, no wrapping.
DO NOT use markdown formatting like **bold** in any of your text output. Keep it plain text.
CRITICAL JSON RULE: NEVER place double-quote characters inside JSON string values. If you need to quote a term, use single quotes or just write it without quotes.

=== SECTION GUIDELINES ===
1. CONTACT INFO
   - Preserve all existing contact information from the master profile.
2. SUMMARY
   - Write a professional summary of about 40-60 words.
   - Clearly state the candidate's years of experience, core expertise, and value proposition.
   - Weave in 4-6 highly relevant keywords from the JD naturally.
   - Mention the company name from the JD and the exact job title.
3. SKILLS
   - technical: comprehensive comma-separated list of technologies, tools, and languages mentioned in the JD that the candidate has.
   - soft: comma-separated list of relevant soft skills.
4. EXPERIENCE
   - Preserve actual companies, roles, and dates.
   - Preserve the user's factual background. Rewrite phrasing for relevance, but do not replace the underlying experience with new responsibilities they never had.
   - Write 4-5 bullet points per role, concise and specific.
   - Start bullets with strong action verbs.
   - Integrate keywords from the JD naturally into bullet points.
   - Include quantified achievements only where they genuinely fit.
   - NEVER use passive voice like Responsible for or Involved in.
5. PROJECTS
   - Rewrite project descriptions to emphasize alignment with the JD.
   - Mention the tech stack explicitly using exact JD terminology.
   - 2-3 bullets per project.
6. EDUCATION, CERTIFICATIONS, LANGUAGES
   - Copy exactly from the master profile. Never fabricate.

=== KEYWORD INJECTION RULE ===
1. Extract the top 20 most important technical keywords, tools, and methodologies from the JD.
2. Confirm which ones are already in the Master Profile.
3. For any keyword not in the Master Profile, if it is reasonable for the candidate's background, insert it verbatim into:
   - skills.technical
   - the techStack of the most relevant project when appropriate
   - one bullet in experience or projects
4. Every keyword extracted in step 1 must appear verbatim at least once in the final resume text.

=== CRITICAL RULES ===
- NEVER fabricate companies, roles, degrees, or certifications.
- Treat the master profile as the source of truth. Keep all factual profile data intact and only tailor wording, emphasis, keyword placement, and ordering.
- Preserve the user's original skill inventory, then add only JD-aligned keywords that are genuinely supported by their background.
- Prefer adapting existing experience and projects to sound closer to the JD instead of inventing new tools, ownership, or achievements.
- DO NOT use markdown inside JSON values.
- Ensure all top JD keywords appear verbatim in the output, prioritising skills.technical.
- Keep ATS-friendly section names clearly represented: Summary, Skills, Experience, Education, Projects when content exists.{ats_context}

JOB DESCRIPTION:
{job_description}

MASTER PROFILE:
{master_profile_str}

JSON STRUCTURE:
{{
  "fullName": "exact from profile",
  "jobTitle": "exact JD job title",
  "email": "exact from profile",
  "phone": "exact from profile",
  "linkedin": "exact from profile",
  "location": "from profile",
  "website": "from profile",
  "github": "from profile",
  "summary": "Professional summary paragraph",
  "skills": {{ "technical": "Python, SQL, TensorFlow", "soft": "Agile, Communication" }},
  "experience": [{{ "company": "...", "role": "...", "startDate": "...", "endDate": "...", "location": "...", "description": ["Led...", "Built..."] }}],
  "projects": [{{ "name": "...", "techStack": "...", "link": "...", "description": ["Developed...", "Implemented..."] }}],
  "education": [{{ "school": "...", "degree": "...", "field": "...", "startDate": "...", "endDate": "...", "grade": "..." }}],
  "certifications": [{{ "name": "...", "issuer": "...", "date": "...", "url": "..." }}],
  "languages": [{{ "name": "...", "proficiency": "..." }}]
}}"""


def generate_resume_content(prompt: str) -> dict:
    resume_gen_model = os.getenv("RESUME_GENERATION_MODEL", "GEMINI").upper()
    sarvam_api_key = os.getenv("SARVAM_API_KEY")

    if resume_gen_model == "SARVAM" and sarvam_api_key:
        logger.info("Using Sarvam AI for resume generation")
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key=sarvam_api_key)
        response = client.chat.completions(
            messages=[{"content": prompt, "role": "user"}],
            temperature=0.3,
            max_tokens=4000,
            n=1,
        )
        if hasattr(response, "choices"):
            response_text = response.choices[0].message.content.strip()
        else:
            response_text = response["choices"][0]["message"]["content"].strip()
    else:
        logger.info("Using Gemini for resume generation")
        response = model.generate_content(prompt)
        response_text = response.text

    parsed_json = extract_json_from_response(response_text)
    if not parsed_json:
        raise HTTPException(status_code=500, detail="Failed to parse AI response. Please try again.")

    normalized = normalize_data(parsed_json)

    for exp in normalized.get("experience", []):
        if isinstance(exp.get("description"), str):
            exp["description"] = [exp["description"]]

    for proj in normalized.get("projects", []):
        if isinstance(proj.get("description"), str):
            proj["description"] = [proj["description"]]

    return enforce_content_limits(normalized)


def apply_profile_fallbacks(resume_data: dict, master_profile: dict) -> dict:
    resume_data = merge_skills(master_profile, resume_data)

    if not resume_data.get("experience") and master_profile.get("experience"):
        resume_data["experience"] = master_profile["experience"]
    if not resume_data.get("projects") and master_profile.get("projects"):
        resume_data["projects"] = master_profile["projects"]
    if not resume_data.get("education") and master_profile.get("education"):
        resume_data["education"] = master_profile["education"]
    if not resume_data.get("certifications") and master_profile.get("certifications"):
        resume_data["certifications"] = master_profile["certifications"]
    if not resume_data.get("languages") and master_profile.get("languages"):
        resume_data["languages"] = master_profile["languages"]
    return enforce_content_limits(resume_data)


def build_ats_report(job_description: str, resume_data: dict) -> dict:
    resume_text = resume_data_to_text(resume_data)

    semantic_result = calculate_semantic_score(job_description, resume_text)
    keyword_result = calculate_keyword_score(job_description, resume_text)
    section_result = calculate_section_score(resume_text)
    impact_result = calculate_impact_score(resume_text)
    readability_result = calculate_readability_score(resume_text)
    format_result = calculate_format_score(resume_text)
    experience_info = detect_experience_level(resume_text)
    content_analysis = calculate_content_analysis(resume_text)

    overall_ats_score = (
        0.25 * keyword_result["score"]
        + 0.20 * semantic_result
        + 0.15 * section_result["score"]
        + 0.15 * impact_result["score"]
        + 0.10 * readability_result["score"]
        + 0.15 * format_result["score"]
    )

    improvements = []
    if keyword_result["missing_keywords"]:
        improvements.append({
            "category": "Keywords",
            "severity": "high" if keyword_result["score"] < 40 else "medium",
            "message": f"Missing key terms: {', '.join(keyword_result['missing_keywords'][:5])}.",
        })

    missing_sections = [
        key.replace("has_", "").replace("_", " ").title()
        for key, value in section_result["feedback"].items()
        if not value
    ]
    if missing_sections:
        improvements.append({
            "category": "Structure",
            "severity": "high" if len(missing_sections) >= 2 else "medium",
            "message": f"Missing resume sections: {', '.join(missing_sections)}.",
        })

    if impact_result["details"]["action_verb_count"] < 5:
        improvements.append({
            "category": "Impact",
            "severity": "medium",
            "message": f"Only {impact_result['details']['action_verb_count']} unique action verbs found.",
        })
    if impact_result["details"]["total_metrics"] < 3:
        improvements.append({
            "category": "Impact",
            "severity": "high",
            "message": f"Only {impact_result['details']['total_metrics']} quantified metrics found.",
        })

    return {
        "overall_ats_score": round(min(overall_ats_score, 100), 1),
        "semantic_match_score": round(semantic_result, 1),
        "keyword_score": round(keyword_result["score"], 1),
        "section_score": round(section_result["score"], 1),
        "impact_score": round(impact_result["score"], 1),
        "readability_score": round(readability_result["score"], 1),
        "format_score": round(format_result["score"], 1),
        "found_keywords": keyword_result["found_keywords"],
        "missing_keywords": keyword_result["missing_keywords"],
        "section_feedback": section_result["feedback"],
        "impact_details": impact_result["details"],
        "readability_details": readability_result["details"],
        "format_checks": format_result["checks"],
        "experience_info": experience_info,
        "improvements": improvements,
        "content_analysis": content_analysis,
    }


@router.post("/api/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {"data": ResumeSchema().model_dump()}

    content = await file.read()
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
        parsed_json = extract_json_from_response(response.text)
        if not parsed_json:
            return {"data": ResumeSchema().model_dump()}

        normalized = normalize_data(parsed_json)
        validated = ResumeSchema(**normalized)
        return {"data": validated.model_dump()}
    except Exception as exc:
        logger.error("Resume parsing error: %s", exc)
        return {"data": ResumeSchema().model_dump()}


@router.post("/api/generate-tailored-resume")
async def generate_tailored_resume(payload: TailorRequest):
    job_description = payload.jobDescription
    master_profile_str = json.dumps(payload.masterProfile, indent=2)

    if len(job_description) > 50000:
        raise HTTPException(status_code=400, detail="Job description too long. Maximum 50,000 characters.")
    if len(master_profile_str) > 100000:
        raise HTTPException(status_code=400, detail="Master profile data too large.")

    try:
        prompt = build_tailoring_prompt(payload.masterProfile, job_description, payload.atsReport)
        normalized = apply_profile_fallbacks(generate_resume_content(prompt), payload.masterProfile)
        ats_report = build_ats_report(job_description, normalized)

        should_retry = (
            not payload.atsReport
            and (
                ats_report["overall_ats_score"] < 78
                or ats_report["keyword_score"] < 85
                or len(ats_report["missing_keywords"]) > 3
            )
        )

        if should_retry:
            logger.info(
                "Initial tailored resume under ATS target, retrying with ATS feedback: overall=%s keyword=%s missing=%s",
                ats_report["overall_ats_score"],
                ats_report["keyword_score"],
                len(ats_report["missing_keywords"]),
            )
            retry_prompt = build_tailoring_prompt(payload.masterProfile, job_description, ats_report)
            retry_resume = apply_profile_fallbacks(generate_resume_content(retry_prompt), payload.masterProfile)
            retry_report = build_ats_report(job_description, retry_resume)

            if retry_report["overall_ats_score"] >= ats_report["overall_ats_score"]:
                normalized = retry_resume
                ats_report = retry_report

        return {"data": normalized, "atsReport": ats_report}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Tailoring error: %s", exc)
        raise HTTPException(status_code=500, detail="Resume generation failed. Please try again.")
