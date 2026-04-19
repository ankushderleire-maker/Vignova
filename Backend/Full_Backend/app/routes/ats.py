"""
ATS Analysis Route
==================
POST /api/calculate-ats    — full algorithmic ATS score
POST /api/enhance-ats-report — LLM narrative report on top of scores

Production fixes applied:
  - All CPU-bound work (PyTorch embeddings, NLTK, Gemini API calls) is
    offloaded to asyncio.run_in_executor so the event loop is never blocked.
  - _ATS_SEMAPHORE(5) caps concurrent analyses to prevent CPU saturation
    from stacked PyTorch inference calls.
  - Request parameter added to every endpoint (required by slowapi).
"""

import asyncio
import json
import logging
from functools import partial

import fitz  # PyMuPDF
import google.generativeai as genai
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from app.config import model
from app.limiter import limiter
from app.utils.llm_cache import llm_cache
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

router = APIRouter()
logger = logging.getLogger("ats")

MAX_FILE_SIZE  = 5 * 1024 * 1024   # 5 MB
MAX_TEXT_LENGTH = 100_000           # 100 K characters

# Limit simultaneous heavy analyses to 5 — prevents stacked PyTorch inference
# from saturating all CPU cores when many users hit the endpoint at once.
_ATS_SEMAPHORE = asyncio.Semaphore(5)


# ── Sync worker (runs in thread pool) ─────────────────────────────────

def _compute_ats_scores(jd_text: str, resume_text: str) -> dict:
    """
    All CPU-bound / blocking-I/O helpers grouped into one callable so a
    single run_in_executor() call covers every blocking operation.
    """
    return {
        "semantic":    calculate_semantic_score(jd_text, resume_text),
        "keyword":     calculate_keyword_score(jd_text, resume_text),
        "section":     calculate_section_score(resume_text),
        "impact":      calculate_impact_score(resume_text),
        "readability": calculate_readability_score(resume_text),
        "format":      calculate_format_score(resume_text),
        "experience":  detect_experience_level(resume_text),
        "content":     calculate_content_analysis(resume_text),
    }


# ── Routes ─────────────────────────────────────────────────────────────

