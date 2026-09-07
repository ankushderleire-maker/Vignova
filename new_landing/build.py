"""Export branding with Node/Sharp, then validate and package the static website."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import json
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent
PUBLIC_FILES = [
    'index.html', 'styles.css', 'sections.css', 'responsive.css', 'script.js',
    'legal.css', 'conversion.css', 'cards.css', 'start.css', 'start.js', 'start/index.html',
    'live-demos.css', 'visuals/demo.js', 'visuals/demo.css', 'visuals/LICENSES.txt',
    '.htaccess', 'robots.txt', 'sitemap.xml',
    'privacy/index.html', 'terms/index.html', 'refund/index.html', 'shipping/index.html',
    '404.html', 'blog.css', 'pages.css', 'seo.css', 'analytics.js', 'analytics.css',
    'about/index.html', 'contact/index.html', 'how-it-works/index.html',
    'og-image.png', 'logo.png', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'favicon-48x48.png',
    'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png',
    'site.webmanifest',
]


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.ids, self.references, self.controls = [], [], []
        self.h1_count = 0
        self.titles, self.canonicals, self.meta = [], [], []
        self.scripts, self.schemas = [], []
        self.capture_title, self.capture_schema = False, False
        self.buffer = ''
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
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
        if tag == 'img' and 'alt' not in attrs:
            raise ValueError('Image is missing alt text')

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


def main():
    # Every release exports current branding, even after a content re-import.
    subprocess.run(['node', str(ROOT / 'build-branding.cjs')], check=True)
    files = [ROOT / name for name in PUBLIC_FILES]
    files.extend(ROOT / 'assets' / name for name in [
        'vignova-purple-blue.png', 'geist-latin.woff2', 'FONT-LICENSE.txt', 'ats-analysis.png',
    ])
    files.extend(sorted((ROOT / 'blog').rglob('*.html')))
    for directory in ['templates']:
        files.extend(sorted(file for file in (ROOT / directory).rglob('*') if file.is_file()))
    assert all(file.is_file() for file in files), 'A required public file is missing'
    manifest = json.loads((ROOT / 'site.webmanifest').read_text(encoding='utf-8'))
    for icon in manifest['icons']:
        assert local_target(ROOT / 'index.html', urlsplit(icon['src']).path) in files, 'Manifest icon missing from ZIP'
    docs = {file: Document(file.read_text(encoding='utf-8')) for file in files if file.suffix == '.html'}
    references = 0
    for file, doc in docs.items():
        assert doc.h1_count == 1, f'{file.name}: expected exactly one main heading'
        duplicates = [key for key, count in Counter(doc.ids).items() if count > 1]
        assert not duplicates, f'{file.name}: duplicate IDs {duplicates}'
        for control in doc.controls:
            assert control in doc.ids, f'{file.name}: missing ARIA target {control}'
        for reference in doc.references:
            parsed = urlsplit(reference)
            if (parsed.scheme or parsed.netloc) and parsed.hostname != 'vignova.io':
                continue
            target = local_target(file, parsed.path) if parsed.path else file
            assert target.is_relative_to(ROOT), f'{file.name}: local link leaves the public folder: {reference}'
            assert target.is_file(), f'{file.name}: missing local target {reference}'
            assert target in files, f'{file.name}: linked file is absent from upload package: {reference}'
            if parsed.fragment:
                target_doc = docs.get(target)
                assert target_doc and unquote(parsed.fragment) in target_doc.ids, f'{file.name}: broken anchor {reference}'
            references += 1
    for file in files:
        if file.suffix == '.css':
            for reference in re.findall(r'url\([\"\']?([^\)\"\']+)', file.read_text(encoding='utf-8')):
                if not urlsplit(reference).scheme:
                    target = local_target(file, urlsplit(reference).path)
                    assert target.is_file() and target in files, f'{file.name}: missing packaged CSS asset {reference}'
    # SEO release gate: a new build must retain the complete existing URL set.
    urls = [entry.text for entry in ET.parse(ROOT / 'sitemap.xml').getroot().iter() if entry.tag.endswith('}loc')]
    assert len(urls) == len(set(urls)), 'Duplicate sitemap URLs'
    old_sitemap = ROOT.parent / 'LandingCode/out/sitemap.xml'
    if old_sitemap.is_file():
        old_urls = {entry.text for entry in ET.parse(old_sitemap).getroot().iter() if entry.tag.endswith('}loc')}
        assert old_urls <= set(urls), f'Existing pages lost from sitemap: {old_urls - set(urls)}'
    seen_titles = set()
    for file, doc in docs.items():
        label = file.relative_to(ROOT).as_posix()
        assert len(doc.titles) == 1 and doc.titles[0], f'{label}: missing or duplicate title'
        assert doc.titles[0] not in seen_titles, f'{label}: duplicated page title'
        seen_titles.add(doc.titles[0])
        metas = {(m.get('name') or m.get('property')): m.get('content', '') for m in doc.meta}
        for key in ['description', 'robots', 'og:title', 'og:description', 'og:image', 'twitter:title', 'twitter:description']:
            assert metas.get(key), f'{label}: missing {key}'
            assert sum(1 for m in doc.meta if key in [m.get('name'), m.get('property')]) == 1, f'{label}: duplicate {key}'
        assert metas['og:title'] == doc.titles[0] == metas['twitter:title'], f'{label}: inherited social title'
        assert len([src for src in doc.scripts if urlsplit(src).path == '/analytics.js']) == 1, f'{label}: analytics missing/duplicated'
        assert not any('googletagmanager.com' in src for src in doc.scripts), f'{label}: Google library bypasses consent'
        nodes = list(schema_nodes(doc.schemas))
        assert nodes, f'{label}: structured data missing'
        assert not any(node.get('@type') in ['HowTo', 'AggregateRating', 'Review'] for node in nodes), f'{label}: obsolete or unverified schema'
        if label in ['start/index.html', '404.html']:
            assert 'noindex' in metas['robots'], f'{label}: utility page is indexable'
            continue
        canonical = 'https://vignova.io/' + label.removesuffix('index.html')
        assert doc.canonicals == [canonical], f'{label}: canonical must match its public URL'
        assert canonical in urls and 'noindex' not in metas['robots'], f'{label}: excluded from search'
        if label.startswith('blog/') and label != 'blog/index.html':
            assert any(n.get('@type') == 'BlogPosting' and n.get('datePublished') and n.get('author') for n in nodes), f'{label}: incomplete article schema'
            assert any(n.get('@type') == 'BreadcrumbList' for n in nodes), f'{label}: missing breadcrumb schema'
    for url in urls:
        assert url.startswith('https://vignova.io/') and url.endswith('/'), f'Unexpected sitemap URL: {url}'
        target = local_target(ROOT / 'index.html', urlsplit(url).path)
        assert target in docs, f'Sitemap route is missing: {url}'
    archive = ROOT / 'hostinger-upload.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for file in files:
            bundle.write(file, file.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None, 'ZIP integrity check failed'
        assert 'index.html' in bundle.namelist(), 'Homepage is not at archive root'
        assert '.htaccess' in bundle.namelist(), 'Hosting settings are missing'
        assert not any(name.startswith('images/') for name in bundle.namelist()), 'Retired branded screenshots leaked into ZIP'
    print(f'Validated {len(docs)} pages, {len(urls)} indexable URLs, SEO metadata, schema and {references} local references.')
    print(f'Packaged {len(files)} public files: {archive.name} ({archive.stat().st_size / 1024:.0f} KB).')


if __name__ == '__main__':
    main()
