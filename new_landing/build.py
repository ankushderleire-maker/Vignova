"""Export branding with Node/Sharp, then validate and package the static website.

Run from new_landing after rendering the pages:
    python build-pages.py
    python build.py
"""
from collections import Counter, defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile

import seo_site as site

ROOT = Path(__file__).resolve().parent
FRONT = re.compile(r"\A\s*<!--\s*(\{.*?\})\s*-->", re.S)
PUBLIC_FILES = [
    'index.html', 'styles.css', 'sections.css', 'responsive.css', 'script.js',
    'legal.css', 'conversion.css', 'cards.css', 'start.css', 'start.js', 'start/index.html',
    'live-demos.css', 'visuals/demo.js', 'visuals/demo.css', 'visuals/LICENSES.txt',
    '.htaccess', 'robots.txt', 'sitemap.xml',
    'privacy/index.html', 'terms/index.html', 'refund/index.html', 'shipping/index.html',
    '404.html', 'blog.css', 'pages.css', 'seo.css', 'analytics.js', 'analytics.css',
    'site.css', 'site.js', 'keyword-scanner.js',
    'about/index.html', 'contact/index.html', 'how-it-works/index.html',
    'og-image.png', 'logo.png', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'favicon-48x48.png',
    'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png',
    'site.webmanifest',
]
ASSET_FOLDERS = ['assets/screens', 'assets/og', 'templates']
UTILITY_PAGES = {'start/index.html', '404.html'}
FORBIDDEN_SCHEMA = {'HowTo', 'AggregateRating', 'Review'}


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.ids, self.references, self.controls, self.images = [], [], [], []
        self.h1_count = 0
        self.lang = None
        self.titles, self.canonicals, self.meta = [], [], []
        self.scripts, self.schemas = [], []
        self.capture_title, self.capture_schema = False, False
        self.buffer = ''
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html':
            self.lang = attrs.get('lang')
        if tag == 'title':
            self.capture_title = True
            self.buffer = ''
        if tag == 'meta':
            self.meta.append(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href'))
        if tag == 'script':
            self.scripts.append(attrs.get('src', ''))
            if attrs.get('type') == 'application/ld+json':
                self.capture_schema = True
                self.buffer = ''
        if tag == 'h1':
            self.h1_count += 1
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in ('href', 'src'):
            if attrs.get(key):
                self.references.append(attrs[key])
        for key in ('aria-controls', 'aria-labelledby'):
            self.controls.extend(attrs.get(key, '').split())
        if tag == 'img':
            if 'alt' not in attrs:
                raise ValueError(f'Image is missing alt text: {attrs.get("src")}')
            self.images.append(attrs)

    def handle_data(self, data):
        if self.capture_title or self.capture_schema:
            self.buffer += data

    def handle_endtag(self, tag):
        if tag == 'title' and self.capture_title:
            self.titles.append(self.buffer.strip())
            self.capture_title = False
        if tag == 'script' and self.capture_schema:
            self.schemas.append(json.loads(self.buffer))
            self.capture_schema = False


def local_target(file, path):
    decoded = unquote(path)
    target = (ROOT / decoded.lstrip('/')).resolve() if decoded.startswith('/') else (file.parent / decoded).resolve()
    if target.is_dir():
        target /= 'index.html'
    return target


def schema_nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from schema_nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from schema_nodes(child)


def rendered_pages():
    """Every page build-pages.py renders from content/."""
    pages = []
    for source in sorted((ROOT / 'content').rglob('*.html')):
        match = FRONT.match(source.read_text(encoding='utf-8'))
        assert match, f'{source.name}: missing front matter'
        pages.append(ROOT / json.loads(match.group(1))['path'].strip('/') / 'index.html')
    return pages


def label_of(file):
    return file.relative_to(ROOT).as_posix()


def main():
    # Every release exports current branding, even after a content re-import.
    subprocess.run(['node', str(ROOT / 'build-branding.cjs')], check=True)
    files = [ROOT / name for name in PUBLIC_FILES]
    files.extend(ROOT / 'assets' / name for name in [
        'vignova-purple-blue.png', 'geist-latin.woff2', 'FONT-LICENSE.txt', 'ats-analysis.png',
    ])
    for folder in ASSET_FOLDERS:
        if (ROOT / folder).is_dir():
            files.extend(sorted(file for file in (ROOT / folder).rglob('*') if file.is_file()))
    files.extend(rendered_pages())
    files.extend(sorted((ROOT / 'blog').rglob('*.html')))
    files = list(dict.fromkeys(files))
    missing = [label_of(file) for file in files if not file.is_file()]
    assert not missing, f'Required public files are missing: {missing}'
    manifest = json.loads((ROOT / 'site.webmanifest').read_text(encoding='utf-8'))
    for icon in manifest['icons']:
        assert local_target(ROOT / 'index.html', urlsplit(icon['src']).path) in files, 'Manifest icon missing from ZIP'

    docs = {file: Document(file.read_text(encoding='utf-8')) for file in files if file.suffix == '.html'}
    redirect_sources = set(site.REDIRECTS)
    inbound = defaultdict(set)
    references = 0
    for file, doc in docs.items():
        label = label_of(file)
        assert doc.h1_count == 1, f'{label}: expected exactly one main heading'
        duplicates = [key for key, count in Counter(doc.ids).items() if count > 1]
        assert not duplicates, f'{label}: duplicate IDs {duplicates}'
        for control in doc.controls:
            assert control in doc.ids, f'{label}: missing ARIA target {control}'
        for image in doc.images:
            assert image.get('width') and image.get('height'), f'{label}: image without width and height: {image.get("src")}'
        for reference in doc.references:
            parsed = urlsplit(reference)
            assert parsed.scheme != 'javascript', f'{label}: javascript: link'
            host = parsed.hostname
            assert host != 'www.vignova.io' and not (host == 'vignova.io' and parsed.scheme == 'http'), \
                f'{label}: link to a non-canonical Vignova host: {reference}'
            if (parsed.scheme or parsed.netloc) and host != 'vignova.io':
                continue
            assert parsed.path not in redirect_sources, f'{label}: link to a redirected URL: {reference}'
            target = local_target(file, parsed.path) if parsed.path else file
            assert target.is_relative_to(ROOT), f'{label}: local link leaves the public folder: {reference}'
            assert target.is_file(), f'{label}: missing local target {reference}'
            assert target in files, f'{label}: linked file is absent from upload package: {reference}'
            if parsed.fragment:
                target_doc = docs.get(target)
                assert target_doc and unquote(parsed.fragment) in target_doc.ids, f'{label}: broken anchor {reference}'
            if target != file:
                inbound[target].add(file)
            references += 1
    for file in files:
        if file.suffix == '.css':
            for reference in re.findall(r'url\([\"\']?([^\)\"\']+)', file.read_text(encoding='utf-8')):
                if not urlsplit(reference).scheme:
                    target = local_target(file, urlsplit(reference).path)
                    assert target.is_file() and target in files, f'{label_of(file)}: missing packaged CSS asset {reference}'

    # SEO release gate: a new build must keep every existing URL, minus deliberate redirects.
    urls = [entry.text for entry in ET.parse(ROOT / 'sitemap.xml').getroot().iter() if entry.tag.endswith('}loc')]
    lastmods = [entry.text for entry in ET.parse(ROOT / 'sitemap.xml').getroot().iter() if entry.tag.endswith('}lastmod')]
    assert len(urls) == len(set(urls)), 'Duplicate sitemap URLs'
    assert all(re.fullmatch(r'\d{4}-\d{2}-\d{2}', value) for value in lastmods), 'Malformed sitemap lastmod'
    redirected_urls = {site.SITE + path for path in redirect_sources}
    assert not redirected_urls & set(urls), 'Redirected URLs are listed in the sitemap'
    old_sitemap = ROOT.parent / 'LandingCode/out/sitemap.xml'
    if old_sitemap.is_file():
        old_urls = {entry.text for entry in ET.parse(old_sitemap).getroot().iter() if entry.tag.endswith('}loc')}
        lost = old_urls - redirected_urls - set(urls)
        assert not lost, f'Existing pages lost from sitemap: {lost}'

    seen_titles = set()
    warnings = []
    for file, doc in docs.items():
        label = label_of(file)
        assert doc.lang, f'{label}: missing html lang'
        assert len(doc.titles) == 1 and doc.titles[0], f'{label}: missing or duplicate title'
        assert doc.titles[0] not in seen_titles, f'{label}: duplicated page title'
        seen_titles.add(doc.titles[0])
        metas = {(m.get('name') or m.get('property')): m.get('content', '') for m in doc.meta}
        for key in ['description', 'robots', 'og:title', 'og:description', 'og:image', 'twitter:title', 'twitter:description']:
            assert metas.get(key), f'{label}: missing {key}'
            assert sum(1 for m in doc.meta if key in [m.get('name'), m.get('property')]) == 1, f'{label}: duplicate {key}'
        assert metas['og:title'] == doc.titles[0] == metas['twitter:title'], f'{label}: inherited social title'
        og_image = urlsplit(metas['og:image'])
        assert og_image.hostname == 'vignova.io' and og_image.scheme == 'https', f'{label}: og:image must be on https://vignova.io'
        assert local_target(ROOT / 'index.html', og_image.path) in files, f'{label}: og:image is not packaged: {metas["og:image"]}'
        if doc.lang == 'en-IN':
            assert metas.get('og:locale') == 'en_IN', f'{label}: en-IN page without the en_IN locale'
        if len(doc.titles[0]) > 70:
            warnings.append(f'{label}: title is {len(doc.titles[0])} characters')
        if not 70 <= len(metas['description']) <= 170:
            warnings.append(f'{label}: description is {len(metas["description"])} characters')
        assert len([src for src in doc.scripts if urlsplit(src).path == '/analytics.js']) == 1, f'{label}: analytics missing/duplicated'
        assert not any('googletagmanager.com' in src for src in doc.scripts), f'{label}: Google library bypasses consent'
        assert len(doc.schemas) == 1, f'{label}: expected one JSON-LD block, found {len(doc.schemas)}'
        nodes = list(schema_nodes(doc.schemas))
        assert any(n.get('@id') == site.SITE + '/#organization' and n.get('@type') == 'Organization' for n in nodes), f'{label}: organization schema missing'
        assert not any(n.get('@type') in FORBIDDEN_SCHEMA for n in nodes), f'{label}: obsolete or unverified schema'
        assert not any('ratingValue' in n or 'reviewCount' in n for n in nodes), f'{label}: rating data in schema'
        if label in UTILITY_PAGES:
            assert 'noindex' in metas['robots'], f'{label}: utility page is indexable'
            continue
        canonical = 'https://vignova.io/' + label.removesuffix('index.html')
        assert doc.canonicals == [canonical], f'{label}: canonical must match its public URL'
        assert canonical in urls and 'noindex' not in metas['robots'], f'{label}: excluded from search'
        if label != 'index.html':
            assert any(n.get('@type') == 'BreadcrumbList' for n in nodes), f'{label}: missing breadcrumb schema'
        if label.startswith('blog/') and label != 'blog/index.html':
            assert any(n.get('@type') == 'BlogPosting' and n.get('datePublished') and n.get('author') for n in nodes), f'{label}: incomplete article schema'

    for url in urls:
        assert url.startswith('https://vignova.io/') and url.endswith('/'), f'Unexpected sitemap URL: {url}'
        target = local_target(ROOT / 'index.html', urlsplit(url).path)
        assert target in docs, f'Sitemap route is missing: {url}'
        if url != site.SITE + '/':
            assert inbound[target], f'Orphan page, nothing links to it: {url}'
    indexable = {file for file in docs if label_of(file) not in UTILITY_PAGES}
    unlisted = sorted(label_of(file) for file in indexable if 'https://vignova.io/' + label_of(file).removesuffix('index.html') not in urls)
    assert not unlisted, f'Indexable pages missing from the sitemap: {unlisted}'

    robots = (ROOT / 'robots.txt').read_text(encoding='utf-8')
    assert 'Sitemap: https://vignova.io/sitemap.xml' in robots, 'robots.txt does not reference the sitemap'
    assert not re.search(r'(?im)^disallow:\s*/\s*$', robots), 'robots.txt blocks the whole site'
    htaccess = (ROOT / '.htaccess').read_text(encoding='utf-8')
    for old, new in site.REDIRECTS.items():
        assert f'^{old.strip("/")}/?$ {site.SITE}{new} [R=301,L]' in htaccess, f'.htaccess is missing the redirect for {old}'

    archive = ROOT / 'hostinger-upload.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for file in files:
            bundle.write(file, label_of(file))
    with zipfile.ZipFile(archive) as bundle:
        names = bundle.namelist()
        assert bundle.testzip() is None, 'ZIP integrity check failed'
        assert 'index.html' in names, 'Homepage is not at archive root'
        assert '.htaccess' in names, 'Hosting settings are missing'
        assert not any(name.startswith('images/') for name in names), 'Retired branded screenshots leaked into ZIP'
        assert not any(name.startswith('content/') or name.endswith('.py') for name in names), 'Build sources leaked into ZIP'
    for warning in warnings:
        print('Warning:', warning)
    print(f'Validated {len(docs)} pages, {len(urls)} indexable URLs, SEO metadata, schema and {references} local references.')
    print(f'Packaged {len(files)} public files: {archive.name} ({archive.stat().st_size / 1024:.0f} KB).')


if __name__ == '__main__':
    main()
