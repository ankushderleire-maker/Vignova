"""Shared layout, metadata and structured data for the Vignova static site.

build-pages.py renders the product, tool and guide pages with this module and
sync-layout.py applies the same header and footer to the older pages, so the
navigation, canonical URLs and schema identities are defined in one place.
"""
from __future__ import annotations

import html
import json
import re

SITE = "https://vignova.io"
APP = "https://app.vignova.io"
REGISTER = APP + "/register"
LOGIN = APP + "/login"
EMAIL = "contact@vignova.io"
BRAND_VERSION = "purple-blue-20260907"
# Bump when site.css or site.js change, so cached copies are replaced.
ASSET_VERSION = "1"
LOGO = SITE + "/assets/vignova-purple-blue.png"
DEFAULT_OG_IMAGE = "/og-image.png?v=" + BRAND_VERSION
EXTENSION_URL = (
    "https://chromewebstore.google.com/detail/oalpfkabaipgcjimbcapeeaoipeikkha"
    "?utm_source=vignova.io&utm_medium=website"
)

# Old URL -> final URL. build-pages.py writes these into .htaccess and keeps
# them out of the sitemap; build.py checks that no page links to them.
REDIRECTS = {
    # Renamed in the Next.js site; the content lives on at the new slug.
    "/blog/sample-post/": "/blog/how-ai-is-changing-the-job-search/",
    # Same intent as /how-it-works/, which is the fuller page.
    "/blog/how-vignova-works/": "/how-it-works/",
}

TRADEMARK_NOTE = (
    "LinkedIn is a trademark of LinkedIn Corporation. Naukri.com is a trademark of "
    "Info Edge (India) Ltd. Vignova is an independent career tool and is not "
    "affiliated with or endorsed by either company."
)

PRODUCT_LINKS = [
    ("AI Resume Builder", "/ai-resume-builder/", "Build an ATS-friendly resume from your career profile"),
    ("ATS Resume Checker", "/ats-resume-checker/", "Check your resume against a job description"),
    ("Resume Tailor", "/resume-tailor/", "Tailor your resume to each job you apply for"),
    ("LinkedIn Profile Optimizer", "/linkedin-profile-optimizer/", "Improve your headline, About section and skills"),
    ("Naukri Profile Optimizer", "/naukri-profile-optimizer/", "Improve your Naukri headline, summary and key skills"),
    ("Job Application Tracker", "/job-application-tracker/", "See every application and its next step"),
]
TOOL_LINKS = [
    ("Resume Keyword Scanner", "/resume-keyword-scanner/", "Free: compare your resume with a job description"),
    ("Chrome Extension", "/chrome-extension/", "Save jobs and check keyword matches as you browse"),
    ("Job Application Autofill", "/job-application-autofill/", "Fill application forms from your profile"),
    ("Cover Letter Generator", "/cover-letter-generator/", "Write a cover letter for a specific job"),
    ("Interview Preparation", "/interview-preparation/", "Practise questions based on the job"),
    ("All tools", "/tools/", "Every Vignova tool in one place"),
]
RESOURCE_LINKS = [
    ("Career guides", "/blog/", "Resume, ATS, LinkedIn and Naukri guides"),
    ("What is a good ATS score?", "/blog/what-is-a-good-ats-score/", "How to read a match score"),
    ("ATS-friendly resume format for India", "/blog/ats-friendly-resume-format-india/", "Layout, sections, CGPA and length"),
    ("Naukri headline examples", "/blog/naukri-profile-headline-examples/", "For freshers and experienced roles"),
    ("LinkedIn headline examples", "/blog/linkedin-headline-examples/", "Headlines people can search for"),
    ("How Vignova works", "/how-it-works/", "From profile to application"),
]
NAV = [("Product", PRODUCT_LINKS), ("Tools", TOOL_LINKS), ("Resources", RESOURCE_LINKS)]

FOOTER = [
    ("Product", [(label, href) for label, href, _ in PRODUCT_LINKS]),
    ("Tools", [(label, href) for label, href, _ in TOOL_LINKS]),
    ("Resources", [
        ("Career guides", "/blog/"),
        ("ATS resume scoring guide", "/blog/ats-resume-checker-how-scoring-works/"),
        ("Tailor a resume to a job", "/blog/how-to-tailor-your-resume-to-a-job-description/"),
        ("Resume keywords guide", "/blog/resume-keywords-how-to-find-and-use-them/"),
        ("How Vignova works", "/how-it-works/"),
    ]),
    ("Company", [
        ("About Vignova", "/about/"),
        ("Contact and support", "/contact/"),
        ("Pricing", "/#plans"),
        ("Privacy policy", "/privacy/"),
        ("Terms of service", "/terms/"),
        ("Refund policy", "/refund/"),
        ("Digital delivery", "/shipping/"),
        ("Log in", LOGIN),
    ]),
]


def esc(value) -> str:
    return html.escape(str(value), quote=True)


def absolute(path: str) -> str:
    """The canonical absolute URL for a site path or an already absolute URL."""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if not path.startswith("/"):
        raise ValueError(f"Site paths must start with '/': {path}")
    return SITE + path


