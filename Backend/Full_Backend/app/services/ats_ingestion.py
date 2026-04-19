from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import xml.etree.ElementTree as ET
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import aiohttp

from app.db_pool import get_db_connection
from app.services.job_storage import normalize_job_payload, fetch_active_sources, mark_source_scraped, upsert_jobs, upsert_sources

logger = logging.getLogger("ats_ingestion")

HTTP_TIMEOUT = 25
CONNECTOR_LIMIT = 24
BATCH_SIZE = 8
MAX_SOURCES_PER_RUN = int(os.environ.get("ATS_SOURCES_PER_RUN", "250"))

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BACKEND_DIR / "data"


@dataclass(slots=True)
class SourceRecord:
    id: str
    company_name: str
    ats_type: str
    endpoint_url: str
    priority: int
    last_scraped: datetime | None
    active: bool


def _strip_html(value: str | None) -> str:
    if not value:
        return ""
    text = re.sub(r"<[^>]+>", " ", value)
    text = re.sub(r"\s+", " ", text).strip()
    return unescape(text)


def _parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value

    text = str(value).strip()
    if not text:
        return None

    for candidate in (
        text.replace("Z", "+00:00"),
        text,
    ):
        try:
            parsed = datetime.fromisoformat(candidate)
            if parsed.tzinfo is not None:
                parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed
        except ValueError:
            continue

    if text.isdigit():
        try:
            stamp = int(text)
            if stamp > 10_000_000_000:
                stamp = stamp / 1000
            return datetime.fromtimestamp(stamp)
        except Exception:
            return None

    return None


def _candidate_lists(payload: Any) -> list[list[dict[str, Any]]]:
    found: list[list[dict[str, Any]]] = []

    def visit(node: Any, depth: int = 0) -> None:
        if depth > 5:
            return
        if isinstance(node, list):
            if node and all(isinstance(item, dict) for item in node):
                keys = {key for item in node[:10] for key in item.keys()}
                if keys & {
                    "title",
                    "name",
                    "jobTitle",
                    "job_title",
                    "text",
                    "position",
                }:
                    found.append(node)
            for item in node[:30]:
                visit(item, depth + 1)
        elif isinstance(node, dict):
            for value in node.values():
                visit(value, depth + 1)

    visit(payload)
    return found


def _get_nested(node: Mapping[str, Any], *paths: str) -> Any:
    for path in paths:
        current: Any = node
        success = True
        for part in path.split("."):
            if isinstance(current, Mapping):
                current = current.get(part)
            elif isinstance(current, list):
                try:
                    current = current[int(part)]
                except Exception:
                    success = False
                    break
            else:
                success = False
                break
            if current is None:
                success = False
                break
        if success and current not in (None, ""):
            return current
    return None


def _normalize_generic_job(
    item: Mapping[str, Any],
    *,
    source: SourceRecord,
) -> dict[str, Any] | None:
    title = (
        _get_nested(item, "title")
        or _get_nested(item, "name")
        or _get_nested(item, "jobTitle")
        or _get_nested(item, "job_title")
        or _get_nested(item, "text")
        or _get_nested(item, "position")
    )
    if not title:
        return None

    company = (
        _get_nested(item, "company")
        or _get_nested(item, "companyName")
        or _get_nested(item, "company.display_name")
        or _get_nested(item, "hiringOrganization.name")
        or source.company_name
    )

    location = (
        _get_nested(item, "location.name")
        or _get_nested(item, "locationName")
        or _get_nested(item, "location.display_name")
        or _get_nested(item, "jobLocation.address.addressLocality")
        or _get_nested(item, "jobLocation.address.addressRegion")
        or _get_nested(item, "city")
        or _get_nested(item, "locations.0.name")
        or _get_nested(item, "location")
        or "Remote"
    )

    apply_url = (
        _get_nested(item, "absolute_url")
        or _get_nested(item, "hostedUrl")
        or _get_nested(item, "applyUrl")
        or _get_nested(item, "jobUrl")
        or _get_nested(item, "redirect_url")
        or _get_nested(item, "canonical_url")
        or _get_nested(item, "url")
    )
    if isinstance(apply_url, str):
        apply_url = urljoin(source.endpoint_url, apply_url)

    description = (
        _get_nested(item, "descriptionPlain")
        or _get_nested(item, "description")
        or _get_nested(item, "content")
        or _get_nested(item, "body")
        or ""
    )

    employment_type = (
        _get_nested(item, "employmentType")
        or _get_nested(item, "type")
        or _get_nested(item, "contract_time")
        or _get_nested(item, "contract_type")
        or _get_nested(item, "categories.commitment")
    )

    salary_min = _get_nested(item, "salary_min") or _get_nested(item, "salary.min")
    salary_max = _get_nested(item, "salary_max") or _get_nested(item, "salary.max")

    remote_value = (
        _get_nested(item, "isRemote")
        or _get_nested(item, "remote")
        or False
    )

    date_posted = (
        _parse_datetime(_get_nested(item, "updated_at"))
        or _parse_datetime(_get_nested(item, "publishedAt"))
        or _parse_datetime(_get_nested(item, "published"))
        or _parse_datetime(_get_nested(item, "createdAt"))
        or _parse_datetime(_get_nested(item, "created"))
        or _parse_datetime(_get_nested(item, "datePosted"))
        or _parse_datetime(_get_nested(item, "postedAt"))
    )

    return {
        "title": str(title),
        "company": str(company),
        "location": str(location),
        "description": _strip_html(str(description)),
        "apply_url": apply_url,
        "source": "ATS",
        "source_type": source.ats_type,
        "date_posted": date_posted,
        "remote": bool(remote_value) or "remote" in str(location).lower(),
        "salary_min": salary_min,
        "salary_max": salary_max,
        "employment_type": str(employment_type) if employment_type else None,
    }


