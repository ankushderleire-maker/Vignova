/* Copy only the existing site's product visuals. Original application files stay untouched. */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const appRequire = createRequire(path.resolve(__dirname, '../../LandingCode/package.json'));
const ts = appRequire('typescript');
const original = path.resolve(__dirname, '../../LandingCode/src/components');
const output = path.join(__dirname, 'components');
fs.mkdirSync(output, { recursive: true });

function theme(text) {
  return "import { demoTimeout as setTimeout, demoInterval as setInterval } from '../runtime';\n" + text
    .replace(/\b(?:blue|emerald|green|indigo|cyan)-(\d+)/g, 'violet-$1')
    .replace(/#0A192F/gi, '#241044').replace(/#112240/gi, '#381665').replace(/#1a3a5c/gi, '#512983')
    .replace(/#F5F8FA/gi, '#faf7ff')
    .replace(/#(?:2563eb|3b82f6|10b981|0a66c2|1d4ed8|22c55e)/gi, '#8b5cf6')
    .replace(/rgba\(59,\s*130,\s*246/g, 'rgba(139,92,246')
    .replace(/rgba\(37,\s*99,\s*235/g, 'rgba(139,92,246')
    .replace(/rgba\(10,\s*102,\s*194/g, 'rgba(139,92,246')
    .replace(/Captain Jack Sparrow/g, 'Alex Carter').replace(/captain-jack-sparrow/g, 'alex-carter-example')
    .replace(/Pirate Lord/g, 'Product Designer').replace(/ATS Passed/g, 'Match improved')
    .replace('Tailor resume for given Job Descriptions.', 'Tailor my resume for this product design role.')
    .replace('Instruct our AI to compile a tailored resume.', 'Add a job description to create a tailored resume.')
    .replace(/Resume Generator/g, 'Tailor your resume').replace(/AI Studio/g, 'Tailored resume')
    .replace(/from 'react'/g, "from '../runtime'").replace(/from "react"/g, "from '../runtime'")
    .replace(/from 'framer-motion'/g, "from '../motion'")
    .replace(/return \(\) => clearInterval\(iv\);/g, 'return () => { clearInterval(iv); clearTimeout(tid); };');
}

for (const name of ['ProfileFlow', 'ResumeFlow', 'AtsFlow', 'TrackerFlow', 'JobsFlow', 'SavedFlow', 'LinkedInFlow']) {
  let source = fs.readFileSync(path.join(original, 'hero', name + '.tsx'), 'utf8');
  fs.writeFileSync(path.join(output, name + '.tsx'), theme(source));
}

function extract(name, marker, wrapper = value => value) {
  const source = fs.readFileSync(path.join(original, name + '.tsx'), 'utf8').replace(/\r\n/g, '\n');
  const ast = ts.createSourceFile(name + '.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  const returnNode = fn.body.statements.find(ts.isReturnStatement);
  let visual;
  function visit(node) {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement.getText(ast);
      if (!visual && opening.includes(marker)) visual = node;
    }
    ts.forEachChild(node, visit);
  }
  visit(returnNode);
  if (!visual) throw new Error('Could not locate original graphic: ' + name);
  let copy = source.slice(0, returnNode.getStart(ast)) + 'return (' + wrapper(visual.getText(ast)) + ');\n}\n';
  copy = copy.replace(/^import .*from '@\/lib\/(seo|analytics)';\s*$/gm, '');
  copy = copy.replace("import Image from 'next/image';", "import { DemoImage as Image } from '../runtime';");
  if (name === 'ExtensionFeature') copy = copy.replace(/<svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 [^"]+"[^>]*>[\s\S]*?<\/svg>/, '<img src="assets/vignova-purple-blue.png" alt="" className="w-6 h-6 object-contain" />');
  if (name === 'MasterProfile') {
    copy = copy.replace("label: 'One-Click Apply', desc: 'Apply instantly anywhere'", "label: 'Application Pack', desc: 'Resume, letter & email'")
      .replace("label: 'Profile Match', desc: '98% role alignment'", "label: 'Profile Match', desc: 'Understand the role fit'")
      .replace("label: 'Auto Apply', desc: 'Bulk apply in seconds'", "label: 'Interview Prep', desc: 'Practice for the role'")
      .replace("desc: 'Beat tracking systems'", "desc: 'Review your ATS match'")
      .replace(/amber-|orange-/g, 'blue-').replace(/rose-/g, 'purple-')
      .replace(/#f59e0b|#f97316/g, '#60a5fa').replace(/#f43f5e/g, '#a78bfa');
  }
  if (['ResumeAnalysis', 'ExtensionFeature', 'LinkedInOptimizer'].includes(name)) {
    const timerHelpers = `const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (duration: number) => new Promise<void>(resolve => {
      const timer = setTimeout(() => { timers.delete(timer); resolve(); }, duration);
      timers.add(timer);
    });`;
    if (name === 'ResumeAnalysis') {
      copy = copy.replace('useMotionValue(0)', 'useMotionValue(42)')
        .replace('let isSubscribed = true;', `let isSubscribed = true;
    ${timerHelpers}
    let currentAnimation: ReturnType<typeof animate> | undefined;
    const tween = (target: number, options: any) => {
      currentAnimation = animate(count, target, { ...options, duration: options.duration / 1.6 });
      return currentAnimation;
    };`)
        .replace(/await animate\(count, /g, 'await tween(')
        .replace(/await new Promise\(r => setTimeout\(r, (\d+)\)\);/g, 'if (!isSubscribed) break;\n        await wait($1);')
        .replace('return () => { isSubscribed = false; };', 'return () => { isSubscribed = false; currentAnimation?.stop(); timers.forEach(clearTimeout); };');
    } else {
      const clickDelay = name === 'ExtensionFeature' ? 200 : 180;
      copy = copy.replace(/  const click = async \(\) => \{[\s\S]*?\n  \};\n/, '')
        .replace('let alive = true;', `let alive = true;
    ${timerHelpers}
    const click = async () => {
      if (!alive) return;
      setIsClicking(true);
      await wait(${clickDelay});
      if (alive) setIsClicking(false);
    };`)
        .replace(/await new Promise\(r => setTimeout\(r, (\d+)\)\);/g, 'await wait($1);')
        .replace(/await click\(\);/g, 'await click();\n        if (!alive) break;')
        .replace('return () => { alive = false; };', 'return () => { alive = false; timers.forEach(clearTimeout); };');
      if (name === 'LinkedInOptimizer') {
        copy = copy.replace('const start = setTimeout(() => {', 'let interval: ReturnType<typeof setInterval>;\n    const start = setTimeout(() => {')
          .replace('const t = setInterval(() => {', 'const t = interval = setInterval(() => {')
          .replace('      return () => clearInterval(t);', '')
          .replace('return () => clearTimeout(start);', 'return () => { clearTimeout(start); clearInterval(interval); };');
      }
    }
  }
  if (name === 'JobTracker') {
    copy = copy.replace(/window.innerWidth/g, 'container.clientWidth')
      .replace('const centerLine = container.clientWidth / 2;', 'const bounds = container.getBoundingClientRect();\n            const centerLine = bounds.left + bounds.width / 2;\n            const sceneScale = bounds.width / container.clientWidth;')
      .replace('rect.right < 0 || rect.left > container.clientWidth', 'rect.right < bounds.left || rect.left > bounds.right')
      .replace('(relativePos / cardWidth)', '(relativePos / (cardWidth * sceneScale))')
      .replace('src={`/templates/${item.id}-thumb.png`}', 'src={`assets/template-${item.id}.png`}');
  }
  fs.writeFileSync(path.join(output, name + '.tsx'), theme(copy));
}

// MasterProfile is maintained locally: its cards and connectors share one coordinate system.
extract('ResumeAnalysis', 'relative w-[320px] h-[320px]', visual => `<div className="radar-scene">${visual}</div>`);
extract('ExtensionFeature', 'relative w-[400px] h-[520px]');
extract('LinkedInOptimizer', 'relative w-[400px] h-[520px]');
extract('JobTracker', 'ref={containerRef}');

for (const name of ['executive', 'tech', 'creative', 'minimal']) {
  fs.copyFileSync(path.resolve(__dirname, '../../LandingCode/public/templates/' + name + '-thumb.png'), path.resolve(__dirname, '../assets/template-' + name + '.png'));
}
console.log('Prepared 12 original visual components and 4 existing template assets.');
