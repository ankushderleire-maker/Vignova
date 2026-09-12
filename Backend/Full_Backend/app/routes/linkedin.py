"""
LinkedIn Optimizer Route
======================
POST /api/linkedin/scrape         — Starts an Apify scrape of a public LinkedIn profile
POST /api/linkedin/scrape/status  — Polls that scrape; scores + stores it once it lands
POST /api/linkedin/ingest         — Scores + stores a profile payload we were handed directly
POST /api/linkedin/optimize       — Generates AI rewrites for profile sections

Auth: this service is reachable from the public internet, so every route here
requires the internal API key. The browser never calls these directly — it goes
through the Next.js /api/linkedin/* routes, which hold the key and bind userId
to the NextAuth session.
"""

import asyncio
import json
import logging
import os
import re
import uuid
from functools import partial

import google.generativeai as genai
import nltk
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from slowapi.util import get_remote_address
from typing import Optional, List

from app.config import model
from app.limiter import limiter
from app.utils.llm_cache import llm_cache
from app.db_pool import get_db_connection
from app.services import apify_linkedin
from app.services.apify_linkedin import ApifyError
from app.services.ats_helpers import (
    calculate_keyword_score,
    calculate_semantic_score,
)
from app.utils.json_utils import extract_json_from_response
from app.utils.linkedin_skills import coerce_skill_list, collect_master_skills, clean_skill_details

router = APIRouter()
logger = logging.getLogger("linkedin")

_LINKEDIN_SEMAPHORE = asyncio.Semaphore(5)

INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")


def _require_internal_auth(request: Request) -> None:
    key = request.headers.get("X-API-Key") or request.headers.get("x-internal-key")
    if not INTERNAL_API_KEY or key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _rate_key(request: Request) -> str:
    """
    Rate-limit per end user, not per source IP.

    Every request here arrives from the Next.js server, so all users would
    otherwise share one IP bucket and one person's polling would 429 everyone
    else. The Next.js routes set X-Client-Id from the NextAuth session, so the
    browser can't forge it.
    """
    return request.headers.get("X-Client-Id") or get_remote_address(request)


class LinkedInScrapeRequest(BaseModel):
    userId: str
    linkedinUrl: str
    masterProfileId: Optional[str] = None

class LinkedInScrapeStatusRequest(BaseModel):
    userId: str
    runId: str
    linkedinUrl: str
    masterProfileId: Optional[str] = None

class LinkedInIngestRequest(BaseModel):
    userId: str
    linkedinUrl: str
    rawProfileData: dict
    masterProfileId: Optional[str] = None

class LinkedInOptimizeRequest(BaseModel):
    userId: str
    analysisId: str
    rawProfileData: dict
    sectionScores: dict
    masterProfileId: Optional[str] = None

def _calculate_linkedin_impact_score(experience_text: str) -> dict:
    """
    LinkedIn experience entries are usually shorter than resumes, so this
    rewards strong action-led bullets without requiring invented metrics.
    """
    action_verbs = {
        "achieved", "improved", "developed", "managed", "created", "designed",
        "implemented", "increased", "reduced", "built", "led", "delivered",
        "launched", "optimized", "automated", "streamlined", "coordinated",
        "mentored", "resolved", "analyzed", "engineered", "architected",
        "spearheaded", "transformed", "accelerated", "generated", "established",
        "negotiated", "collaborated", "integrated", "migrated", "deployed",
        "scaled", "refactored", "orchestrated", "championed", "executed",
    }
    outcome_terms = {
        "impact", "outcomes", "delivery", "quality", "performance", "efficiency",
        "automation", "stakeholders", "production", "scalable", "reliable",
        "business", "value", "workflow", "workflows", "cross-functional",
        "optimization", "deployment", "architecture", "insights", "adoption",
    }
    text = experience_text or ""
    text_lower = text.lower()
    words = re.findall(r"\b[a-z]+\b", text_lower)
    word_set = set(words)
    verbs_found = action_verbs.intersection(word_set)

    bullet_lines = [
        line for line in text.splitlines()
        if re.match(r"^\s*[-•*▸▹►]", line.strip())
    ]
    percentages = re.findall(r"\d+\s*%", text)
    dollar_amounts = re.findall(r"\$[\d,]+", text)
    plain_numbers = re.findall(r"\b\d{2,}\b", text)
    total_metrics = len(percentages) + len(dollar_amounts) + len(plain_numbers)

    action_verb_score = min(len(verbs_found) / 5.0, 1.0) * 100
    bullet_score = min(len(bullet_lines) / 4.0, 1.0) * 100
    metric_score = min(total_metrics / 3.0, 1.0) * 100
    outcome_score = min(len(outcome_terms.intersection(word_set)) / 5.0, 1.0) * 100
    length_score = min(len(words) / 90.0, 1.0) * 100 if words else 0

    combined_score = (
        0.40 * action_verb_score +
        0.25 * bullet_score +
        0.10 * metric_score +
        0.15 * outcome_score +
        0.10 * length_score
    )

    details = {
        "action_verbs_found": sorted(list(verbs_found)),
        "action_verb_count": len(verbs_found),
        "bullet_lines_count": len(bullet_lines),
        "percentages_count": len(percentages),
        "dollar_amounts_count": len(dollar_amounts),
        "numbers_count": len(plain_numbers),
        "total_metrics": total_metrics,
        "outcome_terms_found": sorted(list(outcome_terms.intersection(word_set))),
    }
    return {"score": round(min(combined_score, 100), 1), "details": details}

