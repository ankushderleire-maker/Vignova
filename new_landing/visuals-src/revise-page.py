from pathlib import Path
from bs4 import BeautifulSoup

root = Path(__file__).resolve().parents[1]
soup = BeautifulSoup((root / 'index.html').read_text(encoding='utf-8'), 'html.parser')
pricing = soup.select_one('#plans').extract()
faq = soup.select_one('#faq').extract()
report = soup.select_one('.real-product-screen').extract()
extension_url = 'https://chromewebstore.google.com/detail/oalpfkabaipgcjimbcapeeaoipeikkha?utm_source=vignova.io&amp;utm_medium=website'
signup = 'https://app.vignova.io/register'
logo = 'assets/vignova-purple-blue.png'
def icon(name): return f'<svg class="icon" aria-hidden="true"><use href="#i-{name}"></use></svg>'
def demo(kind, fallback, extra=''):
    aria = '' if kind == 'hero' else ' aria-hidden="true"'
    return f'<div class="story-visual visual-{kind} {extra}"><div class="scene-fallback" aria-hidden="true">{fallback}</div><div class="product-demo" data-product-demo="{kind}" hidden{aria}></div><p class="live-demo-caption">Illustrative preview</p></div>'
def row(id, kind, label, title, description, cta, reverse=False, note='', fallback=''):
    return f'''<section class="story-section story-{kind}" id="{id}" aria-labelledby="{id}-title"><div class="container story-row {'story-reverse' if reverse else ''}"><div class="story-copy"><span class="eyebrow">{label}</span><h2 id="{id}-title">{title}</h2><p>{description}</p><a class="text-link" href="{signup}">{cta} {icon('arrow')}</a>{note}</div>{demo(kind, fallback)}</div></section>'''

hero_fallback = '<div class="fallback-resume"><span>TAILORED RESUME</span><strong>Alex Carter</strong><p>Product Designer</p><hr><b>Experience</b><i></i><i></i><i></i><b>Skills</b><p>Research · Design systems · Prototyping</p></div>'
hero = f'''<section class="hero" aria-labelledby="hero-title"><div class="container hero-grid"><div class="hero-copy"><div class="eyebrow-pill"><span class="status-dot"></span> AI RESUME BUILDER &amp; JOB SEARCH TOOLS</div><h1 id="hero-title">Tailor your resume.<br><span class="accent-word">Apply with confidence.</span></h1><p>Create job-specific resumes, check your ATS match, and manage applications—all from one profile.</p><div class="hero-actions"><a class="button" href="{signup}">Build my resume {icon('arrow')}</a><a class="text-link hero-extension-link" href="#extension">Explore the Chrome extension {icon('arrow')}</a></div><div class="hero-assurances"><span>{icon('check')} 3 free credits</span><span>{icon('check')} No credit card needed</span></div></div>{demo('hero',hero_fallback,'hero-visual')}</div></section>'''
extension_fallback = f'<div class="extension-static"><div><img src="{logo}" alt="" width="42" height="42"><b>Vignova for Chrome</b></div><span>LinkedIn · Example job</span><h3>Product Designer</h3><p>Remote · Full time</p><strong>Save job &nbsp; · &nbsp; Tailor resume</strong><div class="extension-static-fields"><span>Full name <b>Alex Carter</b></span><span>Email <b>alex@example.com</b></span></div></div>'
extension = f'''<section class="story-section story-extension" id="extension" aria-labelledby="extension-title"><div class="container story-row story-reverse"><div class="story-copy"><div class="extension-brand"><span class="extension-logo"><img src="{logo}" alt="Vignova extension logo" width="88" height="88"><span class="extension-logo-badge">{icon('puzzle')}</span></span><div><span class="eyebrow">VIGNOVA FOR CHROME</span><span class="extension-tag">Your browser. Your career assistant.</span></div></div><h2 id="extension-title">Save jobs and tailor resumes <span>as you browse.</span></h2><p>Bring Vignova to LinkedIn, Indeed, and supported application pages. Save a job, attach your resume, and fill repeated details from your profile.</p><a class="button" href="{extension_url}" target="_blank" rel="noopener noreferrer">{icon('puzzle')} Get the Chrome extension {icon('arrow')}</a><span class="story-note">Included with Pro and Premium.</span></div>{demo('extension',extension_fallback)}</div></section>'''
profile_fallback = '<div class="profile-static"><strong>YOUR MASTER PROFILE</strong><div><span>Experience</span><span>Skills</span><span>Education</span><span>Projects</span><span>Achievements</span><span>Certifications</span></div></div>'
profile = row('features','orbit','MASTER PROFILE','Your experience,<br><span>saved in one profile.</span>','Import your resume once. Keep your roles, skills and achievements ready for your next application.','Create my profile',fallback=profile_fallback)
ats = row('ats-check','radar','ATS RESUME CHECK','See what your resume<br><span>needs to improve.</span>','Check your resume against a job description. Review missing keywords, content and formatting before you apply.','Check my resume',True,f'<details class="story-report"><summary>See an actual ATS report {icon("plus")}</summary>{report}</details>','<div class="radar-static"><strong>42<span>/ 100</span></strong><p>Example resume match</p><span>Keywords · Content · Structure</span></div>')
linkedin = row('linkedin','linkedin','LINKEDIN PROFILE OPTIMIZER','Make your LinkedIn profile<br><span>show what you can do.</span>','Get headline, summary and skills suggestions based on your background. Review the changes before adding them to LinkedIn.','Improve my LinkedIn profile',fallback='<div class="linkedin-static"><span>AC</span><h3>Alex Carter</h3><p>Product Designer</p><strong>A clearer headline. More relevant skills.</strong></div>')
tracker = row('job-tracker','tracker','JOB APPLICATION TRACKER','Know where every<br><span>application stands.</span>','Keep saved jobs, applications and interviews on one board. Track your next step without another spreadsheet.','Start tracking jobs',True,fallback='<div class="tracker-static"><div><b>Saved</b><span>Product Designer</span></div><div><b>Applied</b><span>UX Designer</span></div><div><b>Interview</b><span>Design Lead</span></div></div>')
extras = f'''<section class="career-extras section" aria-labelledby="extras-title"><div class="container"><div class="extras-heading"><span class="eyebrow">ALSO IN YOUR WORKSPACE</span><h2 id="extras-title">Support for the rest of your application.</h2></div><div class="extras-grid"><article>{icon('file')}<h3>Write a cover letter</h3><p>Create a letter and application email that fit the role.</p></article><article>{icon('search')}<h3>Find relevant jobs</h3><p>Explore opportunities that match your profile.</p></article><article>{icon('chat')}<h3>Practice interview questions</h3><p>Prepare examples for questions specific to your target role.</p></article></div></div></section>'''
closing = f'''<section class="closing-section" aria-labelledby="closing-title"><div class="container"><div class="closing-card"><div class="closing-content"><h2 id="closing-title">Create your first<br>tailored resume.</h2><a class="button button-white" href="{signup}">Get started free {icon('arrow')}</a></div></div></div></section>'''

