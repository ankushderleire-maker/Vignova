"""Build static supporting pages for the Hostinger site.

Content provenance: LandingCode/src/app/{about,contact,how-it-works} and
LandingCode/src/components/UseCases.tsx. The existing canonical routes and
page titles are retained. Contact metadata is aligned with the original
visible 24-48 hour response policy. Workflow claims about guaranteed outcomes,
live job counts, unlimited plan allowances, and competitor timings are omitted.
No screenshot assets or Next.js runtime are required.
"""
from html import escape
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = 'https://vignova.io'
EXTENSION = 'https://chromewebstore.google.com/detail/oalpfkabaipgcjimbcapeeaoipeikkha?utm_source=vignova.io&utm_medium=website'


def render(slug, title, description, label, body):
    canonical = f'{SITE}/{slug}/'
    schemas = [{
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': label, 'item': canonical},
        ],
    }]
    if slug == 'about':
        schemas.append({
            '@context': 'https://schema.org', '@type': 'AboutPage',
            'name': title, 'url': canonical, 'description': description,
            'about': {'@type': 'Organization', 'name': 'Vignova', 'url': SITE + '/',
                      'founder': {'@type': 'Person', 'name': 'Ankush Derle'}},
        })
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description, quote=True)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="theme-color" content="#6c4bea">
  <link rel="canonical" href="{canonical}">
  <link rel="icon" href="/assets/vignova-purple-blue.png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Vignova">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="{escape(title, quote=True)}">
  <meta property="og:description" content="{escape(description, quote=True)}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{SITE}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Vignova — AI resume tailoring and job search tools">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escape(title, quote=True)}">
  <meta name="twitter:description" content="{escape(description, quote=True)}">
  <meta name="twitter:image" content="{SITE}/og-image.png">
  <meta name="twitter:image:alt" content="Vignova — AI resume tailoring and job search tools">
  <link rel="stylesheet" href="/pages.css">
  <link rel="stylesheet" href="/analytics.css">
  <script defer src="/analytics.js"></script>
  <script type="application/ld+json">{json.dumps(schemas, ensure_ascii=False)}</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="page-header">
    <div class="page-container page-nav">
      <a class="page-brand" href="/" aria-label="Vignova home"><span class="page-logo"><img src="/assets/vignova-purple-blue.png" width="52" height="52" alt=""></span><span>VIGNOVA</span></a>
      <nav aria-label="Main navigation"><a href="/#extension">Chrome extension</a><a href="/how-it-works/">How it works</a><a href="/blog/">Blog</a><a href="/#plans">Pricing</a></nav>
      <a class="page-button page-button-small" href="https://app.vignova.io/register" data-event="sign_up_click" data-location="{slug}_header">Get started free <span aria-hidden="true">↗</span></a>
    </div>
  </header>
  <main id="main" class="page-container page-main">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">{escape(label)}</li></ol></nav>
    {body}
  </main>
  <footer class="page-footer">
    <div class="page-container footer-top"><div><a class="page-brand" href="/" aria-label="Vignova home"><span class="page-logo"><img src="/assets/vignova-purple-blue.png" width="52" height="52" alt="" loading="lazy"></span><span>VIGNOVA</span></a><p>AI tools for your next application.</p><a href="mailto:contact@vignova.io">contact@vignova.io</a></div>
      <nav aria-label="Explore Vignova"><strong>Explore</strong><a href="/how-it-works/">How it works</a><a href="/blog/">Career guides</a><a href="/#plans">Plans</a><a href="/about/">About us</a><a href="/contact/">Contact &amp; support</a></nav>
      <nav aria-label="Policies"><strong>The details</strong><a href="/privacy/">Privacy policy</a><a href="/terms/">Terms of service</a><a href="/refund/">Refund policy</a><a href="/shipping/">Digital delivery</a><a href="https://app.vignova.io/login">Log in</a></nav>
    </div>
    <div class="page-container footer-end"><span>© 2026 Vignova. All rights reserved.</span><a href="#main">Back to top ↑</a></div>
  </footer>
