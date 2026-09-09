"""
Outreach Assistant
==================
Two short pieces of writing the extension offers from a job page:

  * a message to a recruiter or hiring manager — the kind you paste into a
    LinkedIn DM or InMail, so it has to be short and not read like a cover letter
  * an application email — subject line plus body, sent with a resume attached

Both are deliberately conservative. The model only has the posting and whatever
the candidate's profile says, so it must not invent employers, numbers, years of
experience or a name it was not given.
"""

from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.services.openai_client import OpenAiError, strictify, structured_completion

logger = logging.getLogger("outreach")

MESSAGE_LIMIT = 900
BODY_LIMIT = 2600


def _tidy(value: str) -> str:
    """Collapse runs of spaces but keep paragraph breaks."""
    lines = [" ".join(line.split()) for line in (value or "").splitlines()]
    out: list[str] = []
    for line in lines:
        if line or (out and out[-1]):
            out.append(line)
    return "\n".join(out).strip()


class HrMessage(BaseModel):
    message: str = Field(
        description="The message body only. No subject line, no signature block, no placeholders."
    )
    opener: str = Field(description="Three or four words naming the angle it opens on.")

    @field_validator("message")
    @classmethod
    def _clean_message(cls, value: str) -> str:
        text = _tidy(value)
        # Observed: the model sometimes restates the `opener` field as a label on
        # the first line of the body. Drop it rather than paste it into a DM.
        first, _, rest = text.partition("\n")
        if first.lower().startswith(("opener:", "angle:", "subject:")):
            text = rest.strip()
        return text[:MESSAGE_LIMIT]

    @field_validator("opener")
    @classmethod
    def _clean_opener(cls, value: str) -> str:
        return " ".join((value or "").split())


class ApplicationEmail(BaseModel):
    subject: str = Field(description="Subject line. Under 70 characters, no 'Re:' prefix.")
    body: str = Field(description="Email body with paragraph breaks. No signature block.")

    @field_validator("subject")
    @classmethod
    def _clean_subject(cls, value: str) -> str:
        return " ".join((value or "").split())[:120]

    @field_validator("body")
    @classmethod
    def _clean_body(cls, value: str) -> str:
        return _tidy(value)[:BODY_LIMIT]


HR_MESSAGE_SCHEMA = strictify(HrMessage.model_json_schema())
APPLICATION_EMAIL_SCHEMA = strictify(ApplicationEmail.model_json_schema())


HR_MESSAGE_SYSTEM = """You write a short outreach message to a recruiter or hiring manager
about a specific job, of the kind someone pastes into LinkedIn.

Rules:
- 90 to 130 words. This is a message, not a cover letter.
- Open with why this role, not with "I hope this message finds you well".
- Name two or three of the candidate's skills or results that the posting
  actually asks for, using the posting's own wording where it fits.
- Ground every claim in the candidate details supplied. Never invent an
  employer, a number, a certification or years of experience.
The posting's requirements are NOT the candidate's qualifications. Never restate a
requirement as something the candidate has. If the candidate details do not state
a number of years, a degree or a certification, do not mention one at all — write
about what they have actually done instead. Do not say "more than X years" unless
that exact claim appears in the candidate details.
- Close with one concrete, low-friction ask.
- No placeholders like [Your Name] or [Company]. If you were not told the
  recipient's name, open with "Hi" rather than guessing one.
- Plain sentences. No "I am writing to express my keen interest".
- `opener` names the angle you opened on, in three or four words. It is metadata:
  never write it into `message`."""


APPLICATION_EMAIL_SYSTEM = """You write the email someone sends to apply for a job,
with their resume attached.

Rules:
- Subject: under 70 characters, naming the role. No "Re:".
- Body: 110 to 170 words across two or three short paragraphs.
- First paragraph says which role and where it was seen, if you were told.
- Middle names two or three qualifications the posting asks for that the
  candidate genuinely has. Use the posting's wording where it fits.
- Mention that the resume is attached.
- Ground every claim in the candidate details supplied. Never invent an
  employer, a number, a certification or years of experience.
The posting's requirements are NOT the candidate's qualifications. Never restate a
requirement as something the candidate has. If the candidate details do not state
a number of years, a degree or a certification, do not mention one at all — write
about what they have actually done instead. Do not say "more than X years" unless
that exact claim appears in the candidate details.
- No signature block and no placeholders like [Your Name] — the sender's
  client adds that. If you were not given the recipient's name, use "Hello".
- Plain sentences. No "I am writing to express my keen interest"."""


