"""
Resume writer
=============
Turns a master profile plus a job description into the document we would be
willing to send ourselves.

Two things are different from the first version of this endpoint:

  * The house style is written down. The old prompt asked for "4-5 bullet
    points per role" and "a professional summary" and left everything else to
    the model, which is why the output read like filler. RESUME_SPEC below is
    a style guide with numbers in it — bullet grammar, word counts, verb
    variety, how skills are grouped, where keywords go — taken from a resume
    that actually works rather than from generic advice.

  * The shape is enforced by the decoder. The model is handed a JSON schema
    generated from the Pydantic models here, so "return valid JSON" is a
    property of the request rather than a request in the prompt. That removes
    the whole class of failures where a stray quote inside a bullet meant a
    burnt credit and no resume.

Model: gpt-5-nano (not gpt-5 — different model, this is the small one) with
reasoning at minimum, through the shared structured-output client. Gemini
remains as a fallback path in the route, driven by the same style guide, so a
missing OpenAI key or a bad minute at OpenAI still produces a resume.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from pydantic import BaseModel, Field

from app.services.openai_client import (
    OpenAiError,
    is_configured,
    strictify,
    structured_completion,
)

logger = logging.getLogger("resume_writer")

JD_MAX_CHARS = 8_000
PROFILE_MAX_CHARS = 14_000


# ── The shape the model must return ───────────────────────────────────────
#
# Every field is required and non-nullable: OpenAI strict mode demands it, and
# it means downstream code never has to ask whether a key exists. Anything the
# profile does not supply comes back as "" or [].


class SkillGroup(BaseModel):
    label: str = Field(description="Group name in title case, 2-4 words, e.g. 'Cloud & DevOps'.")
    skills: list[str] = Field(description="4-14 tools, systems, methods or domain capabilities the candidate genuinely has.")


class ExperienceEntry(BaseModel):
    company: str = Field(description="Employer name, copied exactly from the profile.")
    role: str = Field(description="Job title held, copied exactly from the profile.")
    location: str = Field(description="Work location from the profile, or '' if absent.")
    startDate: str = Field(description="Start date, copied exactly from the profile.")
    endDate: str = Field(description="End date, copied exactly, or 'Present'.")
    description: list[str] = Field(
        description="Achievement bullets following the bullet grammar. No leading dash or bullet character."
    )
    impact: str = Field(
        description=(
            "One line closing the role: what was different because this person held it. "
            "Carries the role's figures when the individual bullets cannot. "
            "'' when the notes give nothing to say."
        )
    )


class ProjectEntry(BaseModel):
    name: str = Field(description="Project name from the profile.")
    techStack: str = Field(description="Comma-separated technologies, named the way the posting names them.")
    link: str = Field(description="Project URL from the profile, or ''.")
    description: list[str] = Field(description="2-3 bullets following the bullet grammar.")


class EducationEntry(BaseModel):
    school: str
    degree: str
    field: str
    startDate: str
    endDate: str
    grade: str = Field(description="Grade or GPA if the profile states one, else ''.")


class CertificationEntry(BaseModel):
    name: str
    issuer: str
    date: str
    url: str


class LanguageEntry(BaseModel):
    name: str
    proficiency: str


class TailoredResume(BaseModel):
    fullName: str = Field(description="Copied exactly from the profile.")
    jobTitle: str = Field(description="The target title for this application.")
    email: str
    phone: str
    location: str
    website: str
    linkedin: str
    github: str
    summary: str = Field(description="Three or four sentences, 55-90 words, third person.")
    skillGroups: list[SkillGroup] = Field(description="5-7 labelled groups, most relevant to the posting first.")
    softSkills: list[str] = Field(description="Only the interpersonal skills the posting explicitly asks for; [] otherwise.")
    experience: list[ExperienceEntry]
    projects: list[ProjectEntry]
    education: list[EducationEntry]
    certifications: list[CertificationEntry]
    languages: list[LanguageEntry]


RESUME_SCHEMA = strictify(TailoredResume.model_json_schema())


# ── The house style ───────────────────────────────────────────────────────

_SPEC_HEAD = """You write the resume that gets the interview.

The master profile is the record of what this person actually did; it is the only
source of fact you have. You decide what to bring forward, how to phrase it, what
to leave out. You never invent an employer, a title, a date, a degree, a
certification, a tool they have not touched, or a number that is not in the
profile.

THE PROFILE IS RAW NOTES, NOT COPY. The lines in it were typed in a hurry: half
of them are fragments with no verb, most are shorter than a resume bullet, and
several cover two achievements at once. Rewriting them into the house style
below is the whole job. A bullet that repeats a profile line word for word, or
trims it slightly, is a failed bullet — even when the line is accurate.

The house style below is not advice. It is the specification for the document.

=== HEADER ===
fullName, email, phone, location, linkedin, website and github are copied
verbatim from the profile. Leave a field empty rather than guessing at it.
jobTitle is the posting's own title when the candidate can credibly claim it. If
the posting's title is internal jargon (Member of Technical Staff II), write the
plain-English role instead, optionally with their specialism, e.g.
AI/ML Engineer | Data Scientist.

=== SUMMARY ===
Three or four sentences, 55-90 words. Third person. No I, no passionate, no
proven track record of leveraging.
  1. Target title, years of experience, and what they do — then the word
     including, and three or four concrete domain phrases in the posting's
     vocabulary.
  2. Where their ground is: the systems, tools and methods this posting cares
     about that they genuinely have. Name them.
  3. Proof. The flagship thing they shipped or ran, named, with the figure that
     makes it real — or, where the notes carry no figures, the breadth they
     covered: the environments, the regions, the end-to-end processes.
  4. Optional fourth sentence, for a career spanning several environments: what
     they can be trusted to do end to end.
The summary is the densest keyword bed on the page. Every domain term the
candidate genuinely owns should be reachable from here or from the skills.

"""


SKILL_GROUP_SPEC = """=== SKILL GROUPS ===
5-7 groups, ordered by what the posting leads with. Each group is a title-case
label of 2-4 words holding 4-14 items. Label them for the posting's own domain.
A software or data posting reads like:
  Generative AI & LLMs / ML & Data Science / Languages & Frameworks /
  Backend & AI Systems / Databases & Storage / Cloud & DevOps / Tooling
For any other field use that field's own categories — a nurse's groups are not a
developer's.
Items are named precisely: Milvus beats vector database, AWS beats cloud,
PyTorch beats deep learning frameworks. Where the posting names a tool the
candidate has, spell it the posting's way.
An item names a thing — a tool, system, platform, method or capability — in one
to four words. In technical fields those are mostly product names: Milvus,
FastAPI, Power BI. Outside them they are the domain's own terms, and phrases are
right: "stock reconciliation", "shortage mitigation", "ABC/FSN analysis",
"UAT testing", "SOP documentation", "demand-supply balancing". Use the words the
field uses; a supply chain resume that says "planning" where it means "ROP,
safety stock, DOS" has thrown away its keywords.
A description of work is still not an item: write "ETL Pipelines", not
"configurable Python rule engine for JSON extraction". A line from the posting's
wish list is not one either: never write "cost awareness", "strong
communication", "attention to detail" or "Kubernetes an advantage" as a skill.
Neither is a group of people — "product and data teams" is not a skill.
Every item must be supported by the profile. Never pad a group to reach a count;
four real skills beat ten with six invented. Do not repeat an item across groups.
Put each item where a reader expects to find it: Docker, CI/CD, cloud providers,
reverse proxies and deployment tooling go under Cloud & DevOps, not under a
backend heading; programming languages and their frameworks go together. Every
group holds at least three items — if one would hold fewer, fold it into the
group next to it rather than shipping a heading with a single word under it."""


_SPEC_MID = """=== EXPERIENCE ===
Every role in the profile, most recent first. Company, role, location and dates
copied exactly — you rewrite the bullets, never the facts.

