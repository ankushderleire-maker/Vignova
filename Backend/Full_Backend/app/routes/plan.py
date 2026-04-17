"""
AI Agent Planner Route
======================
POST /api/agent/plan       — single next action from Ollama
POST /api/agent/plan-batch — all actions for current page at once

Production fix: call_ollama() is now fully async using aiohttp.
Previously it used requests.post() (blocking) which froze the entire
uvicorn event loop for up to 30 seconds per call.
"""

import json
import logging
import os
import re

import aiohttp
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
logger = logging.getLogger("agent_planner")

OLLAMA_BASE_URL  = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL     = os.environ.get("OLLAMA_MODEL", "llama3")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "vignova_internal_secret_key_123")


# ── Request Models ────────────────────────────────────────────────────

class PlanRequest(BaseModel):
    fields:  list
    buttons: list
    profile: dict
    url:     Optional[str] = ""


# ── Prompt Builder ────────────────────────────────────────────────────

def build_prompt(fields, buttons, profile, url, batch=False):
    profile_str = "\n".join([f"  {k}: {v}" for k, v in profile.items() if v])

    fields_str = "\n".join([
        f"  - selector: {f.get('selector', '')}\n"
        f"    label: {f.get('label', '')}\n"
        f"    type: {f.get('type', 'text')}\n"
        f"    name: {f.get('name', '')}\n"
        f"    placeholder: {f.get('placeholder', '')}\n"
        f"    required: {f.get('required', False)}"
        + (f"\n    options: {json.dumps(f.get('options', []))}" if f.get('options') else "")
        for f in fields[:12]
    ])

    buttons_str = "\n".join([
        f"  - selector: {b.get('selector', '')}\n"
        f"    text: {b.get('text', '')}\n"
        f"    type: {b.get('type', 'button')}"
        for b in buttons[:8]
    ])

    if batch:
        action_instruction = """Return a JSON array of ALL actions needed to fill these fields.
Each action must be a JSON object with: { "action", "selector", "value" }

Return ONLY a valid JSON array. No explanation. No markdown. Example:
[{"action": "fill_input", "selector": "#first_name", "value": "John"}]"""
    else:
        action_instruction = """Return the SINGLE most important next action as a JSON object.
The object must have: { "action", "selector", "value" }

Return ONLY valid JSON. No explanation. No markdown. Example:
{"action": "fill_input", "selector": "#email", "value": "john@example.com"}"""

    return f"""You are an AI assistant controlling a browser to fill out a job application form.

Available actions:
- fill_input: Set a text input or textarea value
- select_option: Select an option from a native HTML dropdown (value should match option text)
- select_react: Select an option from a React-Select/custom dropdown (type a value to search/filter, the best match will be clicked)
- click_button: Click a button
- answer_question: Fill a text field with an appropriate answer
- upload_file: Click a file upload input
- submit_form: Click the submit button

User Profile:
{profile_str}

Current Page: {url}

Form Fields That Need Filling:
{fields_str}

Available Buttons:
{buttons_str}

{action_instruction}

Rules:
- Use EXACT selectors from the field list above
- For questions you don't know, give a reasonable professional answer
- For "Are you authorized to work" type questions, use the profile data
- For salary fields, leave empty or use profile data if available
- Never make up profile data that isn't provided
- For fields with type "react-select", use action "select_react" and set value to the best matching option text
- For "How did you hear about this job" type questions, answer "LinkedIn" or "Job Board"
- For gender questions, answer "Decline To Self Identify" unless profile specifies
- For country/location dropdowns, use the profile city/country data
- IMPORTANT: For react-select dropdowns, the value should be the text to type/search for, not a code"""


# ── Async Ollama API Call ─────────────────────────────────────────────

async def call_ollama(prompt: str) -> str | None:
    """
    Call the local Ollama model asynchronously.
    Uses aiohttp instead of requests.post so the uvicorn event loop is
    never blocked — a single Ollama call can take 10-30 seconds.
    """
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model":  OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 512},
        "format": "json",
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                if resp.status != 200:
                    logger.error("Ollama HTTP error: %s", resp.status)
                    return None
                data = await resp.json(content_type=None)
                return data.get("response", "")
    except aiohttp.ClientError as e:
        logger.error("Ollama connection error: %s", e)
        return None


def parse_action(text):
    if not text:
        return None

    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        obj_match = re.search(r'\{[^{}]+\}', text)
        if obj_match:
            try:
                return json.loads(obj_match.group())
            except json.JSONDecodeError:
                pass

        arr_match = re.search(r'\[[\s\S]*\]', text)
        if arr_match:
            try:
                return json.loads(arr_match.group())
            except json.JSONDecodeError:
                pass

        logger.error("Could not parse AI response: %s", text[:200])
        return None


# ── Routes ────────────────────────────────────────────────────────────

@router.post("/api/agent/plan")
async def plan_action(req: PlanRequest, x_api_key: str = Header(None)):
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        prompt        = build_prompt(req.fields, req.buttons, req.profile, req.url, batch=False)
        response_text = await call_ollama(prompt)

        if not response_text:
            return {"success": False, "error": "Ollama did not respond"}

        action = parse_action(response_text)
        if not action:
            return {"success": False, "error": "Could not parse AI response"}

        return {"success": True, "action": action}

    except Exception as e:
        logger.error("Plan error: %s", e)
        return {"success": False, "error": "Planning failed. Please try again."}


@router.post("/api/agent/plan-batch")
async def plan_batch(req: PlanRequest, x_api_key: str = Header(None)):
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        prompt        = build_prompt(req.fields, req.buttons, req.profile, req.url, batch=True)
        response_text = await call_ollama(prompt)

        if not response_text:
            return {"success": False, "error": "Ollama did not respond"}

        result = parse_action(response_text)
        if result is None:
            return {"success": False, "error": "Could not parse AI response"}

        if isinstance(result, dict):
            result = [result]

        if not isinstance(result, list):
            return {"success": False, "error": "Invalid response format"}

        valid_actions = [
            {
                "action":   action["action"],
                "selector": action["selector"],
                "value":    action.get("value", ""),
            }
            for action in result
            if isinstance(action, dict) and "action" in action and "selector" in action
        ]

        return {"success": True, "actions": valid_actions}

    except Exception as e:
        logger.error("Batch plan error: %s", e)
        return {"success": False, "error": "Batch planning failed. Please try again."}