def canonical(path: str) -> str:
    """HTTPS, apex host, and a trailing slash for every page."""
    clean = path.split("#")[0].split("?")[0]
    if not clean.endswith("/"):
        raise ValueError(f"Page paths must end with '/': {path}")
    if clean in REDIRECTS:
        raise ValueError(f"{path} redirects to {REDIRECTS[clean]} and cannot be canonical")
    return absolute(clean)


def strip_tags(markup: str) -> str:
    text = re.sub(r"<[^>]+>", " ", markup)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def json_ld(nodes: list[dict]) -> str:
    data = json.dumps({"@context": "https://schema.org", "@graph": nodes}, ensure_ascii=False, separators=(",", ":"))
    # A "</script>" inside a string must not close the tag early.
    return '<script type="application/ld+json">' + data.replace("<", "\\u003c") + "</script>"


# ---------- Structured data nodes ----------

def organization() -> dict:
    return {
        "@type": "Organization",
        "@id": SITE + "/#organization",
        "name": "Vignova",
        "url": SITE + "/",
        "logo": {"@type": "ImageObject", "url": LOGO},
        "email": EMAIL,
        "founder": {"@type": "Person", "name": "Ankush Derle"},
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "email": EMAIL,
            "url": SITE + "/contact/",
        },
    }


def website() -> dict:
    return {
        "@type": "WebSite",
        "@id": SITE + "/#website",
        "name": "Vignova",
        "url": SITE + "/",
        "inLanguage": "en",
        "publisher": {"@id": SITE + "/#organization"},
    }


def breadcrumb(items: list[tuple[str, str]]) -> dict:
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": position, "name": name, "item": absolute(path)}
            for position, (name, path) in enumerate(items, 1)
        ],
    }


def webpage(page: dict) -> dict:
    url = canonical(page["path"])
    node = {
        "@type": page.get("pageType", "WebPage"),
        "@id": url + "#webpage",
        "url": url,
        "name": page["title"],
        "description": page["description"],
        "inLanguage": page.get("lang", "en"),
        "isPartOf": {"@id": SITE + "/#website"},
        "publisher": {"@id": SITE + "/#organization"},
    }
    if page.get("modified"):
        node["dateModified"] = page["modified"]
    if page.get("image"):
        node["primaryImageOfPage"] = {"@type": "ImageObject", "url": absolute(page["image"])}
    return node


def faq_page(faqs: list[dict], path: str) -> dict:
    return {
        "@type": "FAQPage",
        "@id": canonical(path) + "#faq",
        "mainEntity": [
            {
                "@type": "Question",
                "name": item["q"],
                "acceptedAnswer": {"@type": "Answer", "text": strip_tags(item["a"])},
            }
            for item in faqs
        ],
    }


def application(page: dict) -> dict:
    """Describes a Vignova feature. Only facts shown on the page belong here."""
    app = page["application"]
    node = {
        "@type": app.get("type", "WebApplication"),
        "@id": canonical(page["path"]) + "#application",
        "name": app["name"],
        "url": canonical(page["path"]),
        "description": page["description"],
        "applicationCategory": app.get("category", "BusinessApplication"),
        "operatingSystem": app.get("operatingSystem", "Any modern web browser"),
        "publisher": {"@id": SITE + "/#organization"},
        "isAccessibleForFree": app.get("free", True),
    }
    if app.get("featureList"):
        node["featureList"] = app["featureList"]
    if app.get("installUrl"):
        node["installUrl"] = app["installUrl"]
    if app.get("free", True):
        # The free plan is real and stated on every product page; paid plans
        # are not listed here because their prices can change in the app.
        node["offers"] = {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "description": "Free plan with 3 introductory credits. Paid plans add more credits.",
            "url": SITE + "/#plans",
        }
    return node


def blog_posting(post: dict) -> dict:
    url = canonical(post["path"])
    return {
        "@type": "BlogPosting",
        "@id": url + "#article",
        "headline": post["h1"],
        "description": post["description"],
        "image": absolute(post.get("image") or DEFAULT_OG_IMAGE),
        "datePublished": post["published"] + "T00:00:00+05:30",
        "dateModified": post.get("modified", post["published"]) + "T00:00:00+05:30",
        "author": {"@type": "Organization", "name": "Vignova", "url": SITE + "/about/"},
        "publisher": {"@id": SITE + "/#organization"},
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "inLanguage": post.get("lang", "en"),
        "isPartOf": {"@id": SITE + "/blog/#blog"},
    }


# ---------- Layout ----------

def brand_link() -> str:
    return (
        '<a class="vn-brand" href="/" aria-label="Vignova home">'
        '<span class="vn-logo"><img src="/assets/vignova-purple-blue.png" width="50" height="50" alt=""></span>'
        '<span class="vn-wordmark">VIGNOVA</span></a>'
    )


def _current(href: str, current: str) -> str:
    return ' aria-current="page"' if href == current else ""