Bullet budget:
  most recent or most relevant role . . . . 5-7 bullets
  the role before that . . . . . . . . . . . 4-6 bullets
  older roles . . . . . . . . . . . . . . . . 3-4 bullets
  a role over ten years old, or unrelated . . 2 bullets
Never write more bullets than the profile gives you material for. Four true
bullets beat seven padded ones."""


_GRAMMAR_HEAD = """=== WHICH REGISTER THIS RESUME IS IN ===
Read the notes before you write a word. They come in two kinds, and they take
two different bullets. Pick the one the evidence supports; do not mix them, and
never write in the first register when the notes only support the second.

  DELIVERY. The person owned outcomes and the notes carry figures — 60%, 200ms,
  10,000 documents, 45% cost. Engineering, sales, growth, operations leadership.
  Bullets run 16-24 words and close on the number.

  SUPPORT. The person supported a process others owned: coordination, testing,
  documentation, planning support, service, administration, clinical or care
  work. The notes carry few figures, because the achievement was that the
  process ran. Bullets run 11-18 words, name the systems and the specific
  domain terms — "stock reconciliation", "UAT testing", "ABC/FSN analysis",
  "hyper-care support" — and do not force a number that is not there. The role's
  outcome goes in its impact line instead.

Writing a support role in the delivery register is how resumes end up with
invented percentages. Precision about what was actually done beats a number
nobody can defend.

=== THE IMPACT LINE ===
Each role may close with one line, `impact`, saying what was different because
this person held it: "Improved inventory accuracy and an estimated 20-25%
improvement in sales performance." 10-20 words. This is where a support role's
figures live, and it is drawn from the notes like everything else — return ""
rather than inventing one.

BULLET GRAMMAR — every bullet is built this way:
  <Past-tense verb> <what you built, ran or changed> <the systems involved>,
  <clause naming the result or the scope>

  A profile note runs 6-12 words. A bullet runs 16-24 in the delivery register
  and 11-18 in the support one. Either way, if your bullet is not visibly better
  built than the note it came from, you have not done the work. Here is the
  transformation, in full:

"""

_DELIVERY_EXAMPLES = """    NOTE:   handled onboarding for new clients, ~15 a month
    BULLET: Coordinated onboarding for 15 new client accounts a month,
            standardising the contract-to-invoice handover across sales and
            finance

    NOTE:   built dashboard in Power BI for regional sales
    BULLET: Built a Power BI dashboard for regional sales reporting, replacing a
            manual weekly spreadsheet cycle with a single live view

    NOTE:   cut supplier costs 18% by renegotiating the three biggest contracts
    BULLET: Renegotiated the three largest supplier contracts against benchmarked
            market rates, reducing annual procurement spend by 18%

"""

_SUPPORT_EXAMPLES = """  And the same three in the support register, where the notes carry no numbers:

    NOTE:   helped with stock counts and reconciliation
    BULLET: Supported inventory control including stock reconciliation,
            replenishment tracking and inbound stock coordination

    NOTE:   did UAT for the WMS rollout
    BULLET: Performed functional, regression and UAT testing across inbound,
            outbound and inventory workflows in Manhattan WMS

    NOTE:   was the go-to during go-live
    BULLET: Provided hyper-care support through go-live, keeping disruption to
            daily operations to a minimum

"""

_GRAMMAR_TAIL = """  Notice what changed each time: a real verb at the front, the tool or method
  named, the scope made explicit, and — where there is one — the outcome moved to
  a closing clause. The facts and the figures did not change at all. Notice too
  that most of these have no percentage, because the notes had none. Inventing
  one is worse than going without.

  - Delivery register: 16 to 28 words, and at least two thirds close on the
    ", <verb>-ing <result>" clause.
  - Support register: 11 to 20 words, dense with the domain's own nouns. A
    closing clause only where the notes support one.
  - Never pad a bullet to reach a word count. A precise 12-word line beats a
    20-word one carrying five words of air.
  - Open every bullet with a different verb. No verb appears twice anywhere in
    the resume, projects included.
    In the delivery register: Architected, Engineered, Built, Designed,
    Developed, Launched, Shipped, Released, Created, Authored, Introduced,
    Automated, Containerized, Optimized, Accelerated, Reduced, Scaled, Migrated,
    Integrated, Instrumented, Established, Standardised, Consolidated,
    Formulated, Delivered, Led, Negotiated, Rebuilt, Streamlined, Recovered.
    In the support register: Supported, Coordinated, Maintained, Performed,
    Conducted, Validated, Monitored, Managed, Tracked, Reconciled, Documented,
    Resolved, Escalated, Liaised, Audited, Verified, Compiled, Prepared,
    Scheduled, Administered, Facilitated, Configured, Provided, Served,
    Processed, Reviewed, Trained, Collaborated, Analysed.
    Take the verb from the register the work is in. "Architected" over a week of
    UAT testing is a claim the bullet cannot support, and a reader can tell.
    Never use: Responsible for, Worked on, Helped, Assisted with, Involved in,
    Tasked with, Utilized, Leveraged, Spearheaded, Successfully.
    The words leverage, leveraging and utilise are banned anywhere in a bullet,
    not only at the front. Use, build and run are ordinary words; prefer them.
  - Carry a number wherever the profile gives you one: percentages, volumes,
    latencies, headcount, revenue, records, users, time saved, uptime. Reuse
    only figures the profile states or plainly implies. A bullet with no honest
    number states scale instead — the size of the corpus, the number of
    services, the systems it fed, the team it served — or simply names what was
    done precisely. Count the figures in the notes before you start: that is how
    many your bullets get, and no more.
  - Name the technology explicitly, in the posting's words where the profile
    supports it.
  - No first person. No trailing full stop. No markdown, no bold, no asterisks.
  - No bullet character or dash at the start of the string."""

# The whole-document spec describes both registers, because it has to pick
# one. A block already knows which it is in, so it sees only its own.
BULLET_GRAMMAR = _GRAMMAR_HEAD + _DELIVERY_EXAMPLES + _SUPPORT_EXAMPLES + _GRAMMAR_TAIL


def grammar_for(register: str) -> str:
    examples = _DELIVERY_EXAMPLES if register == "delivery" else _SUPPORT_EXAMPLES
    return _GRAMMAR_HEAD + examples + _GRAMMAR_TAIL



_SPEC_TAIL = """=== PROJECTS ===
2-4 projects, only ones that argue for this posting. 2-3 bullets each, same
grammar. techStack is a comma-separated list using the posting's names for
things. Personal or independent products count as projects, and are usually the
strongest evidence a junior candidate has — give the flagship 3 bullets.

=== EDUCATION, CERTIFICATIONS, LANGUAGES ===
Copied from the profile exactly. Never invent, never upgrade a grade, never
promote a course to a degree. If the profile has none, return [].

=== KEYWORDS ===
Read the posting and take the 20 terms an ATS would key on — tools, languages,
platforms, methodologies, the exact job title. Every one of those the candidate
can honestly claim must appear verbatim at least once, in this order of
preference:
  1. a skill group
  2. a bullet where it is true
  3. the summary
A term the candidate cannot claim does not go in. No term appears more than
three times in the whole document: a human reads this after the ATS does, and
stuffing is obvious.

