from __future__ import annotations

import asyncio
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import aiohttp

from app.db_pool import get_db_connection
from app.services.job_storage import get_scan_history, get_scan_status, save_scan_record, upsert_jobs

logger = logging.getLogger("portal_scraper")

ADZUNA_APP_ID = os.environ.get("ADZUNA_APP_ID", "").strip()
ADZUNA_APP_KEY = os.environ.get("ADZUNA_APP_KEY", "").strip()
# Default Adzuna countries to query when the user didn't narrow by location.
# Adzuna only supports specific ISO-2 codes on the free plan (us, gb, in, ie,
# ca, au, de, fr, nl, pl, br, za, sg). Comma-separated.
_ADZUNA_FALLBACK_RAW = os.environ.get("ADZUNA_FALLBACK_COUNTRIES", "us,gb,in,ie")
ADZUNA_FALLBACK_COUNTRIES = [
    code.strip().lower()
    for code in _ADZUNA_FALLBACK_RAW.split(",")
    if code.strip()
] or ["us"]

# Location text (lowercased) → Adzuna ISO-2 country code. Keyed by common
# names, abbreviations and a few major cities so users don't have to type
# the exact country name. First match wins.
_LOCATION_COUNTRY_MAP: dict[str, str] = {
    # Ireland
    "ireland": "ie", "dublin": "ie", "cork": "ie", "galway": "ie",
    # United Kingdom
    "united kingdom": "gb", "uk": "gb", "england": "gb", "scotland": "gb",
    "wales": "gb", "london": "gb", "manchester": "gb", "birmingham": "gb",
    "edinburgh": "gb", "leeds": "gb", "bristol": "gb",
    # United States
    "united states": "us", "usa": "us", "us": "us", "america": "us",
    "new york": "us", "san francisco": "us", "los angeles": "us",
    "seattle": "us", "chicago": "us", "boston": "us", "austin": "us",
    # India
    "india": "in", "bangalore": "in", "bengaluru": "in", "mumbai": "in",
    "delhi": "in", "hyderabad": "in", "pune": "in", "chennai": "in",
    "gurgaon": "in", "noida": "in",
    # Canada
    "canada": "ca", "toronto": "ca", "vancouver": "ca", "montreal": "ca",
    # Australia
    "australia": "au", "sydney": "au", "melbourne": "au", "brisbane": "au",
    # Germany
    "germany": "de", "berlin": "de", "munich": "de", "hamburg": "de",
    # France
    "france": "fr", "paris": "fr",
    # Netherlands
    "netherlands": "nl", "amsterdam": "nl", "rotterdam": "nl",
    # Poland
    "poland": "pl", "warsaw": "pl",
    # Brazil
    "brazil": "br", "são paulo": "br", "sao paulo": "br",
    # Singapore
    "singapore": "sg",
    # South Africa
    "south africa": "za",
}


def _derive_adzuna_countries(requested_locations: list[str]) -> list[str]:
    """Pick Adzuna country codes based on what the user typed.

    Returns the user-implied countries if any were recognised, otherwise
    returns ADZUNA_FALLBACK_COUNTRIES so we still hit the Adzuna API.
    """
    if not requested_locations:
        return list(ADZUNA_FALLBACK_COUNTRIES)

    codes: list[str] = []
    seen: set[str] = set()
    for loc in requested_locations:
        lowered = loc.lower()
        for key, code in _LOCATION_COUNTRY_MAP.items():
            if key in lowered and code not in seen:
                codes.append(code)
                seen.add(code)
                break
    return codes or list(ADZUNA_FALLBACK_COUNTRIES)


HTTP_TIMEOUT = 15
CONNECTOR_LIMIT = 12
BATCH_SIZE = 12
USER_JOB_SOURCES = {"linkedin", "indeed"}

LINKEDIN_SEARCH = (
    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
    "?keywords={kw}&location={loc}&start={start}"
)
LINKEDIN_PAGE_SIZE = 25
LINKEDIN_MAX_PAGES = 40         # hard cap — up to ~1000 jobs per keyword/location
LINKEDIN_PAGE_DELAY_SEC = 0.2   # politeness delay between pages
ADZUNA_URL = "https://api.adzuna.com/v1/api/jobs/{country}/search/1"

