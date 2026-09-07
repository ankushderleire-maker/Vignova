/* Render the ported components without a browser and validate their build inputs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const dependencyPath = path.resolve(__dirname, '../../LandingCode/node_modules');
const appRequire = createRequire(path.resolve(__dirname, '../../LandingCode/package.json'));
const ts = appRequire('typescript');
require.extensions['.tsx'] = (module, filename) => {
  module.paths.unshift(dependencyPath);
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const errors = result.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, filename + ': TypeScript syntax error');
  module._compile(result.outputText, filename);
};
const React = appRequire('react');
const { renderToString } = appRequire('react-dom/server');
const { DemoPaused } = require('./runtime.tsx');
const names = ['ResumeFlow.tsx', 'TrackerFlow.tsx', 'MasterProfile.tsx', 'ResumeAnalysis.tsx', 'ExtensionFeature.tsx', 'LinkedInOptimizer.tsx'];
for (const name of names) {
  const Component = require('./components/' + name).default;
  assert.equal(typeof Component, 'function', name + ': missing component');
  for (const paused of [false, true]) {
    const markup = renderToString(React.createElement(DemoPaused.Provider, { value: paused }, React.createElement(Component)));
    assert(markup.length > 500, name + ': preview did not render');
    assert(!markup.includes('/_next/image'), name + ': image requires a Next.js server');
    for (const match of markup.matchAll(/src="(assets\/[^"?]+)/g)) {
      assert(fs.existsSync(path.resolve(__dirname, '..', match[1])), name + ': missing ' + match[1]);
    }
  }
}
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'index.tsx'), 'utf8');
const kinds = [...html.matchAll(/data-product-demo="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(kinds, ['hero', 'extension', 'orbit', 'radar', 'linkedin', 'tracker'], 'Feature order or unique animation coverage changed');
assert.equal(new Set(kinds).size, kinds.length, 'The page repeats an animation');
for (const kind of kinds) assert(new RegExp('\\b' + kind + ': \\[\\d+, \\d+\\]').test(app), 'Missing scene dimensions: ' + kind);
assert(app.includes('onUncaughtError'), 'Static fallback recovery is missing');
assert(app.includes("attributeFilter: ['class']"), 'Global pause preference is disconnected');
const Orbit = require('./components/MasterProfile.tsx').default;
const orbit = renderToString(React.createElement(DemoPaused.Provider, { value: true }, React.createElement(Orbit)));
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const connectors = new Map([...orbit.matchAll(/<line\b[^>]*data-connector="[^"]+"[^>]*>/g)].map(match => { const attrs=attributes(match[0]); return [attrs['data-connector'], attrs]; }));
const nodes = [...orbit.matchAll(/<div\b[^>]*data-profile-node="[^"]+"[^>]*>/g)];
assert.equal(nodes.length, 6, 'Profile diagram should have six distinct inputs');
for (const [tag] of nodes) {
  const attrs = attributes(tag);
  const dimensions = Object.fromEntries(attrs.style.split(';').map(rule => rule.split(':')).filter(pair => pair.length === 2));
  const line = connectors.get(attrs['data-profile-node']);
  assert(line, 'Missing connector for ' + attrs['data-profile-node']);
  assert.equal(+line.x1, 270); assert.equal(+line.y1, 270);
  assert(Math.abs(+line.x2 - (parseFloat(dimensions.left) + parseFloat(dimensions.width) / 2)) < .001, 'Horizontal connection is off-centre');
  assert(Math.abs(+line.y2 - (parseFloat(dimensions.top) + parseFloat(dimensions.height) / 2)) < .001, 'Vertical connection is off-centre');
}
console.log('Profile connectors meet the exact centre of all six cards.');
console.log(`Rendered ${names.length} animation components in normal and paused states. Verified ${kinds.length} landing placements and local template assets.`);
