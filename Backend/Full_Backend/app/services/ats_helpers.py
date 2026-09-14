import html
import os
import re
import json
import datetime
import logging
import hashlib
from pathlib import Path
import nltk
from nltk.stem import WordNetLemmatizer
from sentence_transformers import util
import google.generativeai as genai

from app.config import model as _gemini_model
from app.services import openai_client
from app.services.ml_models import semantic_model

logger = logging.getLogger("ats_helpers")
CACHE_PATH = Path(__file__).resolve().parents[2] / "data" / "ats_keyword_cache.json"


# ───────────── ATS HELPER FUNCTIONS ─────────────

def chunk_text(text: str, max_words: int = 200, overlap: int = 50) -> list:
    """Split long text into overlapping chunks for the sentence transformer."""
    words = text.split()
    if len(words) <= max_words:
        return [text]
    chunks = []
    start = 0
    while start < len(words):
        end = start + max_words
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += max_words - overlap
    return chunks


# Lines a job board wraps around the posting. They carry no requirement, and
# pasted as-is they became "keywords" ("skip", "nbsp", "job") and pulled the
# semantic comparison towards page chrome.
_JOB_BOARD_CHROME = {
    "skip to main content", "skip to content", "about the job", "show more", "show less",
    "see more", "apply", "easy apply", "save", "report this job", "job details",
    "full job description", "job description",
}


def clean_job_description(text: str) -> str:
    """The posting without HTML entities and job-board chrome lines."""
    cleaned = html.unescape(text or "").replace("\xa0", " ")
    cleaned = re.sub(r"\bnbsp;?", " ", cleaned, flags=re.I)
    lines = []
    for line in cleaned.splitlines():
        line = re.sub(r"[ \t]+", " ", line).strip()
        if not line or line.lower().rstrip(":") in _JOB_BOARD_CHROME:
            continue
        # Our own steering note, appended when a resume is generated with a
        # focus. Scoring it gave the generator and the ATS checker different
        # keywords for the same job.
        if line.lower().startswith("candidate focus:"):
            continue
        lines.append(line)
    return "\n".join(lines)


def _normalize_jd_for_cache(jd_text: str) -> str:
    return re.sub(r"\s+", " ", (jd_text or "").strip().lower())


# Bumped when entries written before it can't be trusted. v2: older code cached
# the local fallback's keywords, mostly words from the posting's prose, and
# kept scoring every resume for that posting against them.
_KEYWORD_CACHE_VERSION = "v2"


def _cache_key_for_jd(jd_text: str) -> str:
    text = f"{_KEYWORD_CACHE_VERSION}|{_normalize_jd_for_cache(jd_text)}"
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def _parse_keyword_response(text: str) -> list:
    """The keyword list in a Gemini reply, or [] when there is none."""
    cleaned = (text or "").strip()
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fenced:
        cleaned = fenced.group(1).strip()
    for candidate in [cleaned, *reversed(re.findall(r"\[[^\[\]]*\]", cleaned))]:
        try:
            items = json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            continue
        if isinstance(items, list) and items and all(isinstance(item, str) for item in items):
            return items
    # A bare "Python, AWS, Docker" list is usable; a sentence split on commas is not.
    parts = [part.strip(" \t\"'-*\u2022[]") for part in re.split(r"[,\n]", cleaned)]
    parts = [part for part in parts if part]
    if len(parts) >= 3 and all(len(part.split()) <= 4 for part in parts):
        return parts
    return []


_KEYWORD_SCHEMA = {
    "type": "object",
    "properties": {"keywords": {"type": "array", "items": {"type": "string"}}},
    "required": ["keywords"],
    "additionalProperties": False,
}


def _ask_openai(prompt: str) -> list:
    """Keywords from gpt-5-nano, shaped by a strict schema rather than parsed out of prose."""
    result, _ = openai_client.structured_completion_sync(
        system="You extract the keywords an applicant tracking system screens for. Return them in keywords.",
        user=prompt,
        schema=_KEYWORD_SCHEMA,
        schema_name="ats_keywords",
        max_tokens=2000,
        timeout_secs=20,
    )
    return result.get("keywords") or []


def _ask_gemini(prompt: str) -> list:
    response = _gemini_model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(temperature=0, response_mime_type="application/json"),
    )
    return _parse_keyword_response(response.text or "")