=== WHAT DISQUALIFIES A DRAFT ===
  - a bullet lifted from the profile instead of rewritten
  - a bullet that does not start with a past-tense verb
  - a bullet under 14 words or over 28
  - a bullet that describes duties instead of outcomes
  - the same opening verb twice
  - a number that is not in the profile
  - a skill in a group that the profile never mentions
  - a sentence a recruiter would skim past because it could describe anyone"""


# Restated at the end of the user message, where a small model attends most.
RESUME_SPEC = "\n\n".join(
    [_SPEC_HEAD, SKILL_GROUP_SPEC, _SPEC_MID, BULLET_GRAMMAR, _SPEC_TAIL]
)


CHECKLIST = """
BEFORE YOU ANSWER, CHECK EVERY BULLET:
  1. Does it open with a past-tense verb no other bullet opens with?
  2. Is it between 14 and 28 words? Count them. Most profile lines are shorter
     than that, so a bullet the same length as its note has not been rewritten.
  3. Does it name the technology, and end with the result — ", cutting X by Y" /
     ", enabling Z across N documents"?
  4. Is every number in it taken from the profile?
  5. Would a recruiter learn something from it that they could not have guessed
     from the job title alone?
Then check the summary is three sentences and 55-70 words, and that every skill
you listed appears somewhere in the profile."""


def trim(text: str, max_chars: int) -> str:
    """Cap a block of text, saying so where it was cut."""
    text = text or ""
    return text[:max_chars] + "\n[truncated]" if len(text) > max_chars else text


# The cover-letter and draft-email prompts in the route trim to the same budget.
_trim = trim


def _ats_context(ats_report: Any) -> str:
    """The actionable part of a previous ATS run, if we are refining."""
    if not ats_report:
        return ""

    slim = {
        "overall_ats_score": ats_report.get("overall_ats_score"),
        "keyword_score": ats_report.get("keyword_score"),
        "missing_keywords": (ats_report.get("missing_keywords") or [])[:12],
        "improvements": (ats_report.get("improvements") or [])[:5],
    }
    return (
        "\n\n=== THIS IS A SECOND PASS ===\n"
        "The previous draft scored as follows. Fix these exact problems: place the\n"
        "missing keywords where they are honest, and answer each improvement note.\n"
        f"{json.dumps(slim, indent=2)}\n"
    )


_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _as_months(value: str, *, default_now: bool = False) -> int | None:
    """A date like 'Apr 2023' or '2021' as a month count, for arithmetic."""
    text = str(value or "").strip().lower()
    if not text:
        return None
    if default_now and text in {"present", "current", "currently", "now", "ongoing", "currently pursuing"}:
        from datetime import date
        today = date.today()
        return today.year * 12 + today.month

    year = re.search(r"(19|20)\d{2}", text)
    if not year:
        return None
    month = 1
    for name, number in _MONTHS.items():
        if name in text:
            month = number
            break
    return int(year.group(0)) * 12 + month


def experience_years(master_profile: dict) -> float | None:
    """
    Years of professional experience, from the dates the profile states.

    Handed to the model as a fact so it does not have to estimate. Left out
    entirely when the dates are unreadable — a missing line is better than a
    wrong number on someone's resume.
    """
    spans: list[tuple[int, int]] = []
    for entry in master_profile.get("experience") or []:
        if not isinstance(entry, dict):
            continue
        start = _as_months(entry.get("startDate"))
        end = _as_months(entry.get("endDate"), default_now=True)
        if start and end and end >= start:
            spans.append((start, end))

    if not spans:
        return None

    # Union, so two overlapping roles do not count twice.
    total = 0
    current_start, current_end = sorted(spans)[0]
    for start, end in sorted(spans)[1:]:
        if start > current_end:
            total += current_end - current_start
            current_start, current_end = start, end
        else:
            current_end = max(current_end, end)
    total += current_end - current_start

    return round(total / 12, 1)


def build_user_message(master_profile: dict, job_description: str, ats_report: Any = None) -> str:
    profile_str = _trim(json.dumps(master_profile, indent=2), PROFILE_MAX_CHARS)

    years = experience_years(master_profile)
    facts = (
        f"\n\nCOMPUTED FROM THE PROFILE'S OWN DATES: {years} years of professional\n"
        "experience. Use this figure in the summary; do not estimate your own."
        if years
        else ""
    )

    return (
        "JOB DESCRIPTION:\n"
        f"{_trim(job_description, JD_MAX_CHARS)}\n\n"
        "MASTER PROFILE (the only source of fact):\n"
        f"{profile_str}"
        f"{facts}"
        f"{_ats_context(ats_report)}"
        f"\n{CHECKLIST}"
    )


# The Gemini fallback gets the same style guide plus the shape it has to hand
# back, since it has no schema to hold it to.
_JSON_SHAPE = """
Output STRICT JSON and nothing else — no markdown fence, no commentary.
Never put a double-quote character inside a JSON string value.