pricing.select_one('#plans-title').clear()
pricing.select_one('#plans-title').append(BeautifulSoup('Choose a plan for<br><span>your job search.</span>', 'html.parser'))
pricing.select_one('.section-heading > .eyebrow').decompose()
pricing.select_one('.section-heading > p').string = 'Start free. Upgrade when you need more credits and tools.'
for card,name,label in zip(pricing.select('.pricing-card'), ['Free','Pro','Premium'], ['TRY VIGNOVA','FOR REGULAR APPLICATIONS','FOR MORE APPLICATIONS']):
    card.select_one('h3').string = name
    card.select_one('.price-plan-label').clear()
    card.select_one('.price-plan-label').append(label)
pricing.select_one('caption').string = 'Compare monthly plan features'
faq.select_one('#faq-title').string = 'Questions about Vignova'
eyebrow = faq.select_one('.eyebrow')
if eyebrow: eyebrow.decompose()
for details in faq.select('details'):
    if 'free' in details.select_one('summary').get_text().lower(): details.decompose()
main = soup.select_one('main')
main.clear()
for markup in [hero,extension,profile,ats,linkedin,tracker,extras,str(pricing),str(faq),closing]:
    main.append(BeautifulSoup(markup,'html.parser'))
nav = '<a href="#extension">Chrome extension</a><a href="#features">Features</a><a href="#plans">Pricing</a><a href="#faq">FAQs</a>'
soup.select_one('.desktop-nav').clear()
soup.select_one('.desktop-nav').append(BeautifulSoup(nav,'html.parser'))
soup.select_one('.mobile-nav').clear()
soup.select_one('.mobile-nav').append(BeautifulSoup(nav+f'<a href="https://app.vignova.io/login">Log in</a><a class="button" href="{signup}">Get started free</a>','html.parser'))
for a in soup.select('.site-footer a'):
    url = a.get('href','')
    a.attrs.pop('data-open-tab', None)
    if url == '#features': a['href'] = '#ats-check' if 'ATS' in a.get_text() else '#main'
    elif url == '#templates': a['href'] = signup
    elif url == '#how-it-works': a['href'] = '#features'; a.string = 'Master Profile'
soup.select_one('.footer-brand > p').string = 'AI tools for your next application.'
soup.select_one('.footer-bottom > p').string = 'Vignova · AI resume and job search tools'
defs = soup.select_one('.icon-definitions defs')
for name, paths in [('puzzle','<path d="M20 13v6a1 1 0 0 1-1 1h-6v-2a2 2 0 0 0-4 0v2H3a1 1 0 0 1-1-1v-6h2a2 2 0 0 0 0-4H2V3a1 1 0 0 1 1-1h6v2a2 2 0 0 0 4 0V2h6a1 1 0 0 1 1 1v6h-2a2 2 0 0 0 0 4Z"/>'),('search','<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'),('chat','<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-10A8.5 8.5 0 1 1 21 11.5Z"/><path d="M7 9h9M7 13h6"/>')]:
    if not soup.select_one('#i-'+name): defs.append(BeautifulSoup(f'<symbol id="i-{name}" viewBox="0 0 24 24">{paths}</symbol>','html.parser'))
text = str(soup).replace('?v=5','?v=6')
(root / 'index.html').write_text(text, encoding='utf-8')
print('Created split hero, extension-first zigzag layout, and six unique animation placements.')
