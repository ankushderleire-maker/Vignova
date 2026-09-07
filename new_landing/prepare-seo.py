"""Apply shared metadata and current branding after page migrations.

Run after migrate-blog.py and migrate-pages.py. Uses BeautifulSoup already
available in this workspace; the deployable website has no Python dependency.
"""
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET
import json
import shutil
import subprocess
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / 'LandingCode'
DOMAIN = 'https://vignova.io'
LOGO = DOMAIN + '/assets/vignova-purple-blue.png'
BRAND_VERSION = 'purple-blue-20260907'
SOCIAL_IMAGE = DOMAIN + '/og-image.png?v=' + BRAND_VERSION
INDEXABLE = ['', 'how-it-works', 'blog', 'about', 'contact', 'privacy', 'terms', 'refund', 'shipping']
INDEXABLE += ['blog/' + p.stem for p in sorted((SOURCE / 'content/blog').glob('*.mdx'))]


def meta(soup, key, value, attr='name'):
    nodes = soup.head.find_all('meta', attrs={attr: key})
    element = nodes.pop(0) if nodes else soup.new_tag('meta', attrs={attr: key})
    for duplicate in nodes:
        duplicate.decompose()
    element['content'] = value
    if not element.parent:
        soup.head.append(element)


def link(soup, rel, href, **attrs):
    nodes = soup.head.find_all('link', rel=rel)
    element = nodes.pop(0) if nodes else soup.new_tag('link', rel=rel)
    for duplicate in nodes:
        duplicate.decompose()
    element.attrs.update(href=href, **attrs)
    if not element.parent:
        soup.head.append(element)


def stylesheet(soup, path):
    if not soup.head.find('link', href=path):
        soup.head.append(soup.new_tag('link', rel='stylesheet', href=path))