# Location tokens to ignore when matching (too generic / ambiguous).
LOCATION_STOPWORDS = {"remote", "hybrid", "onsite", "on-site", "anywhere", "worldwide"}


def _html_text(match: re.Match[str] | None) -> str:
    if not match:
        return ""
    text = match.group(1)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _save_scan_record_sync(**kwargs: Any) -> None:
    with get_db_connection() as conn:
        save_scan_record(conn, **kwargs)


def _upsert_jobs_sync(jobs: list[dict[str, Any]]) -> dict[str, int]:
    with get_db_connection() as conn:
        return upsert_jobs(conn, jobs)


def _get_scan_status_sync(scan_id: str) -> dict[str, Any] | None:
    with get_db_connection() as conn:
        return get_scan_status(conn, scan_id)


def _get_scan_history_sync(user_id: str | None, limit: int) -> list[dict[str, Any]]:
    with get_db_connection() as conn:
        return get_scan_history(conn, user_id=user_id, limit=limit)


async def fetch_indeed_via_adzuna(
    session: aiohttp.ClientSession,
    keyword: str,
    country: str = "us",
    location: str | None = None,
) -> list[dict[str, Any]]:
    if not (ADZUNA_APP_ID and ADZUNA_APP_KEY):
        logger.warning(
            "Adzuna credentials missing (ADZUNA_APP_ID/ADZUNA_APP_KEY not set) "
            "— Indeed feed will stay empty. Add them to the backend .env or "
            "docker-compose environment and restart."
        )
        return []

    country = (country or "us").lower()
    params: dict[str, Any] = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "what": keyword,
        "results_per_page": 50,
        "content-type": "application/json",
    }
    if location:
        # Adzuna accepts free-text "where" to narrow inside the country.
        params["where"] = location

    try:
        async with session.get(
            ADZUNA_URL.format(country=country),
            params=params,
            timeout=aiohttp.ClientTimeout(total=HTTP_TIMEOUT),
        ) as response:
            body = await response.text()
            if response.status != 200:
                logger.warning(
                    "Adzuna %s/%s returned HTTP %s: %s",
                    country,
                    keyword,
                    response.status,
                    body[:300],
                )
                return []
            import json as _json
            try:
                payload = _json.loads(body)
            except Exception:
                logger.warning("Adzuna %s/%s returned non-JSON: %s", country, keyword, body[:200])
                return []
    except Exception as exc:
        logger.info("Indeed/Adzuna %s/%s failed: %s", country, keyword, exc)
        return []

    out: list[dict[str, Any]] = []
    for posting in payload.get("results", []):
        location = (posting.get("location") or {}).get("display_name") or "Remote"
        date_posted = None
        if posting.get("created"):
            try:
                date_posted = datetime.fromisoformat(posting["created"].replace("Z", "+00:00"))
            except Exception:
                date_posted = None
        out.append(
            {
                "title": posting.get("title") or "Untitled",
                "company": (posting.get("company") or {}).get("display_name") or "Unknown",
                "location": location,
                "description": posting.get("description") or "",
                "apply_url": posting.get("redirect_url"),
                "source": "indeed",
                "source_type": "indeed",
                "date_posted": date_posted,
                "remote": "remote" in location.lower(),
                "salary_min": int(posting["salary_min"]) if posting.get("salary_min") else None,
                "salary_max": int(posting["salary_max"]) if posting.get("salary_max") else None,
                "employment_type": posting.get("contract_time") or posting.get("contract_type"),
            }
        )
    return out