@router.post("/api/calculate-ats")
@limiter.limit("20/minute")
async def calculate_ats(
    request: Request,
    jd_text: str = Form(...),
    resume_text: str = Form(""),
    resume_file: UploadFile = File(None),
):
    if jd_text and len(jd_text) > MAX_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail="Job description too long. Maximum 100,000 characters.")
    if resume_text and len(resume_text) > MAX_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail="Resume text too long. Maximum 100,000 characters.")

    # ── Step 1: Text extraction ──
    final_resume_text = resume_text
    if resume_file and resume_file.filename:
        content = await resume_file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB.")
        if resume_file.content_type == "application/pdf":
            try:
                doc = fitz.open(stream=content, filetype="pdf")
                final_resume_text = "".join(page.get_text() + "\n" for page in doc).strip()
            except Exception as e:
                logger.warning("PyMuPDF extraction error: %s", e)
                final_resume_text = resume_text

    if not final_resume_text:
        raise HTTPException(status_code=400, detail="No resume text or valid file provided.")

    # ── Step 2: Run all analyzers in a thread — never blocks event loop ──
    async with _ATS_SEMAPHORE:
        try:
            loop   = asyncio.get_event_loop()
            scores = await loop.run_in_executor(
                None,
                partial(_compute_ats_scores, jd_text, final_resume_text),
            )
        except Exception as e:
            logger.error("ATS calculation error: %s", e, exc_info=True)
            raise HTTPException(status_code=500, detail="ATS analysis failed. Please try again.")

    semantic_result    = scores["semantic"]
    keyword_result     = scores["keyword"]
    section_result     = scores["section"]
    impact_result      = scores["impact"]
    readability_result = scores["readability"]
    format_result      = scores["format"]
    experience_info    = scores["experience"]
    content_analysis   = scores["content"]

    # ── Step 3: Weighted overall score ──
    overall_ats_score = (
        0.25 * keyword_result["score"]     +
        0.20 * semantic_result             +
        0.15 * section_result["score"]     +
        0.15 * impact_result["score"]      +
        0.10 * readability_result["score"] +
        0.15 * format_result["score"]
    )

    # ── Step 4: Categorised improvements ──
    improvements = []

    if keyword_result.get("missing") and len(keyword_result["missing"]) > 0:
        improvements.append({
            "category": "Keywords",
            "severity": "high" if keyword_result["score"] < 40 else "medium",
            "message":  f"Missing key terms: {', '.join(keyword_result['missing_keywords'][:5])}. Incorporate these if they match your experience.",
        })

    missing_sections = [
        k.replace("has_", "").replace("_", " ").title()
        for k, v in section_result["feedback"].items() if not v
    ]
    if missing_sections:
        improvements.append({
            "category": "Structure",
            "severity": "high" if len(missing_sections) >= 3 else "medium",
            "message":  f"Missing resume sections: {', '.join(missing_sections)}. Add these for better ATS parsing.",
        })

    impact_details = impact_result["details"]
    if impact_details["action_verb_count"] < 5:
        improvements.append({
            "category": "Impact",
            "severity": "medium",
            "message":  f"Only {impact_details['action_verb_count']} action verbs found. Use verbs like 'Implemented', 'Optimized', 'Delivered' to start bullet points.",
        })
    if impact_details["total_metrics"] < 3:
        improvements.append({
            "category": "Impact",
            "severity": "high",
            "message":  f"Only {impact_details['total_metrics']} quantified metrics found. Add numbers, percentages ($, %) to show measurable impact — aim for 6+.",
        })

    read_details = readability_result["details"]
    if read_details["avg_sentence_length"] > 25:
        improvements.append({
            "category": "Readability",
            "severity": "medium",
            "message":  f"Average sentence length is {read_details['avg_sentence_length']} words. Keep sentences under 20 words for ATS readability.",
        })
    if read_details["word_count"] < 250:
        improvements.append({
            "category": "Readability",
            "severity": "high",
            "message":  f"Resume is only {read_details['word_count']} words. Expand descriptions to at least 300 words.",
        })
    if read_details["word_count"] > 900:
        improvements.append({
            "category": "Readability",
            "severity": "low",
            "message":  f"Resume is {read_details['word_count']} words — trim to 400–700 words for better focus.",
        })

    fmt_checks = format_result["checks"]
    if not fmt_checks.get("has_email"):
        improvements.append({"category": "Format", "severity": "high",   "message": "No email address detected. Contact info is essential for ATS."})
    if not fmt_checks.get("has_phone"):
        improvements.append({"category": "Format", "severity": "medium", "message": "No phone number detected. Add a phone number for recruiter contact."})
    if not fmt_checks.get("no_smart_quotes"):
        improvements.append({"category": "Format", "severity": "low",    "message": "Smart quotes/special characters detected — these can break ATS parsing. Use plain text."})
    if not fmt_checks.get("has_dates"):
        improvements.append({"category": "Format", "severity": "medium", "message": "Few date references found. Ensure all roles have clear start/end dates."})

    if not improvements:
        improvements.append({"category": "Overall", "severity": "low", "message": "Great job! Your resume is well-optimized for this job description."})

    severity_order = {"high": 0, "medium": 1, "low": 2}
    improvements.sort(key=lambda x: severity_order.get(x.get("severity", "low"), 2))

    return {
        "overall_ats_score":   round(min(overall_ats_score, 100), 1),
        "semantic_match_score": round(semantic_result, 1),
        "keyword_score":        round(keyword_result["score"], 1),
        "section_score":        round(section_result["score"], 1),
        "impact_score":         round(impact_result["score"], 1),
        "readability_score":    round(readability_result["score"], 1),
        "format_score":         round(format_result["score"], 1),
        "found_skills":         keyword_result["found"],
        "missing_skills":       keyword_result["missing"],
        "found_keywords":       keyword_result["found_keywords"],
        "missing_keywords":     keyword_result["missing_keywords"],
        "section_feedback":     section_result["feedback"],
        "impact_details":       impact_result["details"],
        "readability_details":  readability_result["details"],
        "format_checks":        fmt_checks,
        "experience_info":      experience_info,
        "improvements":         improvements,
        "content_analysis":     content_analysis,
    }


_ATS_JD_MAX      = 5_000   # ~1.25k tokens
_ATS_RESUME_MAX  = 6_000   # ~1.5k tokens