def _extract_jobs_from_json_payload(payload: Any, *, source: SourceRecord) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for candidates in _candidate_lists(payload):
        for item in candidates[:200]:
            job = _normalize_generic_job(item, source=source)
            if job:
                out.append(job)
        if out:
            break
    return out


def _extract_jobs_from_jsonld(html: str, *, source: SourceRecord) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    scripts = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.I | re.S,
    )
    for raw_script in scripts:
        try:
            payload = json.loads(unescape(raw_script.strip()))
        except Exception:
            continue

        stack = [payload]
        while stack:
            node = stack.pop()
            if isinstance(node, list):
                stack.extend(node)
                continue
            if not isinstance(node, dict):
                continue
            node_type = str(node.get("@type") or "").lower()
            if node_type == "jobposting":
                job = _normalize_generic_job(node, source=source)
                if job:
                    out.append(job)
            else:
                stack.extend(node.values())
    return out


def _extract_jobs_from_xml(xml_text: str, *, source: SourceRecord) -> list[dict[str, Any]]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    out: list[dict[str, Any]] = []
    for item in root.findall(".//item") + root.findall(".//job"):
        title = item.findtext("title") or item.findtext("name")
        if not title:
            continue
        company = item.findtext("company") or source.company_name
        location = item.findtext("location") or "Remote"
        description = item.findtext("description") or item.findtext("summary") or ""
        apply_url = item.findtext("link") or item.findtext("url")
        date_posted = _parse_datetime(item.findtext("pubDate") or item.findtext("datePosted"))
        out.append(
            {
                "title": title,
                "company": company,
                "location": location,
                "description": _strip_html(description),
                "apply_url": apply_url,
                "source": "ATS",
                "source_type": source.ats_type,
                "date_posted": date_posted,
                "remote": "remote" in (location or "").lower(),
            }
        )
    return out


class BaseConnector:
    ats_type = "generic"

    async def fetch_jobs(
        self,
        session: aiohttp.ClientSession,
        source: SourceRecord,
    ) -> list[dict[str, Any]]:
        raise NotImplementedError


class LeverConnector(BaseConnector):
    ats_type = "lever"

    async def fetch_jobs(self, session: aiohttp.ClientSession, source: SourceRecord) -> list[dict[str, Any]]:
        async with session.get(
            source.endpoint_url,
            timeout=aiohttp.ClientTimeout(total=HTTP_TIMEOUT),
        ) as response:
            if response.status != 200:
                logger.info("Lever %s returned HTTP %s", source.company_name, response.status)
                return []
            payload = await response.json(content_type=None)

        out: list[dict[str, Any]] = []
        for posting in payload if isinstance(payload, list) else []:
            location = (posting.get("categories") or {}).get("location") or "Remote"
            out.append(
                {
                    "title": posting.get("text") or "Untitled",
                    "company": source.company_name,
                    "location": location,
                    "description": posting.get("descriptionPlain") or "",
                    "apply_url": posting.get("hostedUrl") or posting.get("applyUrl"),
                    "source": "ATS",
                    "source_type": self.ats_type,
                    "date_posted": _parse_datetime(posting.get("createdAt")),
                    "remote": "remote" in location.lower(),
                    "employment_type": (posting.get("categories") or {}).get("commitment"),
                }
            )
        return out