def _calculate_linkedin_readability_score(about_text: str) -> dict:
    """
    Scores the LinkedIn About section as profile copy, not as a full resume.
    A strong LinkedIn About is concise, paragraph-based and easy to scan.
    """
    text = (about_text or "").strip()
    words = text.split()
    word_count = len(words)
    sentences = nltk.sent_tokenize(text) if text else []
    sentence_count = len(sentences) if sentences else 1
    avg_sentence_len = word_count / sentence_count if sentence_count else 0
    paragraphs = [p for p in re.split(r"\n\s*\n", text) if p.strip()]

    if 80 <= word_count <= 220:
        length_score = 100
    elif word_count < 80:
        length_score = max(0, word_count / 80.0 * 100)
    else:
        length_score = max(0, 100 - (word_count - 220) * 0.6)

    if 8 <= avg_sentence_len <= 24:
        sentence_score = 100
    elif avg_sentence_len < 8:
        sentence_score = max(0, avg_sentence_len / 8.0 * 100)
    else:
        sentence_score = max(0, 100 - (avg_sentence_len - 24) * 5)

    paragraph_score = 100 if 2 <= len(paragraphs) <= 4 else 70 if len(paragraphs) == 1 else 55
    first_person_penalty = 10 if len(re.findall(r"\bI\b|\bmy\b|\bme\b", text, re.IGNORECASE)) > 10 else 0
    combined = (0.45 * length_score) + (0.35 * sentence_score) + (0.20 * paragraph_score) - first_person_penalty

    details = {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_sentence_length": round(avg_sentence_len, 1),
        "paragraph_count": len(paragraphs),
    }
    return {"score": round(max(0, min(combined, 100)), 1), "details": details}

def _calculate_linkedin_project_score(raw_data: dict, master_text: str) -> dict:
    """
    Rewards profiles that have projects and gives extra credit when project
    wording overlaps with the selected master profile.
    """
    projects = raw_data.get("projects") if isinstance(raw_data.get("projects"), list) else []
    if not projects:
        return {
            "score": 0.0,
            "details": {
                "project_count": 0,
                "relevant_project_count": 0,
                "relevance_percent": 0.0,
            },
        }

    project_texts = []
    for project in projects:
        if not isinstance(project, dict):
            continue
        project_texts.append(" ".join(
            _as_clean_text(project.get(key))
            for key in ("title", "name", "description", "associatedWith", "skills")
            if project.get(key)
        ))

    project_blob = " ".join(project_texts).lower()
    master_words = {
        word for word in re.findall(r"[a-z][a-z0-9+.#-]{2,}", (master_text or "").lower())
        if word not in {"the", "and", "with", "for", "from", "this", "that", "your", "you", "are", "was", "were"}
    }
    project_words = set(re.findall(r"[a-z][a-z0-9+.#-]{2,}", project_blob))
    overlap = project_words.intersection(master_words)
    relevance_target = max(5, min(len(project_words), 20))
    relevance_percent = 100.0 if not master_words else min(100.0, (len(overlap) / relevance_target) * 100)

    project_count_score = min(len(projects) / 3.0, 1.0) * 100
    detail_score = min(len(project_blob.split()) / 120.0, 1.0) * 100
    score = (0.10 * project_count_score) + (0.45 * relevance_percent) + (0.45 * detail_score)

    return {
        "score": round(min(score, 100), 1),
        "details": {
            "project_count": len(projects),
            "relevant_project_count": len(projects) if relevance_percent >= 35 else max(0, round(len(projects) * relevance_percent / 100)),
            "relevance_percent": round(relevance_percent, 1),
        },
    }

def _keyword_tokens(text: str) -> set[str]:
    stop_words = {
        "the", "and", "with", "for", "from", "this", "that", "your", "you",
        "are", "was", "were", "have", "has", "will", "can", "into", "using",
        "work", "role", "team", "teams", "profile", "linkedin", "professional",
    }
    return {
        word for word in re.findall(r"[a-z][a-z0-9+.#-]{2,}", (text or "").lower())
        if word not in stop_words
    }

def _calculate_linkedin_keyword_richness_score(raw_data: dict, profile_text: str) -> dict:
    """
    Used when the user has no Master Profile. It scores keyword richness inside
    LinkedIn itself instead of pretending there is a resume comparison.
    """
    skills = _coerce_skill_list(raw_data.get("skills"))
    skill_words = _keyword_tokens(", ".join(skills))
    profile_words = _keyword_tokens(profile_text)

    headline_words = _keyword_tokens(_as_clean_text(raw_data.get("headline")))
    about_words = _keyword_tokens(_as_clean_text(raw_data.get("about")))
    experience_words = _keyword_tokens(raw_data.get("experience_text", ""))

    skill_count_score = min(len(skills) / 20.0, 1.0) * 35
    skill_usage_score = min(len(profile_words.intersection(skill_words)) / max(5, min(len(skill_words) or 5, 20)), 1.0) * 30
    section_coverage_score = (
        (10 if headline_words.intersection(skill_words) else 0) +
        (10 if about_words.intersection(skill_words) else 0) +
        (10 if experience_words.intersection(skill_words) else 0)
    )
    vocabulary_score = min(len(profile_words) / 45.0, 1.0) * 5
    total = skill_count_score + skill_usage_score + section_coverage_score + vocabulary_score

    return {
        "score": round(min(total, 100), 1),
        "found_keywords": sorted(list(profile_words.intersection(skill_words)))[:20],
        "missing_keywords": [],
        "mode": "linkedin_keyword_richness",
        "details": {
            "skill_count": len(skills),
            "keywords_used_across_profile": len(profile_words.intersection(skill_words)),
            "headline_has_skill_keywords": bool(headline_words.intersection(skill_words)),
            "about_has_skill_keywords": bool(about_words.intersection(skill_words)),
            "experience_has_skill_keywords": bool(experience_words.intersection(skill_words)),
        },
    }

def _calculate_linkedin_semantic_coherence_score(raw_data: dict) -> float:
    """
    Used when there is no Master Profile. It checks whether headline, About,
    experience and skills talk about the same professional direction.
    """
    headline_words = _keyword_tokens(_as_clean_text(raw_data.get("headline")))
    about_words = _keyword_tokens(_as_clean_text(raw_data.get("about")))
    experience_words = _keyword_tokens(raw_data.get("experience_text", ""))
    skill_words = _keyword_tokens(", ".join(_coerce_skill_list(raw_data.get("skills"))))

    def overlap_score(a: set[str], b: set[str]) -> float:
        if not a or not b:
            return 0.0
        return min(len(a.intersection(b)) / max(3, min(len(a), len(b))), 1.0) * 100

    pair_score = (
        overlap_score(headline_words, about_words) +
        overlap_score(headline_words, experience_words) +
        overlap_score(skill_words, about_words) +
        overlap_score(skill_words, experience_words)
    ) / 4.0
    depth_score = (
        min(len(about_words) / 35.0, 1.0) * 40 +
        min(len(experience_words) / 45.0, 1.0) * 40 +
        min(len(skill_words) / 15.0, 1.0) * 20
    )
    return round((0.70 * pair_score) + (0.30 * depth_score), 1)