{
  "fullName": "", "jobTitle": "", "email": "", "phone": "", "location": "",
  "website": "", "linkedin": "", "github": "", "summary": "",
  "skillGroups": [{ "label": "Cloud & DevOps", "skills": ["Docker", "AWS"] }],
  "softSkills": [],
  "experience": [{ "company": "", "role": "", "location": "", "startDate": "", "endDate": "", "description": ["", ""] }],
  "projects": [{ "name": "", "techStack": "", "link": "", "description": ["", ""] }],
  "education": [{ "school": "", "degree": "", "field": "", "startDate": "", "endDate": "", "grade": "" }],
  "certifications": [{ "name": "", "issuer": "", "date": "", "url": "" }],
  "languages": [{ "name": "", "proficiency": "" }]
}"""


def build_gemini_prompt(master_profile: dict, job_description: str, ats_report: Any = None) -> str:
    return (
        RESUME_SPEC
        + "\n\n=== OUTPUT ==="
        + _JSON_SHAPE
        + "\n\n"
        + build_user_message(master_profile, job_description, ats_report)
    )


# ── Tidying the model's output ────────────────────────────────────────────

_BULLET_PREFIX = re.compile(r"^\s*(?:[-•*•‣●▪]+\s*)+")
_MARKDOWN = re.compile(r"\*\*|__|`")

_TIRED_WORDS = [
    (re.compile(r"\bleveraging\b", re.I), "using"),
    (re.compile(r"\bleveraged\b", re.I), "used"),
    (re.compile(r"\bleverages\b", re.I), "uses"),
    (re.compile(r"\bleverage\b", re.I), "use"),
    (re.compile(r"\butili[sz]ing\b", re.I), "using"),
    (re.compile(r"\butili[sz]ed\b", re.I), "used"),
    (re.compile(r"\butili[sz]e\b", re.I), "use"),
]


def clean_bullet(line: Any) -> str:
    """One bullet, in house style: no marker, no markdown, no trailing stop."""
    text = " ".join(str(line or "").split())
    text = _BULLET_PREFIX.sub("", text)
    text = _MARKDOWN.sub("", text)

    # "Leveraging" survives the prompt ban often enough to be worth removing
    # here. These swaps are exact — the sentence means what it meant, in the
    # word a person would have used.
    for pattern, replacement in _TIRED_WORDS:
        text = pattern.sub(
            lambda m, r=replacement: r.capitalize() if m.start() == 0 else r, text
        )
    # A single trailing full stop only — "...99.5% uptime." loses the stop,
    # an ellipsis keeps its dots.
    if text.endswith(".") and not text.endswith(".."):
        text = text[:-1].rstrip()
    return text.strip()


# An impact line that refers to the notes, or to what they do not contain, is
# the model describing its instructions instead of the candidate's work.
_META_TALK = re.compile(
    r"\b(?:the\s+)?notes?\b|\bno(?:t|ne)?\s+(?:explicit\s+)?figures?\b"
    r"|\bfigures?\s+(?:in|from|not)\b|\bnot\s+(?:provided|available|specified)\b|\bn/a\b",
    re.I,
)


def clean_impact(line: Any) -> str:
    """The impact line, or nothing at all if it is talking about the brief."""
    text = clean_bullet(line)
    if not text or _META_TALK.search(text):
        return ""
    return text


def _clean_lines(values: Any) -> list[str]:
    if isinstance(values, str):
        values = values.split("\n")
    out: list[str] = []
    for value in values or []:
        line = clean_bullet(value)
        if line:
            out.append(line)
    return out


def _dedupe(items: Any) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items or []:
        text = " ".join(str(item or "").split())
        key = text.lower()
        if text and key not in seen:
            seen.add(key)
            out.append(text)
    return out


def normalize_skill_groups(groups: Any) -> list[dict]:
    """Groups with real labels and real items, nothing empty, no repeats."""
    out: list[dict] = []
    used: set[str] = set()

    for group in groups or []:
        if not isinstance(group, dict):
            continue
        label = " ".join(str(group.get("label") or "").split())
        skills = [s for s in _dedupe(group.get("skills")) if s.lower() not in used]
        if not label or not skills:
            continue
        used.update(s.lower() for s in skills)
        out.append({"label": label, "skills": skills})

    return out


# ── Keeping the skills honest ─────────────────────────────────────────────
#
# The instruction "never list a skill the profile does not support" is the one
# a small model breaks most often: it reads the posting's wish list and copies
# it in. That is the difference between a tailored resume and a lie, so it is
# checked here rather than asked for.

_GENERIC_WORDS = {
    "and", "the", "for", "with", "using", "based", "other", "various",
    "advantage", "preferred", "plus", "bonus", "nice", "etc",
}

# Words that mean the "skill" is a line from the posting's wish list rather
# than something anyone can be said to know.
_NOT_A_SKILL = {
    "awareness", "mindset", "attitude", "ownership", "passion", "willingness",
    "ability", "knowledge", "understanding", "experience", "advantage",
    "preferred", "desirable", "bonus", "familiarity", "exposure", "interest",
    # People and dispositions belong in soft skills, not a technical group.
    "team", "teams", "stakeholder", "stakeholders", "collaboration",
    "communication", "teamwork", "interpersonal",
}


def _fold(token: str) -> str:
    """Lower case, and a plural is the same word as its singular."""
    token = token.lower()
    return token[:-1] if len(token) > 3 and token.endswith("s") and not token.endswith("ss") else token


def _tokens(text: str) -> list[str]:
    return [_fold(t) for t in re.split(r"[^A-Za-z0-9+#.]+", text or "") if t]


def filter_skill_groups(groups: list[dict], master_profile: dict, job_description: str = "") -> list[dict]:
    """
    Drops group items the profile does not support.

    An item survives if every distinctive word in it appears somewhere in the
    profile. A term the posting uses is given more room — it survives on one
    matching word — because the profile's wording and the posting's rarely line
    up exactly ("RAG" against "Retrieval-Augmented Generation"), and dropping
    those would cost the candidate the keyword match they came for.
    """
    profile_text = json.dumps(master_profile, ensure_ascii=False).lower()
    profile_tokens = set(_tokens(profile_text))
    jd_text = (job_description or "").lower()

    kept: list[dict] = []
    for group in groups:
        items: list[str] = []
        for item in group.get("skills") or []:
            words = set(_tokens(item))
            if words & _NOT_A_SKILL:
                continue
            # A skill is the name of a thing. Past four words it is a
            # description of work — "configurable Python rule engine for JSON".
            if len(item.split()) > 4:
                continue
            distinctive = [t for t in _tokens(item) if len(t) >= 4 and t not in _GENERIC_WORDS]

            if not distinctive:
                # An acronym like AWS or SQL: look for the item itself.
                if item.lower() in profile_text:
                    items.append(item)
                continue

            present = [t for t in distinctive if t in profile_tokens]
            if len(present) == len(distinctive):
                items.append(item)
            elif present and item.lower() in jd_text:
                items.append(item)

        if items:
            kept.append({"label": group["label"], "skills": items})

    return kept


# ── Reading the draft back ────────────────────────────────────────────────
#
# The checks an editor would run, written down so a model can act on them.
# Both the bullet writer and the finished draft go through the same ones, so
# there is a single definition of what a good bullet is.


def _profile_notes(master_profile: dict) -> list[str]:
    notes: list[str] = []
    for key in ("experience", "projects"):
        for entry in master_profile.get(key) or []:
            if isinstance(entry, dict):
                notes.extend(_clean_lines(entry.get("description")))
    return notes


# The verb palettes the style guide lists, in code so a request can offer the
# ones a resume has not spent yet.
DELIVERY_VERBS = [
    "Architected", "Engineered", "Built", "Designed", "Developed", "Launched",
    "Shipped", "Released", "Created", "Authored", "Introduced", "Automated",
    "Optimized", "Accelerated", "Reduced", "Scaled", "Migrated", "Integrated",
    "Instrumented", "Established", "Standardised", "Consolidated", "Formulated",
    "Delivered", "Led", "Negotiated", "Rebuilt", "Streamlined", "Recovered",
]

SUPPORT_VERBS = [
    "Supported", "Coordinated", "Maintained", "Performed", "Conducted",
    "Validated", "Monitored", "Managed", "Tracked", "Reconciled", "Documented",
    "Resolved", "Escalated", "Liaised", "Audited", "Verified", "Compiled",
    "Prepared", "Scheduled", "Administered", "Facilitated", "Configured",
    "Provided", "Served", "Processed", "Reviewed", "Trained", "Analysed",
]


_GERUND_CLAUSE = re.compile(r",\s+\w+ing\b")
_HAS_NUMBER = re.compile(r"\d")
# The figures themselves, so a request can name them: 60%, 10,000+, 200ms, 3.
_FIGURE = re.compile(r"\d[\d,.]*\s?(?:%|\+|ms|k|K|M|bn)?(?:\s?-\s?\d+%)?")

# Past tense almost always ends in -ed; these are the irregulars a resume uses.
_IRREGULAR_PAST = {
    "built", "led", "grew", "won", "cut", "ran", "rebuilt", "drove", "wrote",
    "set", "sold", "made", "took", "held", "brought", "spent", "met", "kept",
    "taught", "shipped", "began", "chose", "found", "gave", "put", "sent",
    "split", "won", "cut", "drew", "saw", "sat", "won",
}


def _opening_verb(bullet: str) -> str:
    words = bullet.split()
    return words[0].lower().strip(",") if words else ""


def _opens_with_past_verb(bullet: str) -> bool:
    word = _opening_verb(bullet)
    return bool(word) and (word.endswith("ed") or word in _IRREGULAR_PAST)


def _is_copied(bullet: str, notes: list[str]) -> bool:
    from difflib import SequenceMatcher

    return any(SequenceMatcher(None, bullet.lower(), note.lower()).ratio() >= 0.82 for note in notes)


def source_register(notes: list[str]) -> str:
    """
    Which register the evidence supports: "delivery" or "support".

    Decided by the notes, not by the job title. A second reference resume — five
    years of supply chain and procurement support, and by its owner's account a
    strong ATS scorer — carries a figure in none of its nineteen bullets, runs
    them at 13.5 words rather than 20, and closes only one on a result clause.
    Judged by the delivery register it fails on every count, and "fixing" it
    would mean inventing percentages for work whose achievement was that the
    process ran at all.

    So the thresholds follow the source. Notes dense with figures get the
    delivery register; notes without them get the support one, where precision
    about systems and domain terms is what carries the bullet.
    """
    if not notes:
        return "delivery"
    with_number = sum(1 for note in notes if _HAS_NUMBER.search(note))
    return "delivery" if with_number * 2 >= len(notes) else "support"


def bullet_defects(
    bullets: list[str],
    notes: list[str],
    used_verbs: set[str] | None = None,
    impact: str = "",
) -> list[str]:
    """
    Everything wrong with one block of bullets, each defect naming the bullets
    it applies to. Vague feedback is feedback a small model cannot act on.

    What counts as wrong depends on what the notes support: see source_register.
    """
    if not bullets:
        return ["No bullets were written."]

    register = source_register(notes)
    floor, ceiling = (16, 28) if register == "delivery" else (11, 24)
    target = "16-24 words" if register == "delivery" else "12-20 words"

    problems: list[str] = []

    short = [b for b in bullets if len(b.split()) < floor]
    long_ = [b for b in bullets if len(b.split()) > ceiling]
    if short:
        problems.append(
            f"{len(short)} of these are under {floor} words — they are still notes, not resume "
            f"lines. Rewrite each to {target}: name the systems, state the scope, and say what "
            "it produced. " + " // ".join(short[:6])
        )
    if long_:
        problems.append(f"{len(long_)} run past {ceiling} words. Tighten: " + " // ".join(long_[:3]))

    copied = [b for b in bullets if _is_copied(b, notes)]
    if copied:
        problems.append(
            f"{len(copied)} are the note again, barely touched. Rewrite them completely — same "
            "facts, same figures, new sentence: " + " // ".join(copied[:6])
        )

    openers = [_opening_verb(b) for b in bullets]
    # One repeat inside a block is ordinary in support work, where half the
    # bullets genuinely begin "Supported". Three of the same verb is a rut.
    overused = sorted({v for v in openers if v and openers.count(v) > 2})
    clashing = sorted({v for v in openers if v and v in (used_verbs or set())})
    if overused:
        problems.append(
            "Used three times or more — give those bullets their own verbs: " + ", ".join(overused)
        )
    if clashing:
        problems.append(
            "Already used elsewhere in this resume — pick different verbs: " + ", ".join(clashing)
        )

    no_verb = [b for b in bullets if not _opens_with_past_verb(b)]
    if no_verb:
        problems.append(
            f"{len(no_verb)} do not open with a past-tense verb: " + " // ".join(no_verb[:5])
        )

    if register == "delivery":
        with_clause = sum(1 for b in bullets if _GERUND_CLAUSE.search(b))
        if with_clause * 3 < len(bullets) * 2:
            problems.append(
                f"Only {with_clause} of {len(bullets)} close with a result clause. At least two "
                "thirds must end in ', <verb>-ing <the measurable outcome>'."
            )

    # Never ask for more figures than the notes contain: that is a request to
    # invent them. The bullets should carry what is there, up to half of them.
    available = sum(1 for note in notes if _HAS_NUMBER.search(note))
    expected = min(len(bullets) // 2, available)
    # The impact line is where a support role's figure belongs, so a role that
    # put it there has not lost it.
    carried = bullets + ([impact] if impact else [])
    with_number = sum(1 for b in carried if _HAS_NUMBER.search(b))
    if expected and with_number < expected:
        problems.append(
            f"The notes contain {available} figures but only {with_number} of {len(bullets)} "
            "bullets carry one. Put the numbers that are there into the bullets they belong to — "
            "and invent none."
        )

    return problems


def critique(data: dict, master_profile: dict) -> list[str]:
    """The whole document read back: its bullets, plus what only it can show."""
    bullets: list[str] = []
    impacts: list[str] = []
    for entry in data.get("experience") or []:
        bullets.extend(entry.get("description") or [])
        if entry.get("impact"):
            impacts.append(entry["impact"])
    for entry in data.get("projects") or []:
        bullets.extend(entry.get("description") or [])

    problems = bullet_defects(bullets, _profile_notes(master_profile), impact=" ".join(impacts))

    summary_words = len((data.get("summary") or "").split())
    if summary_words and not 50 <= summary_words <= 95:
        problems.append(f"The summary is {summary_words} words. Three or four sentences, 55-90.")

    groups = data.get("skillGroups") or []
    if len(groups) < 4:
        problems.append(
            f"Only {len(groups)} skill groups. Give 5-7 labelled groups covering what the profile "
            "supports and this posting asks for."
        )

    # A role the profile has plenty of material for should not come back thin.
    source = master_profile.get("experience") or []
    for index, entry in enumerate((data.get("experience") or [])[:2]):
        available = len(_clean_lines(source[index].get("description"))) if index < len(source) else 0
        written = len(entry.get("description") or [])
        if available >= 5 and written < 5:
            problems.append(
                f"The role at {entry.get('company') or 'the top of the resume'} has {written} "
                f"bullets but the profile offers {available} achievements. Write 5-7."
            )

    return problems


def to_resume_dict(payload: dict) -> dict:
    """
    The model's answer in the shape the rest of the system already speaks.

    `skills.technical` stays a comma-separated string because every template,
    the ATS scorer and the extension read it. `skillGroups` rides alongside for
    the templates that can lay them out properly.
    """
    groups = normalize_skill_groups(payload.get("skillGroups"))
    flat = [skill for group in groups for skill in group["skills"]]

    data: dict = {
        key: " ".join(str(payload.get(key) or "").split())
        for key in ("fullName", "jobTitle", "email", "phone", "location", "website", "linkedin", "github")
    }
    data["summary"] = " ".join(str(payload.get("summary") or "").split())
    data["skillGroups"] = groups
    data["skills"] = {
        "technical": ", ".join(flat),
        "soft": ", ".join(_dedupe(payload.get("softSkills"))),
    }

    data["experience"] = [
        {
            "company": str(entry.get("company") or "").strip(),
            "role": str(entry.get("role") or "").strip(),
            "location": str(entry.get("location") or "").strip(),
            "startDate": str(entry.get("startDate") or "").strip(),
            "endDate": str(entry.get("endDate") or "").strip(),
            "description": _clean_lines(entry.get("description")),
            "impact": clean_impact(entry.get("impact")),
        }
        for entry in payload.get("experience") or []
        if isinstance(entry, dict) and (entry.get("company") or entry.get("role"))
    ]

    data["projects"] = [
        {
            "name": str(entry.get("name") or "").strip(),
            "techStack": str(entry.get("techStack") or "").strip(),
            "link": str(entry.get("link") or "").strip(),
            "description": _clean_lines(entry.get("description")),
        }
        for entry in payload.get("projects") or []
        if isinstance(entry, dict) and entry.get("name")
    ]

    data["education"] = [
        {
            "school": str(entry.get("school") or "").strip(),
            "degree": str(entry.get("degree") or "").strip(),
            "field": str(entry.get("field") or "").strip(),
            "startDate": str(entry.get("startDate") or "").strip(),
            "endDate": str(entry.get("endDate") or "").strip(),
            "grade": str(entry.get("grade") or "").strip(),
        }
        for entry in payload.get("education") or []
        if isinstance(entry, dict) and (entry.get("school") or entry.get("degree"))
    ]

    data["certifications"] = [
        {
            "name": str(entry.get("name") or "").strip(),
            "issuer": str(entry.get("issuer") or "").strip(),
            "date": str(entry.get("date") or "").strip(),
            "url": str(entry.get("url") or "").strip(),
        }
        for entry in payload.get("certifications") or []
        if isinstance(entry, dict) and entry.get("name")
    ]

    data["languages"] = [
        {
            "name": str(entry.get("name") or "").strip(),
            "proficiency": str(entry.get("proficiency") or "").strip(),
        }
        for entry in payload.get("languages") or []
        if isinstance(entry, dict) and entry.get("name")
    ]

    return data


# ── Writing the bullets ───────────────────────────────────────────────────
#
# The bullets get their own pass.
#
# Asked for a whole resume in one call, a small model spends its effort on the
# structure — the grouping, the ordering, the copying of dates — and takes the
# cheapest possible route through the writing, which is to hand back the
# profile's own notes with the punctuation changed. Measured on a real profile:
# 20 of 20 bullets were the note again, averaging 12 words against a target of
# 20, with one result clause between them.
#
# Given one role at a time and nothing else to do, the same model writes proper
# bullets. So the first call builds the document and the ones after it write
# the lines, one block at a time, each seeing the verbs already spent so the
# resume does not open five bullets the same way.


class WrittenBullets(BaseModel):
    bullets: list[str] = Field(
        description="The rewritten bullets in the order they should appear, no bullet characters."
    )
    impact: str = Field(
        description=(
            "One line, 10-20 words, closing the role: what was different because this person "
            "held it, carrying whatever figures the notes contain. '' if the notes support none."
        )
    )


BULLETS_SCHEMA = strictify(WrittenBullets.model_json_schema())


def bullet_system(register: str) -> str:
    """The bullet writer's brief, carrying only this register's examples."""
    return (
        """You rewrite one job's rough notes into the bullets that go on the resume.

