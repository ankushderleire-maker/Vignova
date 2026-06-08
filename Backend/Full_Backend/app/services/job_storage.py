from __future__ import annotations

import re
from collections.abc import Iterable, Mapping, Sequence
from datetime import datetime, timezone
from typing import Any

from psycopg2.extras import RealDictCursor, execute_values

ATS_SOURCE = "ATS"
USER_JOB_SOURCES = {"linkedin", "indeed"}

_WHITESPACE_RE = re.compile(r"\s+")


def clean_text(value: Any, *, max_length: int | None = None) -> str | None:
    if value is None:
        return None
    text = str(value)
    text = _WHITESPACE_RE.sub(" ", text).strip()
    if not text:
        return None
    if max_length is not None:
        text = text[:max_length]
    return text


def normalize_location(value: Any) -> str:
    text = clean_text(value) or "Remote"
    return text.lower()


def clean_url(value: Any) -> str | None:
    text = clean_text(value, max_length=2000)
    if not text:
        return None
    if text.startswith("//"):
        return f"https:{text}"
    return text


def _contains_any(text: str, tokens: Sequence[str]) -> bool:
    return any(token in text for token in tokens)


def infer_experience_level(
    *,
    title: str | None,
    employment_type: str | None = None,
    description: str | None = None,
) -> str:
    haystack = " ".join(
        part for part in (title or "", employment_type or "", description or "") if part
    ).lower()

    if _contains_any(
        haystack,
        (
            "intern",
            "internship",
            "trainee",
            "graduate",
            "campus",
            "entry level",
            "entry-level",
            "fresher",
        ),
    ):
        return "fresher"

    if _contains_any(
        haystack,
        (
            "junior",
            "associate",
            "analyst",
            "assistant",
            "apprentice",
        ),
    ):
        return "low"

    if _contains_any(
        haystack,
        (
            "principal",
            "staff",
            "lead",
            "head",
            "director",
            "vice president",
            "vp ",
            "vp,",
            "manager",
            "architect",
            "senior",
            "sr.",
            " sr ",
        ),
    ):
        return "high"

    return "medium"


def build_job_hash(title: str, company: str, location: str) -> str:
    import hashlib

    normalized = "|".join(
        (
            clean_text(title, max_length=500).lower(),
            clean_text(company, max_length=200).lower(),
            normalize_location(location),
        )
    )
    return hashlib.md5(normalized.encode("utf-8")).hexdigest()


def merge_job_dicts(primary: dict[str, Any], secondary: Mapping[str, Any]) -> dict[str, Any]:
    merged = dict(primary)
    for key, value in secondary.items():
        if value in (None, "", []):
            continue
        if key in {"salary_min", "salary_max"} and merged.get(key) is not None:
            continue
        if key == "created_by_user_id" and merged.get(key):
            continue
        if merged.get(key) in (None, "", []):
            merged[key] = value
    return merged


