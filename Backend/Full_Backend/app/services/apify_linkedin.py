"""
Apify LinkedIn Profile Scraper
==============================
Server-side wrapper around the Apify actor `harvestapi/linkedin-profile-scraper`.

The browser never talks to Apify. The dashboard calls our own Next.js route,
Next.js calls this FastAPI service with the internal API key, and only this
module ever sees APIFY_API_TOKEN.

Flow (async, so no HTTP connection is held open for the whole scrape):
    start_profile_run()   -> POST /v2/acts/{actor}/runs   -> runId
    get_run()             -> GET  /v2/actor-runs/{runId}  -> status
    fetch_dataset_items() -> GET  /v2/datasets/{id}/items -> raw profile
    normalize_profile()   -> maps the actor output onto the shape the
                             LinkedIn Optimizer UI and scorer already expect.

Docs: https://docs.apify.com/api/v2/act-runs-post
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any
from urllib.parse import urlparse

import aiohttp

logger = logging.getLogger("apify_linkedin")

APIFY_BASE_URL = os.environ.get("APIFY_BASE_URL", "https://api.apify.com/v2")
APIFY_API_TOKEN = os.environ.get("APIFY_API_TOKEN", "")
# Apify addresses actors as `username~actor-name` inside URLs.
APIFY_LINKEDIN_ACTOR = os.environ.get(
    "APIFY_LINKEDIN_ACTOR", "harvestapi~linkedin-profile-scraper"
)
# The actor's pay-per-event mode. The cheaper mode is enough for us — we never
# need the scraped person's email address.
APIFY_PROFILE_MODE = os.environ.get(
    "APIFY_PROFILE_SCRAPER_MODE", "Profile details no email ($4 per 1k)"
)
# Hard ceiling on the actor run itself, in seconds.
APIFY_RUN_TIMEOUT_SECS = int(os.environ.get("APIFY_RUN_TIMEOUT_SECS", "180"))
# Per-HTTP-call timeout when talking to the Apify REST API.
APIFY_HTTP_TIMEOUT_SECS = int(os.environ.get("APIFY_HTTP_TIMEOUT_SECS", "30"))

# Apify run states that mean "still working".
PENDING_STATES = {"READY", "RUNNING"}
SUCCESS_STATE = "SUCCEEDED"


class ApifyError(RuntimeError):
    """Raised when Apify rejects a request or is misconfigured."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


def is_configured() -> bool:
    return bool(APIFY_API_TOKEN)


def _headers() -> dict[str, str]:
    if not APIFY_API_TOKEN:
        raise ApifyError(
            "LinkedIn scraping is not configured on the server (missing APIFY_API_TOKEN).",
            status=503,
        )
    return {
        "Authorization": f"Bearer {APIFY_API_TOKEN}",
        "Content-Type": "application/json",
    }


def _timeout() -> aiohttp.ClientTimeout:
    return aiohttp.ClientTimeout(total=APIFY_HTTP_TIMEOUT_SECS)


# --------------------------------------------------------------------------
# URL handling
# --------------------------------------------------------------------------

_SLUG_RE = re.compile(r"^[\w\-%]{2,120}$", re.UNICODE)


def normalize_linkedin_url(raw_url: str) -> str:
    """
    Validates a LinkedIn profile URL and returns the canonical
    `https://www.linkedin.com/in/<slug>` form.

    Raises ValueError for anything that is not a public profile URL. This is
    the only user-controlled value we hand to Apify, so it gets validated
    rather than passed straight through.
    """
    url = (raw_url or "").strip()
    if not url:
        raise ValueError("LinkedIn profile URL is required.")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed = urlparse(url)
    host = (parsed.netloc or "").lower().split(":")[0]
    if not (host == "linkedin.com" or host.endswith(".linkedin.com")):
        raise ValueError("That is not a LinkedIn URL.")

    parts = [p for p in (parsed.path or "").split("/") if p]
    if len(parts) < 2 or parts[0].lower() != "in":
        raise ValueError(
            "Enter a personal profile URL that looks like "
            "https://www.linkedin.com/in/your-name"
        )

    slug = parts[1]
    if not _SLUG_RE.match(slug):
        raise ValueError("That LinkedIn profile URL looks malformed.")

    return f"https://www.linkedin.com/in/{slug}"


