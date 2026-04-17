"""
Job-Score Route
===============
POST /api/score-job — keyword + semantic match score against user profile

Production fix: SentenceTransformer.encode() is CPU-bound (PyTorch).
Calling it directly inside an async def froze the event loop for every
request.  Both encodes are now batched into a single run_in_executor call
so the event loop stays free.
"""

import asyncio
import logging
import re
from functools import partial

from fastapi import APIRouter, Request
from sentence_transformers import util

from app.limiter import limiter
from app.models.schemas import ScoreRequest
from app.services.ml_models import get_match_model

router = APIRouter()
logger = logging.getLogger("score")


def _encode_pair(jd_text: str, profile_text: str):
    """Encode JD + profile in one forward pass (single thread, no GIL contention)."""
    model = get_match_model()
    embeddings = model.encode([jd_text, profile_text], convert_to_tensor=True)
    return embeddings[0], embeddings[1]


@router.post("/api/score-job")
@limiter.limit("30/minute")
async def score_job(request: Request, payload: ScoreRequest):
    try:
        # ── Keyword scoring (pure Python — fast, no thread needed) ──
        jd_clean         = payload.jobDescription.lower()
        user_skills_clean = [s.strip().lower() for s in payload.userSkills if s.strip()]

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
            "shell", "c", "unix", "ubuntu", "macos", "windows", "devops",
        }

        hunt_list = COMMON_TECH_SKILLS.union(set(user_skills_clean))

        jd_skills_found = set()
        for skill in hunt_list:
            if re.search(r'\b' + re.escape(skill) + r'\b', jd_clean):
                jd_skills_found.add(skill)

        matched_keywords = [s for s in jd_skills_found if s in user_skills_clean]
        missing_keywords = [s for s in jd_skills_found if s not in user_skills_clean]

        total_jd_skills = len(jd_skills_found)
        if total_jd_skills == 0:
            keyword_score = 50
        else:
            keyword_score = min((len(matched_keywords) / total_jd_skills) * 1.5 * 100, 100)

        # ── Semantic scoring — offloaded to thread pool ──
        semantic_score = 0
        try:
            loop = asyncio.get_event_loop()
            emb_jd, emb_profile = await loop.run_in_executor(
                None,
                partial(_encode_pair, payload.jobDescription, payload.userProfile),
            )
            similarity = util.cos_sim(emb_jd, emb_profile).item()

            if similarity <= 0.2:
                semantic_score = 0
            elif similarity >= 0.7:
                semantic_score = 100
            else:
                semantic_score = ((similarity - 0.2) / 0.5) * 100

        except Exception as e:
            logger.error("Semantic scoring failed: %s", e)
            semantic_score = 0

        # ── Hybrid score ──
        if semantic_score > 0:
            final_score = (0.4 * keyword_score) + (0.6 * semantic_score)
        else:
            final_score = keyword_score

        return {
            "score": min(int(final_score), 100),
            "breakdown": {
                "semantic":            min(int(semantic_score), 100),
                "keyword":             min(int(keyword_score), 100),
                "match_count":         len(matched_keywords),
                "total_unique_jd_words": total_jd_skills,
                "matching_keywords":   list(matched_keywords)[:15],
                "missing_keywords":    list(missing_keywords)[:15],
            },
        }

    except Exception as e:
        logger.error("Scoring error: %s", e)
        return {"score": 0, "breakdown": {"semantic": 0, "keyword": 0}, "error": "Scoring failed. Please try again."}