def main():
    # Rebuild branded files from the supplied logo; never restore the old icons.
    subprocess.run(['node', str(ROOT / 'build-branding.cjs')], check=True)
    # These resume previews contain no old branding. Unused legacy product
    # screenshots contain the retired logo and are no longer copied or packaged.
    shutil.copytree(SOURCE / 'public/templates', ROOT / 'templates', dirs_exist_ok=True)
    (ROOT / 'site.webmanifest').write_text(json.dumps({
        'name': 'Vignova — AI Resume & Job Search Tools', 'short_name': 'Vignova',
        'start_url': '/', 'scope': '/', 'display': 'browser',
        'theme_color': '#7155ed', 'background_color': '#ffffff',
        'icons': [{'src': f'/android-chrome-{size}x{size}.png?v={BRAND_VERSION}',
                   'sizes': f'{size}x{size}', 'type': 'image/png', 'purpose': 'any'} for size in [192, 512]],
    }, indent=2) + '\n', encoding='utf-8')

    for route in INDEXABLE + ['start', '404.html']:
        file = ROOT / route if route.endswith('.html') else ROOT / route / 'index.html'
        soup = BeautifulSoup(file.read_text(encoding='utf-8'), 'html.parser')
        canonical = DOMAIN + ('/' + route + '/' if route else '/')
        is_indexable = route in INDEXABLE
        if route == '':
            soup.title.string = 'AI Resume Builder, ATS Checker & Chrome Extension | Vignova'
            meta(soup, 'description', 'Tailor your resume to any job description with AI. Check your ATS match, save jobs with the Vignova Chrome extension, and track applications in one workspace.')
        if is_indexable:
            link(soup, 'canonical', canonical)
        meta(soup, 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' if is_indexable else 'noindex, follow')
        title = soup.title.get_text()
        description = soup.head.find('meta', attrs={'name': 'description'})['content']
        meta(soup, 'theme-color', '#7155ed')
        meta(soup, 'application-name', 'Vignova')
        meta(soup, 'og:title', title, 'property')
        meta(soup, 'og:description', description, 'property')
        meta(soup, 'og:site_name', 'Vignova', 'property')
        meta(soup, 'og:locale', 'en_US', 'property')
        meta(soup, 'og:type', 'article' if route.startswith('blog/') else 'website', 'property')
        if is_indexable:
            meta(soup, 'og:url', canonical, 'property')
        meta(soup, 'og:image', SOCIAL_IMAGE, 'property')
        meta(soup, 'og:image:width', '1200', 'property')
        meta(soup, 'og:image:height', '630', 'property')
        meta(soup, 'og:image:alt', 'Vignova — AI resume and job search tools', 'property')
        meta(soup, 'twitter:card', 'summary_large_image')
        meta(soup, 'twitter:title', title)
        meta(soup, 'twitter:description', description)
        meta(soup, 'twitter:image', SOCIAL_IMAGE)
        meta(soup, 'twitter:image:alt', 'Vignova — Tailor your resume. Apply with confidence.')
        link(soup, 'icon', f'/favicon-48x48.png?v={BRAND_VERSION}', type='image/png', sizes='48x48')
        link(soup, 'apple-touch-icon', f'/apple-touch-icon.png?v={BRAND_VERSION}', sizes='180x180')
        link(soup, 'manifest', f'/site.webmanifest?v={BRAND_VERSION}')
        stylesheet(soup, '/analytics.css')
        for old in soup.find_all('script', src=lambda value: value and urlsplit(value).path.endswith('/analytics.js')):
            old.decompose()
        soup.head.append(soup.new_tag('script', src='/analytics.js', defer=''))
        organization = {
            '@type': 'Organization', '@id': DOMAIN + '/#organization',
            'name': 'Vignova', 'url': DOMAIN + '/', 'logo': LOGO,
            'founder': {'@type': 'Person', 'name': 'Ankush Derle'},
            'description': 'AI resume tailoring, ATS match analysis and job application tracking.',
            'contactPoint': {'@type': 'ContactPoint', 'contactType': 'customer support',
                             'email': 'contact@vignova.io', 'url': DOMAIN + '/contact/'},
        }
        graph = [organization, {
            '@type': 'WebSite', '@id': DOMAIN + '/#website', 'name': 'Vignova',
            'url': DOMAIN + '/', 'inLanguage': 'en-US', 'publisher': {'@id': DOMAIN + '/#organization'},
        }]
        if is_indexable:
            graph.append({'@type': 'WebPage', '@id': canonical + '#webpage', 'url': canonical,
                          'name': title, 'description': description, 'inLanguage': 'en-US',
                          'isPartOf': {'@id': DOMAIN + '/#website'}})
        for old in soup.select('#site-identity-schema'):
            old.decompose()
        schema = soup.new_tag('script', type='application/ld+json', id='site-identity-schema')
        schema.string = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False).replace('<', '\\u003c')
        soup.head.append(schema)
        # Add consistent discoverable links on older standalone legal/start pages.
        if route in ['privacy', 'terms', 'refund', 'shipping', 'start']:
            footer = soup.find('footer')
            if footer and not footer.select_one('.seo-resource-links'):
                footer.append(BeautifulSoup('<nav class="seo-resource-links" aria-label="More from Vignova"><a href="/blog/">Blog</a> · <a href="/about/">About Vignova</a> · <a href="/contact/">Contact &amp; support</a></nav>', 'html.parser'))
        file.write_text(str(soup) + '\n', encoding='utf-8')

    # Preserve original article dates. Omit unknown static lastmod instead of
    # pretending every build is a substantive content update.
    old = ET.parse(SOURCE / 'out/sitemap.xml')
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    dates = {entry.findtext('s:loc', namespaces=ns): entry.findtext('s:lastmod', namespaces=ns)
             for entry in old.getroot()}
    ET.register_namespace('', ns['s'])
    sitemap = ET.Element('{' + ns['s'] + '}urlset')
    for route in INDEXABLE:
        url = DOMAIN + ('/' + route + '/' if route else '/')
        entry = ET.SubElement(sitemap, 'url')
        ET.SubElement(entry, 'loc').text = url
        if route.startswith('blog/') and dates.get(url):
            ET.SubElement(entry, 'lastmod').text = dates[url]
    ET.indent(sitemap, space='  ')
    ET.ElementTree(sitemap).write(ROOT / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
    print(f'Prepared shared SEO, analytics inclusion, branding and sitemap for {len(INDEXABLE)} indexable URLs.')


if __name__ == '__main__':
    main()
