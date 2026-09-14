"""
Naukri Profile Optimizer
========================
POST /api/naukri/analyze   — scores a Naukri profile the extension scraped
POST /api/naukri/optimize  — rewrites the parts of it Naukri lets a user edit

Naukri has no API, so the Chrome extension reads the profile page and the
dashboard stores it. These routes are stateless: the Next.js app owns the rows
and sends the profile and the Master Profile in, so ownership is checked once,
where the session is.
"""

import asyncio
import json
import logging
import re
from functools import partial
from typing import Optional

import google.generativeai as genai
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.config import model as gemini_model
from app.limiter import limiter
from app.routes.linkedin import (
    _calculate_linkedin_impact_score,
    _calculate_linkedin_readability_score,
    _rate_key,
    _require_internal_auth,
)
from app.services import openai_client
from app.services.ats_helpers import calculate_keyword_score, calculate_semantic_score
from app.utils.json_utils import extract_json_from_response
from app.utils.linkedin_skills import coerce_skill_list, collect_master_skills

router = APIRouter()
logger = logging.getLogger("naukri")

_NAUKRI_SEMAPHORE = asyncio.Semaphore(5)

# Naukri's field limits. Every rewrite has to fit them to be pasted back.
LIMITS = {"headline": 250, "profileSummary": 1000, "jobProfile": 4000, "projectDetails": 1000, "keySkills": 50}

_WEIGHTS = {
    "completeness": 0.15, "keyword": 0.25, "semantic": 0.15, "impact": 0.15,
    "readability": 0.10, "headline": 0.10, "skills": 0.10,
}


class NaukriAnalyzeRequest(BaseModel):
    userId: str
    profile: dict
    masterProfile: Optional[dict] = None


class NaukriOptimizeRequest(NaukriAnalyzeRequest):
    pass


def _text(value) -> str:
    return value.strip() if isinstance(value, str) else ""


def _entries(profile: dict, key: str) -> list[dict]:
    items = profile.get(key)
    return [item for item in items if isinstance(item, dict)] if isinstance(items, list) else []


def _profile_text(profile: dict) -> str:
    """Everything a recruiter searching Naukri reads, as one document."""
    parts = [_text(profile.get("headline")), _text(profile.get("profileSummary")), ", ".join(coerce_skill_list(profile.get("keySkills"), 100))]
    for job in _entries(profile, "employment"):
        parts += [_text(job.get("designation")), _text(job.get("company")), _text(job.get("description"))]
    parts += [_text(row.get("skills")) for row in _entries(profile, "itSkills")]
    for project in _entries(profile, "projects"):
        parts += [_text(project.get("title")), _text(project.get("description"))]
    for edu in _entries(profile, "education"):
        parts += [_text(edu.get("degree")), _text(edu.get("specialization")), _text(edu.get("institute"))]
    career = profile.get("careerProfile") if isinstance(profile.get("careerProfile"), dict) else {}
    parts += [_text(career.get(key)) for key in ("Job role", "Preferred job role", "Role category")]
    return "\n".join(part for part in parts if part)


def _descriptions(profile: dict) -> str:
    rows = [_text(job.get("description")) for job in _entries(profile, "employment")]
    rows += [_text(project.get("description")) for project in _entries(profile, "projects")]
    return "\n".join(row for row in rows if row)


def _completeness(profile: dict) -> tuple[float, list[str]]:
    """Naukri's own sections, weighted by how much recruiters lean on each."""
    jobs = _entries(profile, "employment")
    checks = [
        ("Resume headline", 15, bool(_text(profile.get("headline")))),
        ("Key skills", 15, len(coerce_skill_list(profile.get("keySkills"), 100)) >= 5),
        ("Employment", 20, bool(jobs)),
        ("Job profile descriptions", 15, any(len(_text(job.get("description")).split()) >= 15 for job in jobs)),
        ("Education", 10, bool(_entries(profile, "education"))),
        ("Profile summary", 10, bool(_text(profile.get("profileSummary")))),
        ("IT skills", 5, bool(_entries(profile, "itSkills"))),
        ("Projects", 5, bool(_entries(profile, "projects"))),
        ("Career profile", 5, bool(profile.get("careerProfile"))),
    ]
    return float(sum(weight for _, weight, ok in checks if ok)), [label for label, _, ok in checks if not ok]