class GreenhouseConnector(BaseConnector):
    ats_type = "greenhouse"

    async def fetch_jobs(self, session: aiohttp.ClientSession, source: SourceRecord) -> list[dict[str, Any]]:
        async with session.get(
            source.endpoint_url,
            timeout=aiohttp.ClientTimeout(total=HTTP_TIMEOUT),
        ) as response:
            if response.status != 200:
                logger.info("Greenhouse %s returned HTTP %s", source.company_name, response.status)
                return []
            payload = await response.json(content_type=None)

        out: list[dict[str, Any]] = []
        for posting in (payload or {}).get("jobs", []):
            location = ((posting.get("location") or {}).get("name")) or "Remote"
            out.append(
                {
                    "title": posting.get("title") or "Untitled",
                    "company": source.company_name,
                    "location": location,
                    "description": _strip_html(posting.get("content") or ""),
                    "apply_url": posting.get("absolute_url"),
                    "source": "ATS",
                    "source_type": self.ats_type,
                    "date_posted": _parse_datetime(posting.get("updated_at")),
                    "remote": "remote" in location.lower(),
                }
            )
        return out


class AshbyConnector(BaseConnector):
    ats_type = "ashby"

    async def fetch_jobs(self, session: aiohttp.ClientSession, source: SourceRecord) -> list[dict[str, Any]]:
        async with session.get(
            source.endpoint_url,
            timeout=aiohttp.ClientTimeout(total=HTTP_TIMEOUT),
        ) as response:
            if response.status != 200:
                logger.info("Ashby %s returned HTTP %s", source.company_name, response.status)
                return []
            payload = await response.json(content_type=None)

        out: list[dict[str, Any]] = []
        for posting in (payload or {}).get("jobs", []):
            compensation = posting.get("compensation") or {}
            summary = compensation.get("compensationTierSummary") or ""
            salary_numbers = re.findall(r"([\d,]+)", summary)
            salary_min = salary_max = None
            if len(salary_numbers) >= 2:
                try:
                    salary_min = int(salary_numbers[0].replace(",", ""))
                    salary_max = int(salary_numbers[1].replace(",", ""))
                except ValueError:
                    salary_min = salary_max = None

            location = posting.get("locationName") or "Remote"
            out.append(
                {
                    "title": posting.get("title") or "Untitled",
                    "company": (payload or {}).get("name") or source.company_name,
                    "location": location,
                    "description": posting.get("descriptionPlain") or "",
                    "apply_url": posting.get("jobUrl") or posting.get("applyUrl"),
                    "source": "ATS",
                    "source_type": self.ats_type,
                    "date_posted": _parse_datetime(posting.get("publishedAt")),
                    "remote": bool(posting.get("isRemote")) or "remote" in location.lower(),
                    "salary_min": salary_min,
                    "salary_max": salary_max,
                    "employment_type": posting.get("employmentType"),
                }
            )
        return out


class WorkableConnector(BaseConnector):
    ats_type = "workable"

    async def fetch_jobs(self, session: aiohttp.ClientSession, source: SourceRecord) -> list[dict[str, Any]]:
        async with session.post(
            source.endpoint_url,
            json={"query": "", "location": {}, "department": []},
            headers={"Content-Type": "application/json"},
            timeout=aiohttp.ClientTimeout(total=HTTP_TIMEOUT),
        ) as response:
            if response.status != 200:
                logger.info("Workable %s returned HTTP %s", source.company_name, response.status)
                return []
            payload = await response.json(content_type=None)

        out: list[dict[str, Any]] = []
        for posting in (payload or {}).get("results", []):
            location = ", ".join(
                [str(posting.get(part)) for part in ("city", "region", "country") if posting.get(part)]
            ) or "Remote"
            out.append(
                {
                    "title": posting.get("title") or "Untitled",
                    "company": posting.get("company") or source.company_name,
                    "location": location,
                    "description": _strip_html(posting.get("description") or ""),
                    "apply_url": posting.get("url"),
                    "source": "ATS",
                    "source_type": self.ats_type,
                    "date_posted": _parse_datetime(posting.get("published")),
                    "remote": bool(posting.get("remote")) or "remote" in location.lower(),
                    "employment_type": posting.get("type") or posting.get("employment_type"),
                }
            )
        return out


