"""
AI Agent Planner Route
======================
POST /api/agent/plan — Receives page state + user profile,
calls local Ollama model, returns next action JSON.

POST /api/agent/plan-batch — Same but returns multiple actions at once.
"""

import os
import json
import logging
import requests
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
logger = logging.getLogger("agent_planner")

# Ollama config from .env
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "vignova_internal_secret_key_123")


# ── Request Models ────────────────────────────────────────────────────

class PlanRequest(BaseModel):
    fields: list        # Unmatched form fields
    buttons: list       # Navigation/submit buttons
    profile: dict       # User profile data
    url: Optional[str] = ""


# ── Prompt Builder ────────────────────────────────────────────────────

def build_prompt(fields, buttons, profile, url, batch=False):
    """Build the system + user prompt for the Ollama model."""

    profile_str = "\n".join([f"  {k}: {v}" for k, v in profile.items() if v])

    fields_str = "\n".join([
        f"  - selector: {f.get('selector', '')}\n"
        f"    label: {f.get('label', '')}\n"
        f"    type: {f.get('type', 'text')}\n"
        f"    name: {f.get('name', '')}\n"
        f"    placeholder: {f.get('placeholder', '')}\n"
        f"    required: {f.get('required', False)}"
        + (f"\n    options: {json.dumps(f.get('options', []))}" if f.get('options') else "")
        for f in fields[:12]  # Limit to avoid token overflow
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

    prompt = f"""You are an AI assistant controlling a browser to fill out a job application form.

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

    return prompt


# ── Ollama API Call ───────────────────────────────────────────────────

def call_ollama(prompt):
    """Call the local Ollama model and return the response text."""
    url = f"{OLLAMA_BASE_URL}/api/generate"

    try:
        response = requests.post(
            url,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Low temp for consistent output
                    "num_predict": 512,
                },
                "format": "json",  # Ask Ollama for JSON output
            },
            timeout=30,
        )

        if response.status_code != 200:
            logger.error(f"Ollama HTTP error: {response.status_code}")
            return None

        data = response.json()
        return data.get("response", "")

    except requests.RequestException as e:
        logger.error(f"Ollama connection error: {e}")
        return None


def parse_action(text):
    """Parse AI response into action dict(s)."""
    if not text:
        return None

    # Clean response
    text = text.strip()

    # Remove markdown code blocks if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        parsed = json.loads(text)
        return parsed
    except json.JSONDecodeError:
        # Try to extract JSON from the text
        import re
        # Find JSON object
        obj_match = re.search(r'\{[^{}]+\}', text)
        if obj_match:
            try:
                return json.loads(obj_match.group())
            except json.JSONDecodeError:
                pass

        # Find JSON array
        arr_match = re.search(r'\[[\s\S]*\]', text)
        if arr_match:
            try:
                return json.loads(arr_match.group())
            except json.JSONDecodeError:
                pass

        logger.error(f"Could not parse AI response: {text[:200]}")
        return None


# ── Routes ────────────────────────────────────────────────────────────

@router.post("/api/agent/plan")
async def plan_action(req: PlanRequest, x_api_key: str = Header(None)):
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    """Get a single next action from the AI."""
    try:
        prompt = build_prompt(req.fields, req.buttons, req.profile, req.url, batch=False)
        response_text = call_ollama(prompt)

        if not response_text:
            return {"success": False, "error": "Ollama did not respond"}

        action = parse_action(response_text)

        if not action:
            return {"success": False, "error": "Could not parse AI response"}

        return {"success": True, "action": action}

    except Exception as e:
        logger.error(f"Plan error: {e}")
        return {"success": False, "error": "Planning failed. Please try again."}


@router.post("/api/agent/plan-batch")
async def plan_batch(req: PlanRequest, x_api_key: str = Header(None)):
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    """Get multiple actions at once from the AI."""
    try:
        prompt = build_prompt(req.fields, req.buttons, req.profile, req.url, batch=True)
        response_text = call_ollama(prompt)

        if not response_text:
            return {"success": False, "error": "Ollama did not respond"}

        result = parse_action(response_text)

        if result is None:
            return {"success": False, "error": "Could not parse AI response"}

        # Ensure it's a list
        if isinstance(result, dict):
            result = [result]

        if not isinstance(result, list):
            return {"success": False, "error": "Invalid response format"}

        # Validate each action
        valid_actions = []
        for action in result:
            if isinstance(action, dict) and "action" in action and "selector" in action:
                valid_actions.append({
                    "action": action["action"],
                    "selector": action["selector"],
                    "value": action.get("value", ""),
                })

        return {"success": True, "actions": valid_actions}

    except Exception as e:
        logger.error(f"Batch plan error: {e}")
        return {"success": False, "error": "Batch planning failed. Please try again."}
