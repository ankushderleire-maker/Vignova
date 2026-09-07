// Deterministic web exports of the supplied logo. The original artwork is unchanged.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const appRequire = createRequire(path.resolve(__dirname, '../LandingCode/package.json'));
const sharp = appRequire('sharp');
const root = __dirname;

async function main() {
  const source = path.join(root, 'assets/vignova-purple-blue.png');
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;
  // Fit the mark, rather than its large transparent canvas, inside small icons.
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 128) {
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
  }
  if (left >= right || top >= bottom) throw new Error('The supplied logo has no visible artwork.');
  const mark = await sharp(source).extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).png().toBuffer();
  const icons = new Map();
  for (const size of [16, 32, 48, 180, 192, 512]) {
    const padding = Math.max(1, Math.round(size * 0.065));
    const background = size >= 180 ? '#ffffff' : '#00000000';
    const exportImage = sharp(mark)
      .resize(size - padding * 2, size - padding * 2, { fit: 'contain', background })
      .extend({ top: padding, bottom: padding, left: padding, right: padding, background });
    if (size >= 180) exportImage.flatten({ background: '#ffffff' });
    const png = await exportImage.png({ compressionLevel: 9 }).toBuffer();
    icons.set(size, png);
    const filename = size === 180 ? 'apple-touch-icon.png'
      : size >= 192 ? `android-chrome-${size}x${size}.png` : `favicon-${size}x${size}.png`;
    fs.writeFileSync(path.join(root, filename), png);
  }
  // ICO container with PNG frames, supported by modern browsers and Windows.
  const sizes = [16, 32, 48];
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, index) => {
    const entry = 6 + index * 16;
    header[entry] = size; header[entry + 1] = size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(icons.get(size).length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += icons.get(size).length;
  });
  fs.writeFileSync(path.join(root, 'favicon.ico'), Buffer.concat([header, ...sizes.map(size => icons.get(size))]));
  fs.copyFileSync(source, path.join(root, 'logo.png'));

  // A code-native social card, using the exact supplied mark and current copy.
  const logo = `data:image/png;base64,${mark.toString('base64')}`;
  const card = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fcfaff"/><stop offset=".65" stop-color="#f0eaff"/><stop offset="1" stop-color="#dfedff"/></linearGradient>
      <linearGradient id="brand" x2="1" y2=".3"><stop stop-color="#8426ff"/><stop offset=".55" stop-color="#4a36ff"/><stop offset="1" stop-color="#168cf6"/></linearGradient>
      <radialGradient id="glow"><stop stop-color="#b9a1ff" stop-opacity=".6"/><stop offset="1" stop-color="#b9a1ff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#paper)"/>
    <circle cx="1090" cy="285" r="390" fill="url(#glow)"/>
    <circle cx="1120" cy="300" r="266" fill="none" stroke="#bba8ed" stroke-opacity=".5"/>
    <circle cx="1120" cy="300" r="218" fill="none" stroke="#bba8ed" stroke-opacity=".35"/>
    <image xlink:href="${logo}" x="57" y="57" width="77" height="69"/>
    <g font-family="Arial, Helvetica, sans-serif">
      <text x="153" y="107" font-size="43" font-weight="800" letter-spacing="4" fill="url(#brand)">VIGNOVA</text>
      <text x="64" y="232" font-size="17" font-weight="700" letter-spacing="2.3" fill="#685b8d">YOUR AI CAREER WORKSPACE</text>
      <text x="60" y="323" font-size="75" font-weight="700" letter-spacing="-3.5" fill="#18132e">Tailor your resume.</text>
      <text x="60" y="409" font-size="75" font-weight="700" letter-spacing="-3.5" fill="url(#brand)">Apply with confidence.</text>
      <g font-size="19" font-weight="600" fill="#5b477f">
        <rect x="64" y="460" width="192" height="45" rx="22.5" fill="#fff"/><text x="85" y="489">AI resume builder</text>
        <rect x="271" y="460" width="159" height="45" rx="22.5" fill="#fff"/><text x="292" y="489">ATS checking</text>
        <rect x="445" y="460" width="221" height="45" rx="22.5" fill="#fff"/><text x="466" y="489">Chrome extension</text>
      </g>
      <text x="64" y="580" font-size="20" fill="#75668e">vignova.io</text>
    </g>
    <rect y="622" width="1200" height="8" fill="url(#brand)"/>
  </svg>`;
  await sharp(Buffer.from(card)).png({ compressionLevel: 9 }).toFile(path.join(root, 'og-image.png'));
  console.log('Generated purple-blue favicons, device icons, logo and 1200x630 social card.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
