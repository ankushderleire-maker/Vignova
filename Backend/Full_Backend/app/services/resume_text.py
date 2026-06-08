from typing import Any, Dict, List


def _normalize_lines(value: Any, bullet: bool = False) -> List[str]:
    if not value:
        return []

    if isinstance(value, list):
        items = [str(item).strip() for item in value if str(item).strip()]
    else:
        items = [str(value).strip()]

    if bullet:
        return [f"- {item}" for item in items]
    return items


def resume_data_to_text(data: Dict[str, Any]) -> str:
    """Flatten structured resume JSON into ATS-friendly plain text."""
    parts: List[str] = []

    for key in ("fullName", "jobTitle", "email", "phone", "location", "linkedin", "website", "github"):
        value = data.get(key)
        if value:
            parts.append(str(value).strip())

    summary = data.get("summary")
    if summary:
        parts.append("Summary")
        parts.append(str(summary).strip())

    skills = data.get("skills")
    if skills:
        parts.append("Skills")
        if isinstance(skills, dict):
            technical = skills.get("technical")
            soft = skills.get("soft")
            if technical:
                if isinstance(technical, list):
                    parts.append("Technical Skills: " + ", ".join(str(item).strip() for item in technical if str(item).strip()))
                else:
                    parts.append("Technical Skills: " + str(technical).strip())
            if soft:
                if isinstance(soft, list):
                    parts.append("Soft Skills: " + ", ".join(str(item).strip() for item in soft if str(item).strip()))
                else:
                    parts.append("Soft Skills: " + str(soft).strip())
        elif isinstance(skills, list):
            parts.append(", ".join(str(item).strip() for item in skills if str(item).strip()))
        else:
            parts.append(str(skills).strip())

    experience = data.get("experience") or []
    if experience:
        parts.append("Experience")
        for exp in experience:
            role = exp.get("role", "")
            company = exp.get("company", "")
            start_date = exp.get("startDate", "")
            end_date = exp.get("endDate", "")
            header = f"{role} at {company}".strip()
            if start_date or end_date:
                header = f"{header} ({start_date} - {end_date})".strip()
            if header:
                parts.append(header)
            location = exp.get("location")
            if location:
                parts.append(str(location).strip())
            parts.extend(_normalize_lines(exp.get("description"), bullet=True))

    education = data.get("education") or []
    if education:
        parts.append("Education")
        for edu in education:
            school = edu.get("school", "")
            degree = edu.get("degree", "")
            field = edu.get("field", "")
            line = " ".join(part for part in [degree, field] if part).strip()
            if school:
                line = f"{line} - {school}".strip() if line else str(school).strip()
            if line:
                parts.append(line)
            start_date = edu.get("startDate", "")
            end_date = edu.get("endDate", "")
            if start_date or end_date:
                parts.append(f"{start_date} - {end_date}".strip())

    projects = data.get("projects") or []
    if projects:
        parts.append("Projects")
        for proj in projects:
            name = proj.get("name", "")
            tech_stack = proj.get("techStack", "")
            header = f"{name} ({tech_stack})".strip() if tech_stack else str(name).strip()
            if header:
                parts.append(header)
            link = proj.get("link")
            if link:
                parts.append(str(link).strip())
            parts.extend(_normalize_lines(proj.get("description"), bullet=True))

    certifications = data.get("certifications") or []
    if certifications:
        parts.append("Certifications")
        for cert in certifications:
            value = cert.get("name", "") if isinstance(cert, dict) else cert
            if value:
                parts.append(str(value).strip())

    languages = data.get("languages") or []
    if languages:
        parts.append("Languages")
        for lang in languages:
            if isinstance(lang, dict):
                name = lang.get("name", "")
                proficiency = lang.get("proficiency", "")
                value = f"{name} ({proficiency})".strip() if proficiency else str(name).strip()
            else:
                value = str(lang).strip()
            if value:
                parts.append(value)

    return "\n".join(part for part in parts if part)