async def _fetch_linkedin_page(
    session: aiohttp.ClientSession,
    keyword: str,
    location: str,
    start: int,
) -> list[dict[str, Any]]:
    """Fetch a single LinkedIn guest-search page (~25 results)."""
    try:
        url = LINKEDIN_SEARCH.format(kw=keyword, loc=location or "", start=start)
        async with session.get(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
                "Accept": "text/html",
            },
            timeout=aiohttp.ClientTimeout(total=HTTP_TIMEOUT),
        ) as response:
            if response.status != 200:
                return []
            html = await response.text()
    except Exception as exc:
        logger.info("LinkedIn %s/%s@%d failed: %s", keyword, location, start, exc)
        return []

    cards = re.findall(
        r'<li[^>]*?>\s*<div[^>]*base-card[^>]*?>(.*?)</li>',
        html,
        re.S,
    )
    out: list[dict[str, Any]] = []
    for card in cards:
        title = _html_text(re.search(r"<h3[^>]*>(.*?)</h3>", card, re.S))
        company = _html_text(re.search(r"<h4[^>]*>(.*?)</h4>", card, re.S))
        card_location = _html_text(
            re.search(r'<span[^>]*job-search-card__location[^>]*>(.*?)</span>', card, re.S)
        )
        apply_url = _html_text(re.search(r'href="([^"]+)"', card))
        if not (title and company):
            continue
        out.append(
            {
                "title": title,
                "company": company,
                "location": card_location or location or "Remote",
                "description": "",
                "apply_url": apply_url,
                "source": "linkedin",
                "source_type": "linkedin",
                "date_posted": None,
                "remote": "remote" in (card_location or location or "").lower(),
            }
        )
    return out


async def fetch_linkedin(
    session: aiohttp.ClientSession,
    keyword: str,
    location: str = "",
) -> list[dict[str, Any]]:
    """Crawl all available LinkedIn guest-search pages for this keyword/location.

    Stops as soon as a page returns fewer than PAGE_SIZE results (meaning
    LinkedIn has no more pages) or the hard cap is hit. A small politeness
    delay keeps us from hammering LinkedIn on long keyword/location fans.
    """
    merged: list[dict[str, Any]] = []
    empty_streak = 0
    for page_index in range(LINKEDIN_MAX_PAGES):
        start = page_index * LINKEDIN_PAGE_SIZE
        jobs = await _fetch_linkedin_page(session, keyword, location, start)

        if not jobs:
            empty_streak += 1
            # Two empty pages in a row = LinkedIn is done serving this query.
            if empty_streak >= 2:
                break
        else:
            empty_streak = 0
            merged.extend(jobs)
            # A short page almost always means we're on the last slice.
            if len(jobs) < LINKEDIN_PAGE_SIZE:
                break

        if page_index < LINKEDIN_MAX_PAGES - 1:
            await asyncio.sleep(LINKEDIN_PAGE_DELAY_SEC)

    return merged


def _build_relevance_terms(keywords: list[str]) -> set[str]:
    terms: set[str] = set()
    for keyword in keywords:
        lowered = keyword.lower()
        terms.add(lowered)
        for token in re.split(r"[\s/,\-_]+", lowered):
            token = token.strip()
            if len(token) >= 2 and token not in {"the", "and", "for", "with"}:
                terms.add(token)
    return terms


def _build_cutoff(date_posted: str | None) -> datetime | None:
    if date_posted == "recent":
        return datetime.utcnow() - timedelta(hours=24)
    if date_posted == "week":
        return datetime.utcnow() - timedelta(days=7)
    if date_posted == "month":
        return datetime.utcnow() - timedelta(days=30)
    return None


_PER_LEVEL_REJECTS: dict[str, set[str]] = {
    "fresher": {"senior", "sr", "lead", "staff", "principal", "director", "manager", "head"},
    "low":     {"senior", "sr", "lead", "staff", "principal", "director"},
    "medium":  {"staff", "principal", "director"},
    "high":    set(),
}


def _experience_reject_tokens(experience: Any) -> set[str]:
    """Reject tokens that the job title must not contain.

    Accepts a single level, a list of levels, or None. For multi-select we
    reject only titles that would be rejected by EVERY selected level (i.e.,
    intersection of each level's reject set). If any selected level accepts
    the title (e.g. "high" accepts everything), we keep it.
    """
    if not experience:
        return set()

    if isinstance(experience, str):
        levels = [experience]
    elif isinstance(experience, (list, tuple, set)):
        levels = [str(item).strip().lower() for item in experience if item]
    else:
        return set()

    levels = [level for level in levels if level]
    if not levels:
        return set()

    per_level = [_PER_LEVEL_REJECTS.get(level, set()) for level in levels]
    # If any selected level has NO rejections (e.g. high), nothing is rejected.
    if any(len(level_set) == 0 for level_set in per_level):
        return set()
    return set.intersection(*per_level) if per_level else set()