</body>
</html>
'''
    destination = ROOT / slug / 'index.html'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html, encoding='utf-8')
    return destination


ABOUT = '''<section class="page-intro"><span class="page-eyebrow">OUR STORY</span>
  <h1>Built for job seekers,<br><span>by a job seeker.</span></h1>
</section>
<article class="founder-story page-panel">
  <div class="founder-heading"><span class="founder-avatar" aria-hidden="true">AD</span><div><h2>Ankush Derle</h2><p>Founder &amp; Developer of Vignova</p></div></div>
  <div class="page-prose">
    <p><strong>Hi, I'm Ankush.</strong><br>I've always loved building projects, but Vignova is incredibly close to my heart because it solves a very real, very frustrating problem that I experienced firsthand.</p>
    <p>When I was applying for jobs, I constantly ran into the same roadblocks: struggling to format my resume properly, wondering if it was actually ATS-friendly, and never knowing if my keywords actually matched what recruiters were looking for. I couldn't figure out which roles I actually had a high chance of landing.</p>
    <p>And then there were the application forms—the ones so painfully long that I'd just quit halfway through. On top of that, keeping track of all the relevant jobs for my skill set was a nightmare.</p>
    <p>I realized job hunting shouldn't be this broken. So, I built Vignova to fix it.</p>
    <blockquote><p>“I wanted to create a single platform that strips away the tedious work, automates the formatting and keyword matching, and gives job seekers their time back so they can focus on what actually matters—preparing for interviews and landing the job.”</p></blockquote>
    <p class="story-signoff">Welcome to Vignova. Let's get you hired.</p>
  </div>
  <div class="page-actions"><a class="page-button" href="/how-it-works/">See how Vignova works <span aria-hidden="true">↗</span></a><a class="page-text-link" href="/contact/">Get in touch</a></div>
</article>'''

CONTACT = '''<section class="page-intro"><span class="page-eyebrow">CONTACT &amp; SUPPORT</span>
  <h1>Contact <span>us.</span></h1><p>We'd love to hear from you. Here's how you can reach us.</p>
</section>
<section class="page-panel contact-grid" aria-labelledby="contact-title">
  <div><h2 id="contact-title">Get in touch</h2><p>Whether you have a question about features, pricing, need a demo, or anything else, our team is ready to answer all your questions.</p>
    <dl class="contact-details"><div><dt>Email support</dt><dd><a href="mailto:contact@vignova.io">contact@vignova.io</a></dd></div><div><dt>Location</dt><dd>Dublin, Ireland</dd></div></dl>
  </div>
  <aside class="contact-hours" aria-labelledby="response-title"><span class="page-eyebrow">SUPPORT HOURS</span><h2 id="response-title">Response time</h2>
    <p>Our standard support hours are Monday through Friday, 9am to 5pm EST.</p><p>We aim to respond to all inquiries within 24–48 hours. For urgent billing issues, please include “URGENT” in your email subject line.</p>
  </aside>