The notes are the only source of fact. Every company, technology, figure and
outcome in your bullets must be traceable to them. You never add a number, a
tool or an achievement that is not there.

What you do add is the writing: a real verb, the scope made explicit, the
technology named, and — where the notes support one — the outcome moved into a
closing clause.

"""
        + grammar_for(register)
        + """

You may merge two notes into one bullet when they describe the same piece of
work, and you may drop a note that says nothing a recruiter would value. You may
not pad: if the notes support five bullets, write five.

Then write the role's impact line: one sentence, 10-20 words, saying what was
different because this person held the role. It replaces the note it came from —
never write that note as a bullet as well. It is where the figures go when the
individual bullets cannot carry them — "Improved inventory accuracy and an
estimated 20-25% improvement in sales performance". Return "" for it rather than
inventing an outcome the notes do not support.

Return the bullets in the order they should appear, strongest first."""
    )


def _bullet_request(
    *,
    header: str,
    notes: list[str],
    job_description: str,
    target: int,
    used_verbs: set[str],
    problems: list[str] | None = None,
    previous: list[str] | None = None,
) -> str:
    numbered = "\n".join(f"{i}. {note}" for i, note in enumerate(notes, 1))
    register = source_register(notes)
    figures = sum(1 for note in notes if _HAS_NUMBER.search(note))

    if register == "delivery":
        guidance = [
            f"REGISTER: DELIVERY. These notes carry {figures} figures, so the bullets do too.",
            "Each bullet is 16 to 24 words: the verb, what was built or changed, the",
            "technology by name, then a closing clause carrying the result. Count the words.",
            "",
            "At least two thirds of them close on that clause, and it begins with an -ing",
            "verb after a comma:",
            "  ..., cutting manual processing effort by 60% and lifting accuracy by 35%",
            "  ..., enabling retrieval across a corpus of 10,000+ enterprise documents",
            "  ..., holding average response latency under 200ms at peak load",
            "The rest end on a figure of scale. A bullet that stops at what was built has",
            "told the reader half the story.",
        ]
    else:
        guidance = [
            "REGISTER: SUPPORT. This is work that kept a process running, and the notes carry",
            f"{figures} figures between them. Each bullet is 12 to 20 words, dense with the",
            "systems and the domain's own terms. Do not manufacture an outcome clause, and do",
            "not reach for Architected or Led — this is not that kind of work.",
        ]

    palette = DELIVERY_VERBS if register == "delivery" else SUPPORT_VERBS
    spent = {v.lower() for v in used_verbs}
    free = [v for v in palette if v.lower() not in spent]

    parts = [
        f"WRITING FOR: {header}",
        "",
        f"THE NOTES ({len(notes)} of them, raw and unusable as written):",
        numbered,
        "",
        "THE POSTING — borrow its vocabulary wherever the notes support it:",
        trim(job_description, 1_800),
        "",
    ]

    if problems and previous:
        parts += [
            "YOUR PREVIOUS ATTEMPT:",
            "\n".join(f"- {line}" for line in previous),
            "",
            "WHAT IS WRONG WITH IT:",
            "\n".join(f"{i}. {p}" for i, p in enumerate(problems, 1)),
            "",
        ]

    # Last, because it is what has to survive the read.
    parts += guidance
    quoted = []
    for note in notes:
        for figure in _FIGURE.findall(note):
            if figure not in quoted:
                quoted.append(figure)
    parts += [
        "",
        (
            "The figures in these notes are: " + ", ".join(quoted) + ". Every one belongs in a "
            "bullet or in the impact line, and no other number may appear anywhere."
        )
        if quoted
        else "These notes contain no figures. Do not put a single number in the bullets.",
    ]
    if free:
        parts.append(
            f"Open each bullet with a different verb from this list — the rest are already"
            " spent elsewhere in this resume: " + ", ".join(free[:18])
        )
    parts.append("")
    parts.append(
        f"WRITE {target} BULLETS AND THE IMPACT LINE."
        if not problems
        else f"WRITE {target} BULLETS AND THE IMPACT LINE AGAIN, with every problem above fixed."
    )

    return "\n".join(parts)


async def _write_block(
    *,
    header: str,
    notes: list[str],
    job_description: str,
    target: int,
    used_verbs: set[str],
) -> tuple[list[str], str]:
    """
    One role's or project's bullets and its impact line, checked and given one
    chance to improve.

    Returns ([], "") if the model could not be reached, which leaves the first
    pass's bullets in place rather than losing the section.
    """
    if not notes:
        return [], ""

    async def ask(problems=None, previous=None) -> tuple[list[str], str]:
        payload, _ = await structured_completion(
            system=bullet_system(source_register(notes)),
            user=_bullet_request(
                header=header,
                notes=notes,
                job_description=job_description,
                target=target,
                used_verbs=used_verbs,
                problems=problems,
                previous=previous,
            ),
            schema=BULLETS_SCHEMA,
            schema_name="written_bullets",
            max_tokens=3_000,
        )
        written = WrittenBullets.model_validate(payload)
        return _clean_lines(written.bullets), clean_impact(written.impact)

    def without_the_impact(lines: list[str], line: str) -> list[str]:
        """A bullet that says what the impact line says is one line wasted."""
        if not line:
            return lines
        from difflib import SequenceMatcher

        return [
            b for b in lines
            if SequenceMatcher(None, b.lower(), line.lower()).ratio() < 0.7
        ]

    try:
        bullets, impact = await ask()
        bullets = without_the_impact(bullets, impact)
    except OpenAiError as exc:
        logger.warning("Bullet pass failed for %s (%s)", header, exc)
        return [], ""

    problems = bullet_defects(bullets, notes, used_verbs, impact)
    # A second call is only worth its latency for a defect that shows: a bullet
    # that is still a note, or five bullets opening the same way. Falling a
    # little short on result clauses is not worth another round trip.
    severe = [p for p in problems if not p.startswith("Only ")]
    if severe:
        try:
            second, second_impact = await ask(problems=problems, previous=bullets)
            second = without_the_impact(second, second_impact or impact)
            if second and len(bullet_defects(second, notes, used_verbs, second_impact or impact)) < len(problems):
                bullets, impact = second, (second_impact or impact)
        except OpenAiError:
            pass

    return bullets, impact


def _match_notes(entry: dict, source: list, keys: tuple[str, ...]) -> list[str]:
    """The profile's own notes for this role or project, matched by name."""
    def signature(item: dict) -> str:
        return " ".join(str(item.get(k) or "").strip().lower() for k in keys)

    wanted = signature(entry)
    for item in source or []:
        if isinstance(item, dict) and signature(item) == wanted:
            return _clean_lines(item.get("description"))

    # Fall back on the company or project name alone — the model is allowed to
    # tidy a job title, and that should not cost the role its notes.
    first = str(entry.get(keys[0]) or "").strip().lower()
    for item in source or []:
        if isinstance(item, dict) and str(item.get(keys[0]) or "").strip().lower() == first:
            return _clean_lines(item.get("description"))

    return []


