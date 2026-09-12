"""
Resume Routes
=============
POST /api/parse-resume            — PDF → structured JSON via Gemini
POST /api/generate-tailored-resume — master profile + JD → tailored resume + ATS report

How the tailored resume is written:
  - app.services.resume_writer holds the house style and the output schema.
    First choice is gpt-5-nano with Structured Outputs, so the JSON shape is
    guaranteed by the decoder instead of asked for in the prompt.
  - Gemini is the fallback, driven by the same style guide plus a written-out
    JSON shape. It runs when OpenAI is not configured or is having a bad
    minute, so a generation attempt does not fail outright.

Production fixes applied:
  - All synchronous LLM calls (Gemini / Sarvam) run in run_in_executor so
    the event loop is never blocked (each call can take 3–15 seconds).
  - _TAILORING_SEMAPHORE(3) caps concurrent tailoring requests so at most 3
    × 4 Gemini calls run simultaneously — prevents CPU saturation and
    Gemini rate-limit errors under concurrent load.
  - parse-resume also runs its Gemini call in a thread.
"""

import asyncio
import json
import logging
import os
from functools import partial

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.config import model
from app.limiter import limiter
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
from app.services.openai_client import OpenAiError
from app.services.resume_text import resume_data_to_text
from app.services import resume_writer
from app.utils.json_utils import extract_json_from_response
from app.utils.normalize import enforce_content_limits, normalize_data
from app.utils.pdf import extract_text_from_pdf

router = APIRouter()
logger = logging.getLogger("resume")

MAX_FILE_SIZE = 5 * 1024 * 1024

# Prevents the most expensive endpoint from spawning unlimited concurrent
# Gemini calls.  3 concurrent tailoring flows = up to 12 Gemini calls in
# flight — a safe ceiling for a 2-worker deployment.
_TAILORING_SEMAPHORE = asyncio.Semaphore(3)


# ── Pure helpers (no async needed) ────────────────────────────────────