def normalize_job_payload(
    job: Mapping[str, Any],
    *,
    source: str | None = None,
    source_type: str | None = None,
    created_by_user_id: str | None = None,
    scraped_at: datetime | None = None,
) -> dict[str, Any]:
    title = clean_text(job.get("title"), max_length=500) or "Untitled"
    company = clean_text(job.get("company"), max_length=200) or "Unknown"
    location = clean_text(job.get("location"), max_length=255) or "Remote"
    description = clean_text(job.get("description"), max_length=5000)
    apply_url = clean_url(job.get("apply_url"))

    raw_source = clean_text(source or job.get("source"), max_length=64)
    raw_source_type = clean_text(source_type or job.get("source_type"), max_length=64)

    normalized_source = (raw_source or ATS_SOURCE).lower()
    normalized_source_type = (raw_source_type or normalized_source).lower()

    if normalized_source in USER_JOB_SOURCES:
        public_source = normalized_source
        public_source_type = normalized_source_type
    else:
        public_source = ATS_SOURCE
        public_source_type = normalized_source_type

    employment_type = clean_text(job.get("employment_type"), max_length=50)
    experience_level = clean_text(job.get("experience_level"), max_length=32)
    if not experience_level:
        experience_level = infer_experience_level(
            title=title,
            employment_type=employment_type,
            description=description,
        )

    remote = bool(job.get("remote", False))

    date_posted = job.get("date_posted")
    if isinstance(date_posted, str):
        try:
            date_posted = datetime.fromisoformat(date_posted.replace("Z", "+00:00"))
        except ValueError:
            date_posted = None
    if isinstance(date_posted, datetime) and date_posted.tzinfo is not None:
        date_posted = date_posted.astimezone(timezone.utc).replace(tzinfo=None)

    salary_min = job.get("salary_min")
    salary_max = job.get("salary_max")

    return {
        "title": title,
        "company": company,
        "location": location,
        "location_normalized": normalize_location(location),
        "description": description,
        "apply_url": apply_url,
        "source": public_source,
        "source_type": public_source_type,
        "experience_level": experience_level,
        "job_hash": build_job_hash(title, company, location),
        "created_by_user_id": created_by_user_id or job.get("created_by_user_id"),
        "scraped_at": scraped_at or job.get("scraped_at") or datetime.now(timezone.utc),
        "date_posted": date_posted,
        "remote": remote,
        "salary_min": int(salary_min) if salary_min is not None else None,
        "salary_max": int(salary_max) if salary_max is not None else None,
        "employment_type": employment_type,
    }


def collapse_jobs_by_hash(jobs: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for job in jobs:
        normalized = normalize_job_payload(job)
        existing = merged.get(normalized["job_hash"])
        if existing is None:
            merged[normalized["job_hash"]] = normalized
        else:
            merged[normalized["job_hash"]] = merge_job_dicts(existing, normalized)
    return list(merged.values())


def _fetch_existing_hashes(conn, job_hashes: list[str]) -> set[str]:
    if not job_hashes:
        return set()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT job_hash FROM jobs WHERE job_hash = ANY(%s)",
            (job_hashes,),
        )
        return {row[0] for row in cur.fetchall() if row[0]}


def upsert_jobs(conn, jobs: Iterable[Mapping[str, Any]]) -> dict[str, int]:
    collapsed = collapse_jobs_by_hash(jobs)
    if not collapsed:
        return {"fetched": 0, "inserted": 0, "updated": 0}

    job_hashes = [job["job_hash"] for job in collapsed]
    existing_hashes = _fetch_existing_hashes(conn, job_hashes)

    sql = """
        INSERT INTO jobs (
            title,
            company,
            location,
            description,
            apply_url,
            source,
            source_type,
            location_normalized,
            experience_level,
            job_hash,
            created_by_user_id,
            scraped_at,
            date_posted,
            remote,
            salary_min,
            salary_max,
            employment_type
        )
        VALUES %s
        ON CONFLICT (job_hash) DO UPDATE SET
            title                = EXCLUDED.title,
            company              = EXCLUDED.company,
            location             = EXCLUDED.location,
            description          = COALESCE(EXCLUDED.description, jobs.description),
            apply_url            = COALESCE(EXCLUDED.apply_url, jobs.apply_url),
            source               = EXCLUDED.source,
            source_type          = COALESCE(EXCLUDED.source_type, jobs.source_type),
            location_normalized  = EXCLUDED.location_normalized,
            experience_level     = COALESCE(EXCLUDED.experience_level, jobs.experience_level),
            created_by_user_id   = COALESCE(jobs.created_by_user_id, EXCLUDED.created_by_user_id),
            scraped_at           = COALESCE(EXCLUDED.scraped_at, jobs.scraped_at),
            date_posted          = COALESCE(EXCLUDED.date_posted, jobs.date_posted),
            remote               = COALESCE(EXCLUDED.remote, jobs.remote),
            salary_min           = COALESCE(EXCLUDED.salary_min, jobs.salary_min),
            salary_max           = COALESCE(EXCLUDED.salary_max, jobs.salary_max),
            employment_type      = COALESCE(EXCLUDED.employment_type, jobs.employment_type)
    """

    values = [
        (
            job["title"],
            job["company"],
            job["location"],
            job.get("description"),
            job.get("apply_url"),
            job.get("source"),
            job.get("source_type"),
            job.get("location_normalized"),
            job.get("experience_level"),
            job.get("job_hash"),
            job.get("created_by_user_id"),
            job.get("scraped_at"),
            job.get("date_posted"),
            job.get("remote", False),
            job.get("salary_min"),
            job.get("salary_max"),
            job.get("employment_type"),
        )
        for job in collapsed
    ]

    with conn.cursor() as cur:
        execute_values(cur, sql, values)
    conn.commit()

    updated = sum(1 for job_hash in job_hashes if job_hash in existing_hashes)
    inserted = len(collapsed) - updated
    return {"fetched": len(collapsed), "inserted": inserted, "updated": updated}


