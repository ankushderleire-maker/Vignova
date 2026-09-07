"""
Shared OpenAI client for the structured-output agents.

Both the JD formatter and the resume assistant need the same thing: send a
prompt, get back JSON that is guaranteed to match a schema, and retry the
transient failures. That logic lives here so there is one place to change the
model, the retry policy or the provider.

Schemas are generated from Pydantic models and adapted to OpenAI's strict mode,
so the fields are enforced by the decoder rather than requested in the prompt.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any

import aiohttp

logger = logging.getLogger("openai_client")

OPENAI_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1") + "/chat/completions"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# gpt-5-nano specifically — not gpt-5. Different models; nano is the cheap one
# these extraction/rewrite tasks are sized for.
DEFAULT_MODEL = os.environ.get("OPENAI_JD_MODEL", "gpt-5-nano")

# gpt-5 counts reasoning tokens against max_completion_tokens, so reasoning can
# consume the whole budget and return empty content. Measured on a real posting:
# "low" burned 384 reasoning tokens and degraded the output; "minimal" burned 0
# and did better. These tasks do not benefit from reasoning.
DEFAULT_REASONING = os.environ.get("OPENAI_JD_REASONING", "minimal")
DEFAULT_MAX_TOKENS = int(os.environ.get("OPENAI_JD_MAX_TOKENS", "8000"))

HTTP_TIMEOUT = int(os.environ.get("JD_FORMAT_TIMEOUT_SECS", "45"))
MAX_ATTEMPTS = 3
RETRY_STATUSES = {408, 409, 429, 500, 502, 503, 504}


class OpenAiError(RuntimeError):
    """Raised when the model could not be reached or returned nothing usable."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


def is_configured() -> bool:
    return bool(OPENAI_API_KEY)


def strictify(schema: dict[str, Any]) -> dict[str, Any]:
    """
    Adapts a Pydantic JSON schema to OpenAI Structured Outputs' strict mode.

    Strict mode requires every object to set `additionalProperties: false` and to
    list every property in `required`; optional values must be nullable rather
    than omitted. Pydantic emits `anyOf: [T, null]` with a default instead, so
    those get flattened into `type: [T, "null"]`.
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

    return resolve({k: v for k, v in schema.items() if k != "$defs"})


async def structured_completion(
    *,
    system: str,
    user: str,
    schema: dict[str, Any],
    schema_name: str,
    model: str | None = None,
    max_tokens: int | None = None,
) -> tuple[dict[str, Any], str]:
    """
    Returns (parsed_json, model_used).

    Raises OpenAiError on refusal, exhausted retries, or an unusable response.
    """
    if not OPENAI_API_KEY:
        raise OpenAiError("AI features are not configured on the server (missing OPENAI_API_KEY).", status=503)

    payload = {
        "model": model or DEFAULT_MODEL,
        # gpt-5 rejects a custom temperature, so it stays at the default.
        "reasoning_effort": DEFAULT_REASONING,
        "max_completion_tokens": max_tokens or DEFAULT_MAX_TOKENS,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": schema_name, "strict": True, "schema": schema},
        },
    }
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    timeout = aiohttp.ClientTimeout(total=HTTP_TIMEOUT)

    last_error = "The model did not return a result."

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(OPENAI_URL, headers=headers, json=payload) as resp:
                    if resp.status != 200:
                        detail = (await resp.text())[:300]
                        logger.error("OpenAI error %s: %s", resp.status, detail)
                        last_error = f"AI service unavailable (HTTP {resp.status})."

                        if resp.status in RETRY_STATUSES and attempt < MAX_ATTEMPTS:
                            retry_after = float(resp.headers.get("retry-after") or 0)
                            await asyncio.sleep(retry_after or attempt * 1.5)
                            continue
                        raise OpenAiError(last_error)

                    body = await resp.json()

        except OpenAiError:
            raise
        except Exception as exc:
            logger.error("OpenAI attempt %s failed: %s", attempt, exc)
            last_error = "AI request failed."
            if attempt < MAX_ATTEMPTS:
                await asyncio.sleep(attempt * 1.0)
                continue
            raise OpenAiError(last_error)

        choice = (body.get("choices") or [{}])[0]
        message = choice.get("message") or {}

        if message.get("refusal"):
            raise OpenAiError("The model declined this request.")

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
                await asyncio.sleep(0.5)
                continue
            raise OpenAiError(last_error)

        try:
            return json.loads(content), (body.get("model") or payload["model"])
        except Exception:
            last_error = "Model response was not valid JSON."
            if attempt < MAX_ATTEMPTS:
                continue
            raise OpenAiError(last_error)

    raise OpenAiError(last_error)