def _to_skill_list(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [item.strip() for item in str(value).split(",") if item.strip()]


def merge_skills(master_profile: dict, resume_data: dict) -> dict:
    master_skills    = master_profile.get("skills") or {}
    generated_skills = resume_data.get("skills") or {}

    if isinstance(master_skills, dict):
        master_technical = _to_skill_list(master_skills.get("technical"))
        master_soft      = _to_skill_list(master_skills.get("soft"))
    else:
        master_technical = _to_skill_list(master_skills)
        master_soft      = []

    if isinstance(generated_skills, dict):
        generated_technical = _to_skill_list(generated_skills.get("technical"))
        generated_soft      = _to_skill_list(generated_skills.get("soft"))
    else:
        generated_technical = _to_skill_list(generated_skills)
        generated_soft      = []

    def dedupe(items: list[str]) -> list[str]:
        seen, result = set(), []
        for item in items:
            key = item.lower()
            if key not in seen:
                seen.add(key)
                result.append(item)
        return result

    resume_data["skills"] = {
        "technical": ", ".join(dedupe(master_technical + generated_technical)),
        "soft":      ", ".join(dedupe(master_soft + generated_soft)),
    }
    return resume_data


# The style guide, the prompt and the schema all live in resume_writer so the
# two model paths cannot drift apart.
build_tailoring_prompt = resume_writer.build_gemini_prompt

# The cover letter and the draft email still build their own prompts here;
# they trim the job description to the same budget the resume does.
_trim = resume_writer.trim
_JD_MAX_CHARS = resume_writer.JD_MAX_CHARS


# ── Sync LLM + ATS workers (run via run_in_executor) ──────────────────

def _generate_resume_content_sync(prompt: str) -> dict:
    """Calls Gemini/Sarvam synchronously — must be run in a thread."""
    resume_gen_model = os.getenv("RESUME_GENERATION_MODEL", "GEMINI").upper()
    sarvam_api_key   = os.getenv("SARVAM_API_KEY")

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
        response      = model.generate_content(prompt)
        response_text = response.text

    parsed_json = extract_json_from_response(response_text)
    if not parsed_json:
        raise ValueError("Failed to parse AI response — empty or malformed JSON")

    normalized = normalize_data(parsed_json)

    for exp in normalized.get("experience", []):
        if isinstance(exp.get("description"), str):
            exp["description"] = [exp["description"]]
    for proj in normalized.get("projects", []):
        if isinstance(proj.get("description"), str):
            proj["description"] = [proj["description"]]

    return enforce_content_limits(normalized)


def _build_ats_report_sync(job_description: str, resume_data: dict) -> dict:
    """Runs all ATS helpers synchronously — must be run in a thread."""
    resume_text = resume_data_to_text(resume_data)

    semantic_result    = calculate_semantic_score(job_description, resume_text)
    keyword_result     = calculate_keyword_score(job_description, resume_text)
    section_result     = calculate_section_score(resume_text)
    impact_result      = calculate_impact_score(resume_text)
    readability_result = calculate_readability_score(resume_text)
    format_result      = calculate_format_score(resume_text)
    experience_info    = detect_experience_level(resume_text)
    content_analysis   = calculate_content_analysis(resume_text)

    overall_ats_score = (
        0.25 * keyword_result["score"]     +
        0.20 * semantic_result             +
        0.15 * section_result["score"]     +
        0.15 * impact_result["score"]      +
        0.10 * readability_result["score"] +
        0.15 * format_result["score"]
    )

    improvements = []
    if keyword_result["missing_keywords"]:
        improvements.append({
            "category": "Keywords",
            "severity": "high" if keyword_result["score"] < 40 else "medium",
            "message":  f"Missing key terms: {', '.join(keyword_result['missing_keywords'][:5])}.",
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
            "message":  f"Missing resume sections: {', '.join(missing_sections)}.",
        })

    if impact_result["details"]["action_verb_count"] < 5:
        improvements.append({
            "category": "Impact",
            "severity": "medium",
            "message":  f"Only {impact_result['details']['action_verb_count']} unique action verbs found.",
        })
    if impact_result["details"]["total_metrics"] < 3:
        improvements.append({
            "category": "Impact",
            "severity": "high",
            "message":  f"Only {impact_result['details']['total_metrics']} quantified metrics found.",
        })

    return {
        "overall_ats_score":    round(min(overall_ats_score, 100), 1),
        "semantic_match_score": round(semantic_result, 1),
        "keyword_score":        round(keyword_result["score"], 1),
        "section_score":        round(section_result["score"], 1),
        "impact_score":         round(impact_result["score"], 1),
        "readability_score":    round(readability_result["score"], 1),
        "format_score":         round(format_result["score"], 1),
        "found_keywords":       keyword_result["found_keywords"],
        "missing_keywords":     keyword_result["missing_keywords"],
        "section_feedback":     section_result["feedback"],
        "impact_details":       impact_result["details"],
        "readability_details":  readability_result["details"],
        "format_checks":        format_result["checks"],
        "experience_info":      experience_info,
        "improvements":         improvements,
        "content_analysis":     content_analysis,
    }


def apply_profile_fallbacks(resume_data: dict, master_profile: dict) -> dict:
    # Grouped skills are a deliberate selection for this posting, so the flat
    # master list is not folded back in — that would undo the tailoring and
    # spill the groups' own ordering. Ungrouped output still gets the merge,
    # which is what stops a thin generation from losing the user's skills.
    if resume_data.get("skillGroups"):
        groups = resume_writer.normalize_skill_groups(resume_data["skillGroups"])
        resume_data["skillGroups"] = groups
        flat = [skill for group in groups for skill in group["skills"]]
        skills = resume_data.get("skills")
        soft = skills.get("soft", "") if isinstance(skills, dict) else ""
        resume_data["skills"] = {"technical": ", ".join(flat), "soft": soft}
    else:
        resume_data = merge_skills(master_profile, resume_data)

    for key in ("experience", "projects", "education", "certifications", "languages"):
        if not resume_data.get(key) and master_profile.get(key):
            resume_data[key] = master_profile[key]

    # Awards, the references note and the right-to-work line are facts, not
    # writing. They are copied across as the profile holds them so that no
    # model has the chance to reword an award into one nobody gave.
    for key in ("achievements", "references", "workAuthorization"):
        if master_profile.get(key):
            resume_data[key] = master_profile[key]

    return enforce_content_limits(resume_data)


# ── Routes ─────────────────────────────────────────────────────────────

@router.post("/api/parse-resume")
@limiter.limit("10/minute")
async def parse_resume(request: Request, file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {"data": ResumeSchema().model_dump()}

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB.")

    raw_text = extract_text_from_pdf(content)
    if not raw_text:
        return {"data": ResumeSchema().model_dump()}

    # Resumes beyond 10k chars are usually noise; truncate to save tokens
    raw_text = raw_text[:10_000]

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
        loop     = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, partial(model.generate_content, prompt)
        )
        parsed_json = extract_json_from_response(response.text)
        if not parsed_json:
            return {"data": ResumeSchema().model_dump()}

        normalized = normalize_data(parsed_json)
        validated  = ResumeSchema(**normalized)
        return {"data": validated.model_dump()}
    except Exception as exc:
        logger.error("Resume parsing error: %s", exc)
        return {"data": ResumeSchema().model_dump()}


@router.post("/api/generate-tailored-resume")
@limiter.limit("50/minute")
async def generate_tailored_resume(request: Request, payload: TailorRequest):
    job_description    = payload.jobDescription
    master_profile_str = json.dumps(payload.masterProfile, indent=2)

    if len(job_description) > 50_000:
        raise HTTPException(status_code=400, detail="Job description too long. Maximum 50,000 characters.")
    if len(master_profile_str) > 100_000:
        raise HTTPException(status_code=400, detail="Master profile data too large.")

    async with _TAILORING_SEMAPHORE:
        try:
            loop = asyncio.get_event_loop()

            async def write(ats_context) -> dict:
                """
                One draft. Structured Outputs first, Gemini if that path is
                unavailable — a resume beats an error message, and the user is
                only charged for a request that produced one.
                """
                if resume_writer.available():
                    try:
                        raw = await resume_writer.write_resume(
                            payload.masterProfile, job_description, ats_context
                        )
                        return enforce_content_limits(normalize_data(raw))
                    except OpenAiError as exc:
                        logger.warning("Structured writer unavailable (%s); using Gemini", exc)
                    except Exception as exc:  # schema validation, unexpected shape
                        logger.warning("Structured writer failed (%s); using Gemini", exc)

                prompt = resume_writer.build_gemini_prompt(
                    payload.masterProfile, job_description, ats_context
                )
                return await loop.run_in_executor(
                    None, partial(_generate_resume_content_sync, prompt)
                )

            # ── First generation ──
            raw_resume = await write(payload.atsReport)
            normalized = apply_profile_fallbacks(raw_resume, payload.masterProfile)

            # ── First ATS report (in thread) ──
            ats_report = await loop.run_in_executor(
                None, partial(_build_ats_report_sync, job_description, normalized)
            )

            # ── Optional retry — only for genuinely poor results to save API quota ──
            # Previous thresholds (<78 overall OR <85 keyword OR >3 missing) fired on
            # ~80% of resumes, doubling API cost. Now only retry when the result is
            # clearly unacceptable.
            should_retry = (
                not payload.atsReport
                and ats_report["overall_ats_score"] < 55
                and ats_report["keyword_score"] < 60
            )

            if should_retry:
                logger.info(
                    "Retrying: overall=%.1f keyword=%.1f missing=%d",
                    ats_report["overall_ats_score"],
                    ats_report["keyword_score"],
                    len(ats_report["missing_keywords"]),
                )
                raw_retry     = await write(ats_report)
                retry_resume  = apply_profile_fallbacks(raw_retry, payload.masterProfile)
                retry_report  = await loop.run_in_executor(
                    None, partial(_build_ats_report_sync, job_description, retry_resume)
                )

                if retry_report["overall_ats_score"] >= ats_report["overall_ats_score"]:
                    normalized = retry_resume
                    ats_report = retry_report

            return {"data": normalized, "atsReport": ats_report}

        except HTTPException:
            raise
        except ValueError as exc:
            logger.error("Tailoring parse error: %s", exc)
            raise HTTPException(status_code=500, detail="Resume generation failed. Please try again.")
        except Exception as exc:
            logger.error("Tailoring error: %s", exc)
            msg = str(exc).lower()
            if "429" in str(exc) or "quota" in msg or "resource_exhausted" in msg:
                raise HTTPException(status_code=429, detail="Our AI is a little busy right now. Please wait a moment and try again.")
            raise HTTPException(status_code=500, detail="Resume generation failed. Please try again.")


@router.post("/api/generate-cover-letter")
@limiter.limit("50/minute")
async def generate_cover_letter(request: Request, payload: TailorRequest):
    job_description = payload.jobDescription
    master_profile_str = json.dumps(payload.masterProfile, indent=2)

    prompt = f"""Write a professional, compelling cover letter for the following job application.

APPLICANT PROFILE:
{master_profile_str}

JOB DESCRIPTION:
{_trim(job_description, _JD_MAX_CHARS)}

INSTRUCTIONS:
- Write a professional cover letter (3-4 paragraphs)
- Highlight relevant skills and experience that match the job description
- Show enthusiasm and cultural fit
- Keep it concise (250-350 words)
- Do NOT include addresses or date headers
- Start with "Dear Hiring Manager," or similar
- End with a professional closing
- Output ONLY the cover letter text, no extra commentary
"""

    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, partial(model.generate_content, prompt))
        return {"response": response.text.strip()}
    except Exception as exc:
        logger.error("Cover Letter error: %s", exc)
        raise HTTPException(status_code=500, detail="Cover letter generation failed")

@router.post("/api/generate-draft-email")
@limiter.limit("50/minute")
async def generate_draft_email(request: Request, payload: TailorRequest):
    job_description = payload.jobDescription
    master_profile_str = json.dumps(payload.masterProfile, indent=2)

    prompt = f"""Write a concise, professional application email for the following job.

APPLICANT PROFILE:
{master_profile_str}

JOB DESCRIPTION:
{_trim(job_description, _JD_MAX_CHARS)}

INSTRUCTIONS:
- Write a short, professional email (150-200 words) to apply for this job
- Subject line format: "Application for [Job Title] — [Your Name]"
- Start with a brief, engaging opening
- Mention 2-3 key qualifications that match
- Express enthusiasm for the role
- Close professionally with contact info
- Output ONLY the email text, no extra commentary
"""

    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, partial(model.generate_content, prompt))
        return {"response": response.text.strip()}
    except Exception as exc:
        logger.error("Draft Email error: %s", exc)
        raise HTTPException(status_code=500, detail="Draft email generation failed")