def _headline_score(headline: str, skills: list[str]) -> tuple[float, list[str]]:
    score, feedback = 100.0, []
    if len(headline) < 60:
        score -= 35
        feedback.append("Your resume headline is short. Say what you do and the skills you are hired for.")
    elif len(headline) > LIMITS["headline"]:
        score -= 25
        feedback.append(f"Your resume headline is over Naukri's {LIMITS['headline']}-character limit.")
    lower = headline.lower()
    if skills and sum(1 for skill in skills if skill.lower() in lower) < 3:
        score -= 20
        feedback.append("Name at least three of your core skills in the resume headline.")
    if re.search(r"\b(open for|looking for|fresher)\b", lower):
        score -= 10
        feedback.append("Lead the headline with your role and strengths, not your availability.")
    return max(0.0, score), feedback


def _key_skill_score(skills: list[str], master_skills: list[str]) -> float:
    count = min(len(skills) / 15.0, 1.0) * 60
    if not master_skills:
        return round(count + (40 if len(skills) >= 8 else 20), 1)
    have = {skill.lower() for skill in skills}
    overlap = sum(1 for skill in master_skills if skill.lower() in have)
    return round(count + min(overlap / max(5, min(len(master_skills), 15)), 1.0) * 40, 1)


def _coherence(profile: dict, skills: list[str]) -> float:
    """Without a Master Profile: do the headline, summary and roles use the key skills?"""
    if not skills:
        return 0.0
    keys = {skill.lower() for skill in skills}
    parts = [_text(profile.get("headline")), _text(profile.get("profileSummary")), _descriptions(profile)]
    used = [min(sum(1 for key in keys if key in part.lower()) / 3.0, 1.0) for part in parts]
    return round(sum(used) / len(parts) * 100, 1)


def _compute_naukri_scores(master_text: str, master_skills: list[str], profile: dict) -> dict:
    text = _profile_text(profile)
    skills = coerce_skill_list(profile.get("keySkills"), 100)
    completeness, missing_sections = _completeness(profile)
    if master_text:
        keyword = calculate_keyword_score(master_text, text)
        semantic = calculate_semantic_score(master_text, text)
    else:
        # No Master Profile to compare with, so score the profile against its
        # own key skills instead of handing out made-up matches.
        keyword = {"score": _key_skill_score(skills, []), "missing_keywords": []}
        semantic = _coherence(profile, skills)
    impact = _calculate_linkedin_impact_score(_descriptions(profile))
    readability = _calculate_linkedin_readability_score(_text(profile.get("profileSummary")))
    headline, headline_feedback = _headline_score(_text(profile.get("headline")), master_skills or skills)
    sections = {
        "completeness": completeness,
        "keyword": float(keyword["score"]),
        "semantic": float(semantic),
        "impact": float(impact["score"]),
        "readability": float(readability["score"]),
        "headline": headline,
        "skills": _key_skill_score(skills, master_skills),
    }
    overall = sum(_WEIGHTS[key] * sections[key] for key in _WEIGHTS)
    return {
        "overall_score": round(min(overall, 100.0), 1),
        "sectionScores": {key: round(value, 1) for key, value in sections.items()},
        "missing_sections": missing_sections,
        "missing_keywords": list(keyword.get("missing_keywords") or [])[:10],
        "action_verb_count": impact["details"]["action_verb_count"],
        "headline_feedback": headline_feedback,
    }


def _recommendations(scores: dict) -> list[dict]:
    recs = []
    if scores["missing_sections"]:
        recs.append({
            "category": "Completeness", "severity": "high",
            "message": f"Fill in {', '.join(scores['missing_sections'])}. Recruiters searching Naukri see complete profiles first.",
        })
    if scores["missing_keywords"]:
        recs.append({
            "category": "Keywords", "severity": "medium",
            "message": f"Your Master Profile lists {', '.join(scores['missing_keywords'][:5])}, but your Naukri profile never mentions them. Add the ones you use to Key skills.",
        })
    if scores["action_verb_count"] < 3:
        recs.append({
            "category": "Employment", "severity": "high",
            "message": "Your job profiles use few action verbs. Describe what you built, improved or delivered in each role.",
        })
    recs += [{"category": "Headline", "severity": "medium", "message": message} for message in scores["headline_feedback"]]
    return recs or [{
        "category": "Overall", "severity": "low",
        "message": "Your Naukri profile is in good shape and matches your Master Profile well.",
    }]


