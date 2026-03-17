import re
from collections import Counter


# ───────────── CONTENT ANALYSIS ─────────────

VERB_SYNONYMS = {
    "designed": ["planned", "created", "devised", "formulated", "conceptualized"],
    "developed": ["built", "engineered", "constructed", "crafted", "established"],
    "implemented": ["executed", "deployed", "applied", "integrated", "operationalized"],
    "managed": ["oversaw", "coordinated", "directed", "supervised", "administered"],
    "created": ["produced", "generated", "originated", "invented", "initiated"],
    "improved": ["enhanced", "refined", "upgraded", "elevated", "strengthened"],
    "built": ["constructed", "engineered", "assembled", "developed", "established"],
    "led": ["spearheaded", "directed", "headed", "guided", "championed"],
    "utilized": ["leveraged", "employed", "applied", "harnessed", "adopted"],
    "participated": ["contributed", "engaged", "collaborated", "assisted", "supported"],
    "worked": ["collaborated", "partnered", "cooperated", "operated", "executed"],
    "used": ["leveraged", "employed", "utilized", "adopted", "applied"],
    "made": ["produced", "generated", "crafted", "established", "delivered"],
    "helped": ["facilitated", "assisted", "supported", "enabled", "contributed"],
    "analyzed": ["evaluated", "assessed", "examined", "investigated", "audited"],
    "optimized": ["streamlined", "refined", "enhanced", "fine-tuned", "accelerated"],
    "deployed": ["launched", "released", "rolled out", "shipped", "activated"],
    "automated": ["mechanized", "systematized", "streamlined", "digitized", "programmed"],
    "integrated": ["unified", "incorporated", "consolidated", "merged", "embedded"],
    "delivered": ["shipped", "provided", "produced", "completed", "presented"],
    "ensured": ["guaranteed", "verified", "confirmed", "validated", "maintained"],
    "conducted": ["performed", "executed", "carried out", "facilitated", "administered"],
    "established": ["founded", "initiated", "set up", "launched", "instituted"],
    "supported": ["assisted", "facilitated", "enabled", "maintained", "aided"],
    "provided": ["delivered", "supplied", "offered", "furnished", "presented"],
    "achieved": ["accomplished", "attained", "secured", "realized", "earned"],
    "reduced": ["decreased", "minimized", "cut", "lowered", "diminished"],
    "increased": ["boosted", "grew", "expanded", "elevated", "amplified"],
    "streamlined": ["simplified", "optimized", "consolidated", "refined", "automated"],
    "collaborated": ["partnered", "teamed up", "cooperated", "worked alongside", "co-developed"],
}


def calculate_content_analysis(resume_text: str) -> dict:
    """Analyze resume content for repeated words and section-level quality."""
    resume_lower = resume_text.lower()
    words = re.findall(r'\b[a-z]+\b', resume_lower)

    # ── Repeated action verbs ──
    verb_counts = Counter()
    action_verb_set = set(VERB_SYNONYMS.keys())
    for w in words:
        if w in action_verb_set:
            verb_counts[w] += 1

    repeated_words = []
    for verb, count in verb_counts.most_common():
        if count >= 2:
            synonyms = VERB_SYNONYMS.get(verb, [])[:3]
            repeated_words.append({
                "word": verb,
                "count": count,
                "synonyms": synonyms
            })

    # ── Section-level diagnostics ──
    section_patterns = {
        "Summary": r'(?i)(?:summary|objective|about\s*me|profile|professional\s*summary)\s*[:\n\-–]?\s*([\s\S]*?)(?=\n\s*(?:experience|education|skills|projects|certifications|languages)|$)',
        "Experience": r'(?i)(?:experience|work\s*history|employment|professional\s*experience)\s*[:\n\-–]?\s*([\s\S]*?)(?=\n\s*(?:education|skills|projects|certifications|languages)|$)',
        "Education": r'(?i)(?:education|academic)\s*[:\n\-–]?\s*([\s\S]*?)(?=\n\s*(?:skills|projects|certifications|languages|experience)|$)',
        "Skills": r'(?i)(?:skills|technologies|technical\s*skills|competencies)\s*[:\n\-–]?\s*([\s\S]*?)(?=\n\s*(?:experience|education|projects|certifications|languages)|$)',
        "Projects": r'(?i)(?:projects|portfolio|key\s*projects)\s*[:\n\-–]?\s*([\s\S]*?)(?=\n\s*(?:experience|education|skills|certifications|languages)|$)',
    }

    section_diagnostics = []
    for section_name, pattern in section_patterns.items():
        match = re.search(pattern, resume_text)
        if match:
            content = match.group(1).strip()
            lines = [l.strip() for l in content.split('\n') if l.strip()]
            bullet_lines = [l for l in lines if l.startswith(('•', '-', '·', '*', '–'))]
            word_count = len(content.split())
            avg_words = round(word_count / max(len(lines), 1), 1)

            # Quality assessment
            issues = []
            if section_name == "Summary":
                if word_count < 20:
                    issues.append("Summary is too short — aim for 40-60 words")
                elif word_count > 100:
                    issues.append("Summary is too long — keep under 80 words for ATS")
            elif section_name in ("Experience", "Projects"):
                if len(bullet_lines) < 2:
                    issues.append(f"Only {len(bullet_lines)} bullet(s) — add more detail")
                if avg_words > 25:
                    issues.append("Bullet points are too long — aim for 10-20 words each")
            elif section_name == "Skills":
                if word_count < 10:
                    issues.append("Skills section is sparse — list more technologies")

            status = "strong" if not issues else "needs_work"

            section_diagnostics.append({
                "section": section_name,
                "status": status,
                "line_count": len(lines),
                "bullet_count": len(bullet_lines),
                "word_count": word_count,
                "avg_words_per_line": avg_words,
                "issues": issues,
            })
        else:
            section_diagnostics.append({
                "section": section_name,
                "status": "missing",
                "line_count": 0,
                "bullet_count": 0,
                "word_count": 0,
                "avg_words_per_line": 0,
                "issues": [f"{section_name} section not found — add it for better ATS parsing"],
            })

    return {
        "repeated_words": repeated_words,
        "section_diagnostics": section_diagnostics,
    }