def _extract_keywords_with_models(prompt: str, normalize) -> list[str]:
    """
    Keywords from gpt-5-nano, then from Gemini when OpenAI fails.

    A model failure used to go straight to the local fallback, whose keywords
    are mostly words from the posting's prose, so resumes were scored against
    terms no resume would contain. The reason is logged now, too.
    """
    providers = []
    if openai_client.is_configured():
        providers.append((openai_client.DEFAULT_MODEL, _ask_openai))
    providers.append(("Gemini", _ask_gemini))
    for name, ask in providers:
        try:
            keywords = normalize(ask(prompt))
        except Exception as exc:
            logger.warning("ATS keyword extraction with %s failed: %s", name, exc)
            continue
        if keywords:
            return keywords
        logger.warning("ATS keyword extraction with %s returned no usable keywords.", name)
    return []


def _load_keyword_cache() -> dict:
    try:
        if CACHE_PATH.exists():
            return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Could not read ATS keyword cache: %s", exc)
    return {}


def _save_keyword_cache(cache: dict) -> None:
    """Atomic write: write to a temp file then rename, so a crash mid-write
    never leaves a corrupted JSON file that causes all future requests to
    bypass the cache and hit the Gemini API on every call."""
    try:
        import os
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = CACHE_PATH.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(cache, ensure_ascii=True, indent=2), encoding="utf-8")
        os.replace(tmp_path, CACHE_PATH)  # atomic on both POSIX and Windows
    except Exception as exc:
        logger.warning("Could not write ATS keyword cache: %s", exc)
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass


def _extract_keywords_locally(jd_text: str) -> list[str]:
    common_multi_word_terms = [
        "machine learning", "deep learning", "natural language processing", "project management",
        "data analysis", "data science", "generative ai", "agentic ai", "vector database",
        "knowledge graph", "prompt engineering", "ci/cd", "github actions", "rest api",
        "fast api", "software engineering", "agile", "scrum", "aws", "docker", "langchain",
        "langgraph", "rag", "llmops", "mlops", "sql", "mongodb", "milvus", "python",
        "flask", "pandas", "numpy", "scikit-learn", "nltk", "word2vec", "tf-idf",
        "pos tagging", "agent design patterns", "multi-agent systems", "workflow orchestration",
        "event-driven systems", "cloud platforms", "production operations", "regression testing",
        "ai evaluation", "release gates", "tool use", "planning", "react",
    ]

    jd_lower = _normalize_jd_for_cache(jd_text)
    found = []
    seen = set()

    for term in common_multi_word_terms:
        pattern = r"\b" + re.escape(term) + r"\b"
        if re.search(pattern, jd_lower) and term not in seen:
            seen.add(term)
            found.append(term)

    single_terms = re.findall(r"[A-Za-z][A-Za-z0-9+/#.-]{2,}", jd_lower)
    stop_terms = {
        "experience", "years", "year", "team", "teams", "role", "company", "client", "clients",
        "opportunity", "exciting", "working", "work", "business", "environment", "candidate",
        "including", "preferred", "required", "ability", "strong", "excellent", "using",
        "build", "develop", "design", "support", "knowledge", "understanding", "about", "the",
        "your", "could", "directly", "how", "world", "expertise", "rolewhat", "what", "can",
        "you", "we", "our", "are", "with", "for", "and", "this", "that", "from", "have", "has",
        "been", "will", "all", "other", "any", "which", "their", "they", "not", "but", "also",
        "when", "where", "who", "why", "how", "then", "than", "there", "these", "those",
        "into", "through", "during", "before", "after", "above", "below", "to", "of", "in",
        "on", "at", "by", "as", "if", "or", "because", "while", "until", "unless", "since",
        "so", "very", "much", "more", "most", "some", "such", "no", "nor", "too", "only",
        "same", "few", "both", "each", "every", "own", "out", "over", "under", "again",
        "further", "then", "once", "here", "there", "why", "how", "all", "any", "both",
        "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only",
        "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don",
        "should", "now", "d", "ll", "m", "o", "re", "ve", "y", "ain", "aren", "couldn", "didn",
        "doesn", "hadn", "hasn", "haven", "isn", "ma", "mightn", "mustn", "needn", "shan",
        "shouldn", "wasn", "weren", "won", "wouldn", "rolewhat", "what", "your", "expertise",
        "world", "about", "could", "directly", "within", "must", "make", "sure", "like", "such",
        "good", "well", "new", "throughout", "across",
        # Words every posting uses about itself. None is a skill, and each one
        # counted against a resume that could never contain it.
        "job", "jobs", "hire", "hiring", "details", "type", "location", "locations",
        "description", "overview", "career", "careers", "content", "skip", "search",
        "life", "application", "applications", "apply", "want", "upon", "pivotal",
        "leader", "leaders", "innovators", "global", "organization", "organisation",
        "delivers", "deliver", "was", "were", "two", "hosts", "county", "full",
        "full-time", "part-time", "benefits", "salary", "join", "looking", "seeking",
        "responsibilities", "requirements", "qualifications", "position", "positions",
        "employer", "equal", "remote", "hybrid", "office", "days", "week", "month",
    }

    for term in single_terms:
        # The pattern keeps "." for terms like node.js, so the word ending a
        # sentence arrives as "technology."; trim it before judging the word.
        term = term.rstrip(".-/")
        if term in stop_terms:
            continue
        if term in seen:
            continue
        if len(term) < 3:
            continue
        seen.add(term)
        found.append(term)
        if len(found) >= 20:
            break

    return found[:20]