@router.post("/api/enhance-ats-report")
@limiter.limit("10/minute")
async def enhance_ats_report(
    request: Request,
    jd_text:     str = Form(...),
    resume_text: str = Form(...),
    ats_scores:  str = Form(...),
):
    try:
        scores = json.loads(ats_scores)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid ats_scores JSON: {e}")

    # Check cache first — same inputs produce same analysis
    cached = llm_cache.get("ats_enhance", jd_text[:500], resume_text[:500], ats_scores[:200])
    if cached is not None:
        return cached

    # Truncate heavy text fields to keep prompt under ~4k tokens
    jd_trimmed     = jd_text[:_ATS_JD_MAX]
    resume_trimmed = resume_text[:_ATS_RESUME_MAX]

    found_kw     = json.dumps(scores.get("found_keywords", [])[:15])
    missing_kw   = json.dumps(scores.get("missing_keywords", [])[:15])
    section_fb   = json.dumps(scores.get("section_feedback", {}))
    impact_det   = json.dumps(scores.get("impact_details", {}))
    improvements = json.dumps(scores.get("improvements", [])[:5])

    prompt = f"""You are an expert ATS analyst. A resume has been algorithmically scored against a job description.
Provide DETAILED, ACTIONABLE insights based on these REAL scores — do NOT recalculate them.

=== ATS SCORES ===
Overall: {scores.get('overall_ats_score', 0)}%  Keyword: {scores.get('keyword_score', 0)}%
Semantic: {scores.get('semantic_score', 0)}%  Section: {scores.get('section_score', 0)}%
Impact: {scores.get('impact_score', 0)}%  Readability: {scores.get('readability_score', 0)}%
Format: {scores.get('format_score', 0)}%

Found Keywords: {found_kw}
Missing Keywords: {missing_kw}
Section Feedback: {section_fb}
Impact Details: {impact_det}
Existing Improvements: {improvements}

=== JOB DESCRIPTION (excerpt) ===
{jd_trimmed}

=== RESUME TEXT (excerpt) ===
{resume_trimmed}

Return JSON (no markdown):
{{
  "executive_summary": "<2-3 sentence expert summary>",
  "keyword_insights": {{
    "analysis": "<keyword coverage paragraph>",
    "critical_missing": ["<top 5 missing keywords>"],
    "keyword_placement_tips": ["<where to place them>"]
  }},
  "experience_review": {{
    "analysis": "<alignment with JD>",
    "strong_points": ["<2-3 strong aspects>"],
    "gaps": ["<2-3 gaps>"]
  }},
  "impact_review": {{
    "analysis": "<bullet quality>",
    "weak_bullets": ["<quote actual weak bullets>"],
    "rewrite_suggestions": [{{"original": "<weak>", "improved": "<rewritten>"}}]
  }},
  "section_recommendations": [{{"section": "<name>", "status": "<strong|needs_improvement|missing>", "feedback": "<specific>", "suggestion": "<what to change>"}}],
  "formatting_tips": ["<ATS formatting improvements>"],
  "competitive_insights": {{
    "differentiators": ["<what stands out>"],
    "missing_edge": ["<what could differentiate>"]
  }},
  "action_plan": [{{"priority": 1, "action": "<instruction>", "impact": "<high|medium|low>", "expected_score_boost": "<pts>"}}]
}}
Rules: action_plan max 8 items; rewrite_suggestions 2-4 items; quote actual resume text; no generic advice."""

    generation_config = genai.GenerationConfig(
        response_mime_type="application/json",
        temperature=0.3,
    )

    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            partial(model.generate_content, prompt, generation_config=generation_config),
        )
        result = json.loads(response.text)
        llm_cache.set("ats_enhance", result, jd_text[:500], resume_text[:500], ats_scores[:200])
        return result
    except json.JSONDecodeError as e:
        logger.error("Enhancement JSON parse error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to parse AI report. Please try again.")
    except Exception as e:
        logger.error("ATS enhancement error: %s", e, exc_info=True)
        msg = str(e).lower()
        if "429" in str(e) or "quota" in msg:
            raise HTTPException(status_code=429, detail="Our AI is busy right now. Please wait a moment and try again.")
        raise HTTPException(status_code=500, detail="ATS enhancement failed. Please try again.")