def _location_tokens(location: str | None) -> set[str]:
    """Extract meaningful location tokens, split on commas/slashes.

    Skips generic/ambiguous words and very short tokens (2 chars or fewer) to
    avoid false matches like "us" inside "Austin".
    """
    if not location:
        return set()
    tokens: set[str] = set()
    for piece in re.split(r"[,/|]+", location.lower()):
        piece = piece.strip()
        if len(piece) < 3:
            continue
        if piece in LOCATION_STOPWORDS:
            continue
        tokens.add(piece)
    return tokens


def _job_matches_locations(
    card_location: str | None,
    requested_locations: list[str],
    *,
    allow_remote: bool,
) -> bool:
    """True if the scraped job's location matches any requested location.

    When `requested_locations` is empty the caller didn't narrow by location,
    so we accept everything. `allow_remote` stays True when any requested
    location is itself a remote/global token.
    """
    if not requested_locations:
        return True

    card_text = (card_location or "").lower()
    if not card_text:
        return False

    if allow_remote and any(stop in card_text for stop in LOCATION_STOPWORDS):
        return True

    for requested in requested_locations:
        for token in _location_tokens(requested):
            if token in card_text:
                return True
    return False


def _is_relevant_job(
    job: dict[str, Any],
    *,
    relevance_terms: set[str],
    reject_tokens: set[str],
    cutoff: datetime | None,
    requested_locations: list[str],
    allow_remote: bool,
) -> bool:
    title = str(job.get("title") or "").lower()
    if not title:
        return False

    if reject_tokens and any(re.search(rf"\b{re.escape(token)}\b", title) for token in reject_tokens):
        return False

    if cutoff:
        date_posted = job.get("date_posted")
        if isinstance(date_posted, datetime):
            if date_posted.tzinfo is not None:
                date_posted = date_posted.astimezone(timezone.utc).replace(tzinfo=None)
            if date_posted < cutoff:
                return False

    if relevance_terms and not any(term in title for term in relevance_terms):
        return False

    if requested_locations and not _job_matches_locations(
        job.get("location"),
        requested_locations,
        allow_remote=allow_remote,
    ):
        return False

    return True