def calculate_semantic_score(jd_text: str, resume_text: str) -> float:
    """Chunked semantic similarity using SentenceTransformer."""
    jd_chunks = chunk_text(clean_job_description(jd_text))
    resume_chunks = chunk_text(resume_text)

    jd_embeddings = semantic_model.encode(jd_chunks, convert_to_tensor=True)
    resume_embeddings = semantic_model.encode(resume_chunks, convert_to_tensor=True)

    # Compute all-pairs cosine similarity and take the mean of max similarities
    cos_scores = util.cos_sim(jd_embeddings, resume_embeddings)  # shape: (jd_n, res_n)

    # For each JD chunk, its best matching resume chunk. Only the strongest 70%
    # of JD chunks are averaged: a posting's company blurb, benefits and legal
    # text have no resume counterpart, and averaging them in lowered every
    # resume's score by the same amount without saying anything about fit.
    best = sorted(cos_scores.max(dim=1).values.tolist(), reverse=True)
    keep = max(1, round(len(best) * 0.7))
    avg_similarity = sum(best[:keep]) / keep

    # Map raw cosine similarity [0.15, 0.75] -> [0, 100]
    if avg_similarity <= 0.15:
        return 0.0
    elif avg_similarity >= 0.75:
        return 100.0
    else:
        return ((avg_similarity - 0.15) / 0.60) * 100.0