def _compute_linkedin_scores(master_text: str, profile_text: str, raw_data: dict) -> dict:
    """
    Computes algorithmic scores for LinkedIn profile text against a master profile text.
    """
    # Create a concatenated profile text for keyword/impact analysis
    
    # 1. Profile Completeness
    completeness_score = 0
    missing_sections = []
    if raw_data.get("headline"): completeness_score += 20
    else: missing_sections.append("Headline")
    
    if raw_data.get("about"): completeness_score += 20
    else: missing_sections.append("About")
    
    if raw_data.get("experience") and len(raw_data["experience"]) > 0: completeness_score += 30
    else: missing_sections.append("Experience")
    
    if raw_data.get("education") and len(raw_data["education"]) > 0: completeness_score += 15
    else: missing_sections.append("Education")
    
    if raw_data.get("skills") and len(raw_data["skills"]) > 0: completeness_score += 15
    else: missing_sections.append("Skills")
    
    # 2. Keyword & Semantic (if master text is provided)
    keyword_res = {"score": 0, "found_keywords": [], "missing_keywords": []}
    semantic_score = 0
    if master_text:
        keyword_res = calculate_keyword_score(master_text, profile_text)
        semantic_score = calculate_semantic_score(master_text, profile_text)
    else:
        # No Master Profile exists yet, so compare the profile against its own
        # LinkedIn keyword richness/coherence instead of giving fake 100s.
        keyword_res = _calculate_linkedin_keyword_richness_score(raw_data, profile_text)
        semantic_score = _calculate_linkedin_semantic_coherence_score(raw_data)
        
    # 3. Experience Impact Score
    impact_res = _calculate_linkedin_impact_score(raw_data.get("experience_text", ""))
    
    # 4. Readability Score for About section
    readability_res = _calculate_linkedin_readability_score(raw_data.get("about", ""))

    # 5. Projects Score
    project_res = _calculate_linkedin_project_score(raw_data, master_text)
    
    # 6. Headline Analysis
    headline = raw_data.get("headline", "")
    headline_score = 100
    headline_fb = []
    if len(headline) < 20:
        headline_score -= 30
        headline_fb.append("Headline is too short. Add your value proposition.")
    if len(headline) > 220:
        headline_score -= 20
        headline_fb.append("Headline is too long. LinkedIn limits it to 220 characters.")
    if "|" not in headline and "-" not in headline and "," not in headline:
        headline_score -= 10
        headline_fb.append("Consider using separators (|, -) to include multiple keywords.")
        
    overall_score = (
        0.15 * completeness_score +
        0.25 * keyword_res["score"] +
        0.20 * semantic_score +
        0.20 * impact_res["score"] +
        0.10 * readability_res["score"] +
        0.10 * headline_score
    )
    project_bonus = 0.05 * project_res["score"]

    return {
        "overall_score": round(min(overall_score + project_bonus, 100), 1),
        "sectionScores": {
            "completeness": round(completeness_score, 1),
            "keyword": round(keyword_res["score"], 1),
            "semantic": round(semantic_score, 1),
            "impact": round(impact_res["score"], 1),
            "readability": round(readability_res["score"], 1),
            "headline": round(headline_score, 1),
            "projects": round(project_res["score"], 1)
        },
        "missing_sections": missing_sections,
        "keyword_details": keyword_res,
        "impact_details": impact_res["details"],
        "project_details": project_res["details"],
        "headline_feedback": headline_fb
    }

def _remove_null_bytes(d):
    if isinstance(d, dict):
        return {k: _remove_null_bytes(v) for k, v in d.items()}
    elif isinstance(d, list):
        return [_remove_null_bytes(v) for v in d]
    elif isinstance(d, str):
        return d.replace('\x00', '')
    return d

def _as_clean_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.replace("\x00", "").strip()
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value).replace("\x00", "").strip()

def _coerce_skill_list(value) -> list[str]:
    return coerce_skill_list(value)

def _normalize_linkedin_profile(raw_profile_data: dict) -> dict:
    raw_data = _remove_null_bytes(raw_profile_data or {})
    if not isinstance(raw_data, dict):
        raw_data = {}

    experience = raw_data.get("experience")
    normalized_experience = []
    if isinstance(experience, list):
        for item in experience:
            if not isinstance(item, dict):
                continue
            associated_skills = item.get("associatedSkills")
            normalized_experience.append({
                **item,
                "title": _as_clean_text(item.get("title") or item.get("jobTitle") or item.get("position")),
                "company": _as_clean_text(item.get("company") or item.get("companyName")),
                "dateRange": _as_clean_text(item.get("dateRange") or item.get("dates") or item.get("duration")),
                "location": _as_clean_text(item.get("location")),
                "description": _as_clean_text(item.get("description") or item.get("summary")),
                "associatedSkills": ", ".join(_coerce_skill_list(associated_skills)),
            })

    education = raw_data.get("education")
    normalized_education = []
    if isinstance(education, list):
        for item in education:
            if not isinstance(item, dict):
                continue
            normalized_education.append({
                **item,
                "school": _as_clean_text(item.get("school") or item.get("schoolName") or item.get("name")),
                "degree": _as_clean_text(item.get("degree") or item.get("fieldOfStudy")),
                "dateRange": _as_clean_text(item.get("dateRange") or item.get("dates")),
                "associatedSkills": ", ".join(_coerce_skill_list(item.get("associatedSkills"))),
            })

    projects = raw_data.get("projects")
    normalized_projects = []
    if isinstance(projects, list):
        for item in projects:
            if not isinstance(item, dict):
                continue
            normalized_projects.append({
                **item,
                "title": _as_clean_text(item.get("title") or item.get("name")),
                "dateRange": _as_clean_text(item.get("dateRange") or item.get("dates")),
                "associatedWith": _as_clean_text(item.get("associatedWith")),
                "description": _as_clean_text(item.get("description") or item.get("summary")),
                "skills": _coerce_skill_list(item.get("skills") or item.get("associatedSkills")),
            })

    return {
        **raw_data,
        "name": _as_clean_text(raw_data.get("name") or raw_data.get("fullName")),
        "headline": _as_clean_text(raw_data.get("headline") or raw_data.get("title")),
        "about": _as_clean_text(raw_data.get("about") or raw_data.get("summary")),
        "experience": normalized_experience,
        "education": normalized_education,
        "projects": normalized_projects,
        "skills": _coerce_skill_list(raw_data.get("skills")),
        "skillDetails": clean_skill_details(raw_data.get("skillDetails")),
        "topSkills": _coerce_skill_list(raw_data.get("topSkills")),
    }

