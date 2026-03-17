import re
import logging
from fastapi import APIRouter
from sentence_transformers import util

from app.models.schemas import ScoreRequest
from app.services.ml_models import get_match_model

router = APIRouter()
logger = logging.getLogger("score")


@router.post("/api/score-job")
async def score_job(payload: ScoreRequest):
    try:
        # 1. Skill-Based Keyword Extraction
        jd_clean = payload.jobDescription.lower()
        user_skills_clean = [s.strip().lower() for s in payload.userSkills if s.strip()]

        # A robust list of common technical skills to hunt for in the JD
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
            "graphql", "bash", "shell", "c", "unix", "ubuntu", "macos", "windows", "devops"
        }

        # Combine common skills with the user's explicit skills
        # This ensures we don't miss niche skills the user has if they appear in the JD
        hunt_list = COMMON_TECH_SKILLS.union(set(user_skills_clean))

        jd_skills_found = set()
        # Use regex word boundaries to avoid partial matches (e.g. "go" matching "good")
        for skill in hunt_list:
            # Escape to handle skills like c++, c#
            escaped_skill = re.escape(skill)
            if re.search(r'\b' + escaped_skill + r'\b', jd_clean):
                jd_skills_found.add(skill)

        matched_keywords = []
        missing_keywords = []

        for skill in jd_skills_found:
            # A skill is matched if the user has it explicitly
            if skill in user_skills_clean:
                matched_keywords.append(skill)
            else:
                missing_keywords.append(skill)

        total_jd_skills = len(jd_skills_found)
        match_count = len(matched_keywords)

        if total_jd_skills == 0:
            # Fallback if no specific skills are found: assume Keyword score is OK
            keyword_score = 50
        else:
            raw_percentage = match_count / total_jd_skills
            # We don't need a massive multiplier anymore because we are strictly matching skills
            # But we can still be slightly forgiving (e.g., getting 75% of requested skills is amazing)
            keyword_score = min(raw_percentage * 1.5 * 100, 100)

        # 6. Semantic Scoring (Sentence Transformer Cosine Similarity)
        try:
            model = get_match_model()
            # Generate embeddings for JD and Profile
            embeddings1 = model.encode(payload.jobDescription, convert_to_tensor=True)
            embeddings2 = model.encode(payload.userProfile, convert_to_tensor=True)
            
            # Compute cosine-similarities
            cosine_scores = util.cos_sim(embeddings1, embeddings2)
            similarity = cosine_scores.item() # Returns a value typically between 0 and 1
            
            # Scale similarity: 0.3 is usually quite distinct, 0.7+ is very similar in STS
            # Map [0.2, 0.7] to [0, 100] to be generous
            if similarity <= 0.2:
                semantic_score = 0
            elif similarity >= 0.7:
                semantic_score = 100
            else:
                semantic_score = ((similarity - 0.2) / 0.5) * 100
                
        except Exception as e:
            print(f"Semantic Scoring Failed: {e}")
            semantic_score = 0

        # 7. Hybrid Score Calculation
        # Weighted: 40% Keywords, 60% Semantic
        # Semantic mapping handles "related theory/concepts" much better
        if semantic_score > 0:
            final_score = (0.4 * keyword_score) + (0.6 * semantic_score)
        else:
            final_score = keyword_score

        # Cap at 100 and round
        final_score = min(int(final_score), 100)
        semantic_int = min(int(semantic_score), 100)
        keyword_int = min(int(keyword_score), 100)

        # 8. Return Structure
        return {
            "score": final_score,
            "breakdown": {
                "semantic": semantic_int, 
                "keyword": keyword_int, 
                
                # Extra data for debugging & frontend features
                "match_count": match_count,
                "total_unique_jd_words": total_jd_skills,
                "matching_keywords": list(matched_keywords)[:15],
                "missing_keywords": list(missing_keywords)[:15]
            }
        }

    except Exception as e:
        logger.error(f"Scoring Error: {e}")
        return {"score": 0, "breakdown": {"semantic": 0, "keyword": 0}, "error": "Scoring failed. Please try again."}