def calculate_keyword_score(jd_text: str, resume_text: str) -> dict:
    """
    Extract meaningful skills, technologies, and qualifications from JD with gpt-5-nano, or Gemini when OpenAI fails.
    This guarantees clean, atomic skills (e.g., 'Python', 'Agile') instead of long NLP chunks.
    """
    lemmatizer = WordNetLemmatizer()
    jd_text = clean_job_description(jd_text)

    # ── Step 1: Extract keywords with gpt-5-nano, falling back to Gemini ──
    prompt = f"""
    You are an expert ATS (Applicant Tracking System) keyword extractor.
    Analyze the following Job Description (JD) and extract the exact keywords an ATS would look for.
    
    RULES:
    1. Extract ATOMIC keywords only (e.g., "Python", "Agile", "Project Management"). DO NOT extract long phrases or sentences.
    2. Focus purely on: Hard Skills, Soft Skills, Tools, Technologies, and specific methodologies.
    3. Exclude ALL generic corporate jargon (e.g., "team player", "join us", "fast-paced", "competitive salary", "opportunity").
    4. Provide the list sorted by importance (most critical first).
    5. Limit the output to a maximum of 20 strictly relevant keywords.

    Return the output ONLY as a raw JSON array of strings. Do not include markdown formatting or backticks.
    
    JOB DESCRIPTION:
    {jd_text}
    """
    
    extracted_keywords = []
    cache = _load_keyword_cache()
    cache_key = _cache_key_for_jd(jd_text)

    def normalize_keyword_list(items) -> list[str]:
        normalized = []
        seen = set()
        for item in items or []:
            keyword = str(item).strip().lower()
            if not keyword:
                continue
            if len(keyword) < 3:
                continue
            if keyword in {
                "opportunity", "role", "team", "business", "company", "client",
                "work", "working", "environment", "candidate", "exciting",
            }:
                continue
            if keyword in seen:
                continue
            seen.add(keyword)
            normalized.append(keyword)
        return normalized
    
    cached_keywords = cache.get(cache_key)
    source = "cache"
    if isinstance(cached_keywords, list) and cached_keywords:
        extracted_keywords = normalize_keyword_list(cached_keywords)
    else:
        source = "ai"
        extracted_keywords = _extract_keywords_with_models(prompt, normalize_keyword_list)

        if extracted_keywords:
            cache[cache_key] = extracted_keywords
            _save_keyword_cache(cache)
        else:
            # Never cached. Caching the fallback pinned its rough keywords to
            # the posting for every later check, long after the model was
            # reachable again, and the resume kept scoring against them.
            source = "local"
            extracted_keywords = _extract_keywords_locally(jd_text)

    # Format into expected list of dicts with calculated relevance
    jd_keywords = []
    for i, kw in enumerate(extracted_keywords[:20]):
        relevance = max(0.4, 1.0 - (i * 0.03))
        jd_keywords.append({
            "keyword": kw,
            "relevance": round(relevance, 3),
            "type": "skill"
        })

    # Limit to top 20 just in case
    jd_keywords = jd_keywords[:20]
    
    # ── Step 2: Smart matching against resume ──
    resume_lower = resume_text.lower()
    resume_lemmas = None  # Lazy compute
    found = []
    missing = []

    for item in jd_keywords:
        kw = item["keyword"]
        
        # Strategy 1: Exact match
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, resume_lower):
            found.append(item)
            continue
        
        # Strategy 2: Lemmatized match
        kw_lemmas = ' '.join(lemmatizer.lemmatize(w) for w in kw.split())
        if resume_lemmas is None:
            resume_lemmas = ' '.join(lemmatizer.lemmatize(w) for w in resume_lower.split())
        pattern_lemma = r'\b' + re.escape(kw_lemmas) + r'\b'
        if kw_lemmas != kw and re.search(pattern_lemma, resume_lemmas):
            found.append(item)
            continue
            
        # Strategy 3: For multi-word phrases, check if all words appear in resume
        words = kw.split()
        if len(words) >= 2:
            all_found = all(
                re.search(r'\b' + re.escape(w) + r'\b', resume_lower) 
                for w in words if len(w) > 2
            )
            if all_found:
                partial_item = {**item, "relevance": round(item["relevance"] * 0.7, 3)}
                found.append(partial_item)
                continue
        
        # Strategy 4: Substring fallback for short single-word technical terms
        # e.g. 'docker' matches 'docker-compose', 'dockerfile', 'dockerised'
        if len(words) == 1 and len(kw) >= 3:
            if kw in resume_lower:  # simple substring (not word-boundary)
                partial_item = {**item, "relevance": round(item["relevance"] * 0.6, 3)}
                found.append(partial_item)
                continue

        missing.append(item)

    def dedupe_items(items: list[dict]) -> list[dict]:
        deduped = {}
        for item in items:
            keyword = item["keyword"]
            current = deduped.get(keyword)
            if current is None or item["relevance"] > current["relevance"]:
                deduped[keyword] = item
        return list(deduped.values())

    found = dedupe_items(found)
    missing = [item for item in dedupe_items(missing) if item["keyword"] not in {f["keyword"] for f in found}]

    total = len(jd_keywords) if jd_keywords else 1
    score = (len(found) / total * 100)
    return {
        "score": round(score, 1),
        "found": found,
        "missing": missing,
        "found_keywords": [f["keyword"] for f in found],
        "missing_keywords": [m["keyword"] for m in missing],
        # "ai" or "cache" for model-extracted keywords, "local" for the fallback.
        "source": source,
    }


