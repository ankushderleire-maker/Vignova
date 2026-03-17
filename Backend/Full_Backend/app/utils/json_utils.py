import re
import json


def _repair_json_string(raw: str) -> str:
    """Attempt to fix the most common AI JSON formatting errors."""
    # 1. Remove markdown fences
    raw = re.sub(r"```json|```", "", raw).strip()
    
    # 2. Replace smart/curly quotes with straight quotes
    raw = raw.replace("\u2018", "'").replace("\u2019", "'")
    raw = raw.replace("\u201c", "'").replace("\u201d", "'")
    
    # 3. Strip null bytes / control chars that break parsers
    raw = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", raw)
    
    # 4. Fix unescaped double-quotes inside JSON string values.
    #    E.g.  "soft": "..., "AI-first" thinking, ..."
    #    Strategy: scan character-by-character inside string values and escape
    #    stray quotes. This is intentionally conservative.
    def fix_inner_quotes(m: re.Match) -> str:
        inner = m.group(1)
        # Replace any " that is not preceded by a backslash with an escaped version
        # but only if it's not at the start/end of the captured group
        inner = re.sub(r'(?<!\\)"', "'", inner)
        return '"' + inner + '"'

    # Only apply to string values that are longer than 30 chars (skill lists etc.)
    raw = re.sub(r'"([^"\\\\\\n]{30,})"', fix_inner_quotes, raw)

    return raw


def extract_json_from_response(text: str):
    """Extract and parse a JSON object from an AI response, with multi-stage repair."""
    stages = [
        lambda t: t,                         # Stage 0: raw (maybe already clean)
        _repair_json_string,                  # Stage 1: apply all repairs
        lambda t: _repair_json_string(t),     # Stage 2: second pass after strip
    ]

    for i, prepare in enumerate(stages):
        try:
            cleaned = prepare(text)
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                return json.loads(match.group())
        except json.JSONDecodeError as e:
            if i == len(stages) - 1:
                print("JSON Extraction Error (all stages failed):", e)
                print("--- RAW TEXT THAT FAILED TO PARSE ---")
                print(text[:2000])  # limit log size
                print("-------------------------------------")
        except Exception as e:
            print(f"JSON Extraction Error (stage {i}):", e)

    return {}
