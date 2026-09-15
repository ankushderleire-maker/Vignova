"""Render Vignova's product, tool and guide pages, the blog index and the sitemap.

Sources
  content/pages/*.html     product and tool pages
  content/articles/*.html  career guides
  blog/<slug>/index.html   any article still maintained as HTML, read for the blog index and sitemap

Each source file starts with a JSON front matter block inside an HTML comment,
followed by the page body. Placeholders in the body:
  {{FAQ}}        the page's FAQ, from "faqs" (also emitted as FAQPage data)
  {{GUIDES}}     related guide cards, from "guides"
  {{REGISTER}}   {{LOGIN}}   {{EXTENSION}}   app and Chrome Web Store links

An article gets /assets/og/blog-<slug>.png as its social image when that file exists.
The hand-maintained pages are brought in line afterwards by sync-layout.py.

Run from new_landing:  python build-pages.py   then   python build.py
"""
from __future__ import annotations

import json
import math
import re
import runpy
import subprocess
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup

import seo_site as site

ROOT = Path(__file__).resolve().parent
FRONT = re.compile(r"\A\s*<!--\s*(\{.*?\})\s*-->\s*", re.S)
WORDS_PER_MINUTE = 220

# Indexable pages that are maintained directly as HTML, in sitemap order.
STATIC_PAGES = ["/", "/how-it-works/", "/about/", "/contact/", "/privacy/", "/terms/", "/refund/", "/shipping/"]

# Topic groups on the blog index, each tied to the product page it supports.
BLOG_CLUSTERS = [
    ("ats", "ATS and resume checks", "/ats-resume-checker/", "Check your resume against a job", [
        "what-is-a-good-ats-score", "ats-resume-checker-how-scoring-works", "ats-friendly-resume-format-india",
        "resume-keywords-how-to-find-and-use-them", "the-75-percent-ats-rejection-myth",
    ]),
    ("tailoring", "Resume writing and tailoring", "/resume-tailor/", "Tailor your resume to a job", [
        "how-to-tailor-your-resume-to-a-job-description", "can-recruiters-tell-you-used-ai-on-your-resume",
        "how-ai-is-changing-the-job-search",
    ]),
    ("profiles", "LinkedIn and Naukri profiles", "/naukri-profile-optimizer/", "Optimize your Naukri profile", [
        "naukri-profile-headline-examples", "linkedin-headline-examples",
    ]),
    ("applications", "Applying and tracking", "/job-application-tracker/", "Track your applications", [
        "how-many-jobs-to-apply-to-and-how-to-track-them",
    ]),
]