def calculate_section_score(resume_text: str) -> dict:
    """Detect presence of standard resume sections via regex patterns."""
    sections = {
        "has_summary": r'(?i)\b(summary|objective|about\s*me|profile|professional\s*summary)\b',
        "has_experience": r'(?i)\b(experience|work\s*history|employment|professional\s*experience)\b',
        "has_education": r'(?i)\b(education|academic|degree|university|college)\b',
        "has_skills": r'(?i)\b(skills|technologies|technical\s*skills|competencies|proficiencies)\b',
        "has_projects": r'(?i)\b(projects|portfolio|personal\s*projects|key\s*projects)\b',
    }

    feedback = {}
    detected_count = 0
    for key, pattern in sections.items():
        found = bool(re.search(pattern, resume_text))
        feedback[key] = found
        if found:
            detected_count += 1

    score = (detected_count / len(sections)) * 100
    return {"score": round(score, 1), "feedback": feedback}


def calculate_impact_score(resume_text: str) -> dict:
    """Score based on action verbs, quantified achievements, and metrics."""
    ACTION_VERBS = {
        "achieved", "improved", "developed", "managed", "created", "designed",
        "implemented", "increased", "reduced", "built", "led", "delivered",
        "launched", "optimized", "automated", "streamlined", "coordinated",
        "mentored", "resolved", "analyzed", "engineered", "architected",
        "spearheaded", "transformed", "accelerated", "generated", "established",
        "negotiated", "collaborated", "integrated", "migrated", "deployed",
        "scaled", "refactored", "orchestrated", "championed", "executed"
    }

    resume_lower = resume_text.lower()
    words = re.findall(r'\b[a-z]+\b', resume_lower)
    word_set = set(words)

    # Count action verbs found
    action_verbs_found = ACTION_VERBS.intersection(word_set)
    action_verb_score = min(len(action_verbs_found) / 8.0, 1.0) * 100  # 8+ verbs = perfect

    # Count quantified metrics: numbers, percentages, dollar amounts
    percentages = re.findall(r'\d+\s*%', resume_text)
    dollar_amounts = re.findall(r'\$[\d,]+', resume_text)
    plain_numbers = re.findall(r'\b\d{2,}\b', resume_text)  # numbers with 2+ digits

    total_metrics = len(percentages) + len(dollar_amounts) + len(plain_numbers)
    metric_score = min(total_metrics / 6.0, 1.0) * 100  # 6+ metrics = perfect

    combined_score = (0.5 * action_verb_score) + (0.5 * metric_score)

    details = {
        "action_verbs_found": sorted(list(action_verbs_found)),
        "action_verb_count": len(action_verbs_found),
        "percentages_count": len(percentages),
        "dollar_amounts_count": len(dollar_amounts),
        "numbers_count": len(plain_numbers),
        "total_metrics": total_metrics
    }

    return {"score": round(combined_score, 1), "details": details}


def calculate_readability_score(resume_text: str) -> dict:
    """Analyze sentence length, bullet density, and word count."""
    # A resume line is a sentence. Bullets rarely end in a full stop, and
    # tokenizing the whole text at once merged every bullet under a heading
    # into one "sentence" of dozens of words, marking tight bullet-point
    # writing as hard to read.
    lines = [line.strip() for line in resume_text.split("\n") if line.strip()]
    sentences = []
    for line in lines:
        sentences.extend([s for s in nltk.sent_tokenize(line) if s.strip()] or [line])
    words = resume_text.split()
    word_count = len(words)
    sentence_count = len(sentences) if sentences else 1

    # Average sentence length (ideal: 10–20 words per sentence for resumes)
    avg_sentence_len = word_count / sentence_count
    if 8 <= avg_sentence_len <= 22:
        sentence_len_score = 100
    elif avg_sentence_len < 8:
        sentence_len_score = max(0, avg_sentence_len / 8.0 * 100)
    else:
        sentence_len_score = max(0, 100 - (avg_sentence_len - 22) * 5)

    # Bullet density: count lines starting with bullets/dashes
    # Measured over lines with some content, so a name, contact details and
    # section headings do not dilute the ratio of a resume that is all bullets.
    content_lines = [line for line in lines if len(line.split()) >= 4]
    total_lines = len(content_lines) if content_lines else 1
    bullet_lines = sum(1 for line in content_lines if re.match(r'^\s*[\-•\*▸▹►]', line))
    bullet_ratio = bullet_lines / total_lines
    bullet_score = min(bullet_ratio / 0.3, 1.0) * 100  # 30%+ bullet lines = perfect

    # Word count (ideal resume: 300–800 words)
    if 300 <= word_count <= 800:
        length_score = 100
    elif word_count < 300:
        length_score = max(0, (word_count / 300) * 100)
    else:
        length_score = max(0, 100 - (word_count - 800) * 0.1)

    combined = (0.4 * sentence_len_score) + (0.3 * bullet_score) + (0.3 * length_score)

    details = {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_sentence_length": round(avg_sentence_len, 1),
        "bullet_line_ratio": round(bullet_ratio * 100, 1),
    }

    return {"score": round(min(combined, 100), 1), "details": details}


