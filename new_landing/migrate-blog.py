"""Migrate the existing, rendered Vignova blog without changing its article copy.

Run from anywhere: python new_landing/migrate-blog.py
Requires BeautifulSoup, already available in this workspace. This script is a
local content migration tool; Hostinger only needs the generated HTML and CSS.
The existing Next export is the source of the rendered article bodies. The MDX
sources are retained in content/blog for editorial reference and future builds.
"""

from __future__ import annotations

import argparse
import copy
import html
import json
import math
from pathlib import Path
import re
import shutil
from datetime import date

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parent
SITE = "https://vignova.io"
TOPICS = {
    "ats-resume-checker-how-scoring-works": "ATS resume checks",
    "can-recruiters-tell-you-used-ai-on-your-resume": "AI & your resume",
    "how-ai-is-changing-the-job-search": "Job search insights",
    "how-many-jobs-to-apply-to-and-how-to-track-them": "Application tracking",
    "how-to-tailor-your-resume-to-a-job-description": "Resume tailoring",
    "how-vignova-works": "Getting started",
    "resume-keywords-how-to-find-and-use-them": "Resume keywords",
    "the-75-percent-ats-rejection-myth": "ATS explained",
}


def esc(value: str) -> str:
    return html.escape(str(value), quote=True)


def frontmatter(path: Path) -> dict:
    # The source uses only simple quoted scalar values in YAML frontmatter.
    block = path.read_text(encoding="utf-8-sig").split("---", 2)[1]
    result = {}
    for line in block.strip().splitlines():
        key, value = line.split(":", 1)
        result[key.strip()] = value.strip().strip('"').strip("'")
    return result


def schema_json(data) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


def organization() -> dict:
    return {
        "@type": "Organization", "@id": SITE + "/#organization",
        "name": "Vignova", "url": SITE + "/",
        "logo": {"@type": "ImageObject", "url": SITE + "/assets/vignova-purple-blue.png"},
    }


def breadcrumb(items: list[tuple[str, str]]) -> dict:
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": n, "name": title, "item": SITE + url}
            for n, (title, url) in enumerate(items, 1)
        ],
    }


def head(title: str, description: str, path: str, graph: list, published: str = "") -> str:
    article_meta = f'<meta property="article:published_time" content="{published}T00:00:00.000Z">' if published else ""
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#7155ed">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:site_name" content="Vignova">
<meta property="og:type" content="{'article' if published else 'website'}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{SITE}{path}">
<meta property="og:image" content="{SITE}/og-image.png">
<meta property="og:image:alt" content="Vignova — AI resume and job search tools">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{SITE}/og-image.png">
{article_meta}
<link rel="icon" href="/assets/vignova-purple-blue.png" type="image/png">
<link rel="preload" href="/assets/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/blog.css?v=1">
<link rel="stylesheet" href="/analytics.css">
<script type="application/ld+json">{schema_json({'@context': 'https://schema.org', '@graph': graph})}</script>
<script src="/analytics.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
{header()}
'''


def brand() -> str:
    return '''<a class="brand" href="/" aria-label="Vignova home"><span class="logo-crop"><img src="/assets/vignova-purple-blue.png" alt="" width="48" height="48"></span><span>VIGNOVA</span></a>'''


def header() -> str:
    return f'''<header class="blog-site-header"><div class="shell nav-wrap">{brand()}
