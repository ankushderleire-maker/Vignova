import json
import re


def _strip_fences(raw: str) -> str:
    return re.sub(r"```json|```", "", raw or "").strip()


def _normalize_quotes(raw: str) -> str:
    return (
        raw.replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2013", "-")
        .replace("\u2014", "-")
    )


def _remove_control_chars(raw: str) -> str:
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", raw)


_VALID_ESCAPES = set('"\\/bfnrt')


def _fix_string_bodies(raw: str) -> str:
    """
    Repairs the two things models get wrong inside JSON strings.

    1. Backslashes that don't begin a legal escape — "C:\\Users", "\\d+", "100\\%"
       — which json.loads rejects as `Invalid \\escape`.
    2. Raw newlines and tabs, which are illegal control characters inside a
       JSON string and show up whenever a model writes a multi-line value.

    This walks the text instead of using a regex because a legal "\\\\" has to be
    consumed as a pair; a regex would re-examine the second backslash and
    double it again, turning valid JSON into invalid JSON.
    """
    out: list[str] = []
    i = 0
    n = len(raw)
    in_string = False

    while i < n:
        ch = raw[i]

        if not in_string:
            if ch == '"':
                in_string = True
            out.append(ch)
            i += 1
            continue

        if ch == '"':
            in_string = False
            out.append(ch)
            i += 1
            continue

        if ch in "\n\r\t":
            out.append({"\n": "\\n", "\r": "\\r", "\t": "\\t"}[ch])
            i += 1
            continue

        if ch != "\\":
            out.append(ch)
            i += 1
            continue

        nxt = raw[i + 1] if i + 1 < n else ""
        if nxt == "u" and re.fullmatch(r"[0-9a-fA-F]{4}", raw[i + 2 : i + 6] or ""):
            out.append(raw[i : i + 6])
            i += 6
        elif nxt in _VALID_ESCAPES:
            out.append(ch + nxt)
            i += 2
        else:
            # Not a legal escape — the model meant a literal backslash.
            out.append("\\\\")
            i += 1

    return "".join(out)


def _extract_json_candidate(text: str) -> str:
    start = text.find("{")
    if start == -1:
        return ""

    depth = 0
    in_string = False
    escape = False

    for idx in range(start, len(text)):
        ch = text[idx]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : idx + 1]

    return text[start:].strip()


def _trim_to_last_complete_field(raw: str) -> str:
    raw = raw.rstrip().rstrip(",")
    if raw.endswith("}"):
        return raw

    last_comma = raw.rfind(',"')
    if last_comma == -1:
        last_comma = raw.rfind(",\n")
    if last_comma == -1:
        return raw

    trimmed = raw[:last_comma].rstrip(", \n\r\t")
    open_braces = trimmed.count("{")
    close_braces = trimmed.count("}")
    if open_braces > close_braces:
        trimmed += "}" * (open_braces - close_braces)
    return trimmed


def _repair_common_json_issues(raw: str) -> str:
    raw = _strip_fences(raw)
    raw = _normalize_quotes(raw)
    raw = _remove_control_chars(raw)
    raw = _fix_string_bodies(raw)
    raw = re.sub(r",(\s*[}\]])", r"\1", raw)
    return raw.strip()


def extract_json_from_response(text: str):
    """Extract and parse a JSON object from an AI response, with recovery for truncation."""
    prepared = _repair_common_json_issues(text)
    candidate = _extract_json_candidate(prepared)
    if not candidate:
        return {}

    attempts = [
        candidate,
        re.sub(r",(\s*[}\]])", r"\1", candidate),
        _trim_to_last_complete_field(candidate),
    ]

    for idx, attempt in enumerate(attempts):
        if not attempt:
            continue
        try:
            return json.loads(attempt)
        except json.JSONDecodeError as exc:
            if idx == len(attempts) - 1:
                print("JSON Extraction Error (all stages failed):", exc)
                print("--- RAW TEXT THAT FAILED TO PARSE ---")
                print((text or "")[:4000])
                print("-------------------------------------")
        except Exception as exc:
            print(f"JSON Extraction Error (stage {idx}):", exc)

    return {}