def _build_linkedin_profile_text(raw_data: dict) -> str:
    raw_data["experience_text"] = ""
    exp_lines = []
    for exp in raw_data.get("experience", []) if isinstance(raw_data.get("experience"), list) else []:
        if not isinstance(exp, dict):
            continue
        exp_text = " ".join(
            _as_clean_text(exp.get(key))
            for key in ("title", "company", "description", "associatedSkills")
            if exp.get(key)
        )
        exp_lines.append(exp_text)
    raw_data["experience_text"] = "\n".join(exp_lines)

    project_lines = []
    for project in raw_data.get("projects", []) if isinstance(raw_data.get("projects"), list) else []:
        if not isinstance(project, dict):
            continue
        project_lines.append(" ".join(
            _as_clean_text(project.get(key))
            for key in ("title", "associatedWith", "description", "skills")
            if project.get(key)
        ))
    raw_data["projects_text"] = "\n".join(project_lines)

    skills_text = ", ".join(raw_data.get("skills", [])) if isinstance(raw_data.get("skills"), list) else ""
    return "\n".join([
        _as_clean_text(raw_data.get("headline")),
        _as_clean_text(raw_data.get("about")),
        raw_data["experience_text"],
        raw_data["projects_text"],
        skills_text,
    ]).strip()

def _collect_master_keywords(master_data, limit: int = 35) -> list[str]:
    return collect_master_skills(master_data, limit)

def _append_unique_skills(existing: list[str], additions: list[str], limit: int = 80) -> list[str]:
    return coerce_skill_list([*existing, *additions], limit)

def _extract_master_projects(master_data: dict) -> list[dict]:
    projects = master_data.get("projects") if isinstance(master_data, dict) else []
    if not isinstance(projects, list):
        return []

    normalized_projects = []
    for item in projects:
        if not isinstance(item, dict):
            continue
        skills = _coerce_skill_list(
            item.get("techStack")
            or item.get("skills")
            or item.get("technologies")
            or item.get("tools")
        )
        normalized_projects.append({
            "title": _as_clean_text(item.get("title") or item.get("name") or item.get("projectName")),
            "dateRange": _as_clean_text(item.get("dateRange") or item.get("dates")),
            "associatedWith": _as_clean_text(item.get("associatedWith") or item.get("organization") or "Master Profile"),
            "description": _as_clean_text(item.get("description") or item.get("summary")),
            "url": _as_clean_text(item.get("url") or item.get("link") or item.get("liveLink") or item.get("repoUrl")),
            "skills": skills,
        })
    return [project for project in normalized_projects if project.get("title") or project.get("description")]

def _merge_project_lists(*project_lists: list[dict]) -> list[dict]:
    merged: list[dict] = []
    index_by_key: dict[str, int] = {}

    for projects in project_lists:
        for project in projects if isinstance(projects, list) else []:
            if not isinstance(project, dict):
                continue
            normalized = {
                **project,
                "title": _as_clean_text(project.get("title") or project.get("name") or project.get("projectName")),
                "dateRange": _as_clean_text(project.get("dateRange") or project.get("dates")),
                "associatedWith": _as_clean_text(project.get("associatedWith") or project.get("organization")),
                "description": _as_clean_text(project.get("description") or project.get("summary")),
                "url": _as_clean_text(project.get("url") or project.get("link") or project.get("liveLink") or project.get("repoUrl")),
                "skills": _coerce_skill_list(project.get("skills") or project.get("techStack") or project.get("technologies")),
            }
            key = re.sub(r"[^a-z0-9]+", " ", (normalized.get("title") or normalized.get("description") or "").lower()).strip()
            if not key:
                continue

            if key in index_by_key:
                current = merged[index_by_key[key]]
                if len(normalized.get("description", "")) > len(current.get("description", "")):
                    current["description"] = normalized["description"]
                for field in ("dateRange", "associatedWith", "url"):
                    if not current.get(field) and normalized.get(field):
                        current[field] = normalized[field]
                current["skills"] = _append_unique_skills(current.get("skills", []), normalized.get("skills", []), 12)
            else:
                index_by_key[key] = len(merged)
                merged.append(normalized)

    return merged

def _build_score_friendly_about(profile: dict, source: dict, score_keywords: list[str]) -> str:
    headline = _as_clean_text(profile.get("headline") or source.get("headline") or "AI and technology delivery")
    role_focus = headline.split("|")[0].split("-")[0].strip() or "AI and technology delivery"
    skill_text = ", ".join(score_keywords[:6]) if score_keywords else "AI systems, automation, analytics, cloud delivery, and stakeholder collaboration"

    return (
        f"I help teams turn {role_focus.lower()} into practical, reliable business outcomes. "
        f"My work spans {skill_text}, with a focus on building useful products, improving workflows, and delivering clear value for users and stakeholders.\n\n"
        "I bring hands-on experience across the full delivery lifecycle, from problem framing and data preparation to implementation, deployment, and continuous improvement. "
        "I am strongest in environments where technical execution, communication, and measurable progress need to come together.\n\n"
        "I am actively focused on roles where I can build scalable AI-powered solutions, improve operational efficiency, and contribute to products that solve real-world problems."
    )

