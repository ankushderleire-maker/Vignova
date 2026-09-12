"""Skill-only normalization for LinkedIn imports, rewrites and keyword enrichment."""
import re
import unicodedata

_HEADINGS = {
    "skill", "skills", "technical skills", "soft skills", "top skills",
    "certification", "certifications", "licenses & certifications", "contact",
    "contact info", "contact information", "personal information", "personal details",
    "email", "email address", "phone", "phone number", "mobile", "address",
    "name", "full name", "location", "education", "experience", "projects",
    "summary", "about", "interests", "references", "n/a", "none", "null",
}
_SKILL_FIELDS = {
    "skills", "skill", "technicalskills", "softskills", "topskills", "skilldetails",
    "associatedskills", "technologies", "technology", "techstack", "tools",
    "competencies", "expertise",
}
_CONTACT_FIELDS = {"contact", "contactinfo", "contactinformation", "personalinfo", "personaldetails", "email", "phone", "mobile", "address"}
_GROUP_FIELDS = {"technical", "soft", "languages", "frameworks", "databases", "cloud", "devops", "other", "items", "values", "list"}
_PHONE = re.compile(r"(?<!\w)\+?\d[\d\s().-]{5,}\d(?!\w)")
_LINK = re.compile(r"(?:https?://|www\.|mailto:|tel:|(?:linkedin\.com|github\.com)/)", re.I)
_CONTACT_LABEL = re.compile(r"^(?:e-?mail|phone|mobile|telephone|contact|address|location|full name)\s*[:=]", re.I)


def clean_skill_name(value) -> str:
    if not isinstance(value, str):
        return ""
    text = unicodedata.normalize("NFKC", value)
    text = re.sub(r"[\x00-\x1f\x7f\u200b-\u200f\ufeff]", "", text)
    text = re.sub(r"\s+", " ", text).strip(" -*•\t:")
    if not text or len(text) > 100 or not any(char.isalpha() for char in text):
        return ""
    if text.lower() in _HEADINGS or "@" in text or _LINK.search(text) or _CONTACT_LABEL.search(text):
        return ""
    if any(sum(char.isdigit() for char in match.group()) >= 7 for match in _PHONE.finditer(text)):
        return ""
    return text


def _key(value) -> str:
    return re.sub(r"[^a-z]", "", str(value).lower())


def _split_skills(text: str):
    # Keep CI/CD, C++, and parenthesized lists such as LLMs (GPT-4, Gemini).
    depth, start = 0, 0
    for index, char in enumerate(text):
        if char in "([":
            depth += 1
        elif char in ")]":
            depth = max(0, depth - 1)
        elif char in ",;|\n\r•" and depth == 0:
            yield text[start:index]
            start = index + 1
    yield text[start:]


def coerce_skill_list(value, limit: int = 80) -> list[str]:
    skills, seen = [], set()

    def add(item):
        if isinstance(item, str):
            for part in _split_skills(item):
                name = clean_skill_name(part)
                if name and name.lower() not in seen and len(skills) < limit:
                    seen.add(name.lower())
                    skills.append(name)
        elif isinstance(item, list):
            for child in item:
                add(child)
        elif isinstance(item, dict):
            # A skill object can carry endorsements, URLs or contact metadata;
            # those values must never become additional skills.
            for field in ("name", "title", "skill", "text"):
                if isinstance(item.get(field), str) and item[field].strip():
                    add(item[field])
                    return
            for field, child in item.items():
                if _key(field) in _GROUP_FIELDS | _SKILL_FIELDS:
                    add(child)

    add(value)
    return skills


def collect_master_skills(master_data, limit: int = 35) -> list[str]:
    candidates = []

    def walk(value):
        if isinstance(value, dict):
            for field, child in value.items():
                key = _key(field)
                if key in _CONTACT_FIELDS:
                    continue
                if key in _SKILL_FIELDS:
                    candidates.extend(coerce_skill_list(child))
                elif isinstance(child, (dict, list)):
                    walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(master_data)
    return coerce_skill_list(candidates, limit)


def clean_skill_details(value) -> list[dict]:
    result, seen = [], set()
    items = value if isinstance(value, list) else coerce_skill_list(value)
    for item in items:
        for name in coerce_skill_list(item):
            if name.lower() in seen:
                continue
            seen.add(name.lower())
            result.append({**(item if isinstance(item, dict) else {}), "name": name})
    return result