def calculate_format_score(resume_text: str) -> dict:
    """Check ATS formatting compatibility."""
    checks = {}
    
    # Check for contact info
    checks["has_email"] = bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', resume_text))
    checks["has_phone"] = bool(re.search(r'[\+]?[\d\s\-\(\)]{7,15}', resume_text))
    checks["has_linkedin"] = bool(re.search(r'(?i)linkedin\.com|linkedin', resume_text))
    
    # Check for problematic formatting
    special_chars = re.findall(r'[\u2018\u2019\u201c\u201d\u2013\u2014\u00a0\u2026]', resume_text)
    checks["no_smart_quotes"] = len(special_chars) < 5
    checks["no_tables"] = not bool(re.search(r'\|.*\|.*\|', resume_text))  # pipe-delimited tables
    
    # Check for consistent date formatting
    date_formats = re.findall(r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\b|\b\d{1,2}/\d{4}\b|\b\d{4}\s*[-–]\s*(?:Present|\d{4})\b', resume_text, re.IGNORECASE)
    checks["has_dates"] = len(date_formats) >= 2
    
    # Check file length (pages estimate: ~500 words per page)
    word_count = len(resume_text.split())
    estimated_pages = word_count / 500
    checks["good_length"] = 0.5 <= estimated_pages <= 2.5
    
    passed = sum(1 for v in checks.values() if v)
    total = len(checks)
    score = (passed / total) * 100
    
    return {"score": round(score, 1), "checks": checks, "passed": passed, "total": total}


def detect_experience_level(resume_text: str) -> dict:
    """Detect experience level from resume content."""
    resume_lower = resume_text.lower()
    
    # Year ranges detection
    year_ranges = re.findall(r'(\d{4})\s*[-–]\s*(\d{4}|present)', resume_lower)
    total_years = 0
    current_year = datetime.datetime.now().year
    for start, end in year_ranges:
        start_yr = int(start)
        end_yr = current_year if 'present' in end.lower() else int(end)
        total_years += max(0, end_yr - start_yr)
    
    # Seniority keywords
    senior_keywords = ['senior', 'lead', 'principal', 'staff', 'architect', 'manager', 'director', 'head', 'vp', 'chief']
    mid_keywords = ['mid', 'intermediate', 'associate', 'specialist']
    entry_keywords = ['junior', 'intern', 'entry', 'trainee', 'fresher', 'graduate', 'student']
    
    senior_count = sum(1 for kw in senior_keywords if re.search(r'\b' + kw + r'\b', resume_lower))
    mid_count = sum(1 for kw in mid_keywords if re.search(r'\b' + kw + r'\b', resume_lower))
    entry_count = sum(1 for kw in entry_keywords if re.search(r'\b' + kw + r'\b', resume_lower))
    
    # Determine level
    if total_years >= 8 or senior_count >= 2:
        level = "Senior"
        confidence = "High" if total_years >= 8 and senior_count >= 1 else "Medium"
    elif total_years >= 3 or mid_count >= 1 or (senior_count == 1 and total_years >= 2):
        level = "Mid-Level"
        confidence = "High" if total_years >= 4 else "Medium"
    elif entry_count >= 1 or total_years < 2:
        level = "Entry-Level"
        confidence = "High" if entry_count >= 1 else "Medium"
    else:
        level = "Mid-Level"
        confidence = "Low"
    
    return {
        "level": level,
        "confidence": confidence,
        "estimated_years": total_years,
        "seniority_signals": {
            "senior_keywords_found": senior_count,
            "mid_keywords_found": mid_count,
            "entry_keywords_found": entry_count,
        }
    }