# Bullets to aim for, by position. Matches the budget in the style guide.
_EXPERIENCE_TARGETS = [6, 6, 5, 4, 3]
_PROJECT_TARGETS = [3, 2, 2, 2]


async def write_bullets_for(data: dict, master_profile: dict, job_description: str) -> dict:
    """Replaces the first pass's bullets with properly written ones, in place."""
    used_verbs: set[str] = set()

    roles = data.get("experience") or []
    for index, entry in enumerate(roles):
        notes = _match_notes(entry, master_profile.get("experience") or [], ("company", "role"))
        notes = notes or list(entry.get("description") or [])
        target = _EXPERIENCE_TARGETS[min(index, len(_EXPERIENCE_TARGETS) - 1)]
        # One role carrying the whole resume gets the room a second role would
        # have taken, so a strong single-job candidate does not read as thin.
        if len(roles) == 1:
            target = 8
        target = max(2, min(target, len(notes)))

        header = " — ".join(p for p in [entry.get("role"), entry.get("company")] if p)
        dates = " ".join(p for p in [entry.get("startDate"), entry.get("endDate")] if p)
        bullets, impact = await _write_block(
            header=f"{header} ({dates})" if dates else header,
            notes=notes,
            job_description=job_description,
            target=target,
            used_verbs=used_verbs,
        )
        if bullets:
            entry["description"] = bullets
        if impact:
            entry["impact"] = impact
        used_verbs.update(_opening_verb(b) for b in entry.get("description") or [])

    for index, entry in enumerate(data.get("projects") or []):
        notes = _match_notes(entry, master_profile.get("projects") or [], ("name",))
        notes = notes or list(entry.get("description") or [])
        target = _PROJECT_TARGETS[min(index, len(_PROJECT_TARGETS) - 1)]
        target = max(1, min(target, len(notes)))

        name = entry.get("name") or "project"
        stack = entry.get("techStack")
        bullets, _impact = await _write_block(
            header=f"{name} — personal or independent project ({stack})" if stack else f"{name} — project",
            notes=notes,
            job_description=job_description,
            target=target,
            used_verbs=used_verbs,
        )
        if bullets:
            entry["description"] = bullets
        used_verbs.update(_opening_verb(b) for b in entry.get("description") or [])

    return data


