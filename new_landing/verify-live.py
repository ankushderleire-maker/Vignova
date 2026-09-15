"""Check vignova.io and app.vignova.io after a release.

Run from new_landing once hostinger-upload.zip is live and the app is deployed:
    python verify-live.py

It only sends GET requests and prints one PASS or FAIL line per check. The exit
code is 1 when anything fails, so it can run in CI or a scheduled job.
"""
from __future__ import annotations

import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urljoin

import seo_site as site

HEADERS = {"User-Agent": "VignovaReleaseCheck/1.0 (+https://vignova.io)"}
REDIRECT_CODES = {301, 302, 303, 307, 308}
failures = 0


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


OPENER = urllib.request.build_opener(NoRedirect)


def fetch(url: str) -> tuple[int, dict, str]:
    request = urllib.request.Request(url, headers=HEADERS)
    try:
        with OPENER.open(request, timeout=30) as response:
            return response.status, {k.lower(): v for k, v in response.headers.items()}, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, {k.lower(): v for k, v in error.headers.items()}, error.read().decode("utf-8", "replace")


def report(name: str, ok: bool, detail: str = "") -> None:
    global failures
    failures += not ok
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"\n      {detail}" if detail and not ok else ""))


def chain(url: str, limit: int = 6) -> list[tuple[str, int, dict, str]]:
    hops = []
    for _ in range(limit):
        status, headers, body = fetch(url)
        hops.append((url, status, headers, body))
        if status in REDIRECT_CODES and headers.get("location"):
            url = urljoin(url, headers["location"])
            continue
        break
    return hops


def describe(hops) -> str:
    return " -> ".join(f"{url} [{status}]" for url, status, _, _ in hops)


def expect_redirect(start: str, final: str) -> None:
    hops = chain(start)
    ok = len(hops) == 2 and hops[0][1] in (301, 308) and hops[1][0] == final and hops[1][1] == 200
    report(f"{start} redirects permanently to {final} in one hop", ok, describe(hops))


def tag_attribute(html: str, pattern: str, attribute: str) -> str | None:
    match = re.search(pattern, html, re.I)
    if not match:
        return None
    value = re.search(rf'{attribute}="([^"]*)"', match.group(0), re.I)
    return value.group(1) if value else None


def main() -> int:
    print("== Hosts, protocols and URL formats")
    expect_redirect("http://vignova.io/", site.SITE + "/")
    expect_redirect("http://www.vignova.io/", site.SITE + "/")
    expect_redirect("https://www.vignova.io/", site.SITE + "/")
    expect_redirect("https://www.vignova.io/about/", site.SITE + "/about/")
    expect_redirect(site.SITE + "/about", site.SITE + "/about/")
    expect_redirect(site.SITE + "/index.html", site.SITE + "/")
    expect_redirect(site.SITE + "/about/index.html", site.SITE + "/about/")

    print("== Retired URLs")
    for old, new in site.REDIRECTS.items():
        expect_redirect(site.SITE + old, site.SITE + new)
        expect_redirect(site.SITE + old.rstrip("/"), site.SITE + new)
    status, _, _ = fetch(site.SITE + "/this-page-does-not-exist-check/")
    report("Unknown URLs return 404", status == 404, f"status {status}")

    print("== robots.txt and sitemap")
    status, headers, robots = fetch(site.SITE + "/robots.txt")
    report("robots.txt is served as text", status == 200 and headers.get("content-type", "").startswith("text/plain"), f"{status} {headers.get('content-type')}")
    report("robots.txt lists the sitemap", "Sitemap: https://vignova.io/sitemap.xml" in robots)
    report("robots.txt does not block the site", not re.search(r"(?im)^disallow:\s*/\s*$", robots))
    status, headers, sitemap = fetch(site.SITE + "/sitemap.xml")
    report("sitemap.xml is served", status == 200, f"status {status}")
    urls = [node.text for node in ET.fromstring(sitemap).iter() if node.tag.endswith("}loc")] if status == 200 else []
    report("sitemap.xml lists URLs", bool(urls))

    print(f"== {len(urls)} sitemap URLs")
    for url in urls:
        status, headers, html = fetch(url)
        canonical = tag_attribute(html, r'<link[^>]+rel="canonical"[^>]*>', "href")
        robots_meta = tag_attribute(html, r'<meta[^>]+name="robots"[^>]*>', "content") or ""
        problems = []
        if status != 200:
            problems.append(f"status {status}")
        if canonical != url:
            problems.append(f"canonical {canonical}")
        if "noindex" in robots_meta.lower() or "noindex" in headers.get("x-robots-tag", "").lower():
            problems.append("noindex")
        report(url, not problems, ", ".join(problems))

    print("== app.vignova.io stays out of search")
    hops = chain(site.APP + "/")
    report("App root redirects to the login page", len(hops) >= 2 and hops[-1][0].startswith(site.LOGIN) and hops[-1][1] == 200, describe(hops))
    status, headers, html = fetch(site.LOGIN)
    report("Login page sends X-Robots-Tag: noindex", "noindex" in headers.get("x-robots-tag", "").lower(), headers.get("x-robots-tag", "missing"))
    login_meta = tag_attribute(html, r'<meta[^>]+name="robots"[^>]*>', "content") or ""
    report("Login page has a noindex robots meta tag", "noindex" in login_meta.lower(), login_meta or "missing")
    status, headers, robots = fetch(site.APP + "/robots.txt")
    report("App robots.txt lets crawlers see the noindex", status == 200 and not re.search(r"(?im)^disallow:\s*/\s*$", robots), f"status {status}")

    print(f"\n{'All checks passed.' if not failures else f'{failures} check(s) failed.'}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
