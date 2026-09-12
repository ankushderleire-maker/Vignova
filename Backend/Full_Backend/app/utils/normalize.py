import uuid
from app.models.schemas import ResumeSchema


def normalize_data(data: dict):
    safe_structure = ResumeSchema().model_dump()

    # Ensure top-level keys exist
    for key in safe_structure:
        if key not in data:
            data[key] = safe_structure[key]

    # Skills normalization
    if not isinstance(data.get("skills"), dict):
        if isinstance(data.get("skills"), list):
             data["skills"] = {"technical": ", ".join(data["skills"]), "soft": ""}
        else:
             data["skills"] = {"technical": str(data.get("skills", "")), "soft": ""}

    def normalize_description(desc):
        if isinstance(desc, list):
            return [str(item).strip() for item in desc if str(item).strip()]
        if isinstance(desc, str) and desc:
            # Split by newlines, or by sentence if no newlines but very long
            if "\n" in desc:
                return [d.strip() for d in desc.split("\n") if d.strip()]
            return [desc.strip()]
        return []

    # Normalize Experience
    normalized_exp = []
    for exp in data.get("experience", []):
        normalized_exp.append({
            "id": exp.get("id", str(uuid.uuid4())),
            "company": exp.get("company", ""),
            "role": exp.get("role", exp.get("title", "")),
            "location": exp.get("location", ""),
            "startDate": exp.get("startDate", ""),
            "endDate": exp.get("endDate", ""),
            "description": normalize_description(exp.get("description", "")),
            # One line closing the role. Where a support-shaped history keeps
            # its figures, so it must survive normalisation.
            "impact": str(exp.get("impact", "") or "").strip(),
        })
    data["experience"] = normalized_exp

    # Normalize Education
    normalized_edu = []
    for edu in data.get("education", []):
        normalized_edu.append({
            "id": edu.get("id", str(uuid.uuid4())),
            "school": edu.get("school", edu.get("institution", "")),
            "degree": edu.get("degree", ""),
            "field": edu.get("field", edu.get("major", "")),
            "startDate": edu.get("startDate", ""),
            "endDate": edu.get("endDate", ""),
            "grade": edu.get("grade", ""),
        })
    data["education"] = normalized_edu
    
    # Normalize Projects
    normalized_proj = []
    for proj in data.get("projects", []):
        normalized_proj.append({
            "id": proj.get("id", str(uuid.uuid4())),
            "name": proj.get("name", ""),
            "techStack": proj.get("techStack", ""),
            "link": proj.get("link", ""),
            "description": normalize_description(proj.get("description", "")),
        })
    data["projects"] = normalized_proj

    # Normalize Certifications
    normalized_certs = []
    for cert in data.get("certifications", []):
        if isinstance(cert, str):
             normalized_certs.append({
                "id": str(uuid.uuid4()),
                "name": cert,
                "issuer": "",
                "date": "",
                "url": ""
            })
        elif isinstance(cert, dict):
            normalized_certs.append({
                "id": cert.get("id", str(uuid.uuid4())),
                "name": cert.get("name", ""),
                "issuer": cert.get("issuer", ""),
                "date": cert.get("date", ""),
                "url": cert.get("url", "")
            })
    data["certifications"] = normalized_certs

    # Normalize Languages
    normalized_langs = []
    for lang in data.get("languages", []):
        if isinstance(lang, str):
             normalized_langs.append({
                "id": str(uuid.uuid4()),
                "name": lang,
                "proficiency": ""
            })
        elif isinstance(lang, dict):
            normalized_langs.append({
                "id": lang.get("id", str(uuid.uuid4())),
                "name": lang.get("name", ""),
                "proficiency": lang.get("proficiency", "")
            })
    data["languages"] = normalized_langs

    return data

def enforce_content_limits(data: dict) -> dict:
    """
    Ceilings, not targets.

    These used to be flat — four roles, four bullets each, twelve skills —
    which quietly truncated every resume to the same thin shape no matter how
    much the candidate had done. A senior engineer's most recent role carries
    six or seven bullets on a real resume, and a skills section runs to forty
    terms across labelled groups. The budget now tapers by position instead:
    the role a recruiter actually reads gets the room, older roles get less.
    """
    MAX_SKILLS = 40
    MAX_SKILLS_PER_GROUP = 14
    MAX_SKILL_GROUPS = 7
    MAX_EXPERIENCE = 5
    # Bullets per role, most recent first; roles past the end of the list get
    # the last value.
    EXP_BULLET_BUDGET = [8, 6, 5, 4, 3]
    MAX_PROJECTS = 4
    MAX_PROJ_BULLETS = 3
    MAX_ACHIEVEMENTS = 6

    groups = data.get("skillGroups")
    if isinstance(groups, list) and groups:
        trimmed = []
        for group in groups[:MAX_SKILL_GROUPS]:
            if not isinstance(group, dict):
                continue
            items = [str(s).strip() for s in (group.get("skills") or []) if str(s).strip()]
            if not items:
                continue
            trimmed.append({
                "label": str(group.get("label") or "").strip(),
                "skills": items[:MAX_SKILLS_PER_GROUP],
            })

        # The flat list and the groups have to agree: templates read one or the
        # other, and a resume that lists a skill in its grid but not in its
        # skills line looks like two different documents.
        kept: list[str] = []
        for group in trimmed:
            room = max(0, MAX_SKILLS - len(kept))
            group["skills"] = group["skills"][:room]
            kept.extend(group["skills"])
        data["skillGroups"] = [g for g in trimmed if g["skills"]]
        if kept:
            soft = data.get("skills", {}).get("soft", "") if isinstance(data.get("skills"), dict) else ""
            data["skills"] = {"technical": ", ".join(kept), "soft": soft}

    skills = data.get("skills", {})
    if isinstance(skills, dict):
        tech = skills.get("technical", "")
        if isinstance(tech, str) and tech:
            skill_list = [s.strip() for s in tech.split(",") if s.strip()]
            if len(skill_list) > MAX_SKILLS:
                skills["technical"] = ", ".join(skill_list[:MAX_SKILLS])
        data["skills"] = skills

    exp_list = data.get("experience", [])
    if len(exp_list) > MAX_EXPERIENCE:
        exp_list = exp_list[:MAX_EXPERIENCE]
    for index, exp in enumerate(exp_list):
        budget = EXP_BULLET_BUDGET[min(index, len(EXP_BULLET_BUDGET) - 1)]
        desc = exp.get("description", "")
        if isinstance(desc, list) and len(desc) > budget:
            exp["description"] = desc[:budget]
    data["experience"] = exp_list

    achievements = data.get("achievements")
    if isinstance(achievements, list) and len(achievements) > MAX_ACHIEVEMENTS:
        data["achievements"] = achievements[:MAX_ACHIEVEMENTS]

    proj_list = data.get("projects", [])
    if len(proj_list) > MAX_PROJECTS:
        proj_list = proj_list[:MAX_PROJECTS]
    for proj in proj_list:
        desc = proj.get("description", "")
        if isinstance(desc, list) and len(desc) > MAX_PROJ_BULLETS:
            proj["description"] = desc[:MAX_PROJ_BULLETS]
    data["projects"] = proj_list

    return data
