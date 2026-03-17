import os
import re
import json
import datetime
import nltk
from nltk.stem import WordNetLemmatizer
from sentence_transformers import util
import google.generativeai as genai

from app.services.ml_models import semantic_model


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


def calculate_semantic_score(jd_text: str, resume_text: str) -> float:
    """Chunked semantic similarity using SentenceTransformer."""
    jd_chunks = chunk_text(jd_text)
    resume_chunks = chunk_text(resume_text)

    jd_embeddings = semantic_model.encode(jd_chunks, convert_to_tensor=True)
    resume_embeddings = semantic_model.encode(resume_chunks, convert_to_tensor=True)

    # Compute all-pairs cosine similarity and take the mean of max similarities
    cos_scores = util.cos_sim(jd_embeddings, resume_embeddings)  # shape: (jd_n, res_n)

    # For each JD chunk, find the best matching resume chunk
    max_per_jd = cos_scores.max(dim=1).values  # best match for each JD chunk
    avg_similarity = max_per_jd.mean().item()

    # Map raw cosine similarity [0.15, 0.75] -> [0, 100]
    if avg_similarity <= 0.15:
        return 0.0
    elif avg_similarity >= 0.75:
        return 100.0
    else:
        return ((avg_similarity - 0.15) / 0.60) * 100.0


def calculate_keyword_score(jd_text: str, resume_text: str) -> dict:
    """
    Extract meaningful skills, technologies, and qualifications from JD using either Sarvam AI or Gemini.
    This guarantees clean, atomic skills (e.g., 'Python', 'Agile') instead of long NLP chunks.
    """
    lemmatizer = WordNetLemmatizer()
    
    # ── Step 1: Extract keywords using Sarvam AI or Gemini ──
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
    
    try:
        ats_score_model = os.getenv("ATS_SCORE_MODEL", "GEMINI").upper()
        sarvam_api_key = os.getenv("SARVAM_API_KEY")
        
        if ats_score_model == "SARVAM" and sarvam_api_key:
            # --- SARVAM AI IMPLEMENTATION ---
            print("Using Sarvam AI for ATS Keyword Extraction...")
            from sarvamai import SarvamAI
            client = SarvamAI(api_subscription_key=sarvam_api_key)
            
            response = client.chat.completions(
                messages=[{"content": prompt, "role": "user"}]
            )
            
            # Extract text (handling both object and dict return types from the SDK)
            if hasattr(response, 'choices'):
                text_response = response.choices[0].message.content.strip()
            else:
                text_response = response['choices'][0]['message']['content'].strip()
            
        else:
            # --- GEMINI IMPLEMENTATION (Fallback/Default) ---
            print("Using Gemini for keyword extraction...")
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            text_response = response.text.strip()
            
        # Clean markdown if present
        if text_response.startswith('```json'):
            text_response = text_response[7:]
        if text_response.startswith('```'):
            text_response = text_response[3:]
        if text_response.endswith('```'):
            text_response = text_response[:-3]
            
        extracted_keywords = json.loads(text_response.strip())
        
        # Format into expected list of dicts with calculated relevance
        jd_keywords = []
        for i, kw in enumerate(extracted_keywords):
            # Degrading relevance based on order (most important first)
            relevance = max(0.4, 1.0 - (i * 0.03)) 
            jd_keywords.append({
                "keyword": str(kw).lower().strip(),
                "relevance": round(relevance, 3),
                "type": "skill"
            })
            
    except Exception as e:
        print(f"Error extracting keywords with AI: {e}")
        # Fallback to a very basic extraction if API fails
        jd_keywords = [{"keyword": w.lower(), "relevance": 0.5, "type": "term"} 
                       for w in jd_text.split() if len(w) > 5][:10]

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

    total = len(jd_keywords) if jd_keywords else 1
    score = (len(found) / total * 100)
    return {
        "score": round(score, 1),
        "found": found,
        "missing": missing,
        "found_keywords": [f["keyword"] for f in found],
        "missing_keywords": [m["keyword"] for m in missing],
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
    sentences = nltk.sent_tokenize(resume_text)
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
    lines = resume_text.strip().split('\n')
    total_lines = len(lines) if lines else 1
    bullet_lines = sum(1 for line in lines if re.match(r'^\s*[\-•\*▸▹►]', line.strip()))
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