# ── Grouping the skills ───────────────────────────────────────────────────
#
# The document call is at its weakest here. Asked for the whole resume, it
# routinely returns two groups where the style guide asks for five to seven,
# and lumps fourteen unrelated terms under one heading. Given the skill
# inventory and nothing else to do, it groups them properly — the same pattern
# as the bullets.


class WrittenGroups(BaseModel):
    groups: list[SkillGroup] = Field(description="5-7 labelled groups, the posting's priorities first.")


GROUPS_SCHEMA = strictify(WrittenGroups.model_json_schema())

GROUPS_SYSTEM = (
    """You arrange one candidate's skills into the labelled groups that head their resume.

You are given every skill they have and the posting they are applying to. You
choose the headings, decide what belongs under each, and order both so the
posting's priorities come first.

"""
    + SKILL_GROUP_SPEC
    + """

You may reword an item to match the posting's spelling of it. You may not add a
skill that is not in the list you were given — not one, however obviously the
posting wants it."""
)


def _skill_inventory(master_profile: dict) -> list[str]:
    """Everything the profile claims, however the profile stores it."""
    skills = master_profile.get("skills")
    items: list[str] = []
    if isinstance(skills, dict):
        for key in ("technical", "soft"):
            value = skills.get(key)
            if isinstance(value, list):
                items.extend(str(v) for v in value)
            elif value:
                items.extend(str(value).split(","))
    elif isinstance(skills, list):
        items.extend(str(v) for v in skills)
    elif skills:
        items.extend(str(skills).split(","))
    return _dedupe(items)


def group_defects(groups: list[dict], inventory: list[str]) -> list[str]:
    problems: list[str] = []
    if len(groups) < 4:
        problems.append(
            f"Only {len(groups)} groups. Give 5-7, each with its own heading, so the section can "
            "be read at a glance instead of as one long list."
        )
    thin = [g["label"] for g in groups if len(g["skills"]) < 3]
    if thin:
        problems.append(
            "These hold fewer than three items — fold them into a neighbouring group or give them "
            "more of what belongs there: " + ", ".join(thin)
        )
    fat = [g["label"] for g in groups if len(g["skills"]) > 14]
    if fat:
        problems.append("These hold more than 14 items; split them: " + ", ".join(fat))

    placed = sum(len(g["skills"]) for g in groups)
    if inventory and placed * 2 < len(inventory):
        problems.append(
            f"Only {placed} of the candidate's {len(inventory)} skills were placed. Keep every one "
            "the posting could care about."
        )
    return problems


async def write_skill_groups_for(data: dict, master_profile: dict, job_description: str) -> dict:
    """Replaces the first pass's skill groups with properly arranged ones."""
    inventory = _skill_inventory(master_profile)
    if not inventory:
        return data

    user = "\n".join(
        [
            "THE POSTING:",
            trim(job_description, 3_000),
            "",
            f"EVERY SKILL THIS CANDIDATE HAS ({len(inventory)}):",
            ", ".join(inventory),
            "",
            "Arrange them.",
        ]
    )

    async def ask(text: str) -> list[dict]:
        payload, _ = await structured_completion(
            system=GROUPS_SYSTEM,
            user=text,
            schema=GROUPS_SCHEMA,
            schema_name="skill_groups",
            max_tokens=2_500,
        )
        parsed = WrittenGroups.model_validate(payload)
        groups = normalize_skill_groups([g.model_dump() for g in parsed.groups])
        return filter_skill_groups(groups, master_profile, job_description)

    try:
        groups = await ask(user)
    except OpenAiError as exc:
        logger.warning("Skill grouping failed (%s); keeping the first draft", exc)
        return data

    problems = group_defects(groups, inventory)
    if problems:
        retry = (
            f"{user}\n\nYOUR PREVIOUS ATTEMPT:\n"
            + "\n".join(f"- {g['label']}: {', '.join(g['skills'])}" for g in groups)
            + "\n\nWHAT IS WRONG WITH IT:\n"
            + "\n".join(f"{i}. {p}" for i, p in enumerate(problems, 1))
            + "\n\nArrange them again with those fixed."
        )
        try:
            second = await ask(retry)
            if second and len(group_defects(second, inventory)) < len(problems):
                groups = second
        except OpenAiError:
            pass

    if groups:
        data["skillGroups"] = groups
        data["skills"] = {
            "technical": ", ".join(s for g in groups for s in g["skills"]),
            "soft": (data.get("skills") or {}).get("soft", "") if isinstance(data.get("skills"), dict) else "",
        }
    return data


# ── Writing the summary ───────────────────────────────────────────────────
#
# Same reason as the bullets: on its own, with the finished bullets in front of
# it as evidence, the model writes a summary worth reading. Buried in the
# document call it writes three sentences that could head anyone's resume.