def _project_description(title: str, associated_with: str, score_keywords: list[str], source_description: str = "") -> str:
    skill_text = ", ".join(score_keywords[:8]) if score_keywords else "AI, automation, data analysis, cloud delivery, and product development"
    project_title = title or "Applied AI Delivery Project"
    context = f" for {associated_with}" if associated_with else ""
    source_sentence = f"{source_description.strip().rstrip('.')}." if source_description else f"Built {project_title}{context}."
    return (
        f"{source_sentence}\n"
        f"Positioned {project_title}{context} around practical delivery, measurable business value, and reliable user outcomes.\n"
        f"Applied {skill_text} to design, implement, test, and improve the solution across the delivery lifecycle.\n"
        "Documented the approach, clarified technical decisions, and aligned the work with stakeholder needs so the project could be understood, reused, and extended."
    )

def _ensure_score_friendly_projects(result: dict, source: dict, master_projects: list[dict], score_keywords: list[str]) -> list[dict]:
    result_projects = result.get("projects") if isinstance(result.get("projects"), list) else []
    source_projects = source.get("projects") if isinstance(source.get("projects"), list) else []
    projects = _merge_project_lists(result_projects, master_projects, source_projects)

    if not projects:
        first_exp = next((exp for exp in result.get("experience", []) if isinstance(exp, dict)), {})
        focus = score_keywords[0] if score_keywords else _as_clean_text(first_exp.get("title")) or "AI"
        projects = [{
            "title": f"{focus} Delivery Project",
            "dateRange": _as_clean_text(first_exp.get("dateRange")),
            "associatedWith": _as_clean_text(first_exp.get("company")),
            "description": "",
            "skills": score_keywords[:8],
        }]

    source_descriptions = {
        re.sub(r"\s+", " ", _as_clean_text(project.get("description") or project.get("summary")).lower()).strip()
        for project in source_projects
        if isinstance(project, dict)
    }
    optimized_projects = []
    for project in projects[:4]:
        if not isinstance(project, dict):
            continue
        project_keywords = score_keywords or result.get("skills", [])[:12]
        project = {
            **project,
            "title": _as_clean_text(project.get("title") or project.get("name")) or "Applied Delivery Project",
            "associatedWith": _as_clean_text(project.get("associatedWith")),
            "dateRange": _as_clean_text(project.get("dateRange") or project.get("dates")),
            "description": _as_clean_text(project.get("description") or project.get("summary")),
            "skills": _append_unique_skills(_coerce_skill_list(project.get("skills")), project_keywords[:10], 12),
        }
        normalized_description = re.sub(r"\s+", " ", project["description"].lower()).strip()
        if (
            len(project["description"].split()) < 70
            or normalized_description in source_descriptions
            or len(set(_keyword_tokens(project["description"])).intersection(_keyword_tokens(", ".join(project["skills"])))) < 5
        ):
            project["description"] = _project_description(
                project["title"],
                project["associatedWith"],
                _append_unique_skills(project.get("skills", []), project_keywords, 12),
                project["description"],
            )
        optimized_projects.append(project)

    return optimized_projects

def _recalculate_score_from_sections(section_scores: dict) -> float:
    def val(key: str) -> float:
        try:
            return float(section_scores.get(key, 0) or 0)
        except (TypeError, ValueError):
            return 0.0

    base_score = (
        0.15 * val("completeness") +
        0.25 * val("keyword") +
        0.20 * val("semantic") +
        0.20 * val("impact") +
        0.10 * val("readability") +
        0.10 * val("headline")
    )
    return round(min(base_score + (0.05 * val("projects")), 100), 1)

