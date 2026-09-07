"""
Job Description Formatter Agent
===============================
Turns the raw text a posting gives us into one predictable structure, so every
Preview JD and AI Studio screen renders the same way regardless of how the
posting was written.

Lives here rather than in the Next.js app so that the provider key, the model
choice and the prompt all stay inside the backend, alongside the rest of the AI
stack. Next calls `POST /api/jd/format` with the internal API key; it never sees
OPENAI_API_KEY.

The response schema is generated from the Pydantic models below and sent as an
OpenAI Structured Output with `strict: true`, so the fields are guaranteed by
the decoder rather than requested in the prompt. The reply is then validated
back through Pydantic, which also normalises the values.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Optional

import aiohttp
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("jd_formatter")

OPENAI_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1") + "/chat/completions"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# gpt-5-nano specifically — not gpt-5. They are different models and nano is the
# cheap one this task is sized for (~$2 per 10k postings).
MODEL = os.environ.get("OPENAI_JD_MODEL", "gpt-5-nano")

# gpt-5 counts reasoning tokens against max_completion_tokens, so reasoning can
# consume the whole budget and return empty content. Measured on a real posting:
# "low" burned 384 reasoning tokens and produced 1 responsibility and no skills;
# "minimal" burned 0 and produced 4 responsibilities with skills. Extraction does
# not benefit from reasoning here, it degrades it. "minimal" is the floor.
REASONING_EFFORT = os.environ.get("OPENAI_JD_REASONING", "minimal")
MAX_OUTPUT_TOKENS = int(os.environ.get("OPENAI_JD_MAX_TOKENS", "8000"))

HTTP_TIMEOUT = int(os.environ.get("JD_FORMAT_TIMEOUT_SECS", "45"))
MAX_INPUT_CHARS = 24_000

MAX_ATTEMPTS = 3
RETRY_STATUSES = {408, 409, 429, 500, 502, 503, 504}

_NULLISH = {"null", "none", "n/a", "na", "not specified", "unspecified", "not stated"}


class JdKeyInfo(BaseModel):
    jobType: Optional[str] = Field(None, description="Full-time, Part-time, Contract, Internship or Temporary.")
    workMode: Optional[str] = Field(None, description="On-site, Hybrid, Remote or In person.")
    location: Optional[str] = Field(None, description="City and country as written in the posting.")
    salary: Optional[str] = Field(None, description="Pay exactly as stated, e.g. '38,000 EUR per year'.")
    experienceLevel: Optional[str] = Field(
        None, description="Entry level, Mid level, Senior or Lead - only if stated or clearly implied."
    )
    company: Optional[str] = Field(None, description="Hiring company name.")

    @field_validator("*", mode="before")
    @classmethod
    def _blank_to_none(cls, value: Any) -> Any:
        """Models sometimes answer the string "null" or "N/A" rather than JSON null."""
        if not isinstance(value, str):
            return value
        text = " ".join(value.split())
        return None if not text or text.lower() in _NULLISH else text


class FormattedJd(BaseModel):
    summary: str = Field("", description="One or two sentences describing the role. Plain text.")
    overview: list[str] = Field(
        default_factory=list,
        description="Descriptive paragraphs about the role and company, in the posting's order.",
    )
    responsibilities: list[str] = Field(
        default_factory=list, description="What the person will do. One duty per item, as a short sentence."
    )
    requirements: list[str] = Field(
        default_factory=list, description="Must-have qualifications, experience and skills. One per item."
    )
    niceToHave: list[str] = Field(
        default_factory=list, description="Preferred or bonus qualifications. One per item."
    )
    benefits: list[str] = Field(
        default_factory=list, description="Benefits, perks and what the company offers. One per item."
    )
    skills: list[str] = Field(
        default_factory=list,
        description="Concrete skills, tools and technologies named in the posting, e.g. 'SQL', 'Data Cleaning'. Short noun phrases, not sentences.",
    )
    keyInfo: JdKeyInfo = Field(default_factory=JdKeyInfo)

    @field_validator("overview", "responsibilities", "requirements", "niceToHave", "benefits", "skills")
    @classmethod
    def _tidy_list(cls, value: list[str]) -> list[str]:
        out: list[str] = []
        for item in value or []:
            if not isinstance(item, str):
                continue
            text = " ".join(item.split())
            if text and text not in out:
                out.append(text)
        return out

    @field_validator("summary")
    @classmethod
    def _tidy_summary(cls, value: str) -> str:
        return " ".join((value or "").split())

    def has_content(self) -> bool:
        return bool(self.summary or self.overview or self.responsibilities or self.requirements)


def _strictify(schema: dict[str, Any]) -> dict[str, Any]:
    """
    Adapts a Pydantic JSON schema to OpenAI Structured Outputs' strict mode.

    Strict mode requires every object to set `additionalProperties: false` and to
    list every property in `required`; optional values must be nullable rather
    than omitted. Pydantic emits `anyOf: [T, null]` with a default instead, so we
    flatten those into `type: [T, "null"]`.
    """
    defs = schema.get("$defs", {})

    def resolve(node: Any) -> Any:
        if isinstance(node, list):
            return [resolve(n) for n in node]
        if not isinstance(node, dict):
            return node

        if "$ref" in node:
            ref = node["$ref"].split("/")[-1]
            return resolve(dict(defs.get(ref, {})))

        node = {k: v for k, v in node.items() if k not in ("default", "title")}

        # Optional[str] -> type: ["string", "null"]
        if "anyOf" in node:
            options = [resolve(o) for o in node["anyOf"]]
            types = [o.get("type") for o in options if isinstance(o, dict) and o.get("type")]
            if types:
                node.pop("anyOf")
                node["type"] = types if len(types) > 1 else types[0]

        if node.get("type") == "object" or "properties" in node:
            node["properties"] = {k: resolve(v) for k, v in (node.get("properties") or {}).items()}
            node["additionalProperties"] = False
            node["required"] = list(node["properties"].keys())

        if "items" in node:
            node["items"] = resolve(node["items"])

        return node

    root = resolve({k: v for k, v in schema.items() if k != "$defs"})
    return root


JD_JSON_SCHEMA = _strictify(FormattedJd.model_json_schema())

SYSTEM_PROMPT = """You restructure job postings into JSON. You are an extractor, not a writer.