class RecruiteeConnector(BaseConnector):
    ats_type = "recruitee"

    async def fetch_jobs(self, session: aiohttp.ClientSession, source: SourceRecord) -> list[dict[str, Any]]:
        async with session.get(
            source.endpoint_url,
            timeout=aiohttp.ClientTimeout(total=HTTP_TIMEOUT),
        ) as response:
            if response.status != 200:
                logger.info("Recruitee %s returned HTTP %s", source.company_name, response.status)
                return []
            payload = await response.json(content_type=None)

        out: list[dict[str, Any]] = []
        for posting in (payload or {}).get("offers", []):
            location = (
                posting.get("location")
                or posting.get("location_name")
                or ((posting.get("locations") or [{}])[0].get("name"))
                or "Remote"
            )
            out.append(
                {
                    "title": posting.get("title") or "Untitled",
                    "company": source.company_name,
                    "location": location,
                    "description": _strip_html(posting.get("description") or ""),
                    "apply_url": posting.get("careers_url") or posting.get("url"),
                    "source": "ATS",
                    "source_type": self.ats_type,
                    "date_posted": _parse_datetime(posting.get("updated_at") or posting.get("created_at")),
                    "remote": "remote" in str(location).lower(),
                    "employment_type": posting.get("employment_type"),
                }
            )
        return out


class SmartRecruitersConnector(BaseConnector):
    ats_type = "smartrecruiters"

    async def fetch_jobs(self, session: aiohttp.ClientSession, source: SourceRecord) -> list[dict[str, Any]]:
        async with session.get(
            source.endpoint_url,
            timeout=aiohttp.ClientTimeout(total=HTTP_TIMEOUT),
        ) as response:
            if response.status != 200:
                logger.info(
                    "SmartRecruiters %s returned HTTP %s",
                    source.company_name,
                    response.status,
                )
                return []
            payload = await response.json(content_type=None)

        return _extract_jobs_from_json_payload(payload, source=source)


class GenericFeedConnector(BaseConnector):
    def __init__(self, ats_type: str):
        self.ats_type = ats_type

    async def fetch_jobs(self, session: aiohttp.ClientSession, source: SourceRecord) -> list[dict[str, Any]]:
        async with session.get(
            source.endpoint_url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; VignovaJobBot/1.0)",
                "Accept": "application/json, text/html, application/xml;q=0.9, */*;q=0.8",
            },
            timeout=aiohttp.ClientTimeout(total=HTTP_TIMEOUT),
        ) as response:
            if response.status != 200:
                logger.info("%s %s returned HTTP %s", self.ats_type, source.company_name, response.status)
                return []
            content_type = response.headers.get("content-type", "").lower()
            text = await response.text()

        if "xml" in content_type:
            return _extract_jobs_from_xml(text, source=source)

        if "json" in content_type or text.lstrip().startswith(("{", "[")):
            try:
                payload = json.loads(text)
            except json.JSONDecodeError:
                payload = None
            if payload is not None:
                jobs = _extract_jobs_from_json_payload(payload, source=source)
                if jobs:
                    return jobs

        jobs = _extract_jobs_from_jsonld(text, source=source)
        if jobs:
            return jobs

        return []


CONNECTORS: dict[str, BaseConnector] = {
    "lever": LeverConnector(),
    "greenhouse": GreenhouseConnector(),
    "ashby": AshbyConnector(),
    "workable": WorkableConnector(),
    "recruitee": RecruiteeConnector(),
    "smartrecruiters": SmartRecruitersConnector(),
    "teamtailor": GenericFeedConnector("teamtailor"),
    "bamboohr": GenericFeedConnector("bamboohr"),
    "zoho_recruit": GenericFeedConnector("zoho_recruit"),
    "freshteam": GenericFeedConnector("freshteam"),
    "darwinbox": GenericFeedConnector("darwinbox"),
    "keka_hr": GenericFeedConnector("keka_hr"),
}


def load_company_slugs() -> list[str]:
    companies_file = DATA_DIR / "companies.txt"
    if not companies_file.exists():
        return []
    return [
        line.strip()
        for line in companies_file.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    ]


def build_default_source_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for slug in load_company_slugs():
        company_name = slug.replace("-", " ").title()
        rows.append(
            {
                "company_name": company_name,
                "ats_type": "greenhouse",
                "endpoint_url": f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true",
                "priority": 100,
                "active": True,
            }
        )
        rows.append(
            {
                "company_name": company_name,
                "ats_type": "lever",
                "endpoint_url": f"https://api.lever.co/v0/postings/{slug}?mode=json",
                "priority": 90,
                "active": True,
            }
        )
    return rows