def _master_inputs(master: Optional[dict]) -> tuple[str, list[str]]:
    """The Master Profile as scoring text and skills, or nothing when it is empty."""
    if not isinstance(master, dict) or not any(master.values()):
        return "", []
    return json.dumps(master, sort_keys=True), collect_master_skills(master, 35)


async def _score(master_text: str, master_skills: list[str], profile: dict) -> dict:
    async with _NAUKRI_SEMAPHORE:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(_compute_naukri_scores, master_text, master_skills, profile))


@router.post("/api/naukri/analyze")
@limiter.limit("20/minute", key_func=_rate_key)
async def analyze_naukri(request: Request, payload: NaukriAnalyzeRequest):
    _require_internal_auth(request)
    master_text, master_skills = _master_inputs(payload.masterProfile)
    try:
        scores = await _score(master_text, master_skills, payload.profile or {})
    except Exception as e:
        logger.error("Naukri analyze error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to analyze the profile.")
    return {
        "overallScore": scores["overall_score"],
        "sectionScores": scores["sectionScores"],
        "recommendations": _recommendations(scores),
        "missingKeywords": scores["missing_keywords"],
    }


_SECTIONS = ("keySkills", "headline", "profileSummary", "employment", "projects")

_DESCRIPTION_LIST = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {"description": {"type": "string"}},
        "required": ["description"],
        "additionalProperties": False,
    },
}
_REWRITE_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "profileSummary": {"type": "string"},
        "keySkills": {"type": "array", "items": {"type": "string"}},
        "employment": _DESCRIPTION_LIST,
        "projects": _DESCRIPTION_LIST,
    },
    "required": ["headline", "profileSummary", "keySkills", "employment", "projects"],
    "additionalProperties": False,
}


def _rewrite_prompt(profile: dict, master: dict, missing_keywords: list[str]) -> tuple[str, str]:
    jobs = [{key: job.get(key) for key in ("designation", "company", "duration", "description")} for job in _entries(profile, "employment")]
    projects = [{key: project.get(key) for key in ("title", "client", "description")} for project in _entries(profile, "projects")]
    system = (
        "You rewrite Naukri.com profiles so recruiters searching Naukri find and shortlist the candidate. "
        "Use only facts in the Naukri profile or the Master Profile. Never invent employers, dates, numbers, "
        "tools or achievements."
    )
    master_json = json.dumps(master, ensure_ascii=False, sort_keys=True)[:12000] if master else "Not provided. Improve the Naukri text only."
    user = f"""Rewrite the editable parts of this Naukri profile.

Rules:
- headline: the Resume headline, at most {LIMITS['headline']} characters. Lead with the role, then 3-6 core skills. No availability notes.
- profileSummary: at most {LIMITS['profileSummary']} characters, in 2-3 short paragraphs.
- keySkills: up to {LIMITS['keySkills']} real skills, most relevant first. Keep the ones the candidate uses and add these Master Profile skills where the profile supports them: {json.dumps(missing_keywords[:15])}.
- employment: one entry per role below, same order. description is Naukri's Job profile, at most {LIMITS['jobProfile']} characters: 3-5 lines, each starting with a bullet and an action verb. Metrics only when a source states them.
- projects: one entry per project below, same order, description at most {LIMITS['projectDetails']} characters.

NAUKRI PROFILE
Resume headline: {_text(profile.get('headline'))}
Profile summary: {_text(profile.get('profileSummary'))}
Key skills: {', '.join(coerce_skill_list(profile.get('keySkills'), 100))}
IT skills: {', '.join(_text(row.get('skills')) for row in _entries(profile, 'itSkills'))}
Employment: {json.dumps(jobs, ensure_ascii=False)}
Projects: {json.dumps(projects, ensure_ascii=False)}

MASTER PROFILE
{master_json}
"""
    return system, user


