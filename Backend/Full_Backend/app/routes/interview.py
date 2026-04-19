"""
Interview Prep Routes
=====================
POST /api/interview/questions  — generate contextual questions for a job
POST /api/interview/analyze    — analyse user answers and return detailed feedback
"""

import asyncio
import json
import logging
from functools import partial
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.config import model
from app.limiter import limiter
from app.utils.llm_cache import llm_cache

router = APIRouter()
logger = logging.getLogger("interview")

_SEMAPHORE = asyncio.Semaphore(5)


# ── Pydantic models ────────────────────────────────────────────────────

class QuestionsRequest(BaseModel):
    job_title: str
    company: Optional[str] = ""
    job_description: str
    num_questions: Optional[int] = 7
    user_profile: Optional[dict] = None


class AnswerItem(BaseModel):
    question: str
    answer: str


class AnalyzeRequest(BaseModel):
    job_title: str
    company: Optional[str] = ""
    job_description: Optional[str] = ""
    answers: List[AnswerItem]


# ── Helpers ────────────────────────────────────────────────────────────

def _truncate(text: str, max_chars: int = 3000) -> str:
    return text[:max_chars] + "…" if len(text) > max_chars else text


def _parse_json_response(text: str) -> dict:
    """Extract JSON from LLM response that may have markdown fences."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last fence lines
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    return json.loads(text)


# ── Sync workers (run in thread pool) ─────────────────────────────────

def _build_profile_summary(profile: dict) -> str:
    """Extract a concise summary from the master profile for prompt injection."""
    if not profile:
        return ""
    parts = []
    if profile.get("name"):
        parts.append(f"Candidate: {profile['name']}")
    if profile.get("title") or profile.get("current_title"):
        parts.append(f"Current title: {profile.get('title') or profile.get('current_title')}")
    # Skills
    skills = profile.get("skills", [])
    if isinstance(skills, list) and skills:
        skill_names = [s.get("name", s) if isinstance(s, dict) else s for s in skills[:20]]
        parts.append(f"Skills: {', '.join(str(s) for s in skill_names)}")
    elif isinstance(skills, dict):
        tech = skills.get("technical", "")
        if tech:
            parts.append(f"Technical skills: {str(tech)[:200]}")
    # Experience
    exp_list = profile.get("experience", [])
    if exp_list:
        latest = exp_list[0]
        parts.append(f"Most recent role: {latest.get('title', '')} at {latest.get('company', '')} ({latest.get('duration', '')})")
    # Education
    edu_list = profile.get("education", [])
    if edu_list:
        ed = edu_list[0]
        parts.append(f"Education: {ed.get('degree', '')} in {ed.get('field', '')} from {ed.get('institution', '')}")
    years = profile.get("years_of_experience") or profile.get("total_experience")
    if years:
        parts.append(f"Years of experience: {years}")
    return "\n".join(parts)


def _generate_questions_sync(job_title: str, company: str, jd_text: str, num_questions: int, user_profile: dict = None) -> list:
    profile_section = ""
    if user_profile:
        summary = _build_profile_summary(user_profile)
        if summary:
            profile_section = f"""
Candidate Profile (use this to tailor questions to their specific background):
{summary}

Based on the candidate's profile vs the job requirements, identify:
- Skills they already have → ask deep technical questions to validate depth
- Skills/gaps they need to address → ask how they'd bridge those gaps
- Relevant past experiences → probe with behavioural questions about those specific situations
"""

    prompt = f"""You are a senior technical recruiter and interview coach with 15+ years of experience.

Generate exactly {num_questions} interview questions for this role. Make them highly specific, not generic.

Job Title: {job_title}
Company: {company or "a tech company"}
Job Description:
{_truncate(jd_text)}
{profile_section}
Question structure required:
1. Q1: Strong opener (tell me about yourself, tailored to this role)
2. Q2-Q{max(2, num_questions-3)}: Technical/skill-based questions referencing specific technologies/requirements from the JD
3. Q{max(3, num_questions-2)}-Q{num_questions-1}: Behavioural questions using STAR method, referencing candidate's actual experience
4. Q{num_questions}: Thoughtful closing (what questions do you have for us?)

Each question must:
- Be conversational, not robotic
- Reference specific technologies, responsibilities or requirements from the JD
- Include a sharp, actionable coaching tip