Rules:
- Use only what the posting says. Never invent duties, requirements, benefits, salary or location.
- When the posting states something as prose, split it into individual items. "Responsibilities include establishing, reviewing and carrying out processes for capturing data, analysing that data, and identifying cost savings" becomes three separate responsibilities.
- Keep the posting's own wording. Tidy grammar and drop filler, but do not embellish or add metrics.
- Put a fact in exactly one place. A duty belongs in responsibilities, not also in overview.
- overview holds context about the role and company that is not a duty, requirement or benefit.
- skills are short noun phrases naming tools, technologies or competencies actually mentioned.
- Use null for any keyInfo field the posting does not state. Do not guess.
- Return [] for any section the posting does not cover."""


def is_configured() -> bool:
    return bool(OPENAI_API_KEY)


class JdFormatError(RuntimeError):
    """Raised when the posting could not be formatted by the model."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


async def format_job_description(
    description: str,
    *,
    job_title: str | None = None,
    company: str | None = None,
    location: str | None = None,
    salary: str | None = None,
) -> dict[str, Any]:
    """
    Returns {"model": ..., "data": {...}} for a posting.

    Raises JdFormatError when the model cannot be reached or returns nothing
    usable; the caller decides what to fall back to.
    """
    text = (description or "").strip()
    if not text:
        raise JdFormatError("No job description to format.", status=400)

    if not OPENAI_API_KEY:
        raise JdFormatError("JD formatting is not configured on the server (missing OPENAI_API_KEY).", status=503)

    user_content = "\n".join(
        line
        for line in [
            f"Job title: {job_title}" if job_title else None,
            f"Company: {company}" if company else None,
            f"Location: {location}" if location else None,
            f"Stated salary: {salary}" if salary else None,
            "",
            "Job posting:",
            text[:MAX_INPUT_CHARS],
        ]
        if line is not None
    )

    payload = {
        "model": MODEL,
        # gpt-5 rejects a custom temperature, so it stays at the default.
        "reasoning_effort": REASONING_EFFORT,
        "max_completion_tokens": MAX_OUTPUT_TOKENS,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "job_description", "strict": True, "schema": JD_JSON_SCHEMA},
        },
    }
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    timeout = aiohttp.ClientTimeout(total=HTTP_TIMEOUT)

    last_error = "The formatter did not return a result."

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(OPENAI_URL, headers=headers, json=payload) as resp:
                    if resp.status != 200:
                        detail = (await resp.text())[:300]
                        logger.error("OpenAI error %s: %s", resp.status, detail)
                        last_error = f"Formatter unavailable (HTTP {resp.status})."

                        # Rate limits and upstream blips are transient; a posting
                        # should not be stuck on the fallback for one bad second.
                        if resp.status in RETRY_STATUSES and attempt < MAX_ATTEMPTS:
                            retry_after = float(resp.headers.get("retry-after") or 0)
                            await _sleep(retry_after or attempt * 1.5)
                            continue
                        raise JdFormatError(last_error)

                    body = await resp.json()

        except JdFormatError:
            raise
        except Exception as exc:  # network drop, timeout, malformed response
            logger.error("JD format attempt %s failed: %s", attempt, exc)
            last_error = "Formatter request failed."
            if attempt < MAX_ATTEMPTS:
                await _sleep(attempt * 1.0)
                continue
            raise JdFormatError(last_error)

        choice = (body.get("choices") or [{}])[0]
        message = choice.get("message") or {}

        if message.get("refusal"):
            raise JdFormatError("The model declined to format this posting.")

        content = message.get("content")
        if not content:
            # finish_reason "length" means the budget was spent before any output
            # was emitted. With minimal reasoning that should not happen.
            ran_out = choice.get("finish_reason") == "length"
            last_error = (
                "Model hit its token limit before returning output."
                if ran_out
                else "Model returned no content."
            )
            if attempt < MAX_ATTEMPTS:
                await _sleep(0.5)
                continue
            raise JdFormatError(last_error)

        try:
            parsed = FormattedJd.model_validate(json.loads(content))
        except Exception as exc:
            logger.error("JD format validation failed: %s", exc)
            last_error = "Model response did not match the expected shape."
            if attempt < MAX_ATTEMPTS:
                continue
            raise JdFormatError(last_error)

        if not parsed.has_content():
            raise JdFormatError("Model returned an empty result.")

        # The job row is the better source when the model leaves these blank.
        parsed.keyInfo.company = parsed.keyInfo.company or company
        parsed.keyInfo.location = parsed.keyInfo.location or location
        parsed.keyInfo.salary = parsed.keyInfo.salary or salary

        return {"model": body.get("model") or MODEL, "data": parsed.model_dump()}

    raise JdFormatError(last_error)


async def _sleep(seconds: float) -> None:
    import asyncio

    await asyncio.sleep(max(0.0, seconds))