<nav class="desktop-nav" aria-label="Main navigation"><a href="/#extension">Chrome extension</a><a href="/#features">Features</a><a href="/#plans">Pricing</a><a href="/blog/" aria-current="true">Blog</a></nav>
<a class="button nav-cta" href="https://app.vignova.io/register">Get started free <span aria-hidden="true">↗</span></a>
<details class="mobile-menu"><summary aria-label="Open navigation"><span></span><span></span></summary><nav aria-label="Mobile navigation"><a href="/#extension">Chrome extension</a><a href="/#features">Features</a><a href="/#plans">Pricing</a><a href="/blog/">Blog</a><a href="https://app.vignova.io/login">Log in</a><a href="https://app.vignova.io/register">Get started free ↗</a></nav></details>
</div></header>'''


def footer() -> str:
    return f'''<footer class="blog-site-footer"><div class="shell footer-grid"><div>{brand()}<p>AI tools for your next application.</p><a href="mailto:contact@vignova.io">contact@vignova.io</a></div><nav aria-label="Explore Vignova"><h2>Explore</h2><a href="/#features">Features</a><a href="/#extension">Chrome extension</a><a href="/#plans">Plans</a><a href="/blog/">Blog</a><a href="/about/">About Vignova</a><a href="/contact/">Contact &amp; support</a></nav><nav aria-label="Legal links"><h2>The details</h2><a href="/privacy/">Privacy policy</a><a href="/terms/">Terms of service</a><a href="/refund/">Refund policy</a><a href="https://app.vignova.io/login">Log in</a></nav></div><div class="shell footer-bottom"><span>© 2026 Vignova. All rights reserved.</span><a href="#main">Back to top ↑</a></div></footer></body></html>'''


def date_label(value: str) -> str:
    day = date.fromisoformat(value)
    return day.strftime("%B ") + str(day.day) + day.strftime(", %Y")


def card(post: dict, position: int = 0) -> str:
    return f'''<article class="blog-card accent-{position % 3}"><a href="/blog/{post['slug']}/"><div class="card-top"><span class="topic">{esc(post['topic'])}</span><span class="card-arrow" aria-hidden="true">↗</span></div><h3>{esc(post['title'])}</h3><p>{esc(post['description'])}</p><div class="card-meta"><time datetime="{post['date']}">{date_label(post['date'])}</time><span>{post['minutes']} min read</span></div></a></article>'''


def load_posts(source: Path) -> list[dict]:
    posts = []
    for mdx in sorted((source / "content/blog").glob("*.mdx")):
        meta = frontmatter(mdx)
        exported = source / "out/blog" / mdx.stem / "index.html"
        soup = BeautifulSoup(exported.read_text(encoding="utf-8"), "html.parser")
        source_body = soup.select_one("article > div.prose")
        if source_body is None:
            raise ValueError(f"Missing rendered article body: {exported}")
        if soup.select_one("article h1").get_text() != meta["title"]:
            raise ValueError(f"Stale title in Next export: {mdx.stem}")
        if soup.find("meta", attrs={"name": "description"})["content"] != meta["description"]:
            raise ValueError(f"Stale description in Next export: {mdx.stem}")
        body = copy.deepcopy(source_body)
        headings = []
        for n, heading in enumerate(body.find_all("h2"), 1):
            anchor = "article-" + str(n) + "-" + re.sub(r"[^a-z0-9]+", "-", heading.get_text().lower()).strip("-")
            heading["id"] = anchor
            headings.append((anchor, heading.get_text()))
        # Only heading IDs change. Text, citations and link destinations remain exact.
        assert body.get_text() == source_body.get_text()
        assert [(a.get_text(), a.get("href")) for a in body.find_all("a")] == [(a.get_text(), a.get("href")) for a in source_body.find_all("a")]
        minutes = max(1, math.ceil(len(body.get_text(" ", strip=True).split()) / 220))
        posts.append({**meta, "slug": mdx.stem, "body": body.decode_contents(), "headings": headings, "minutes": minutes, "topic": TOPICS.get(mdx.stem, "Career guide"), "source_body": source_body})
        content_dir = ROOT / "content/blog"
        content_dir.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(mdx, content_dir / mdx.name)
    if not posts:
        raise ValueError("No source blog articles found")
    return sorted(posts, key=lambda post: (post["date"], post["slug"]), reverse=True)


def build_article(post: dict, posts: list[dict]) -> None:
    path = "/blog/" + post["slug"] + "/"
    article = {
        "@type": "BlogPosting", "@id": SITE + path + "#article",
        "headline": post["title"], "description": post["description"],
        "datePublished": post["date"] + "T00:00:00.000Z",
        "dateModified": post["date"] + "T00:00:00.000Z",
        "image": SITE + post.get("coverImage", "/og-image.png"),
        "mainEntityOfPage": {"@type": "WebPage", "@id": SITE + path},
        "author": {"@type": "Organization", "name": "Vignova", "url": SITE + "/"},
        "publisher": {"@id": SITE + "/#organization"},
        "inLanguage": "en", "isPartOf": {"@id": SITE + "/blog/#blog"},
    }
    graph = [organization(), article, breadcrumb([("Home", "/"), ("Blog", "/blog/"), (post["title"], path)])]
    toc = "".join(f'<li><a href="#{anchor}">{esc(label)}</a></li>' for anchor, label in post["headings"])
    clusters = {
        'ats-resume-checker-how-scoring-works': ['the-75-percent-ats-rejection-myth', 'resume-keywords-how-to-find-and-use-them', 'how-to-tailor-your-resume-to-a-job-description'],
        'the-75-percent-ats-rejection-myth': ['ats-resume-checker-how-scoring-works', 'resume-keywords-how-to-find-and-use-them', 'how-to-tailor-your-resume-to-a-job-description'],
        'how-many-jobs-to-apply-to-and-how-to-track-them': ['how-to-tailor-your-resume-to-a-job-description', 'how-vignova-works', 'how-ai-is-changing-the-job-search'],
        'can-recruiters-tell-you-used-ai-on-your-resume': ['how-ai-is-changing-the-job-search', 'how-to-tailor-your-resume-to-a-job-description', 'resume-keywords-how-to-find-and-use-them'],
        'how-ai-is-changing-the-job-search': ['can-recruiters-tell-you-used-ai-on-your-resume', 'how-vignova-works', 'how-many-jobs-to-apply-to-and-how-to-track-them'],
        'resume-keywords-how-to-find-and-use-them': ['how-to-tailor-your-resume-to-a-job-description', 'ats-resume-checker-how-scoring-works', 'the-75-percent-ats-rejection-myth'],
        'how-vignova-works': ['how-to-tailor-your-resume-to-a-job-description', 'how-many-jobs-to-apply-to-and-how-to-track-them', 'ats-resume-checker-how-scoring-works'],
        'how-to-tailor-your-resume-to-a-job-description': ['resume-keywords-how-to-find-and-use-them', 'ats-resume-checker-how-scoring-works', 'can-recruiters-tell-you-used-ai-on-your-resume'],
    }
    by_slug = {item['slug']: item for item in posts}
    related = [by_slug[slug] for slug in clusters[post['slug']]]
    page = head(post["title"] + " | Vignova", post["description"], path, graph, post["date"])
    page += f'''<main id="main"><div class="shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/blog/">Blog</a><span aria-hidden="true">/</span><span aria-current="page">{esc(post['title'])}</span></nav></div>