def header(current: str = "") -> str:
    menus = []
    for label, links in NAV:
        items = "".join(
            f'<a href="{esc(href)}"{_current(href, current)}><strong>{esc(name)}</strong><span>{esc(blurb)}</span></a>'
            for name, href, blurb in links
        )
        menus.append(
            f'<li><details class="vn-dropdown"><summary>{esc(label)}</summary>'
            f'<div class="vn-panel">{items}</div></details></li>'
        )
    mobile_groups = "".join(
        f'<div class="vn-mobile-group"><p>{esc(label)}</p>'
        + "".join(f'<a href="{esc(href)}"{_current(href, current)}>{esc(name)}</a>' for name, href, _ in links)
        + "</div>"
        for label, links in NAV
    )
    mobile_groups += (
        '<div class="vn-mobile-group"><p>Account</p>'
        '<a href="/#plans">Pricing</a>'
        f'<a href="{LOGIN}">Log in</a>'
        f'<a href="{REGISTER}">Get started free</a></div>'
    )
    return (
        '<header class="vn-header"><div class="vn-container vn-nav-row">'
        + brand_link()
        + '<nav class="vn-nav" aria-label="Main navigation"><ul class="vn-menu">'
        + "".join(menus)
        + '<li><a class="vn-top-link" href="/#plans">Pricing</a></li></ul></nav>'
        + '<div class="vn-actions">'
        + f'<a class="vn-login" href="{LOGIN}">Log in</a>'
        + f'<a class="vn-button vn-button-small" href="{REGISTER}">Get started free</a>'
        + "</div>"
        + '<details class="vn-mobile"><summary aria-label="Menu"><span></span><span></span><span></span></summary>'
        + '<nav class="vn-mobile-panel" aria-label="Mobile navigation">'
        + mobile_groups
        + "</nav></details>"
        + "</div></header>"
    )


def footer() -> str:
    columns = "".join(
        f'<nav aria-label="{esc(title)}"><p class="vn-footer-title">{esc(title)}</p>'
        + "".join(f'<a href="{esc(href)}">{esc(label)}</a>' for label, href in links)
        + "</nav>"
        for title, links in FOOTER
    )
    return (
        '<footer class="vn-footer"><div class="vn-container vn-footer-grid">'
        '<div class="vn-footer-brand">'
        + brand_link()
        + "<p>One career profile for your resume, ATS checks, LinkedIn and Naukri profiles, and applications.</p>"
        + f'<a href="mailto:{EMAIL}">{EMAIL}</a></div>'
        + columns
        + "</div>"
        # footer-bottom is where analytics.js places the Cookie settings button.
        + '<div class="vn-container vn-footer-bottom footer-bottom">'
        + f'<p>&copy; <span data-vn-year>2026</span> Vignova. All rights reserved. {esc(TRADEMARK_NOTE)}</p>'
        + '<a href="#main">Back to top</a></div></footer>'
    )


def breadcrumbs(items: list[tuple[str, str]]) -> str:
    parts = []
    for position, (name, path) in enumerate(items, 1):
        if position == len(items):
            parts.append(f'<li aria-current="page">{esc(name)}</li>')
        else:
            parts.append(f'<li><a href="{esc(path)}">{esc(name)}</a></li>')
    return f'<nav class="vn-container vn-breadcrumbs" aria-label="Breadcrumb"><ol>{"".join(parts)}</ol></nav>'


def head(page: dict, graph: list[dict], stylesheets: list[str], scripts: list[str] | None = None) -> str:
    url = canonical(page["path"])
    title = page["title"]
    description = page["description"]
    image = absolute(page.get("ogImage") or DEFAULT_OG_IMAGE)
    lang = page.get("lang", "en")
    robots = page.get("robots", "index, follow, max-image-preview:large, max-snippet:-1")
    og_type = "article" if page.get("kind") == "article" else "website"
    article_meta = ""
    if og_type == "article":
        article_meta = (
            f'<meta property="article:published_time" content="{page["published"]}T00:00:00+05:30">\n'
            f'<meta property="article:modified_time" content="{page.get("modified", page["published"])}T00:00:00+05:30">\n'
        )
    links = "".join(f'<link rel="stylesheet" href="{esc(sheet)}">\n' for sheet in stylesheets)
    extra = "".join(f'<script src="{esc(src)}" defer></script>\n' for src in (scripts or []))
    return f'''<!doctype html>
<html lang="{esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#7155ed">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<meta name="robots" content="{esc(robots)}">
<link rel="canonical" href="{url}">
<meta property="og:site_name" content="Vignova">
<meta property="og:locale" content="{'en_IN' if lang == 'en-IN' else 'en_US'}">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(page.get('ogAlt', 'Vignova AI career workspace'))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{esc(image)}">
{article_meta}<link rel="icon" href="/favicon-48x48.png?v={BRAND_VERSION}" sizes="48x48" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v={BRAND_VERSION}" sizes="180x180">
<link rel="manifest" href="/site.webmanifest?v={BRAND_VERSION}">
<link rel="preload" href="/assets/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
{links}<link rel="stylesheet" href="/analytics.css">
{json_ld(graph)}
<script src="/analytics.js" defer></script>
<script src="/site.js?v={ASSET_VERSION}" defer></script>
{extra}</head>
<body>
<a class="vn-skip" href="#main">Skip to content</a>
'''