# --------------------------------------------------------------------------
# Apify REST calls
# --------------------------------------------------------------------------

async def _read_error(resp: aiohttp.ClientResponse) -> str:
    try:
        body = await resp.json()
        if isinstance(body, dict):
            err = body.get("error")
            if isinstance(err, dict):
                return str(err.get("message") or err.get("type") or body)
            return str(err or body)
        return str(body)
    except Exception:
        try:
            return (await resp.text())[:400]
        except Exception:
            return f"HTTP {resp.status}"


async def start_profile_run(linkedin_url: str) -> dict[str, Any]:
    """
    Kicks off an actor run and returns immediately with the run metadata.

    We deliberately skip Apify's `waitForFinish` / run-sync endpoints: polling
    keeps every request short, so nginx, the Next.js proxy and the browser all
    stay well inside their timeouts no matter how slow the actor is.
    """
    actor_input = {
        "profileScraperMode": APIFY_PROFILE_MODE,
        "queries": [linkedin_url],
    }

    url = f"{APIFY_BASE_URL}/acts/{APIFY_LINKEDIN_ACTOR}/runs"
    params = {"timeout": str(APIFY_RUN_TIMEOUT_SECS), "maxItems": "1"}

    async with aiohttp.ClientSession(timeout=_timeout()) as session:
        async with session.post(
            url, headers=_headers(), params=params, json=actor_input
        ) as resp:
            if resp.status not in (200, 201):
                detail = await _read_error(resp)
                logger.error("Apify run start failed (%s): %s", resp.status, detail)
                if resp.status in (401, 403):
                    raise ApifyError(
                        "The scraping service rejected our credentials.", status=502
                    )
                raise ApifyError(f"Could not start the LinkedIn scrape: {detail}")
            payload = await resp.json()

    data = payload.get("data") or {}
    run_id = data.get("id")
    if not run_id:
        raise ApifyError("The scraping service did not return a run id.")

    return {
        "runId": run_id,
        "status": data.get("status") or "READY",
        "datasetId": data.get("defaultDatasetId"),
    }


async def get_run(run_id: str) -> dict[str, Any]:
    """Returns {status, datasetId, statusMessage} for a run."""
    url = f"{APIFY_BASE_URL}/actor-runs/{run_id}"

    async with aiohttp.ClientSession(timeout=_timeout()) as session:
        async with session.get(url, headers=_headers()) as resp:
            if resp.status == 404:
                raise ApifyError("That scrape run no longer exists.", status=404)
            if resp.status != 200:
                detail = await _read_error(resp)
                logger.error("Apify run lookup failed (%s): %s", resp.status, detail)
                raise ApifyError(f"Could not check the scrape status: {detail}")
            payload = await resp.json()

    data = payload.get("data") or {}
    return {
        "status": data.get("status") or "UNKNOWN",
        "datasetId": data.get("defaultDatasetId"),
        "statusMessage": data.get("statusMessage") or "",
    }


async def fetch_dataset_items(dataset_id: str, limit: int = 1) -> list[dict[str, Any]]:
    url = f"{APIFY_BASE_URL}/datasets/{dataset_id}/items"
    params = {"clean": "true", "format": "json", "limit": str(limit)}

    async with aiohttp.ClientSession(timeout=_timeout()) as session:
        async with session.get(url, headers=_headers(), params=params) as resp:
            if resp.status != 200:
                detail = await _read_error(resp)
                logger.error("Apify dataset read failed (%s): %s", resp.status, detail)
                raise ApifyError(f"Could not read the scraped profile: {detail}")
            items = await resp.json()

    return items if isinstance(items, list) else []