<article><header class="article-header shell"><span class="eyebrow">{esc(post['topic'])}</span><h1>{esc(post['title'])}</h1><p class="article-description">{esc(post['description'])}</p><div class="article-meta"><span class="author-mark"><img src="/assets/vignova-purple-blue.png" alt="" width="32" height="32"></span><span>By <a href="/about/">Vignova</a></span><span class="meta-dot" aria-hidden="true">·</span><time datetime="{post['date']}">{date_label(post['date'])}</time><span class="meta-dot" aria-hidden="true">·</span><span>{post['minutes']} min read</span></div></header>
<div class="shell article-layout"><aside class="article-sidebar" aria-label="Article navigation"><details class="table-of-contents" open><summary>In this article</summary><ol>{toc}</ol></details><div class="sidebar-cta"><span class="eyebrow">PUT IT INTO PRACTICE</span><h2>Build a resume for your next role.</h2><a class="button" href="https://app.vignova.io/register">Try Vignova free ↗</a><p>3 introductory credits. No card needed.</p></div></aside><div class="article-body">{post['body']}</div></div></article>
<section class="related shell" aria-labelledby="related-title"><div class="section-title"><div><span class="eyebrow">KEEP EXPLORING</span><h2 id="related-title">More for your job search.</h2></div><a class="text-link" href="/blog/">All articles ↗</a></div><div class="related-grid">{''.join(card(item, n) for n, item in enumerate(related))}</div></section></main>'''
    page += footer()
    destination = ROOT / "blog" / post["slug"] / "index.html"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(page, encoding="utf-8", newline="\n")
    # Reparse the file after writing, rather than only validating the in-memory body.
    output = BeautifulSoup(destination.read_text(encoding="utf-8"), "html.parser")
    output_body = output.select_one(".article-body")
    assert output_body.get_text() == post["source_body"].get_text(), post["slug"]
    assert [(a.get_text(), a.get("href")) for a in output_body.find_all("a")] == [(a.get_text(), a.get("href")) for a in post["source_body"].find_all("a")], post["slug"]


def build_index(posts: list[dict], source: Path) -> None:
    old = BeautifulSoup((source / "out/blog/index.html").read_text(encoding="utf-8"), "html.parser")
    title = old.title.get_text()
    description = old.find("meta", attrs={"name": "description"})["content"]
    graph = [organization(), {
        "@type": "Blog", "@id": SITE + "/blog/#blog", "name": "Vignova Blog",
        "url": SITE + "/blog/", "description": description,
        "publisher": {"@id": SITE + "/#organization"},
        "blogPost": [{"@type": "BlogPosting", "headline": post["title"], "url": SITE + "/blog/" + post["slug"] + "/", "datePublished": post["date"] + "T00:00:00.000Z"} for post in posts],
    }, breadcrumb([("Home", "/"), ("Blog", "/blog/")])]
    featured = next(post for post in posts if post["slug"] == "how-to-tailor-your-resume-to-a-job-description")
    page = head(title, description, "/blog/", graph)
    page += f'''<main id="main"><section class="blog-hero shell"><span class="eyebrow">THE VIGNOVA BLOG</span><h1>Resume advice.<br><span>A clearer job search.</span></h1><p>Practical guides to tailor your resume, understand ATS checks, and keep your next career move on track.</p></section>
