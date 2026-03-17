import json
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import fitz  # PyMuPDF
import google.generativeai as genai

from app.config import model
from app.services.ats_helpers import (
    calculate_semantic_score,
    calculate_keyword_score,
    calculate_section_score,
    calculate_impact_score,
    calculate_readability_score,
    calculate_format_score,
    detect_experience_level,
)
from app.services.content_analysis import calculate_content_analysis

router = APIRouter()
logger = logging.getLogger("ats")

# Limits
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_TEXT_LENGTH = 100000  # 100K characters


# ───────────── ATS ENDPOINT ─────────────

@router.post("/api/calculate-ats")
async def calculate_ats(
    jd_text: str = Form(...),
    resume_text: str = Form(""),
    resume_file: UploadFile = File(None)
):
    try:
        # Input length validation
        if jd_text and len(jd_text) > MAX_TEXT_LENGTH:
            raise HTTPException(status_code=400, detail="Job description too long. Maximum 100,000 characters.")
        if resume_text and len(resume_text) > MAX_TEXT_LENGTH:
            raise HTTPException(status_code=400, detail="Resume text too long. Maximum 100,000 characters.")
        # ── Step 1: Text Extraction ──
        final_resume_text = resume_text
        if resume_file and resume_file.filename:
            content = await resume_file.read()
            # Enforce file size limit
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB.")
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ATS Calculation Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="ATS analysis failed. Please try again.")

# ───────────── ATS ENHANCEMENT ENDPOINT (LLM Report based on real scores) ─────────────

@router.post("/api/enhance-ats-report")
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
        logger.error(f"Enhancement JSON Parse Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI report. Please try again.")
    except Exception as e:
        logger.error(f"ATS Enhancement Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="ATS enhancement failed. Please try again.")