</section>
<section class="contact-help" aria-labelledby="help-title"><h2 id="help-title">Find an answer while you wait.</h2><div class="help-links"><a href="/how-it-works/"><strong>Using Vignova</strong><span>Learn the resume and application workflow ↗</span></a><a href="/#plans"><strong>Plans and credits</strong><span>Compare the available plans ↗</span></a><a href="/refund/"><strong>Billing and refunds</strong><span>Read the refund policy ↗</span></a></div></section>'''

# Preserve the eight existing feature topics and the useful step links already
# published in LandingCode's structured data. Examples use no invented results.
FEATURES = [
    ('Foundation', 'Create your Master Profile',
     "Build your comprehensive career database—every skill, project, certification, and metric in one place. Import from LinkedIn or an existing PDF, or start from scratch. This becomes the context for every tailored resume Vignova generates.",
     ['Keep your full career history in one place', 'Import from LinkedIn or a PDF resume', 'Review the information used to tailor your resume'],
     '/#features', 'See the Master Profile', ['Experience', 'Skills', 'Education', 'Projects', 'Certifications']),
    ('Discovery', 'Save the jobs you want',
     "Browse jobs from the built-in job board or save them directly from LinkedIn using the Vignova extension. Every saved job lands in your personal pipeline, ready for tailoring.",
     ['Save jobs while you browse', 'Keep the job description with the application', 'Track status, dates, and notes'],
     '/#extension', 'Explore the Chrome extension', ['Job description', 'Company', 'Location', 'Application notes']),
    ('AI tailoring', 'Tailor your resume to the job',
     "Select a saved job and open AI Studio. Vignova cross-references the job description against your Master Profile, rewrites bullet points, and highlights relevant keywords and experience. Review the draft to make sure every statement accurately reflects your background.",
     ['Match job requirements to your experience', 'Tailor your summary, skills, and bullet points', 'Choose a professional resume template'],
     '/#main', 'See the resume builder', ['Your profile', '+', 'Job description', '→', 'Tailored draft']),
    ('Full control', 'Edit and perfect your resume',
     "You're always in control. AI Studio gives you a side-by-side editor: AI-generated content on the left, a live resume preview on the right. Click a section to edit, reorder, or regenerate it.",
     ['See a live preview as you edit', 'Customize each section', 'Format text and regenerate individual passages'],
     '/#main', 'Explore the resume editor', ['Review', 'Edit', 'Preview', 'Save']),
    ('ATS analysis', 'Check your ATS score',
     "Before you apply, run an ATS analysis. Vignova scores your resume across six dimensions—Keywords, Semantics, Sections, Impact, Format, and Readability—and gives you suggestions for improvement. The score is a tool for reviewing your resume, not a prediction of a hiring decision.",
     ['Review the six-dimension scoring breakdown', 'Check word count, action verbs, and metrics', 'Use the insights to refine your draft'],
     '/#ats-check', 'See an ATS analysis', ['Keywords', 'Semantics', 'Sections', 'Impact', 'Format', 'Readability']),
    ('Organization', 'Track every application',
     "Use the job tracker with a Kanban board and list view to see every application at a glance. Follow your progress through Saved, Tailoring, Applied, Interviewing, and Offer without losing your notes or the associated resume.",
     ['Switch between a board and list view', 'Filter by status, company, or date', 'Open AI Studio from a saved job'],
     '/#job-tracker', 'See the application tracker', ['Saved', 'Tailoring', 'Applied', 'Interviewing', 'Offer']),
    ('Job discovery', 'Find relevant jobs',
     "Explore live job postings in Vignova's job finder. Search by title, company, or location, save a role that interests you, and tailor your CV before opening the application.",
     ['Search by role, company, and location', 'Save a job to your tracker', 'Keep discovery and preparation in one workspace'],
     'https://app.vignova.io/register', 'Start finding jobs', ['Search', 'Compare roles', 'Save a job', 'Prepare to apply']),
    ('Browser extension', 'Bring Vignova to your browser',
     "Install the Vignova Chrome extension to work from supported job pages. Its LinkedIn panel lets you review a job match, save a role to your dashboard, and tailor your resume. Autofill helps with repeated details on supported application forms.",
     ['Use the panel on LinkedIn job postings', 'Save jobs and tailor resumes while browsing', 'Review details before submitting an application'],
     '/#extension', 'See Vignova for Chrome', ['LinkedIn', 'Job match', 'Save job', 'Tailor resume', 'Autofill']),
]


def workflow():
    steps = []
    for n, (tag, heading, description, bullets, href, link, tokens) in enumerate(FEATURES, 1):
        steps.append(f'''<section class="workflow-step" id="step-{n}" aria-labelledby="step-{n}-title">
          <div class="workflow-copy"><span class="page-eyebrow">STEP {n:02} · {escape(tag)}</span><h2 id="step-{n}-title">{escape(heading)}</h2><p>{escape(description)}</p><ul>{''.join('<li>' + escape(bullet) + '</li>' for bullet in bullets)}</ul><a class="page-text-link" href="{escape(href, quote=True)}">{escape(link)} <span aria-hidden="true">↗</span></a></div>
          <div class="workflow-visual"><span class="workflow-number" aria-hidden="true">{n:02}</span><div class="workflow-tokens">{''.join('<span>' + escape(token) + '</span>' for token in tokens)}</div><span class="workflow-caption">{escape(tag)} in your Vignova workspace</span></div>
        </section>''')
    return '''<section class="page-intro workflow-intro"><span class="page-eyebrow">HOW VIGNOVA WORKS</span><h1>Your entire job search,<br><span>one AI-powered platform.</span></h1><p>Build your Master Profile, tailor a resume to each job description, check its ATS match, and track every application.</p><div class="page-actions"><a class="page-button" href="https://app.vignova.io/register" data-event="sign_up_click" data-location="how_it_works">Start building free <span aria-hidden="true">↗</span></a><a class="page-text-link" href="/#extension">Explore the Chrome extension</a></div><span class="intro-note">3 free credits · No credit card required</span></section>
      <nav class="workflow-jump" aria-label="Workflow steps">''' + ''.join(f'<a href="#step-{n}"><b>{n:02}</b> {escape(row[1])}</a>' for n, row in enumerate(FEATURES, 1)) + '''</nav>
      <div class="workflow">''' + ''.join(steps) + '''</div>
      <section class="page-panel audience-section" aria-labelledby="audience-title"><span class="page-eyebrow">BUILT FOR YOUR NEXT STEP</span><h2 id="audience-title">Use the experience you already have.</h2><div class="audience-grid">
        <article><h3>Career changers</h3><p>Find transferable skills in your Master Profile and frame your achievements for the field you want to enter.</p></article>
        <article><h3>Students and new graduates</h3><p>Highlight the coursework, projects, internships, and certifications relevant to the posting.</p></article>
        <article><h3>Experienced professionals</h3><p>Keep your full career history in one place and select the experience that matters for each role.</p></article>
        <article><h3>International applicants</h3><p>Use a clear, machine-readable resume layout and review it for the conventions of your target market.</p></article>
        <article><h3>Applicants reviewing ATS fit</h3><p>Check keywords, semantics, sections, impact, format, and readability before submitting a resume.</p></article>
        <article><h3>People applying to several roles</h3><p>Keep each tailored resume with its saved job and track the next action on your board.</p></article>
      </div></section>
      <section class="workflow-next" aria-labelledby="next-title"><h2 id="next-title">Start with one profile.<br><span>Prepare for your next application.</span></h2><p>Read our <a href="/blog/">career guides</a> for practical resume advice, or check <a href="/#plans">plans and credits</a> to choose your workspace.</p><div class="page-actions"><a class="page-button" href="https://app.vignova.io/register" data-event="sign_up_click" data-location="how_it_works_bottom">Build my resume <span aria-hidden="true">↗</span></a><a class="page-text-link" href="/contact/">Talk to the Vignova team</a></div></section>'''


if __name__ == '__main__':
    pages = [
        ('about', 'About Us | Vignova',
         'Vignova was built by a job seeker who got tired of rewriting the same resume fifty times. Meet the founder and the story behind the AI career platform.',
         'About us', ABOUT),
        ('contact', 'Contact & Support | Vignova',
         'Contact the Vignova team about resume tailoring, billing, the Chrome extension or partnerships. We aim to reply within 24–48 hours.',
         'Contact & support', CONTACT),
        ('how-it-works', 'How Vignova Tailors Your Resume With AI | Vignova',
         'A step-by-step walkthrough: build your Master Profile, save a job, let AI tailor your resume to the job description, check the ATS score, and track the application.',
         'How it works', workflow()),
    ]
    for page in pages:
        print(render(*page).relative_to(ROOT))
