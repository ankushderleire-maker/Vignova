"""
LinkedIn Optimizer Route
======================
POST /api/linkedin/ingest    — Ingests raw data from Chrome extension, compares with master profile, generates score
POST /api/linkedin/optimize  — Generates AI rewrites for profile sections
"""

import asyncio
import json
import logging
from functools import partial

import google.generativeai as genai
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List

from app.config import model
from app.limiter import limiter
from app.utils.llm_cache import llm_cache
from app.db_pool import get_db_connection
from app.services.ats_helpers import (
    calculate_impact_score,
    calculate_keyword_score,
    calculate_semantic_score,
    calculate_readability_score
)

router = APIRouter()
logger = logging.getLogger("linkedin")

_LINKEDIN_SEMAPHORE = asyncio.Semaphore(5)

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
        # Default fallback if no master profile
        keyword_res = calculate_keyword_score(profile_text, profile_text)
        semantic_score = 100
        
    # 3. Experience Impact Score
    impact_res = calculate_impact_score(raw_data.get("experience_text", ""))
    
    # 4. Readability Score for About section
    readability_res = calculate_readability_score(raw_data.get("about", ""))
    
    # 5. Headline Analysis
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

    return {
        "overall_score": round(min(overall_score, 100), 1),
        "sectionScores": {
            "completeness": round(completeness_score, 1),
            "keyword": round(keyword_res["score"], 1),
            "semantic": round(semantic_score, 1),
            "impact": round(impact_res["score"], 1),
            "readability": round(readability_res["score"], 1),
            "headline": round(headline_score, 1)
        },
        "missing_sections": missing_sections,
        "keyword_details": keyword_res,
        "impact_details": impact_res["details"],
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

@router.post("/api/linkedin/ingest")
@limiter.limit("20/minute")
async def ingest_linkedin(request: Request, payload: LinkedInIngestRequest):
    try:
        user_id = payload.userId
        master_text = ""
        
        # 1. Fetch Master Profile to compare against
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if payload.masterProfileId:
                    cur.execute("SELECT parsed_data FROM master_profiles WHERE id = %s AND user_id = %s", (payload.masterProfileId, user_id))
                else:
                    cur.execute("SELECT parsed_data FROM master_profiles WHERE user_id = %s AND is_default = TRUE LIMIT 1", (user_id,))
                    
                row = cur.fetchone()
                if row and row[0]:
                    # Convert JSON to text for comparison
                    parsed_data = row[0] if isinstance(row[0], dict) else json.loads(row[0])
                    master_text = json.dumps(parsed_data)
            
        # 2. Prepare LinkedIn text
        raw_data = _remove_null_bytes(payload.rawProfileData)
        exp_text = ""
        if "experience" in raw_data and isinstance(raw_data["experience"], list):
            for exp in raw_data["experience"]:
                exp_text += f"{exp.get('title', '')} {exp.get('company', '')} {exp.get('description', '')}\n"
        raw_data["experience_text"] = exp_text
        
        profile_text = f"{raw_data.get('headline', '')}\n{raw_data.get('about', '')}\n{exp_text}\n"
        if "skills" in raw_data and isinstance(raw_data["skills"], list):
            profile_text += ", ".join(raw_data["skills"])

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
        import uuid
        analysis_id = str(uuid.uuid4()) # using uuid instead of cuid is fine if id is String
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO "LinkedInAnalysis" 
                    ("id", "userId", "linkedinUrl", "overallScore", "sectionScores", "recommendations", "rawProfileData", "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, (
                    analysis_id,
                    user_id,
                    payload.linkedinUrl,
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

    except Exception as e:
        logger.error("LinkedIn Ingest error: %s", e, exc_info=True)
        import traceback
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}\n{traceback.format_exc()}")


@router.post("/api/linkedin/optimize")
@limiter.limit("10/minute")
async def optimize_linkedin(request: Request, payload: LinkedInOptimizeRequest):
    try:
        user_id = payload.userId
        raw_data = payload.rawProfileData
        
        # 1. Fetch Master Profile Data
        master_data_text = ""
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if payload.masterProfileId:
                    cur.execute("SELECT parsed_data FROM master_profiles WHERE id = %s AND user_id = %s", (payload.masterProfileId, user_id))
                else:
                    cur.execute("SELECT parsed_data FROM master_profiles WHERE user_id = %s AND is_default = TRUE LIMIT 1", (user_id,))
                    
                row = cur.fetchone()
                if row and row[0]:
                    parsed_data = row[0] if isinstance(row[0], dict) else json.loads(row[0])
                    master_data_text = json.dumps(parsed_data, indent=2)
                    
        # 2. Prompt Gemini to rewrite the full profile
        prompt = f"""You are an expert LinkedIn profile optimizer and career coach. 
Your goal is to completely rewrite the user's LinkedIn profile to make it highly professional, keyword-rich, and impactful.
You must use the provided "Master Resume Data" as the ultimate source of truth for their skills, experiences, and achievements.
Do not invent facts. Enhance the descriptions using action verbs and highlight measurable impact.

--- CURRENT LINKEDIN PROFILE ---
{json.dumps(raw_data, indent=2)}

--- MASTER RESUME DATA ---
{master_data_text if master_data_text else "No master resume provided. Just improve the current LinkedIn text."}

You must output a raw JSON object (NO markdown formatting, NO ```json blocks) that exactly matches this schema:
{{
    "headline": "A highly optimized, keyword-rich professional headline (under 220 chars).",
    "about": "A professionally rewritten about section, 2-3 paragraphs, engaging and highlighting their value proposition.",
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
    "skills": [
        "Skill 1", "Skill 2", "Skill 3"
    ]
}}

Keep the original number of experiences and education items if possible, but aggressively rewrite their descriptions and skills arrays using the Master Resume data.
"""
        generation_config = genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.7,
        )

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            partial(model.generate_content, prompt, generation_config=generation_config),
        )
        result = json.loads(response.text)
        
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

    except Exception as e:
        logger.error("LinkedIn Optimize error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate optimizations.")