def _bootstrap_sources_sync() -> int:
    with get_db_connection() as conn:
        return upsert_sources(conn, build_default_source_rows())


def _fetch_active_sources_sync(limit: int) -> list[dict[str, Any]]:
    with get_db_connection() as conn:
        return fetch_active_sources(conn, limit=limit)


def _upsert_jobs_sync(jobs: list[Mapping[str, Any]]) -> dict[str, int]:
    with get_db_connection() as conn:
        return upsert_jobs(conn, jobs)


def _mark_source_scraped_sync(source_id: str) -> None:
    with get_db_connection() as conn:
        mark_source_scraped(conn, source_id)


async def _fetch_source_jobs(
    session: aiohttp.ClientSession,
    source_dict: Mapping[str, Any],
) -> tuple[SourceRecord, list[dict[str, Any]], str | None]:
    source = SourceRecord(
        id=str(source_dict["id"]),
        company_name=str(source_dict["company_name"]),
        ats_type=str(source_dict["ats_type"]).lower(),
        endpoint_url=str(source_dict["endpoint_url"]),
        priority=int(source_dict.get("priority") or 0),
        last_scraped=source_dict.get("last_scraped"),
        active=bool(source_dict.get("active", True)),
    )

    connector = CONNECTORS.get(source.ats_type)
    if connector is None:
        return source, [], f"Unsupported ATS type: {source.ats_type}"

    try:
        jobs = await connector.fetch_jobs(session, source)
        normalized = [
            normalize_job_payload(
                job,
                source="ATS",
                source_type=source.ats_type,
            )
            for job in jobs
        ]
        return source, normalized, None
    except Exception as exc:
        logger.exception("ATS fetch failed for %s (%s)", source.company_name, source.ats_type)
        return source, [], str(exc)


async def run_ats_ingestion() -> dict[str, Any]:
    bootstrapped = await asyncio.to_thread(_bootstrap_sources_sync)
    sources = await asyncio.to_thread(_fetch_active_sources_sync, MAX_SOURCES_PER_RUN)

    if not sources:
        return {
            "status": "success",
            "sources_processed": 0,
            "sources_per_run_limit": MAX_SOURCES_PER_RUN,
            "jobs_fetched": 0,
            "jobs_inserted": 0,
            "jobs_updated": 0,
            "errors": 0,
            "bootstrapped_sources": bootstrapped,
            "source_summaries": [],
        }

    connector = aiohttp.TCPConnector(limit=CONNECTOR_LIMIT, limit_per_host=6)
    source_summaries: list[dict[str, Any]] = []
    total_fetched = 0
    total_inserted = 0
    total_updated = 0
    total_errors = 0

    async with aiohttp.ClientSession(connector=connector) as session:
        for index in range(0, len(sources), BATCH_SIZE):
            batch = sources[index : index + BATCH_SIZE]
            results = await asyncio.gather(
                *[_fetch_source_jobs(session, source) for source in batch],
                return_exceptions=False,
            )

            for source, jobs, error in results:
                if error:
                    total_errors += 1
                    source_summaries.append(
                        {
                            "source_id": source.id,
                            "company_name": source.company_name,
                            "ats_type": source.ats_type,
                            "jobs_fetched": 0,
                            "jobs_inserted": 0,
                            "jobs_updated": 0,
                            "error": error,
                        }
                    )
                    await asyncio.to_thread(_mark_source_scraped_sync, source.id)
                    continue

                result = await asyncio.to_thread(_upsert_jobs_sync, jobs)
                await asyncio.to_thread(_mark_source_scraped_sync, source.id)

                total_fetched += result["fetched"]
                total_inserted += result["inserted"]
                total_updated += result["updated"]

                source_summaries.append(
                    {
                        "source_id": source.id,
                        "company_name": source.company_name,
                        "ats_type": source.ats_type,
                        "jobs_fetched": result["fetched"],
                        "jobs_inserted": result["inserted"],
                        "jobs_updated": result["updated"],
                        "error": None,
                    }
                )

    return {
        "status": "success",
        "sources_processed": len(sources),
        "sources_per_run_limit": MAX_SOURCES_PER_RUN,
        "jobs_fetched": total_fetched,
        "jobs_inserted": total_inserted,
        "jobs_updated": total_updated,
        "errors": total_errors,
        "bootstrapped_sources": bootstrapped,
        "source_summaries": source_summaries,
    }
