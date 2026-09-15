// 1200x630 social cards for the rendered pages and articles, in the style of og-image.png.
// A page's card is written to the path named by "ogImage" in its front matter;
// an article's card goes to assets/og/blog-<slug>.png, which build-pages.py picks up.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const appRequire = createRequire(path.resolve(__dirname, '../LandingCode/package.json'));
const sharp = appRequire('sharp');
const root = __dirname;

const FRONT = /^\s*<!--\s*(\{[\s\S]*?\})\s*-->/;
const TITLE_WIDTH = 940;

function sources(folder) {
  const dir = path.join(root, 'content', folder);
  return fs.readdirSync(dir).filter(name => name.endsWith('.html')).sort().map(name => {
    const match = fs.readFileSync(path.join(dir, name), 'utf8').match(FRONT);
    if (!match) throw new Error(`content/${folder}/${name}: missing front matter`);
    return JSON.parse(match[1]);
  });
}

const escapeXml = text => text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]);

// SVG text does not wrap, so lines are broken by an estimate of Arial Bold's average glyph width.
function wrap(text, size) {
  const limit = Math.floor(TITLE_WIDTH / (size * 0.53));
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && `${line} ${word}`.length > limit) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitTitle(text) {
  for (const size of [72, 64, 58, 52, 46]) {
    const lines = wrap(text, size);
    if (lines.length <= 3) return { size, lines };
  }
  throw new Error(`Title too long for a social card: ${text}`);
}

function card(eyebrow, title, logo) {
  const { size, lines } = fitTitle(title);
  const lineHeight = Math.round(size * 1.14);
  // Centre the title, but keep the label above it clear of the wordmark.
  const first = Math.max(330 - Math.round(((lines.length - 1) * lineHeight) / 2), 200 + size);
  const text = lines.map((line, index) =>
    `<text x="60" y="${first + index * lineHeight}" font-size="${size}" font-weight="700" letter-spacing="-1.5" fill="${index === lines.length - 1 ? 'url(#brand)' : '#18132e'}">${escapeXml(line)}</text>`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fcfaff"/><stop offset=".65" stop-color="#f0eaff"/><stop offset="1" stop-color="#dfedff"/></linearGradient>
      <linearGradient id="brand" x2="1" y2=".3"><stop stop-color="#8426ff"/><stop offset=".55" stop-color="#4a36ff"/><stop offset="1" stop-color="#168cf6"/></linearGradient>
      <radialGradient id="glow"><stop stop-color="#b9a1ff" stop-opacity=".55"/><stop offset="1" stop-color="#b9a1ff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#paper)"/>
    <circle cx="1130" cy="300" r="360" fill="url(#glow)"/>
    <circle cx="1160" cy="310" r="240" fill="none" stroke="#bba8ed" stroke-opacity=".45"/>
    <image xlink:href="${logo}" x="57" y="57" width="77" height="69"/>
    <g font-family="Arial, Helvetica, sans-serif">
      <text x="153" y="107" font-size="43" font-weight="800" letter-spacing="4" fill="url(#brand)">VIGNOVA</text>
      <text x="64" y="${first - size - 26}" font-size="19" font-weight="700" letter-spacing="2.3" fill="#685b8d">${escapeXml(eyebrow.toUpperCase())}</text>
      ${text}
      <text x="64" y="580" font-size="22" fill="#75668e">vignova.io</text>
    </g>
    <rect y="622" width="1200" height="8" fill="url(#brand)"/>
  </svg>`;
}

async function main() {
  const source = path.join(root, 'assets/vignova-purple-blue.png');
  const trimmed = await sharp(source).trim().png().toBuffer();
  const logo = `data:image/png;base64,${trimmed.toString('base64')}`;
  const jobs = [];
  for (const page of sources('pages')) {
    if (!page.ogImage) continue;
    jobs.push([page.ogImage.replace(/^\//, ''), page.breadcrumbName || page.topicLabel || 'Vignova', page.h1 || page.title]);
  }
  for (const article of sources('articles')) {
    const slug = article.path.replace(/\/$/, '').split('/').pop();
    jobs.push([`assets/og/blog-${slug}.png`, article.topic || 'Career guide', article.h1]);
  }
  fs.mkdirSync(path.join(root, 'assets/og'), { recursive: true });
  for (const [file, eyebrow, title] of jobs) {
    await sharp(Buffer.from(card(eyebrow, title, logo))).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(root, file));
  }
  console.log(`Generated ${jobs.length} social cards in assets/og.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