# --------------------------------------------------------------------------
# Normalisation: Apify item -> the rawProfileData shape the app already uses
#
# Field names below follow the actor's published schema
# (docs.harvestapi.io/linkedin-api-reference/profile/get). Two traps worth
# remembering: images are ImageObjects ({url, sizes[]}), not strings — that
# includes coverPicture, companyLogo and schoolLogo — and the banner lives on
# `coverPicture`, not `coverImage`.
# --------------------------------------------------------------------------

def _first(source: dict[str, Any], *keys: str) -> Any:
    """Returns the first key present and non-empty. The actor has renamed a
    few fields across builds, so we accept the known aliases."""
    for key in keys:
        value = source.get(key)
        if value not in (None, "", [], {}):
            return value
    return None


def _text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, bool):
        return ""
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, dict):
        return _text(_first(value, "text", "name", "title", "linkedinText", "label"))
    if isinstance(value, list):
        return ", ".join(filter(None, (_text(v) for v in value)))
    return str(value)


def _image(value: Any) -> str:
    """
    Pulls a URL out of the actor's ImageObject: {url, sizes: [{url, width, height}]}.

    Prefers the largest declared size, falls back to the object's own `url`,
    and still accepts a plain string or a list for older builds.
    """
    if not value:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        for entry in value:
            found = _image(entry)
            if found:
                return found
        return ""
    if isinstance(value, dict):
        sizes = value.get("sizes")
        if isinstance(sizes, list) and sizes:
            best = None
            best_area = -1
            for size in sizes:
                if not isinstance(size, dict) or not size.get("url"):
                    continue
                area = (size.get("width") or 0) * (size.get("height") or 0)
                if area > best_area:
                    best, best_area = size["url"], area
            if best:
                return str(best).strip()
        url = _first(value, "url", "src", "originalUrl", "expiresAt")
        if isinstance(url, str):
            return url.strip()
    return ""


def _date_text(value: Any) -> str:
    """Apify returns dates as {month, year, text}; `text` is the display form."""
    if not value:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        text = _text(value.get("text"))
        if text:
            return text
        month, year = value.get("month"), value.get("year")
        if year and month:
            return f"{month}/{year}"
        return _text(year)
    return _text(value)


def _date_range(entry: dict[str, Any]) -> str:
    """
    Builds `Jan 2020 - Present · 2 yrs` style text from whatever is present.

    The actor's `duration` sometimes already carries the full span
    ("2000 - Present - 25 yrs") and sometimes only the length ("2 yrs 3 mos"),
    so we only stitch the two together in the second case.
    """
    explicit = _text(_first(entry, "duration", "period", "dateRange", "dates"))
    if explicit and re.search(r"\d{4}", explicit):
        return explicit

    start = _date_text(entry.get("startDate"))
    end = _date_text(entry.get("endDate"))

    span = ""
    if start or end:
        span = f"{start} - {end or 'Present'}".strip(" -")

    if span and explicit:
        return f"{span} · {explicit}"
    return span or explicit


def _skill_names(value: Any) -> list[str]:
    """Skills arrive either as plain strings or as {name, endorsements, ...}."""
    names: list[str] = []
    for item in value or []:
        name = _text(item) if not isinstance(item, dict) else _text(
            _first(item, "name", "title", "skill", "text")
        )
        if name and name not in names:
            names.append(name)
    return names