class WrittenSummary(BaseModel):
    summary: str = Field(description="Three sentences, 55-70 words, third person, no first person.")


SUMMARY_SCHEMA = strictify(WrittenSummary.model_json_schema())

SUMMARY_SYSTEM = """You write the three or four sentence profile that opens a resume.

  1. Who they are and how long: the target title, the years of experience, and
     what they do — then the word including, and three or four concrete domain
     phrases in the posting's own vocabulary.
  2. Where their ground is: the systems, tools and methods this posting cares
     about that they genuinely have. Name them.
  3. Proof: the thing they shipped or ran, named, with the figure that makes it
     real — or, where the evidence carries no figures, the breadth they covered.
  4. Optional, for a career spanning several environments: what they can be
     trusted to do end to end.

Two openings that work:

  Generative AI Engineer with 2+ years architecting production AI systems,
  including LLM applications, agentic workflows and retrieval-augmented
  pipelines.

  Supply chain and procurement support professional with 5 years across
  procurement operations, inventory management, material planning and ERP/WMS
  systems in manufacturing, logistics and retail environments.

Write full sentences. Never a label and a colon — no "Flagship achievement:",
no "Key strengths:". 55-90 words in total. Third person, no I, no my. Never
"passionate", "results-driven", "proven track record", "dynamic professional".

Every fact and figure comes from the evidence you are given.

Name only technologies that appear in the skills list or the evidence below.
The posting will mention tools this person has never touched; putting one of
those in their summary is a lie told in the first line of their resume."""


# Words a summary opens with or leans on that are not claims about tooling.
_NAME_STOP = {
    "senior", "junior", "lead", "staff", "principal", "engineer", "scientist",
    "developer", "analyst", "manager", "specialist", "consultant", "designer",
    "the", "and", "with", "including", "grounded", "proficient", "experienced",
    "led", "built", "shipped", "designed", "developed", "delivered", "trained",
    "strong", "deep", "track", "record", "targeting", "focused",
}


def unsupported_names(text: str, allowed: str) -> list[str]:
    """
    Capitalised names in the text that nothing in the resume supports.

    Catches the failure that matters most in a summary: repeating a technology
    from the posting that the candidate has never used. A false positive here
    costs one extra call and nothing else, because a revision is only kept when
    it has fewer defects than what it replaced.
    """
    allowed_tokens = set(_tokens(allowed))
    names = set(re.findall(r"\b[A-Z][A-Za-z0-9+.#]{3,}", text or ""))
    return sorted(
        name for name in names
        if name.lower() not in _NAME_STOP and _fold(name) not in allowed_tokens
    )


def summary_defects(summary: str, allowed: str = "", require_figure: bool = True) -> list[str]:
    problems: list[str] = []
    words = len(summary.split())
    if not 50 <= words <= 95:
        problems.append(f"It is {words} words. It must be 55-90.")
    sentences = [s for s in re.split(r"(?<![0-9])[.!?]\s+", summary.strip()) if s.strip()]
    if not 3 <= len(sentences) <= 4:
        problems.append(f"It is {len(sentences)} sentences. It must be three or four.")
    if require_figure and not _HAS_NUMBER.search(summary):
        problems.append("It carries no figure. Sentence three must name the scale of what they shipped.")
    if re.search(r"\b(I|my|passionate|results-driven|proven track record|leverag)\w*\b", summary, re.I):
        problems.append("It uses first person or a phrase from the banned list.")
    if allowed:
        unsupported = unsupported_names(summary, allowed)
        if unsupported:
            problems.append(
                "It names things this resume does not support — remove them: " + ", ".join(unsupported)
            )
    return problems


async def write_summary_for(data: dict, master_profile: dict, job_description: str) -> dict:
    """Rewrites the summary against the finished bullets. Never raises."""
    evidence: list[str] = []
    for entry in data.get("experience") or []:
        header = " — ".join(p for p in [entry.get("role"), entry.get("company")] if p)
        evidence.append(f"{header} ({entry.get('startDate')} - {entry.get('endDate')})")
        evidence += [f"  - {line}" for line in entry.get("description") or []]
    for entry in data.get("projects") or []:
        evidence.append(f"{entry.get('name')} (project) — {entry.get('techStack')}")
        evidence += [f"  - {line}" for line in entry.get("description") or []]

    years = experience_years(master_profile)
    skills = ", ".join(s for group in data.get("skillGroups") or [] for s in group["skills"])

    base = "\n".join(
        [
            "THE POSTING:",
            _trim(job_description, 3_000),
            "",
            f"YEARS OF EXPERIENCE, computed from the profile's dates: {years}" if years else "",
            f"SKILLS ON THIS RESUME: {skills}" if skills else "",
            "",
            "THE EVIDENCE — this resume's own experience and projects:",
            "\n".join(evidence),
            "",
            "Write the profile.",
        ]
    )

    async def ask(user: str) -> str:
        payload, _ = await structured_completion(
            system=SUMMARY_SYSTEM,
            user=user,
            schema=SUMMARY_SCHEMA,
            schema_name="written_summary",
            max_tokens=1_200,
        )
        return " ".join(WrittenSummary.model_validate(payload).summary.split())

    # What the summary is allowed to name: this resume, and the profile behind it.
    allowed = " ".join([skills, " ".join(evidence), json.dumps(master_profile, ensure_ascii=False)])

    try:
        summary = await ask(base)
    except OpenAiError as exc:
        logger.warning("Summary pass failed (%s); keeping the first draft", exc)
        return data

    # A support-shaped history has no figures to quote; demanding one there is
    # asking the model to make one up.
    require_figure = source_register(_profile_notes(master_profile)) == "delivery"
    problems = summary_defects(summary, allowed, require_figure)
    if problems:
        retry = (
            f"{base}\n\nYOUR PREVIOUS ATTEMPT:\n{summary}\n\nWHAT IS WRONG WITH IT:\n"
            + "\n".join(f"{i}. {p}" for i, p in enumerate(problems, 1))
            + "\n\nWrite it again with those fixed."
        )
        try:
            second = await ask(retry)
            if second and len(summary_defects(second, allowed, require_figure)) < len(problems):
                summary = second
        except OpenAiError:
            pass

    if summary:
        data["summary"] = summary
    return data


# ── Entry point ───────────────────────────────────────────────────────────

def available() -> bool:
    return is_configured()


async def write_resume(master_profile: dict, job_description: str, ats_report: Any = None) -> dict:
    """
    The tailored resume: one call to build the document, then one call per role
    and project to write its bullets.

    Raises OpenAiError if the model could not be reached or returned nothing
    usable — the caller falls back to Gemini rather than failing the request.
    """
    payload, model_used = await structured_completion(
        system=RESUME_SPEC,
        user=build_user_message(master_profile, job_description, ats_report),
        schema=RESUME_SCHEMA,
        schema_name="tailored_resume",
        max_tokens=12_000,
    )

    data = to_resume_dict(TailoredResume.model_validate(payload).model_dump())
    data["skillGroups"] = filter_skill_groups(data["skillGroups"], master_profile, job_description)

    if not data["experience"] and not data["projects"] and not data["summary"]:
        raise OpenAiError("The model returned an empty resume.")

    data = await write_skill_groups_for(data, master_profile, job_description)
    data = await write_bullets_for(data, master_profile, job_description)
    data = await write_summary_for(data, master_profile, job_description)

    remaining = critique(data, master_profile)
    logger.info(
        "Tailored resume written by %s (%d style notes remaining%s)",
        model_used,
        len(remaining),
        ": " + "; ".join(p.split(".")[0] for p in remaining[:3]) if remaining else "",
    )
    return data
