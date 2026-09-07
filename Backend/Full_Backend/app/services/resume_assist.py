"""
Resume Assistant
================
Small, targeted rewrites inside the resume editor — the "Improve with AI" and
"Suggest skills" actions.

Each returns several options rather than silently overwriting the user's text,
so the person stays in control of what lands in their resume.
"""

from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.services.openai_client import OpenAiError, strictify, structured_completion

logger = logging.getLogger("resume_assist")

VARIANT_COUNT = 3


class SummaryVariant(BaseModel):
    text: str = Field(description="The rewritten professional summary. 2-4 sentences, no bullet points.")
    angle: str = Field(description="Two or three words naming the angle, e.g. 'Impact focused'.")

    @field_validator("text", "angle")
    @classmethod
    def _tidy(cls, value: str) -> str:
        return " ".join((value or "").split())


class SummaryOptions(BaseModel):
    variants: list[SummaryVariant] = Field(description=f"Exactly {VARIANT_COUNT} distinct summary options.")


class SkillSuggestions(BaseModel):
    skills: list[str] = Field(
        description="Skills from the job description that the resume is missing. Short noun phrases."
    )

    @field_validator("skills")
    @classmethod
    def _tidy(cls, value: list[str]) -> list[str]:
        out: list[str] = []
        for item in value or []:
            if not isinstance(item, str):
                continue
            text = " ".join(item.split())
            if text and text.lower() not in {s.lower() for s in out}:
                out.append(text)
        return out[:12]


SUMMARY_SCHEMA = strictify(SummaryOptions.model_json_schema())
SKILLS_SCHEMA = strictify(SkillSuggestions.model_json_schema())

SUMMARY_SYSTEM = f"""You rewrite the professional summary at the top of a resume.

Produce exactly {VARIANT_COUNT} options, each taking a genuinely different angle — do not
paraphrase one idea three ways.

Rules:
- 2 to 4 sentences. No bullet points, no headings, no first-person pronouns.
- Ground every claim in the candidate's own experience and skills as supplied.
  Never invent employers, numbers, certifications or years of experience.
- Where the job description names a skill the candidate genuinely has, use the
  posting's wording for it so applicant tracking systems match it.
- Write plainly. No "results-driven professional passionate about leveraging".
- `angle` names what the option emphasises, in two or three words."""

SKILLS_SYSTEM = """You compare a job description against a resume's current skill list.

Return only skills that the job description actually asks for and the resume does
not already list. Use the posting's own wording. Short noun phrases, not sentences.
Never invent a skill the posting does not mention. Return [] if nothing is missing."""


async def summary_variants(
    *,
    current_summary: str = "",
    job_title: Optional[str] = None,
    company: Optional[str] = None,
    job_description: Optional[str] = None,
    skills: Optional[list[str]] = None,
    experience: Optional[list[str]] = None,
) -> dict:
    """Returns {"model": ..., "variants": [{text, angle}, ...]}."""
    parts = [
        f"Target role: {job_title}" if job_title else None,
        f"Company: {company}" if company else None,
        f"Candidate's skills: {', '.join(skills)}" if skills else None,
        "Candidate's experience:" if experience else None,
        *(f"- {line}" for line in (experience or [])[:8]),
        "",
        "Current summary:",
        current_summary.strip() or "(none written yet)",
    ]
    if job_description:
        parts += ["", "Job description:", job_description.strip()[:6000]]

    user = "\n".join(p for p in parts if p is not None)

    data, model = await structured_completion(
        system=SUMMARY_SYSTEM,
        user=user,
        schema=SUMMARY_SCHEMA,
        schema_name="summary_options",
        max_tokens=2000,
    )

    parsed = SummaryOptions.model_validate(data)
    variants = [v for v in parsed.variants if v.text]
    if not variants:
        raise OpenAiError("The model returned no usable summary options.")

    return {"model": model, "variants": [v.model_dump() for v in variants[:VARIANT_COUNT]]}


async def suggest_skills(
    *,
    current_skills: Optional[list[str]] = None,
    job_description: Optional[str] = None,
    job_title: Optional[str] = None,
) -> dict:
    """Returns {"model": ..., "skills": [...]} — job skills the resume is missing."""
    if not job_description or not job_description.strip():
        raise OpenAiError("A job description is needed to suggest skills.", status=400)

    user = "\n".join(
        p
        for p in [
            f"Target role: {job_title}" if job_title else None,
            f"Skills already on the resume: {', '.join(current_skills)}" if current_skills else "The resume lists no skills yet.",
            "",
            "Job description:",
            job_description.strip()[:6000],
        ]
        if p is not None
    )

    data, model = await structured_completion(
        system=SKILLS_SYSTEM,
        user=user,
        schema=SKILLS_SCHEMA,
        schema_name="skill_suggestions",
        max_tokens=1200,
    )

    parsed = SkillSuggestions.model_validate(data)
    existing = {s.lower() for s in (current_skills or [])}
    return {"model": model, "skills": [s for s in parsed.skills if s.lower() not in existing]}
