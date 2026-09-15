"""Give the hand-maintained pages the shared header, footer, assets and structured data.

build-pages.py renders the product, tool and guide pages from content/. The
homepage and the company, legal and utility pages are still edited as HTML, so
this script applies the layout from seo_site.py to them: the same navigation and
footer, site.css and site.js, one JSON-LD graph per page, visible breadcrumbs,
and links moved from the old one-page anchors to the pages that now cover each
topic. Running it again replaces what the previous run added.

build-pages.py runs this at the end. It can also be run on its own:
    python sync-layout.py
"""
from __future__ import annotations

from pathlib import Path

from bs4 import BeautifulSoup, Tag

import seo_site as site

ROOT = Path(__file__).resolve().parent

# File, public path (None for noindex utility pages), breadcrumb name, schema page type.
PAGES = [
    ("index.html", "/", None, "WebPage"),
    ("about/index.html", "/about/", "About us", "AboutPage"),
    ("contact/index.html", "/contact/", "Contact & support", "ContactPage"),
    ("how-it-works/index.html", "/how-it-works/", "How it works", "WebPage"),
    ("privacy/index.html", "/privacy/", "Privacy policy", "WebPage"),
    ("terms/index.html", "/terms/", "Terms of service", "WebPage"),
    ("refund/index.html", "/refund/", "Refund policy", "WebPage"),
    ("shipping/index.html", "/shipping/", "Digital delivery", "WebPage"),
    ("404.html", None, None, None),
    ("start/index.html", None, None, None),
]

# Topics that had an anchor on the old one-page homepage now have their own page.
MOVED_ANCHORS = {
    "/#extension": "/chrome-extension/",
    "/#features": "/ai-resume-builder/",
    "/#main": "/ai-resume-builder/",
    "/#ats-check": "/ats-resume-checker/",
    "/#linkedin": "/linkedin-profile-optimizer/",
    "/#job-tracker": "/job-application-tracker/",
}

HOME_FEATURES = [
    "Master Profile that keeps your experience in one place",
    "AI resume builder and resume tailoring for each job description",
    "ATS resume checker with six scoring areas",
    "LinkedIn and Naukri profile scoring and rewrites",
    "Job application tracker with list and board views",
    "Chrome extension for saving jobs, keyword scores and application autofill",
    "Cover letters and interview preparation",
]


def nodes(markup: str) -> list:
    return list(BeautifulSoup(markup, "html.parser").contents)


def replace(old: Tag, markup: str) -> None:
    for node in nodes(markup):
        old.insert_before(node)
    old.decompose()


def visible_crumbs(soup: BeautifulSoup, path: str, name: str) -> list[tuple[str, str]]:
    """The breadcrumb trail a page already shows, so the schema matches it."""
    trail = soup.find("nav", class_="breadcrumbs")
    if trail is None:
        return [("Home", "/"), (name, path)]
    items = []
    for item in trail.find_all("li"):
        link = item.find("a", href=True)
        items.append((item.get_text(" ", strip=True), link["href"] if link else path))
    return items


def home_faqs(soup: BeautifulSoup) -> list[dict]:
    faqs = []
    for item in soup.select("#faq details"):
        answer = item.select_one(".faq-answer")
        faqs.append({"q": item.summary.get_text(" ", strip=True), "a": answer.decode_contents().strip() if answer else ""})
    return faqs


def page_graph(soup: BeautifulSoup, path: str | None, page_type: str | None, crumbs: list) -> list[dict]:
    graph = [site.organization(), site.website()]
    if path is None:
        return graph
    page = {
        "path": path,
        "title": soup.title.get_text(strip=True),
        "description": soup.find("meta", attrs={"name": "description"})["content"],
        "pageType": page_type,
        "lang": soup.html.get("lang", "en"),
    }
    graph.append(site.webpage(page))
    if path == "/":
        page["application"] = {"name": "Vignova", "featureList": HOME_FEATURES}
        graph.append(site.application(page))
        faqs = home_faqs(soup)
        if faqs:
            graph.append(site.faq_page(faqs, path))
    else:
        graph.append(site.breadcrumb(crumbs))
    return graph


def sync_body(soup: BeautifulSoup, file: str, path: str | None, crumbs: list) -> None:
    body = soup.body
    main = body.find("main")
    if main is not None and main.get("id") != "main":
        main["id"] = "main"

    headers = body.find_all("header", recursive=False)
    if headers:
        replace(headers[0], site.header(path or ""))
    else:
        for node in nodes(site.header(path or "")):
            main.insert_before(node)
    if body.find("a", href="#main", recursive=False) is None:
        body.insert(0, nodes('<a class="vn-skip" href="#main">Skip to content</a>')[0])

    footers = body.find_all("footer", recursive=False)
    if footers:
        replace(footers[-1], site.footer())
    else:
        for node in nodes(site.footer()):
            body.append(node)
    if file == "index.html":
        # The homepage animations keep their pause control (script.js).
        bottom = body.find("div", class_="vn-footer-bottom")
        bottom.find("a", href="#main").insert_before(
            nodes('<button aria-pressed="false" class="motion-toggle" type="button">Pause animations</button>')[0]
        )

    if path and path != "/" and body.find("nav", class_="breadcrumbs") is None:
        trail = nodes(site.breadcrumbs(crumbs))[0]
        trail["class"] = ["vn-breadcrumbs"]
        existing = body.find("nav", class_="vn-breadcrumbs")
        if existing is not None:
            existing.replace_with(trail)
        else:
            (main.find("div", class_="container") or main).insert(0, trail)

    for link in main.find_all("a", href=True):
        if file != "index.html" and link["href"] in MOVED_ANCHORS:
            link["href"] = MOVED_ANCHORS[link["href"]]
        if link["href"].rstrip("/").endswith("blog"):
            label = link.get_text(strip=True)
            if label == "Blog":
                link.string = "Career guides"
            elif label == "Read the blog":
                link.string = "Read career guides"


def sync_head(soup: BeautifulSoup, graph: list[dict]) -> None:
    head = soup.head
    for script in head.find_all("script", attrs={"type": "application/ld+json"}):
        script.decompose()
    stylesheet = f"/site.css?v={site.ASSET_VERSION}"
    sheets = head.find_all("link", rel="stylesheet")
    ours = [link for link in sheets if link["href"].split("?")[0] == "/site.css"]
    if ours:
        ours[0]["href"] = stylesheet
    else:
        sheets[-1].insert_after(soup.new_tag("link", rel="stylesheet", href=stylesheet))
    script_src = f"/site.js?v={site.ASSET_VERSION}"
    scripts = [tag for tag in head.find_all("script", src=True) if tag["src"].split("?")[0] == "/site.js"]
    if scripts:
        scripts[0]["src"] = script_src
    else:
        head.append(soup.new_tag("script", src=script_src, defer=""))
    head.append(nodes(site.json_ld(graph))[0])


def main() -> None:
    for file, path, name, page_type in PAGES:
        target = ROOT / file
        soup = BeautifulSoup(target.read_text(encoding="utf-8"), "html.parser")
        crumbs = visible_crumbs(soup, path, name) if path and path != "/" else []
        sync_body(soup, file, path, crumbs)
        sync_head(soup, page_graph(soup, path, page_type, crumbs))
        target.write_text(str(soup), encoding="utf-8", newline="\n")
    print(f"Synced the shared layout into {len(PAGES)} hand-maintained pages.")


if __name__ == "__main__":
    main()