<section class="shell featured-section" aria-labelledby="featured-title"><a class="featured-card" href="/blog/{featured['slug']}/"><div class="featured-copy"><span class="featured-label">START HERE · RESUME TAILORING</span><h2 id="featured-title">{esc(featured['title'])}</h2><p>{esc(featured['description'])}</p><span class="featured-read">Read the guide <span aria-hidden="true">↗</span></span></div><div class="featured-art" aria-hidden="true"><div class="document-paper"><div class="document-avatar">V</div><div class="document-line long"></div><div class="document-line medium"></div><div class="document-rule"></div><span>EXPERIENCE</span><div class="document-line"></div><div class="document-line long"></div><div class="document-line medium"></div><span>SKILLS</span><div class="skill-chips"><i></i><i></i><i></i></div></div><div class="feature-note"><span>✦</span> Your experience.<br><strong>Tailored to the role.</strong></div></div></a></section>
<section class="shell article-collection" aria-labelledby="articles-title"><div class="section-title"><div><span class="eyebrow">RESUME ADVICE, EXPLAINED</span><h2 id="articles-title">Explore all guides.</h2></div><span class="article-count">{len(posts)} articles from Vignova</span></div><div class="blog-grid">{''.join(card(post, n) for n, post in enumerate(posts))}</div></section>
<section class="shell blog-cta" aria-labelledby="blog-cta-title"><div><span class="eyebrow">YOUR NEXT CHAPTER</span><h2 id="blog-cta-title">Put your experience<br>into a stronger application.</h2></div><a class="button" href="https://app.vignova.io/register">Build my resume <span aria-hidden="true">↗</span></a></section></main>'''
    page += footer()
    destination = ROOT / "blog/index.html"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(page, encoding="utf-8", newline="\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT.parent / "LandingCode")
    args = parser.parse_args()
    posts = load_posts(args.source.resolve())
    for post in posts:
        build_article(post, posts)
    build_index(posts, args.source.resolve())
    print(f"Migrated {len(posts)} articles and blog index; all source article text and links match exactly.")


if __name__ == "__main__":
    main()