Return ONLY a valid JSON array (no markdown fences):
[
  {{
    "question": "...",
    "tip": "...",
    "type": "opener|technical|behavioural|situational|closing"
  }}
]"""

    response = model.generate_content(prompt)
    questions = _parse_json_response(response.text)
    if not isinstance(questions, list):
        raise ValueError("LLM did not return a list")
    return questions[:num_questions]


def _analyze_answers_sync(job_title: str, company: str, jd_text: str, qa_pairs: list) -> dict:
    qa_formatted = "\n\n".join(
        f"Q{i+1}: {item['question']}\nA{i+1}: {item['answer'] or '(no answer provided)'}"
        for i, item in enumerate(qa_pairs)
    )

    prompt = f"""You are an expert interview coach with 15+ years of experience.

Analyse this mock interview for:
Job Title: {job_title}
Company: {company or "N/A"}
Job Description: {_truncate(jd_text, 1500)}

Interview Transcript:
{qa_formatted}

Provide a thorough, honest, and constructive evaluation. Be specific — reference actual things the candidate said.

Return ONLY valid JSON (no markdown):
{{
  "overall_score": <integer 0-100>,
  "overall_grade": "<A+|A|B+|B|C+|C|D|F>",
  "headline": "<one sentence overall verdict, encouraging but honest>",
  "strengths": ["<specific strength observed>", ...],  // 2-4 items
  "improvements": ["<specific area to improve>", ...],  // 2-4 items
  "per_question": [
    {{
      "question": "...",
      "score": <integer 0-10>,
      "what_went_well": "...",
      "what_to_improve": "...",
      "better_answer_hint": "..."
    }},
    ...
  ],
  "power_phrases": ["<phrase or sentence they should use more>", ...],  // 3 items
  "next_steps": ["<concrete action to take before next interview>", ...],  // 3 items
  "hiring_likelihood": "<Low|Medium|High|Very High>"
}}"""

    response = model.generate_content(prompt)
    return _parse_json_response(response.text)


# ── Error sanitiser ────────────────────────────────────────────────────

def _friendly_error(exc: Exception) -> tuple[int, str]:
    """Return (http_status, user-facing message) for any LLM exception."""
    msg = str(exc).lower()
    if "429" in str(exc) or "quota" in msg or "rate" in msg or "resource_exhausted" in msg:
        return 429, "Our AI is a little busy right now. Please wait a moment and try again."
    if "400" in str(exc) or "invalid" in msg:
        return 400, "The job description could not be processed. Try shortening it and retry."
    if "503" in str(exc) or "unavailable" in msg or "overloaded" in msg:
        return 503, "The AI service is temporarily unavailable. Please try again in a few seconds."
    if "timeout" in msg or "deadline" in msg:
        return 504, "The request took too long. Please try again."
    return 500, "Something went wrong generating your interview. Please try again."


# ── Endpoints ──────────────────────────────────────────────────────────

@router.post("/api/interview/questions")
@limiter.limit("15/minute")
async def generate_questions(request: Request, data: QuestionsRequest):
    num_q = data.num_questions or 7

    # Cache key: title + company + first 600 chars of JD (profile excluded —
    # profile-personalised questions must always be fresh per user)
    cache_key_parts = (data.job_title, data.company or "", data.job_description[:600], str(num_q))
    if not data.user_profile:
        cached = llm_cache.get("interview_questions", *cache_key_parts)
        if cached is not None:
            return {"success": True, "questions": cached, "cached": True}

    async with _SEMAPHORE:
        loop = asyncio.get_event_loop()
        try:
            questions = await loop.run_in_executor(
                None,
                partial(
                    _generate_questions_sync,
                    data.job_title,
                    data.company or "",
                    data.job_description,
                    num_q,
                    data.user_profile,
                ),
            )
            if not data.user_profile:
                llm_cache.set("interview_questions", questions, *cache_key_parts)
            return {"success": True, "questions": questions}
        except Exception as exc:
            logger.error("Interview question generation failed: %s", exc)
            status, message = _friendly_error(exc)
            raise HTTPException(status_code=status, detail=message)


@router.post("/api/interview/analyze")
@limiter.limit("5/minute")
async def analyze_interview(request: Request, data: AnalyzeRequest):
    if not data.answers:
        raise HTTPException(status_code=400, detail="No answers provided")

    async with _SEMAPHORE:
        loop = asyncio.get_event_loop()
        try:
            qa_pairs = [{"question": a.question, "answer": a.answer} for a in data.answers]
            result = await loop.run_in_executor(
                None,
                partial(
                    _analyze_answers_sync,
                    data.job_title,
                    data.company or "",
                    data.job_description or "",
                    qa_pairs,
                ),
            )
            return {"success": True, **result}
        except Exception as exc:
            logger.error("Interview analysis failed: %s", exc)
            status, message = _friendly_error(exc)
            raise HTTPException(status_code=status, detail=message)