def _candidate_block(
    *,
    full_name: Optional[str],
    current_title: Optional[str],
    skills: Optional[list[str]],
    experience: Optional[list[str]],
    summary: Optional[str],
) -> list[str]:
    return [
        f"Candidate name: {full_name}" if full_name else "Candidate name: (not supplied — do not invent one)",
        f"Current title: {current_title}" if current_title else None,
        f"Skills: {', '.join(skills[:20])}" if skills else None,
        f"Summary: {summary.strip()}" if summary else None,
        "Experience:" if experience else None,
        *(f"- {line}" for line in (experience or [])[:6]),
    ]


def _job_block(
    *,
    job_title: Optional[str],
    company: Optional[str],
    recipient: Optional[str],
    job_description: Optional[str],
) -> list[str]:
    parts = [
        f"Role: {job_title}" if job_title else None,
        f"Company: {company}" if company else None,
        f"Recipient: {recipient}" if recipient else "Recipient name unknown — do not guess one.",
    ]
    if job_description:
        parts += ["", "Job description:", job_description.strip()[:6000]]
    return parts


async def hr_message(
    *,
    job_title: Optional[str] = None,
    company: Optional[str] = None,
    recipient: Optional[str] = None,
    job_description: Optional[str] = None,
    full_name: Optional[str] = None,
    current_title: Optional[str] = None,
    skills: Optional[list[str]] = None,
    experience: Optional[list[str]] = None,
    summary: Optional[str] = None,
) -> dict:
    """Returns {"model": ..., "message": str, "opener": str}."""
    if not (job_title or job_description):
        raise OpenAiError("A job title or description is needed to write a message.", status=400)

    parts = _job_block(
        job_title=job_title, company=company, recipient=recipient, job_description=job_description
    ) + [""] + _candidate_block(
        full_name=full_name, current_title=current_title, skills=skills,
        experience=experience, summary=summary,
    )

    data, model = await structured_completion(
        system=HR_MESSAGE_SYSTEM,
        user="\n".join(p for p in parts if p is not None),
        schema=HR_MESSAGE_SCHEMA,
        schema_name="hr_message",
        max_tokens=1600,
    )

    parsed = HrMessage.model_validate(data)
    if not parsed.message:
        raise OpenAiError("The model returned an empty message.")
    return {"model": model, **parsed.model_dump()}


async def application_email(
    *,
    job_title: Optional[str] = None,
    company: Optional[str] = None,
    recipient: Optional[str] = None,
    job_description: Optional[str] = None,
    full_name: Optional[str] = None,
    current_title: Optional[str] = None,
    skills: Optional[list[str]] = None,
    experience: Optional[list[str]] = None,
    summary: Optional[str] = None,
    source: Optional[str] = None,
) -> dict:
    """Returns {"model": ..., "subject": str, "body": str}."""
    if not (job_title or job_description):
        raise OpenAiError("A job title or description is needed to write an email.", status=400)

    parts = _job_block(
        job_title=job_title, company=company, recipient=recipient, job_description=job_description
    )
    if source:
        parts.insert(2, f"Where the candidate saw the posting: {source}")
    parts += [""] + _candidate_block(
        full_name=full_name, current_title=current_title, skills=skills,
        experience=experience, summary=summary,
    )

    data, model = await structured_completion(
        system=APPLICATION_EMAIL_SYSTEM,
        user="\n".join(p for p in parts if p is not None),
        schema=APPLICATION_EMAIL_SCHEMA,
        schema_name="application_email",
        max_tokens=2000,
    )

    parsed = ApplicationEmail.model_validate(data)
    if not parsed.body:
        raise OpenAiError("The model returned an empty email.")
    return {"model": model, **parsed.model_dump()}