def save_scan_record(
    conn,
    *,
    scan_id: str,
    user_id: str | None,
    sources: Sequence[str],
    companies: Sequence[str] | None = None,
    keywords: Sequence[str] | None = None,
    locations: Sequence[str] | None = None,
    status: str,
    fetched: int,
    inserted: int,
    updated: int,
    errors: int,
    error_message: str | None = None,
    started_at: datetime | None = None,
) -> None:
    companies = list(companies or [])
    keywords = list(keywords or [])
    locations = list(locations or [])
    completed_at = datetime.utcnow() if status in ("DONE", "FAILED") else None
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO scan_jobs (
                id,
                user_id,
                sources,
                companies,
                keywords,
                locations,
                status,
                jobs_fetched,
                jobs_inserted,
                duplicates,
                errors,
                error_message,
                started_at,
                completed_at,
                created_at
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                sources        = EXCLUDED.sources,
                companies      = EXCLUDED.companies,
                keywords       = EXCLUDED.keywords,
                locations      = EXCLUDED.locations,
                status         = EXCLUDED.status,
                jobs_fetched   = EXCLUDED.jobs_fetched,
                jobs_inserted  = EXCLUDED.jobs_inserted,
                duplicates     = EXCLUDED.duplicates,
                errors         = EXCLUDED.errors,
                error_message  = EXCLUDED.error_message,
                started_at     = COALESCE(scan_jobs.started_at, EXCLUDED.started_at),
                completed_at   = EXCLUDED.completed_at
            """,
            (
                scan_id,
                user_id,
                list(sources),
                companies,
                keywords,
                locations,
                status,
                fetched,
                inserted,
                updated,
                errors,
                error_message,
                started_at,
                completed_at,
            ),
        )
    conn.commit()


def get_scan_status(conn, scan_id: str) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                user_id,
                sources,
                companies,
                keywords,
                locations,
                status,
                jobs_fetched,
                jobs_inserted,
                duplicates,
                errors,
                error_message,
                started_at,
                completed_at,
                created_at
            FROM scan_jobs
            WHERE id = %s
            LIMIT 1
            """,
            (scan_id,),
        )
        row = cur.fetchone()
    return dict(row) if row else None


def get_scan_history(
    conn,
    *,
    user_id: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    limit = max(1, min(100, int(limit)))
    sql = """
        SELECT
            id,
            user_id,
            sources,
            companies,
            keywords,
            locations,
            status,
            jobs_fetched,
            jobs_inserted,
            duplicates,
            errors,
            error_message,
            started_at,
            completed_at,
            created_at
        FROM scan_jobs
    """
    params: list[Any] = []
    if user_id:
        sql += " WHERE user_id = %s"
        params.append(user_id)
    sql += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, tuple(params))
        rows = cur.fetchall()
    return [dict(row) for row in rows]