def _ensure_score_friendly_profile(
    optimized_data: dict,
    source_data: dict,
    master_keywords: list[str],
    missing_keywords: list[str],
    master_data: dict | None = None,
) -> dict:
    result = _normalize_linkedin_profile({**source_data, **(optimized_data or {})})
    source = _normalize_linkedin_profile(source_data)
    master_projects = _extract_master_projects(master_data or {})
    master_project_skills = []
    for project in master_projects:
        master_project_skills.extend(project.get("skills", []))

    result["headline"] = _as_clean_text(result.get("headline") or source.get("headline"))
    if result["headline"] and all(sep not in result["headline"] for sep in ("|", "-", ",")):
        headline_terms = _append_unique_skills([], master_keywords[:3] or result.get("skills", [])[:3], 3)
        if headline_terms:
            base = result["headline"].split("|")[0].strip()
            result["headline"] = f"{base} | {' | '.join(headline_terms)}"
    if len(result["headline"]) > 220:
        result["headline"] = result["headline"][:217].rstrip() + "..."

    # ATS keywords also contain names, contact fragments and section headings.
    # Only promote keywords backed by explicit skill fields into LinkedIn skills.
    grounded_skills = _append_unique_skills(master_keywords, master_project_skills, 80)
    missing_keys = {skill.lower() for skill in _coerce_skill_list(missing_keywords)}
    prioritized = [skill for skill in grounded_skills if skill.lower() in missing_keys]
    score_keywords = _append_unique_skills(prioritized, grounded_skills, 24)
    if score_keywords:
        relevant_keys = {skill.lower() for skill in score_keywords}
        current_relevant = [
            skill for skill in result.get("skills", [])
            if any(skill.lower() == key or skill.lower() in key or key in skill.lower() for key in relevant_keys)
        ]
        result["skills"] = _append_unique_skills([], score_keywords + current_relevant, 30)
    else:
        result["skills"] = _append_unique_skills([], result.get("skills", []), 30)

    if not result.get("about"):
        result["about"] = source.get("about") or "Professional profile focused on delivering measurable business impact through practical execution and continuous improvement."
    if len(result["about"].split()) < 70 and score_keywords:
        strengths = ", ".join(score_keywords[:8])
        result["about"] = (
            f"{result['about'].strip()}\n\n"
            f"Core strengths include {strengths}, with a focus on clear delivery, stakeholder alignment, and measurable outcomes."
        )
    if len(result["about"].split()) < 80:
        profile_focus = result.get("headline") or source.get("headline") or "my professional work"
        result["about"] = (
            f"{result['about'].strip()}\n\n"
            f"I bring a practical, outcome-focused approach to {profile_focus}. "
            "My work combines clear problem solving, reliable execution, and continuous improvement so teams can move from ideas to working solutions with confidence."
        )
    if _calculate_linkedin_readability_score(result.get("about", "")).get("score", 0) < 90:
        result["about"] = _build_score_friendly_about(result, source, score_keywords)

    if not result.get("experience") and source.get("experience"):
        result["experience"] = source["experience"]

    action_verbs = ["Developed", "Implemented", "Optimized", "Delivered", "Led", "Automated", "Improved", "Collaborated"]
    optimized_experience = []
    for idx, exp in enumerate(result.get("experience", [])):
        if not isinstance(exp, dict):
            continue
        exp = {**exp}
        desc = _as_clean_text(exp.get("description"))
        associated = _coerce_skill_list(exp.get("associatedSkills"))
        supported_skills = _append_unique_skills(associated, score_keywords[:8], 10)
        if desc:
            lines = [line.strip(" -*•\t") for line in desc.splitlines() if line.strip()]
        else:
            role = exp.get("title") or "key initiatives"
            company = exp.get("company") or "the organization"
            lines = [f"Delivered {role} work for {company} with a focus on reliable execution and measurable outcomes."]
        while len(lines) < 4:
            role = exp.get("title") or "professional initiatives"
            skill_text = ", ".join(supported_skills[:4]) if supported_skills else "core business priorities"
            additions = [
                f"Built practical solutions for {role} using {skill_text}.",
                "Implemented clear workflows that improved delivery quality and reduced avoidable rework.",
                "Collaborated with stakeholders to align execution with business goals.",
                "Optimized day-to-day processes so work could be delivered more consistently.",
            ]
            lines.append(additions[len(lines) % len(additions)])

        bullet_lines = []
        for line_idx, line in enumerate(lines[:5]):
            verb = action_verbs[(idx + line_idx) % len(action_verbs)]
            if not line.lower().startswith(tuple(v.lower() for v in action_verbs)):
                line = f"{verb} {line[0].lower() + line[1:] if line else 'professional initiatives'}"
            bullet_lines.append(f"• {line}")
        exp["description"] = "\n".join(bullet_lines)

        exp["associatedSkills"] = ", ".join(_append_unique_skills(associated, score_keywords[:6], 12))
        optimized_experience.append(exp)
    result["experience"] = optimized_experience

    if not result.get("education") and source.get("education"):
        result["education"] = source["education"]

    result["projects"] = _ensure_score_friendly_projects(result, source, master_projects, score_keywords)

    return result

def _fallback_linkedin_optimization(source_data: dict, master_keywords: list[str], missing_keywords: list[str], master_data: dict | None = None) -> dict:
    source = _normalize_linkedin_profile(source_data)
    fallback = {
        "headline": source.get("headline", ""),
        "about": source.get("about", ""),
        "experience": source.get("experience", []),
        "education": source.get("education", []),
        "projects": source.get("projects", []),
        "skills": source.get("skills", []),
    }
    return _ensure_score_friendly_profile(fallback, source, master_keywords, missing_keywords, master_data)

async def _analyze_and_store(
    user_id: str,
    linkedin_url: str,
    raw_profile_data: dict,
    master_profile_id: Optional[str],
) -> dict:
    """
    Scores a LinkedIn profile against the user's master profile, writes the
    analysis row and returns the payload the dashboard renders.

    Shared by the Apify scrape flow and the direct-ingest flow, so both produce
    identical results.
    """
    master_text = ""

    # 1. Fetch Master Profile to compare against
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            if master_profile_id:
                cur.execute("SELECT parsed_data FROM master_profiles WHERE id = %s AND user_id = %s", (master_profile_id, user_id))
            else:
                cur.execute("SELECT parsed_data FROM master_profiles WHERE user_id = %s AND is_default = TRUE LIMIT 1", (user_id,))

            row = cur.fetchone()
            if row and row[0]:
                # Convert JSON to text for comparison
                parsed_data = row[0] if isinstance(row[0], dict) else json.loads(row[0])
                master_text = json.dumps(parsed_data, sort_keys=True)

    # 2. Prepare LinkedIn text
    raw_data = _normalize_linkedin_profile(raw_profile_data)
    profile_text = _build_linkedin_profile_text(raw_data)

    # 3. Analyze
    async with _LINKEDIN_SEMAPHORE:
        loop = asyncio.get_event_loop()
        scores = await loop.run_in_executor(
            None,
            partial(_compute_linkedin_scores, master_text, profile_text, raw_data)
        )

    overall = scores["overall_score"]

    # Generate recommendations
    recommendations = []
    if scores["missing_sections"]:
        recommendations.append({
            "category": "Completeness",
            "severity": "high",
            "message": f"Missing sections: {', '.join(scores['missing_sections'])}. Adding these will significantly boost your visibility."
        })

    if scores["keyword_details"].get("missing_keywords"):
        missing_kws = scores["keyword_details"]["missing_keywords"][:5]
        if missing_kws:
            recommendations.append({
                "category": "Keywords",
                "severity": "medium",
                "message": f"Your master profile has these skills but LinkedIn doesn't: {', '.join(missing_kws)}. Add them to your LinkedIn Skills section."
            })

    if scores["impact_details"]["action_verb_count"] < 3:
        recommendations.append({
            "category": "Experience",
            "severity": "high",
            "message": "We detected very few action verbs in your experience section. Start bullets with 'Managed', 'Developed', 'Spearheaded'."
        })

    if scores["headline_feedback"]:
        for fb in scores["headline_feedback"]:
            recommendations.append({
                "category": "Headline",
                "severity": "medium",
                "message": fb
            })

    if not recommendations:
        recommendations.append({
            "category": "Overall",
            "severity": "low",
            "message": "Your profile looks excellent and aligns well with your master resume."
        })

    # 4. Save to Database
    analysis_id = str(uuid.uuid4())  # using uuid instead of cuid is fine if id is String

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO "LinkedInAnalysis"
                ("id", "userId", "linkedinUrl", "overallScore", "sectionScores", "recommendations", "rawProfileData", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (
                analysis_id,
                user_id,
                linkedin_url,
                overall,
                json.dumps(scores["sectionScores"]),
                json.dumps(recommendations),
                json.dumps(raw_data)
            ))
        conn.commit()

    return {
        "id": analysis_id,
        "overallScore": overall,
        "sectionScores": scores["sectionScores"],
        "recommendations": recommendations,
        "rawProfileData": raw_data
    }