async def run_job_scrape(
    *,
    user_id: str | None,
    scan_id: str,
    keywords: list[str],
    locations: list[str],
    sources: list[str] | None = None,
    experience: Any = None,
    date_posted: str | None = None,
) -> dict[str, Any]:
    sources = [source.lower() for source in (sources or ["linkedin", "indeed"]) if source]
    invalid_sources = [source for source in sources if source not in USER_JOB_SOURCES]
    if invalid_sources:
        raise ValueError(f"Unsupported user scraper sources: {', '.join(sorted(set(invalid_sources)))}")

    keywords = [keyword.strip() for keyword in keywords if keyword and keyword.strip()]
    if not keywords:
        raise ValueError("At least one keyword is required")

    requested_locations = [
        location.strip() for location in locations if location and location.strip()
    ]
    # If user didn't specify a location, we search with an empty string (global).
    query_locations = requested_locations or [""]

    # If any requested location literally mentions "remote"/"hybrid"/etc., allow
    # remote listings through even if they don't name a city.
    allow_remote = any(
        any(stop in location.lower() for stop in LOCATION_STOPWORDS)
        for location in requested_locations
    )

    started_at = datetime.utcnow()
    relevance_terms = _build_relevance_terms(keywords)
    cutoff = _build_cutoff(date_posted)
    reject_tokens = _experience_reject_tokens(experience)

    await asyncio.to_thread(
        _save_scan_record_sync,
        scan_id=scan_id,
        user_id=user_id,
        sources=sources,
        companies=[],
        keywords=keywords,
        locations=query_locations,
        status="RUNNING",
        fetched=0,
        inserted=0,
        updated=0,
        errors=0,
        started_at=started_at,
    )

    connector = aiohttp.TCPConnector(limit=CONNECTOR_LIMIT, limit_per_host=6)
    total_fetched = 0
    total_inserted = 0
    total_updated = 0
    total_errors = 0

    # Map user-typed locations → Adzuna ISO-2 country codes once per scan.
    adzuna_countries = _derive_adzuna_countries(requested_locations)
    logger.info(
        "Scan %s: sources=%s keywords=%s locations=%s adzuna_countries=%s "
        "adzuna_configured=%s",
        scan_id,
        sources,
        keywords,
        requested_locations,
        adzuna_countries,
        bool(ADZUNA_APP_ID and ADZUNA_APP_KEY),
    )

    async with aiohttp.ClientSession(connector=connector) as session:
        tasks: list[asyncio.Future[Any] | asyncio.Task[Any] | Any] = []
        for keyword in keywords:
            for location in query_locations:
                if "linkedin" in sources:
                    tasks.append(fetch_linkedin(session, keyword, location))
            if "indeed" in sources:
                for country in adzuna_countries:
                    # Pass the first matching requested location as the
                    # `where` filter to narrow within the country.
                    where_hint = next(
                        (loc for loc in requested_locations if loc), None
                    )
                    tasks.append(
                        fetch_indeed_via_adzuna(
                            session, keyword, country=country, location=where_hint
                        )
                    )

        for index in range(0, len(tasks), BATCH_SIZE):
            chunk = tasks[index : index + BATCH_SIZE]
            results = await asyncio.gather(*chunk, return_exceptions=True)
            jobs_to_upsert: list[dict[str, Any]] = []

            for result in results:
                if isinstance(result, Exception):
                    total_errors += 1
                    continue
                for job in result:
                    if _is_relevant_job(
                        job,
                        relevance_terms=relevance_terms,
                        reject_tokens=reject_tokens,
                        cutoff=cutoff,
                        requested_locations=requested_locations,
                        allow_remote=allow_remote,
                    ):
                        jobs_to_upsert.append({**job, "created_by_user_id": user_id})

            if jobs_to_upsert:
                upsert_result = await asyncio.to_thread(_upsert_jobs_sync, jobs_to_upsert)
                total_fetched += upsert_result["fetched"]
                total_inserted += upsert_result["inserted"]
                total_updated += upsert_result["updated"]

            await asyncio.to_thread(
                _save_scan_record_sync,
                scan_id=scan_id,
                user_id=user_id,
                sources=sources,
                companies=[],
                keywords=keywords,
                locations=query_locations,
                status="RUNNING",
                fetched=total_fetched,
                inserted=total_inserted,
                updated=total_updated,
                errors=total_errors,
                started_at=started_at,
            )

    await asyncio.to_thread(
        _save_scan_record_sync,
        scan_id=scan_id,
        user_id=user_id,
        sources=sources,
        companies=[],
        keywords=keywords,
        locations=query_locations,
        status="DONE",
        fetched=total_fetched,
        inserted=total_inserted,
        updated=total_updated,
        errors=total_errors,
        started_at=started_at,
    )

    return {
        "status": "success",
        "scan_id": scan_id,
        "sources": sources,
        "jobs_fetched": total_fetched,
        "jobs_inserted": total_inserted,
        "jobs_updated": total_updated,
        "errors": total_errors,
        "keywords_tried": len(keywords),
        "locations_tried": len(query_locations),
    }


def list_supported_sources() -> list[dict[str, Any]]:
    return [
        {"id": "linkedin", "label": "LinkedIn", "type": "job_scrapper", "default": True},
        {"id": "indeed", "label": "Indeed", "type": "job_scrapper", "default": True},
    ]


async def fetch_scan_status(scan_id: str) -> dict[str, Any] | None:
    return await asyncio.to_thread(_get_scan_status_sync, scan_id)


async def fetch_scan_history(user_id: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
    return await asyncio.to_thread(_get_scan_history_sync, user_id, limit)