def fetch_jobs_from_db(
    conn,
    *,
    title: str | None = None,
    location: str | None = None,
    experience: str | None = None,
    days: int | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict[str, Any]:
    page = max(1, int(page))
    limit = max(1, min(100, int(limit)))
    offset = (page - 1) * limit

    where_parts: list[str] = []
    params: list[Any] = []

    title_filter = clean_text(title, max_length=120)
    if title_filter:
        pattern = f"%{title_filter}%"
        where_parts.append("(title ILIKE %s OR company ILIKE %s)")
        params.extend((pattern, pattern))

    location_filter = clean_text(location, max_length=120)
    if location_filter:
        where_parts.append("location_normalized LIKE %s")
        params.append(f"%{normalize_location(location_filter)}%")

    experience_filter = clean_text(experience, max_length=32)
    if experience_filter and experience_filter.lower() != "all":
        where_parts.append("experience_level = %s")
        params.append(experience_filter.lower())

    if days is not None and int(days) > 0:
        where_parts.append(
            "COALESCE(date_posted, scraped_at::timestamp, created_at) >= NOW() - (%s * INTERVAL '1 day')"
        )
        params.append(int(days))

    where_sql = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""

    count_sql = f"SELECT COUNT(*) FROM jobs {where_sql}"
    list_sql = f"""
        SELECT
            id,
            title,
            company,
            location,
            description,
            apply_url,
            source,
            source_type,
            COALESCE(NULLIF(source_type, ''), NULLIF(source, ''), 'unknown') AS source_label,
            date_posted,
            experience_level,
            scraped_at
        FROM jobs
        {where_sql}
        ORDER BY COALESCE(date_posted, scraped_at::timestamp, created_at) DESC NULLS LAST, created_at DESC
        OFFSET %s
        LIMIT %s
    """

    with conn.cursor() as cur:
        cur.execute(count_sql, tuple(params))
        total = cur.fetchone()[0]

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(list_sql, tuple(params + [offset, limit]))
        jobs = [dict(row) for row in cur.fetchall()]

    total_pages = (total + limit - 1) // limit if total else 0
    return {
        "jobs": jobs,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages,
    }


def fetch_active_sources(conn, limit: int | None = None) -> list[dict[str, Any]]:
    sql = """
        SELECT
            id,
            company_name,
            ats_type,
            endpoint_url,
            priority,
            last_scraped,
            active
        FROM sources
        WHERE active = TRUE
        ORDER BY priority DESC, last_scraped ASC NULLS FIRST, company_name ASC
    """
    params: list[Any] = []
    if limit is not None and limit > 0:
        sql += " LIMIT %s"
        params.append(int(limit))

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, tuple(params))
        return [dict(row) for row in cur.fetchall()]


def upsert_sources(conn, rows: Sequence[Mapping[str, Any]]) -> int:
    if not rows:
        return 0

    sql = """
        INSERT INTO sources (
            company_name,
            ats_type,
            endpoint_url,
            priority,
            last_scraped,
            active
        )
        VALUES %s
        ON CONFLICT (endpoint_url) DO UPDATE SET
            company_name = EXCLUDED.company_name,
            ats_type     = EXCLUDED.ats_type,
            priority     = EXCLUDED.priority,
            active       = EXCLUDED.active
    """

    values = [
        (
            clean_text(row.get("company_name"), max_length=200) or "Unknown",
            clean_text(row.get("ats_type"), max_length=64) or "unknown",
            clean_url(row.get("endpoint_url")),
            int(row.get("priority") or 100),
            row.get("last_scraped"),
            bool(row.get("active", True)),
        )
        for row in rows
        if clean_url(row.get("endpoint_url"))
    ]

    if not values:
        return 0

    with conn.cursor() as cur:
        execute_values(cur, sql, values)
        count = cur.rowcount
    conn.commit()
    return count


def mark_source_scraped(conn, source_id: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE sources SET last_scraped = NOW() WHERE id = %s",
            (source_id,),
        )
    conn.commit()