@router.post("/api/linkedin/scrape")
@limiter.limit("10/minute", key_func=_rate_key)
async def start_linkedin_scrape(request: Request, payload: LinkedInScrapeRequest):
    """
    Kicks off the Apify scrape and hands the run id back immediately. The
    dashboard then polls /api/linkedin/scrape/status while it plays its
    fetching animation.
    """
    _require_internal_auth(request)

    try:
        linkedin_url = apify_linkedin.normalize_linkedin_url(payload.linkedinUrl)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        run = await apify_linkedin.start_profile_run(linkedin_url)
    except ApifyError as e:
        raise HTTPException(status_code=e.status, detail=str(e))
    except Exception as e:
        logger.error("LinkedIn scrape start error: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail="Could not reach the scraping service.")

    logger.info("Started LinkedIn scrape run %s for user %s", run["runId"], payload.userId)
    return {
        "runId": run["runId"],
        "status": run["status"],
        "linkedinUrl": linkedin_url,
    }


@router.post("/api/linkedin/scrape/status")
@limiter.limit("60/minute", key_func=_rate_key)
async def linkedin_scrape_status(request: Request, payload: LinkedInScrapeStatusRequest):
    """
    Polling endpoint. While the actor is working this returns {status: RUNNING}.
    Once it succeeds we pull the dataset item, normalise it, score it against
    the master profile, store it, and return the finished analysis.
    """
    _require_internal_auth(request)

    try:
        linkedin_url = apify_linkedin.normalize_linkedin_url(payload.linkedinUrl)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        run = await apify_linkedin.get_run(payload.runId)
    except ApifyError as e:
        raise HTTPException(status_code=e.status, detail=str(e))

    state = run["status"]

    if state in apify_linkedin.PENDING_STATES:
        return {"status": "RUNNING", "state": state, "message": run.get("statusMessage") or ""}

    if state != apify_linkedin.SUCCESS_STATE:
        logger.warning("LinkedIn scrape run %s ended as %s", payload.runId, state)
        return {
            "status": "FAILED",
            "state": state,
            "error": "The scraper could not finish reading that profile. Please check the URL and try again.",
        }

    dataset_id = run.get("datasetId")
    if not dataset_id:
        return {"status": "FAILED", "state": state, "error": "The scrape finished but returned no data."}

    try:
        items = await apify_linkedin.fetch_dataset_items(dataset_id, limit=1)
    except ApifyError as e:
        raise HTTPException(status_code=e.status, detail=str(e))

    if not items:
        return {
            "status": "FAILED",
            "state": state,
            "error": "No profile was found at that URL. Make sure it is a public LinkedIn profile.",
        }

    raw_profile_data = apify_linkedin.normalize_profile(items[0], linkedin_url)

    if not raw_profile_data.get("name") and not raw_profile_data.get("headline"):
        return {
            "status": "FAILED",
            "state": state,
            "error": "That profile came back empty — it may be private or the URL may be wrong.",
        }

    try:
        result = await _analyze_and_store(
            payload.userId, linkedin_url, raw_profile_data, payload.masterProfileId
        )
    except Exception as e:
        logger.error("LinkedIn scrape analysis error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to analyze the scraped profile.")

    return {"status": "SUCCEEDED", "state": state, "result": result}


@router.post("/api/linkedin/ingest")
@limiter.limit("20/minute", key_func=_rate_key)
async def ingest_linkedin(request: Request, payload: LinkedInIngestRequest):
    """
    Scores a profile payload we were handed directly, without going through
    Apify. Kept for callers that already hold the profile JSON.
    """
    _require_internal_auth(request)
    try:
        return await _analyze_and_store(
            payload.userId,
            payload.linkedinUrl,
            payload.rawProfileData,
            payload.masterProfileId,
        )
    except Exception as e:
        logger.error("LinkedIn Ingest error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to analyze the profile.")


@router.post("/api/linkedin/optimize")
@limiter.limit("10/minute", key_func=_rate_key)
async def optimize_linkedin(request: Request, payload: LinkedInOptimizeRequest):
    _require_internal_auth(request)
    try:
        user_id = payload.userId
        raw_data = _normalize_linkedin_profile(payload.rawProfileData)
        
        # 1. Fetch Master Profile Data
        master_data_text = ""
        master_score_text = ""
        master_data = {}
        current_score = 0.0
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if payload.masterProfileId:
                    cur.execute("SELECT parsed_data FROM master_profiles WHERE id = %s AND user_id = %s", (payload.masterProfileId, user_id))
                else:
                    cur.execute("SELECT parsed_data FROM master_profiles WHERE user_id = %s AND is_default = TRUE LIMIT 1", (user_id,))
                    
                row = cur.fetchone()
                if row and row[0]:
                    parsed_data = row[0] if isinstance(row[0], dict) else json.loads(row[0])
                    master_data = parsed_data if isinstance(parsed_data, dict) else {}
                    master_score_text = json.dumps(parsed_data, sort_keys=True)
                    master_data_text = json.dumps(parsed_data, indent=2, sort_keys=True)

                cur.execute(
                    'SELECT "overallScore" FROM "LinkedInAnalysis" WHERE "id" = %s AND "userId" = %s',
                    (payload.analysisId, user_id),
                )
                analysis_row = cur.fetchone()
                if not analysis_row:
                    raise HTTPException(status_code=404, detail="LinkedIn analysis not found.")
                current_score = float(analysis_row[0] or 0)

        current_profile_text = _build_linkedin_profile_text(raw_data)
        loop = asyncio.get_event_loop()
        current_scores = await loop.run_in_executor(
            None,
            partial(_compute_linkedin_scores, master_score_text, current_profile_text, raw_data),
        )
        master_keywords = _collect_master_keywords(master_data)
        skill_keys = {skill.lower() for skill in master_keywords}
        missing_keywords = [skill for skill in _coerce_skill_list(current_scores.get("keyword_details", {}).get("missing_keywords", []))
                            if skill.lower() in skill_keys]
                    
        # 2. Prompt Gemini to rewrite the full profile
        prompt = f"""You are an expert LinkedIn profile optimizer and career coach. 
Your goal is to completely rewrite the user's LinkedIn profile to make it highly professional, keyword-rich, and impactful.
You must use the provided "Master Resume Data" as the ultimate source of truth for their skills, experiences, and achievements.
Do not invent facts. Enhance the descriptions using action verbs and highlight measurable impact.
All skills and associatedSkills values must be actual professional skills, tools, technologies or competencies supported by the source. Never put emails, phone numbers, contact details, URLs, names, locations, section headings or certification headings in skill lists.
The current algorithmic profile strength score is {round(current_score, 1)}.
Optimize specifically for this scoring rubric:
- Completeness: keep headline, about, experience, education, and skills populated when source data exists.
- Keywords: naturally include these missing master-profile keywords where truthful: {json.dumps(missing_keywords[:15])}.
- Semantic match: align the profile language with the master resume.
- Impact: write 3-5 concise bullets per experience, start bullets with strong action verbs, and include measurable metrics only when they exist in the provided data.
- Readability: write a clear LinkedIn About section around 80-220 words, split into 2-3 short paragraphs.
- Projects: keep or create LinkedIn project entries from the user's real experience/master resume. Add detailed descriptions and relevant skills.
- Headline: keep under 220 characters and use separators like | or - to include important keywords.
Every optimized section should be strong enough to score 90+ under this rubric.

--- CURRENT LINKEDIN PROFILE ---
{json.dumps(raw_data, indent=2)}

--- MASTER RESUME DATA ---
{master_data_text if master_data_text else "No master resume provided. Just improve the current LinkedIn text."}

You must output a raw JSON object (NO markdown formatting, NO ```json blocks) that exactly matches this schema:
{{
    "headline": "A highly optimized, keyword-rich professional headline (under 220 chars).",
    "about": "A professionally rewritten About section, 80-220 words in 2-3 short paragraphs, engaging and highlighting their value proposition.",
    "experience": [
        {{
            "title": "Job Title",
            "company": "Company Name",
            "dateRange": "Dates",
            "location": "Location",
            "description": "Optimized description with bullet points using bullet characters (•). Include metrics and impact from the master resume.",
            "associatedSkills": "Skill 1, Skill 2, Skill 3"
        }}
    ],
    "education": [
        {{
            "school": "School Name",
            "degree": "Degree Info",
            "dateRange": "Dates"
        }}
    ],
    "projects": [
        {{
            "title": "Project Title",
            "dateRange": "Dates if available",
            "associatedWith": "Company or school if available",
            "description": "Detailed LinkedIn project description based only on the provided profile/resume facts.",
            "skills": ["Skill 1", "Skill 2", "Skill 3"]
        }}
    ],
    "skills": [
        "Skill 1", "Skill 2", "Skill 3"
    ]
}}

Keep the original number of experiences and education items if possible, but aggressively rewrite their descriptions and skills arrays using the Master Resume data.
"""
        generation_config = genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.2,
        )

        response = await loop.run_in_executor(
            None,
            partial(model.generate_content, prompt, generation_config=generation_config),
        )
        result = extract_json_from_response(response.text)
        if not isinstance(result, dict) or not result:
            logger.warning("LinkedIn Optimize returned invalid AI JSON. Using deterministic fallback optimization.")
            result = _fallback_linkedin_optimization(raw_data, master_keywords, missing_keywords, master_data)

        result = _ensure_score_friendly_profile(result, raw_data, master_keywords, missing_keywords, master_data)
        optimized_profile_text = _build_linkedin_profile_text(result)
        optimized_scores = await loop.run_in_executor(
            None,
            partial(_compute_linkedin_scores, master_score_text, optimized_profile_text, result),
        )
        optimized_score = round(float(optimized_scores.get("overall_score", current_score)), 1)

        if optimized_score < current_score:
            logger.info(
                "LinkedIn optimized score %.1f was below current %.1f; trying deterministic fallback.",
                optimized_score,
                current_score,
            )
            fallback_result = _fallback_linkedin_optimization(raw_data, master_keywords, missing_keywords, master_data)
            fallback_profile_text = _build_linkedin_profile_text(fallback_result)
            fallback_scores = await loop.run_in_executor(
                None,
                partial(_compute_linkedin_scores, master_score_text, fallback_profile_text, fallback_result),
            )
            fallback_score = round(float(fallback_scores.get("overall_score", 0)), 1)
            if fallback_score >= optimized_score:
                result = fallback_result
                optimized_scores = fallback_scores
                optimized_score = fallback_score

        result["optimizedScore"] = optimized_score
        result["optimizedSectionScores"] = optimized_scores.get("sectionScores", {})
        result["scoreDelta"] = round(max(0.0, optimized_score - current_score), 1)
        
        # Save optimized content to DB
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE "LinkedInAnalysis"
                    SET "optimizedContent" = %s, "updatedAt" = NOW()
                    WHERE "id" = %s AND "userId" = %s
                """, (json.dumps(result), payload.analysisId, payload.userId))
            conn.commit()

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("LinkedIn Optimize error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate optimizations.")