def _ask_rewrite(system: str, user: str) -> dict:
    """gpt-5-nano with a strict schema; Gemini when OpenAI is unavailable."""
    if openai_client.is_configured():
        try:
            result, _ = openai_client.structured_completion_sync(
                system=system, user=user, schema=_REWRITE_SCHEMA, schema_name="naukri_rewrite",
                max_tokens=8000, timeout_secs=90,
            )
            return result
        except Exception as exc:
            logger.warning("Naukri rewrite with %s failed: %s", openai_client.DEFAULT_MODEL, exc)
    response = gemini_model.generate_content(
        f"{system}\n\n{user}\nReturn only a JSON object with the keys headline, profileSummary, keySkills, employment and projects.",
        generation_config=genai.GenerationConfig(temperature=0.2, response_mime_type="application/json"),
    )
    parsed = extract_json_from_response(response.text)
    return parsed if isinstance(parsed, dict) else {}


def _clip(text: str, limit: int) -> str:
    """Trimmed to a Naukri field limit, at a sentence or word boundary."""
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("\n"))
    return (cut[: end + 1] if end > limit * 0.6 else cut[: max(cut.rfind(" "), 1)]).strip()


def _apply_rewrite(profile: dict, rewrite: dict, master_text: str) -> dict:
    """The profile with the rewrite's text laid over it, inside Naukri's limits."""
    result = json.loads(json.dumps(profile))
    if _text(rewrite.get("headline")):
        result["headline"] = _clip(rewrite["headline"], LIMITS["headline"])
    if _text(rewrite.get("profileSummary")):
        result["profileSummary"] = _clip(rewrite["profileSummary"], LIMITS["profileSummary"])

    existing = coerce_skill_list(profile.get("keySkills"), 100)
    evidence = f"{_profile_text(profile)}\n{master_text}".lower()
    # A skill the model proposes goes in only when the profile or the Master
    # Profile already mentions it, and existing skills are never dropped.
    grounded = [skill for skill in coerce_skill_list(rewrite.get("keySkills"), 100) if skill.lower() in evidence]
    if grounded:
        result["keySkills"] = coerce_skill_list(grounded + existing, max(LIMITS["keySkills"], len(existing)))

    for key, limit in (("employment", LIMITS["jobProfile"]), ("projects", LIMITS["projectDetails"])):
        rewritten = rewrite.get(key) if isinstance(rewrite.get(key), list) else []
        for i, entry in enumerate(_entries(result, key)):
            if i < len(rewritten) and isinstance(rewritten[i], dict) and _text(rewritten[i].get("description")):
                entry["description"] = _clip(rewritten[i]["description"], limit)
    return result


def _never_worse(master_text: str, master_skills: list[str], profile: dict, candidate: dict, base_scores: dict) -> tuple[dict, dict]:
    """Takes each rewritten section only if the score does not drop."""
    best, best_scores = json.loads(json.dumps(profile)), base_scores
    for key in _SECTIONS:
        if candidate.get(key) == best.get(key):
            continue
        trial = {**best, key: candidate.get(key)}
        trial_scores = _compute_naukri_scores(master_text, master_skills, trial)
        if trial_scores["overall_score"] >= best_scores["overall_score"]:
            best, best_scores = trial, trial_scores
    return best, best_scores


@router.post("/api/naukri/optimize")
@limiter.limit("10/minute", key_func=_rate_key)
async def optimize_naukri(request: Request, payload: NaukriOptimizeRequest):
    _require_internal_auth(request)
    profile = payload.profile or {}
    master_text, master_skills = _master_inputs(payload.masterProfile)
    try:
        current = await _score(master_text, master_skills, profile)
        system, user = _rewrite_prompt(profile, payload.masterProfile if master_text else {}, current["missing_keywords"])
        loop = asyncio.get_event_loop()
        rewrite = await loop.run_in_executor(None, partial(_ask_rewrite, system, user))
        if not rewrite:
            raise HTTPException(status_code=502, detail="The AI rewrite came back empty.")
        candidate = _apply_rewrite(profile, rewrite, master_text)
        async with _NAUKRI_SEMAPHORE:
            optimized, scores = await loop.run_in_executor(
                None, partial(_never_worse, master_text, master_skills, profile, candidate, current)
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Naukri optimize error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate optimizations.")
    return {
        "optimized": {key: optimized.get(key) for key in _SECTIONS},
        "currentScore": current["overall_score"],
        "currentSectionScores": current["sectionScores"],
        "optimizedScore": scores["overall_score"],
        "optimizedSectionScores": scores["sectionScores"],
        "scoreDelta": round(max(0.0, scores["overall_score"] - current["overall_score"]), 1),
    }