def _normalize_experience(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in raw or []:
        if not isinstance(entry, dict):
            continue

        # Some builds nest the roles held at one company under `positions`.
        positions = entry.get("positions")
        if isinstance(positions, list) and positions:
            company = _text(_first(entry, "companyName", "company", "name"))
            logo = _image(_first(entry, "companyLogo", "logo", "companyLogoUrl", "image"))
            for position in positions:
                if not isinstance(position, dict):
                    continue
                out.append(
                    {
                        "title": _text(_first(position, "position", "title", "role")),
                        "company": _text(
                            _first(position, "companyName", "company")
                        ) or company,
                        "dateRange": _date_range(position),
                        "location": _text(_first(position, "location", "geoLocation")),
                        "employmentType": _text(position.get("employmentType")),
                        "workplaceType": _text(position.get("workplaceType")),
                        "description": _text(
                            _first(position, "description", "summary")
                        ),
                        "companyLogoUrl": _image(
                            _first(position, "companyLogo", "logo", "companyLogoUrl")
                        ) or logo,
                        "companyUrl": _text(position.get("companyLinkedinUrl")),
                        "associatedSkills": ", ".join(
                            _skill_names(position.get("skills"))
                        ),
                    }
                )
            continue

        out.append(
            {
                "title": _text(_first(entry, "position", "title", "role", "jobTitle")),
                "company": _text(_first(entry, "companyName", "company", "organisation")),
                "dateRange": _date_range(entry),
                "location": _text(_first(entry, "location", "geoLocation")),
                "employmentType": _text(entry.get("employmentType")),
                "workplaceType": _text(entry.get("workplaceType")),
                "description": _text(_first(entry, "description", "summary")),
                "companyLogoUrl": _image(
                    _first(entry, "companyLogo", "logo", "companyLogoUrl", "image")
                ),
                "companyUrl": _text(entry.get("companyLinkedinUrl")),
                "associatedSkills": ", ".join(_skill_names(entry.get("skills"))),
            }
        )
    return out


def _normalize_education(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in raw or []:
        if not isinstance(entry, dict):
            continue

        degree = _text(_first(entry, "degree", "degreeName"))
        field = _text(_first(entry, "fieldOfStudy", "field"))
        if degree and field and field.lower() not in degree.lower():
            degree = f"{degree}, {field}"
        elif field and not degree:
            degree = field

        out.append(
            {
                "school": _text(_first(entry, "schoolName", "school", "title", "name")),
                "degree": degree,
                "dateRange": _date_range(entry),
                "description": _text(_first(entry, "description", "activities")),
                "schoolLogoUrl": _image(
                    _first(entry, "schoolLogo", "logo", "schoolLogoUrl", "image")
                ),
                "schoolUrl": _text(entry.get("schoolLinkedinUrl")),
                "associatedSkills": ", ".join(_skill_names(entry.get("skills"))),
            }
        )
    return out


def _normalize_certifications(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in raw or []:
        if not isinstance(entry, dict):
            continue
        out.append(
            {
                "name": _text(_first(entry, "title", "name")),
                "organization": _text(
                    _first(entry, "issuedBy", "organization", "companyName", "issuer")
                ),
                "issueDate": _date_text(
                    _first(entry, "issuedAt", "issueDate", "period", "date")
                ),
                "url": _text(_first(entry, "link", "credentialUrl", "url")),
                "logoUrl": _image(_first(entry, "issuedByLogo", "logo", "image")),
            }
        )
    return out


def _normalize_projects(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in raw or []:
        if not isinstance(entry, dict):
            continue
        out.append(
            {
                "title": _text(_first(entry, "title", "name")),
                "dateRange": _date_range(entry),
                "description": _text(entry.get("description")),
                "associatedWith": _text(entry.get("associatedWith")),
                "url": _text(_first(entry, "associatedWithLink", "link", "url")),
            }
        )
    return out


def _normalize_volunteering(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in raw or []:
        if not isinstance(entry, dict):
            continue
        out.append(
            {
                "role": _text(_first(entry, "role", "title", "position")),
                "organization": _text(
                    _first(entry, "organizationName", "organization", "companyName")
                ),
                "dateRange": _date_range(entry),
                "description": _text(entry.get("description")),
            }
        )
    return out


def _normalize_publications(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in raw or []:
        if not isinstance(entry, dict):
            continue
        out.append(
            {
                "title": _text(_first(entry, "title", "name")),
                "publishedAt": _date_text(_first(entry, "publishedAt", "date")),
                "description": _text(entry.get("description")),
                "url": _text(_first(entry, "link", "url")),
            }
        )
    return out


def _normalize_awards(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in raw or []:
        if not isinstance(entry, dict):
            continue
        out.append(
            {
                "title": _text(_first(entry, "title", "name")),
                "issuedBy": _text(_first(entry, "issuedBy", "issuer", "associatedWith")),
                "issuedAt": _date_text(_first(entry, "issuedAt", "date")),
                "description": _text(entry.get("description")),
            }
        )
    return out


def _normalize_courses(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in raw or []:
        if not isinstance(entry, dict):
            continue
        out.append(
            {
                "title": _text(_first(entry, "title", "name")),
                "associatedWith": _text(entry.get("associatedWith")),
            }
        )
    return out


def _normalize_patents(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in raw or []:
        if not isinstance(entry, dict):
            continue
        out.append(
            {
                "title": _text(_first(entry, "title", "name")),
                "number": _text(entry.get("number")),
                "issuedAt": _date_text(_first(entry, "issuedAt", "date")),
                "description": _text(entry.get("description")),
                "url": _text(_first(entry, "url", "link")),
            }
        )
    return out


def _normalize_organizations(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in raw or []:
        if not isinstance(entry, dict):
            continue
        out.append(
            {
                "name": _text(_first(entry, "name", "organizationName")),
                "positionHeld": _text(_first(entry, "positionHeld", "role")),
                "dateRange": _date_range(entry),
                "description": _text(entry.get("description")),
                "logoUrl": _image(entry.get("logo")),
            }
        )
    return out


def _normalize_languages(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in raw or []:
        if isinstance(entry, str):
            out.append({"name": entry.strip(), "proficiency": ""})
        elif isinstance(entry, dict):
            name = _text(_first(entry, "name", "language", "title"))
            if name:
                out.append(
                    {"name": name, "proficiency": _text(entry.get("proficiency"))}
                )
    return out


def _normalize_skills(raw: Any) -> list[dict[str, Any]]:
    """Keeps endorsement counts and the roles a skill was used in."""
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for entry in raw or []:
        if isinstance(entry, str):
            name, endorsements, positions = entry.strip(), "", []
        elif isinstance(entry, dict):
            name = _text(_first(entry, "name", "title", "skill"))
            endorsements = _text(entry.get("endorsements"))
            positions = [p for p in (_text(x) for x in (entry.get("positions") or [])) if p]
        else:
            continue
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())
        out.append({"name": name, "endorsements": endorsements, "positions": positions})
    return out


def _normalize_interests(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for group in raw or []:
        if not isinstance(group, dict):
            continue
        items = []
        for element in group.get("elements") or []:
            if not isinstance(element, dict):
                continue
            items.append(
                {
                    "title": _text(element.get("title")),
                    "subtitle": _text(element.get("subtitle")),
                    "caption": _text(element.get("caption")),
                    "url": _text(element.get("link")),
                    "logoUrl": _image(element.get("image")),
                }
            )
        if items:
            out.append(
                {"name": _text(group.get("interestName")), "items": items}
            )
    return out


def _normalize_featured(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict) or not raw:
        return {}
    slides = []
    for slide in raw.get("slides") or []:
        if not isinstance(slide, dict):
            continue
        slides.append(
            {
                "title": _text(slide.get("title")),
                "subtitle": _text(slide.get("subtitle")),
                "description": _text(slide.get("description")),
                "url": _text(slide.get("url")),
                "imageUrl": _image(slide.get("image")),
            }
        )
    return {
        "title": _text(raw.get("title")),
        "subtitle": _text(raw.get("subtitle")),
        "url": _text(raw.get("link")),
        "imageUrl": _image(raw.get("images")),
        "slides": slides,
    }


def normalize_profile(item: dict[str, Any], linkedin_url: str) -> dict[str, Any]:
    """
    Maps one `harvestapi/linkedin-profile-scraper` dataset item onto the
    rawProfileData contract the optimizer UI and the scorer speak.

    `skills` deliberately stays a list of plain strings — the scorer joins it
    into text and the AI rewrite returns the same shape. The richer version
    with endorsement counts rides along as `skillDetails`.
    """
    item = item or {}

    name = _text(_first(item, "name", "fullName"))
    if not name:
        name = " ".join(
            filter(None, [_text(item.get("firstName")), _text(item.get("lastName"))])
        )

    experience = _normalize_experience(_first(item, "experience", "positions"))
    education = _normalize_education(item.get("education"))
    skill_details = _normalize_skills(item.get("skills"))
    skills = [s["name"] for s in skill_details] or _skill_names(item.get("topSkills"))

    # LinkedIn shows the current employer and top school beside the name.
    current = _normalize_experience(item.get("currentPosition"))
    top_education = _normalize_education(item.get("profileTopEducation"))
    current_company = {}
    if current:
        current_company = {
            "name": current[0]["company"],
            "logoUrl": current[0]["companyLogoUrl"],
            "url": current[0]["companyUrl"],
        }
    elif experience:
        current_company = {
            "name": experience[0]["company"],
            "logoUrl": experience[0]["companyLogoUrl"],
            "url": experience[0]["companyUrl"],
        }
    top_school = top_education[0] if top_education else (education[0] if education else None)

    return {
        # ── identity ──
        "name": name,
        "firstName": _text(item.get("firstName")),
        "lastName": _text(item.get("lastName")),
        "headline": _text(_first(item, "headline", "occupation")),
        "about": _text(_first(item, "about", "summary", "description")),
        "location": _text(_first(item, "location", "locationName", "geoLocation")),
        "photoUrl": _image(_first(item, "photo", "profilePicture", "photoUrl", "avatar")),
        "coverImageUrl": _image(
            _first(item, "coverPicture", "coverImage", "backgroundImage", "coverImageUrl")
        ),
        "linkedinUrl": _text(_first(item, "linkedinUrl", "profileUrl")) or linkedin_url,
        "publicIdentifier": _text(item.get("publicIdentifier")),
        "websites": [w for w in (_text(x) for x in (item.get("websites") or [])) if w],
        "registeredAt": _text(item.get("registeredAt")),

        # ── badges / status ──
        "openToWork": bool(item.get("openToWork")),
        "hiring": bool(item.get("hiring")),
        "premium": bool(item.get("premium")),
        "influencer": bool(item.get("influencer")),
        "creator": bool(item.get("creator")),
        "verified": bool(item.get("verified")),
        "connectionsCount": _first(item, "connectionsCount", "connections") or 0,
        "followerCount": _first(item, "followerCount", "followers") or 0,

        # ── intro card side panel ──
        "currentCompany": current_company,
        "topEducation": (
            {
                "school": top_school["school"],
                "logoUrl": top_school["schoolLogoUrl"],
                "url": top_school["schoolUrl"],
            }
            if top_school
            else {}
        ),

        # ── sections ──
        "featured": _normalize_featured(item.get("featured")),
        "experience": experience,
        "education": education,
        "skills": skills,
        "skillDetails": skill_details,
        "topSkills": _skill_names(item.get("topSkills")),
        "certifications": _normalize_certifications(item.get("certifications")),
        "projects": _normalize_projects(item.get("projects")),
        "volunteering": _normalize_volunteering(item.get("volunteering")),
        "publications": _normalize_publications(item.get("publications")),
        "courses": _normalize_courses(item.get("courses")),
        "honorsAndAwards": _normalize_awards(item.get("honorsAndAwards")),
        "patents": _normalize_patents(item.get("patents")),
        "organizations": _normalize_organizations(item.get("organizations")),
        "languages": _normalize_languages(item.get("languages")),
        "interests": _normalize_interests(item.get("interests")),
        "causes": [c for c in (_text(x) for x in (item.get("causes") or [])) if c],

        "source": "apify",
    }