def read_source(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8")
    match = FRONT.match(text)
    if not match:
        raise ValueError(f"{path.name}: missing JSON front matter")
    meta = json.loads(match.group(1))
    for key in ("path", "title", "description"):
        if not meta.get(key):
            raise ValueError(f"{path.name}: front matter needs {key!r}")
    return meta, text[match.end():]


def output_file(page_path: str) -> Path:
    return ROOT / "index.html" if page_path == "/" else ROOT / page_path.strip("/") / "index.html"


def date_label(value: str) -> str:
    day = date.fromisoformat(value)
    return f"{day.strftime('%B')} {day.day}, {day.year}"


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def reading_minutes(markup: str) -> int:
    words = len(BeautifulSoup(markup, "html.parser").get_text(" ", strip=True).split())
    return max(1, math.ceil(words / WORDS_PER_MINUTE))


# ---------- Existing pages, read back for links and the sitemap ----------

def existing_articles(rendered: set[str]) -> dict[str, dict]:
    """Articles maintained as HTML. Slugs rendered from content/articles are skipped."""
    articles = {}
    for file in sorted((ROOT / "blog").glob("*/index.html")):
        slug = file.parent.name
        if f"/blog/{slug}/" in site.REDIRECTS or f"/blog/{slug}/" in rendered:
            continue
        soup = BeautifulSoup(file.read_text(encoding="utf-8"), "html.parser")
        published, modified = None, None
        for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
            data = json.loads(script.string or "{}")
            nodes = data.get("@graph", data if isinstance(data, list) else [data])
            for node in nodes:
                if isinstance(node, dict) and node.get("@type") == "BlogPosting":
                    published = node.get("datePublished", "")[:10]
                    modified = node.get("dateModified", published)[:10]
        eyebrow = soup.select_one(".article-header .eyebrow")
        minutes = re.search(r"(\d+) min read", soup.get_text(" "))
        articles[slug] = {
            "path": f"/blog/{slug}/",
            "h1": soup.h1.get_text(" ", strip=True),
            "description": soup.find("meta", attrs={"name": "description"})["content"],
            "topic": eyebrow.get_text(" ", strip=True) if eyebrow else "Career guide",
            "published": published,
            "modified": modified or published,
            "minutes": int(minutes.group(1)) if minutes else 5,
        }
    return articles


def page_summary(path: str, registry: dict) -> dict:
    """Title, label and description for a card linking to any site page."""
    if path in registry:
        return registry[path]
    file = output_file(path)
    if not file.is_file():
        raise ValueError(f"Linked page does not exist: {path}")
    soup = BeautifulSoup(file.read_text(encoding="utf-8"), "html.parser")
    return {
        "path": path,
        "h1": soup.h1.get_text(" ", strip=True),
        "description": soup.find("meta", attrs={"name": "description"})["content"],
        "topic": "Vignova",
    }


# ---------- Shared blocks ----------

def faq_block(meta: dict) -> str:
    faqs = meta.get("faqs") or []
    if not faqs:
        return ""
    items = "".join(
        f'<details><summary>{site.esc(item["q"])}</summary><div class="vn-answer"><p>{item["a"]}</p></div></details>'
        for item in faqs
    )
    title = site.esc(meta.get("faqTitle", "Frequently asked questions"))
    return (
        '<section class="vn-section" aria-labelledby="faq-title"><div class="vn-container">'
        f'<div class="vn-section-head"><span class="vn-eyebrow">FAQ</span><h2 id="faq-title">{title}</h2></div>'
        f'<div class="vn-faq">{items}</div></div></section>'
    )


def guides_block(meta: dict, registry: dict) -> str:
    paths = meta.get("guides") or []
    if not paths:
        return ""
    cards = []
    for path in paths:
        info = page_summary(path, registry)
        cards.append(
            f'<a class="vn-guide" href="{site.esc(path)}"><small>{site.esc(info.get("topic", "Guide"))}</small>'
            f'<strong>{site.esc(info["h1"])}</strong><span>{site.esc(info["description"])}</span></a>'
        )
    title = site.esc(meta.get("guidesTitle", "Guides to read next"))
    return (
        '<section class="vn-section vn-section-tint" aria-labelledby="guides-title"><div class="vn-container">'
        f'<div class="vn-section-head"><span class="vn-eyebrow">KEEP LEARNING</span><h2 id="guides-title">{title}</h2></div>'
        f'<div class="vn-guides">{"".join(cards)}</div></div></section>'
    )


def expand(body: str, meta: dict, registry: dict) -> str:
    body = body.replace("{{REGISTER}}", site.REGISTER).replace("{{LOGIN}}", site.LOGIN).replace("{{EXTENSION}}", site.esc(site.EXTENSION_URL))
    body = body.replace("{{FAQ}}", faq_block(meta)).replace("{{GUIDES}}", guides_block(meta, registry))
    leftover = re.findall(r"\{\{[A-Z_]+\}\}", body)
    if leftover:
        raise ValueError(f"{meta['path']}: unknown placeholders {leftover}")
    return body


def crumbs_for(meta: dict) -> list[tuple[str, str]]:
    trail = [("Home", "/")] + [tuple(item) for item in meta.get("breadcrumbs", [])]
    return trail + [(meta.get("breadcrumbName", meta["title"]), meta["path"])]


# ---------- Renderers ----------

def render_page(meta: dict, body: str, registry: dict) -> str:
    crumbs = crumbs_for(meta)
    graph = [site.organization(), site.website(), site.webpage(meta), site.breadcrumb(crumbs)]
    if meta.get("application"):
        graph.append(site.application(meta))
    if meta.get("faqs"):
        graph.append(site.faq_page(meta["faqs"], meta["path"]))
    scripts = meta.get("scripts") or []
    page = site.head(meta, graph, [f"/site.css?v={site.ASSET_VERSION}"], scripts)
    page += site.header(meta["path"])
    page += '<main id="main" class="vn-page">' + site.breadcrumbs(crumbs) + expand(body, meta, registry) + "</main>"
    page += site.footer() + "\n</body>\n</html>\n"
    return page


def article_card(info: dict, position: int) -> str:
    return (
        f'<article class="blog-card accent-{position % 3}"><a href="{info["path"]}"><div class="card-top">'
        f'<span class="topic">{site.esc(info["topic"])}</span><span class="card-arrow" aria-hidden="true">↗</span></div>'
        f'<h3>{site.esc(info["h1"])}</h3><p>{site.esc(info["description"])}</p><div class="card-meta">'
        f'<time datetime="{info["published"]}">{date_label(info["published"])}</time><span>{info["minutes"]} min read</span></div></a></article>'
    )


def render_article(meta: dict, body: str, registry: dict) -> tuple[str, dict]:
    soup = BeautifulSoup(body, "html.parser")
    headings = []
    for number, heading in enumerate(soup.find_all("h2"), 1):
        anchor = heading.get("id") or f"section-{number}-{slugify(heading.get_text())}"
        heading["id"] = anchor
        headings.append((anchor, heading.get_text(" ", strip=True)))
    minutes = reading_minutes(body)
    info = {**meta, "minutes": minutes, "kind": "article"}
    social = f"/assets/og/blog-{meta['path'].strip('/').split('/')[-1]}.png"
    if (ROOT / social.lstrip("/")).is_file():
        info.setdefault("ogImage", social)
        info.setdefault("image", social)
        info.setdefault("ogAlt", meta["h1"])
    crumbs = [("Home", "/"), ("Career guides", "/blog/"), (meta["h1"], meta["path"])]
    graph = [site.organization(), site.website(), site.blog_posting(info), site.breadcrumb(crumbs)]
    if meta.get("faqs"):
        graph.append(site.faq_page(meta["faqs"], meta["path"]))
    body_html = expand(str(soup), meta, registry)
    toc = "".join(f'<li><a href="#{anchor}">{site.esc(label)}</a></li>' for anchor, label in headings)
    updated = ""
    if meta.get("modified") and meta["modified"] != meta["published"]:
        updated = f'<span class="meta-dot" aria-hidden="true">·</span><span>Updated <time datetime="{meta["modified"]}">{date_label(meta["modified"])}</time></span>'
    cta = meta["cta"]
    related = "".join(article_card(registry[path], n) for n, path in enumerate(meta.get("related", [])))
    page = site.head(info, graph, ["/blog.css?v=1", f"/site.css?v={site.ASSET_VERSION}"], meta.get("scripts"))
    page += site.header(meta["path"])
    page += (
        '<main id="main"><div class="shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a>'
        '<span aria-hidden="true">/</span><a href="/blog/">Career guides</a><span aria-hidden="true">/</span>'
        f'<span aria-current="page">{site.esc(meta["h1"])}</span></nav></div>'
        f'<article><header class="article-header shell"><span class="eyebrow">{site.esc(meta["topic"])}</span>'
        f'<h1>{site.esc(meta["h1"])}</h1><p class="article-description">{site.esc(meta["description"])}</p>'
        '<div class="article-meta"><span class="author-mark"><img src="/assets/vignova-purple-blue.png" alt="" width="32" height="32"></span>'
        '<span>By <a href="/about/">Vignova</a></span><span class="meta-dot" aria-hidden="true">·</span>'
        f'<time datetime="{meta["published"]}">{date_label(meta["published"])}</time>{updated}'
        f'<span class="meta-dot" aria-hidden="true">·</span><span>{minutes} min read</span></div></header>'
        '<div class="shell article-layout"><aside class="article-sidebar" aria-label="Article navigation">'
        f'<details class="table-of-contents" open><summary>In this article</summary><ol>{toc}</ol></details>'
        f'<div class="sidebar-cta"><span class="eyebrow">PUT IT INTO PRACTICE</span><h2>{site.esc(cta["title"])}</h2>'
        f'<a class="button" href="{site.esc(cta["href"])}">{site.esc(cta["label"])} <span aria-hidden="true">↗</span></a>'
        f'<p>{site.esc(cta.get("note", ""))}</p></div></aside><div class="article-body">{body_html}</div></div></article>'
    )
    if related:
        page += (
            '<section class="related shell" aria-labelledby="related-title"><div class="section-title"><div>'
            '<span class="eyebrow">KEEP EXPLORING</span><h2 id="related-title">More for your job search.</h2></div>'
            f'<a class="text-link" href="/blog/">All guides ↗</a></div><div class="related-grid">{related}</div></section>'
        )
    page += "</main>" + site.footer() + "\n</body>\n</html>\n"
    return page, info


def render_blog_index(articles: dict[str, dict]) -> str:
    listed = set()
    sections = []
    for key, title, product_path, product_label, slugs in BLOG_CLUSTERS:
        cards = [articles[slug] for slug in slugs if slug in articles]
        listed.update(slug for slug in slugs if slug in articles)
        if not cards:
            continue
        grid = "".join(article_card(card, n) for n, card in enumerate(cards))
        sections.append(
            f'<section class="shell article-collection" aria-labelledby="cluster-{key}"><div class="section-title"><div>'
            f'<span class="eyebrow">TOPIC</span><h2 id="cluster-{key}">{site.esc(title)}</h2></div>'
            f'<a class="text-link" href="{product_path}">{site.esc(product_label)} ↗</a></div><div class="blog-grid">{grid}</div></section>'
        )
    unlisted = sorted(set(articles) - listed)
    if unlisted:
        raise ValueError(f"Articles missing from a blog topic group: {unlisted}")
    posts = sorted(articles.values(), key=lambda item: item["published"], reverse=True)
    meta = {
        "path": "/blog/",
        "title": "Career Guides: Resume, ATS, LinkedIn & Naukri Tips | Vignova",
        "description": "Practical guides for job seekers: tailor your resume, understand ATS scores, write LinkedIn and Naukri headlines, and track your applications.",
        "modified": max(post["modified"] for post in posts),
    }
    crumbs = [("Home", "/"), ("Career guides", "/blog/")]
    graph = [site.organization(), site.website(), {
        "@type": "Blog", "@id": site.SITE + "/blog/#blog", "name": "Vignova Career Guides",
        "url": site.SITE + "/blog/", "description": meta["description"], "inLanguage": "en",
        "publisher": {"@id": site.SITE + "/#organization"},
        "blogPost": [
            {"@type": "BlogPosting", "headline": post["h1"], "url": site.canonical(post["path"]),
             "datePublished": post["published"] + "T00:00:00+05:30", "dateModified": post["modified"] + "T00:00:00+05:30"}
            for post in posts
        ],
    }, site.breadcrumb(crumbs)]
    page = site.head(meta, graph, ["/blog.css?v=1", f"/site.css?v={site.ASSET_VERSION}"])
    page += site.header("/blog/")
    page += (
        '<main id="main"><div class="shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a>'
        '<span aria-hidden="true">/</span><span aria-current="page">Career guides</span></nav></div>'
        '<section class="blog-hero shell"><span class="eyebrow">VIGNOVA CAREER GUIDES</span>'
        '<h1>Career guides for a<br><span>clearer job search.</span></h1>'
        '<p>How ATS checks read a resume, how to tailor it to a job description, how to write LinkedIn and Naukri '
        'headlines, and how to keep track of every application. Written for job seekers in India and anywhere else.</p></section>'
        + "".join(sections)
        + '<section class="shell blog-cta" aria-labelledby="blog-cta-title"><div><span class="eyebrow">TRY IT ON YOUR RESUME</span>'
        '<h2 id="blog-cta-title">See which job description keywords<br>your resume is missing.</h2></div>'
        '<a class="button" href="/resume-keyword-scanner/">Scan my resume free <span aria-hidden="true">↗</span></a></section></main>'
    )
    page += site.footer() + "\n</body>\n</html>\n"
    return page


def write_sitemap(entries: list[tuple[str, str | None]]) -> None:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, lastmod in entries:
        lines.append("  <url>")
        lines.append(f"    <loc>{site.canonical(path)}</loc>")
        if lastmod:
            lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append("  </url>")
    lines.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


def sync_redirects() -> None:
    file = ROOT / ".htaccess"
    text = file.read_text(encoding="utf-8")
    rules = "\n".join(
        f"  RewriteRule ^{old.strip('/').replace('.', chr(92) + '.')}/?$ {site.SITE}{new} [R=301,L]"
        for old, new in site.REDIRECTS.items()
    )
    updated, count = re.subn(
        r"(  # BEGIN VIGNOVA REDIRECTS\n).*?(\n  # END VIGNOVA REDIRECTS)",
        lambda m: m.group(1) + rules + m.group(2),
        text,
        flags=re.S,
    )
    if count != 1:
        raise ValueError(".htaccess is missing the VIGNOVA REDIRECTS markers")
    file.write_text(updated, encoding="utf-8", newline="\n")


def main() -> None:
    # Social cards first: render_article uses an article's card when it exists.
    subprocess.run(["node", str(ROOT / "build-og.cjs")], check=True)
    for old, new in site.REDIRECTS.items():
        assert not output_file(old).exists(), f"Redirected URL still has a page: {old}"
        assert new not in site.REDIRECTS, f"Redirect chain: {old} -> {new}"

    article_sources = [read_source(file) for file in sorted((ROOT / "content/articles").glob("*.html"))]
    articles = existing_articles({meta["path"] for meta, _ in article_sources})
    registry: dict[str, dict] = {info["path"]: info for info in articles.values()}

    for meta, body in article_sources:
        slug = meta["path"].strip("/").split("/")[-1]
        registry[meta["path"]] = {**meta, "minutes": reading_minutes(body)}
        articles[slug] = registry[meta["path"]]

    page_sources = [read_source(file) for file in sorted((ROOT / "content/pages").glob("*.html"))]
    for meta, _ in page_sources:
        registry[meta["path"]] = {"path": meta["path"], "h1": meta.get("h1", meta["title"]), "description": meta["description"], "topic": meta.get("topicLabel", "Vignova")}

    for meta, body in article_sources:
        page, _ = render_article(meta, body, registry)
        output = output_file(meta["path"])
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(page, encoding="utf-8", newline="\n")

    for meta, body in page_sources:
        output = output_file(meta["path"])
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(render_page(meta, body, registry), encoding="utf-8", newline="\n")

    (ROOT / "blog/index.html").write_text(render_blog_index(articles), encoding="utf-8", newline="\n")

    entries: list[tuple[str, str | None]] = [(path, None) for path in STATIC_PAGES]
    entries += [(meta["path"], meta.get("modified")) for meta, _ in sorted(page_sources, key=lambda item: item[0].get("order", 99))]
    posts = sorted(articles.values(), key=lambda item: item["published"], reverse=True)
    entries.append(("/blog/", max(post["modified"] for post in posts)))
    entries += [(post["path"], post["modified"]) for post in posts]
    write_sitemap(entries)
    sync_redirects()
    print(f"Rendered {len(page_sources)} pages, {len(article_sources)} articles and the blog index; sitemap has {len(entries)} URLs.")

    # The hand-maintained pages get the same header, footer and schema.
    runpy.run_path(str(ROOT / "sync-layout.py"), run_name="__main__")


if __name__ == "__main__":
    main()
