// Offline regression tests using existing TypeScript/React dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function load(relative, overrides = {}) {
    const filename = path.join(root, relative);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, jsx: ts.JsxEmit.ReactJSX },
        fileName: filename,
    });
    const module = { exports: {} };
    vm.runInThisContext(`(function(require,module,exports){${outputText}\n})`, { filename })(
        name => Object.hasOwn(overrides, name) ? overrides[name] : require(name), module, module.exports);
    return module.exports;
}
const skills = load('lib/linkedin-skills.ts');
const dirty = ['person@example.org', '+353 891234567', '0891234567', 'Call (212) 555-0199',
    'Certifications', 'https://example.org/cv', 'Technical Skills', 'person＠example.org',
    'person\u200b@example.org', 'Phone', null, 123456789, {}, true];
assert.deepEqual(skills.cleanSkills(dirty), []);
const valid = ['C++', 'C#', 'C', 'R', 'CI/CD', '.NET', 'Node.js', 'ASP.NET', 'AWS S3', 'Python 3',
    'HTML5', 'ISO 27001', 'Email marketing', 'LLMs (GPT-4, Gemini)', '3D modelling'];
assert.deepEqual(skills.cleanSkills(valid), valid);
assert.deepEqual(skills.cleanSkills('C++, C#; CI/CD | LLMs (GPT-4, Gemini)\nR'), valid.slice(0, 2).concat(['CI/CD', 'LLMs (GPT-4, Gemini)', 'R']));
assert.deepEqual(skills.cleanSkills({ technical: 'Python, SQL', soft: 'Leadership', email: 'person@example.org' }), ['Python', 'SQL', 'Leadership']);
assert.deepEqual(skills.cleanSkills(['Python', 'python', 'SQL'], 1), ['Python']);

const profile = {
    name: 'Example Person', contact: { email: 'person@example.org', phone: '+353 891234567' },
    skills: ['Python', ...dirty, 'SQL'], skillDetails: [{ name: 'Python', endorsements: '3' }, { name: 'person@example.org' }],
    topSkills: ['Python', ...dirty],
    projects: [{ title: 'Search', description: 'Built a search tool.\nAdded filters.', skills: ['Python', ...dirty] },
        { title: 'Parser', description: 'Built a separate parser.', skills: ['SQL', ...dirty] }],
    experience: [{ associatedSkills: 'Python, person@example.org, +353 891234567' }],
};
const before = JSON.stringify(profile);
for (const input of [profile, before, JSON.stringify(before)]) {
    const cleaned = skills.sanitizeLinkedInProfile(input);
    assert.deepEqual(cleaned.skills, ['Python', 'SQL']);
    assert.deepEqual(cleaned.contact, profile.contact);
    assert.deepEqual(cleaned.topSkills, ['Python']);
    assert.equal(cleaned.skillDetails[0].endorsements, '3');
    assert.equal(cleaned.experience[0].associatedSkills, 'Python');
    assert.deepEqual(cleaned.projects[0].skills, ['Python']);
}
assert.equal(JSON.stringify(profile), before, 'Saved data must not be mutated');
assert.equal(skills.sanitizeLinkedInProfile('invalid JSON'), null);

const componentPath = 'components/linkedin/LinkedInProfileView.tsx';
const component = load(componentPath, { '@/lib/linkedin-skills': skills });
const props = { profile, viewMode: 'optimized', optimizedSkills: profile.skills, copiedText: '', onCopy() {} };
const html = renderToStaticMarkup(React.createElement(component.default, props));
assert.ok(!html.includes('person@example.org') && !html.includes('891234567'));
assert.ok(html.includes('aria-label="Copy Search description"'));
assert.ok(html.includes('aria-label="Copy Parser description"'));
assert.ok(!renderToStaticMarkup(React.createElement(component.default, { ...props, viewMode: 'current' })).includes('Copy Search description'));

// Evaluate the component tree with deterministic hooks to activate the real
// button handlers and assert their clipboard callback receives the right text.
const clickable = load(componentPath, { '@/lib/linkedin-skills': skills,
    react: { ...React, useId: () => 'test-profile', useState: value => [value, () => {}] } });
const buttons = [];
function walk(node) {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node !== 'object') return;
    if (typeof node.type === 'function') return walk(node.type(node.props));
    if (node.type === 'button') buttons.push(node);
    walk(node.props?.children);
}
let copied;
walk(clickable.default({ ...props, onCopy: text => { copied = text; } }));
buttons.find(button => button.props['aria-label'] === 'Copy Search description').props.onClick();
assert.equal(copied, profile.projects[0].description);
buttons.find(button => button.props['aria-label'] === 'Copy Parser description').props.onClick();
assert.equal(copied, profile.projects[1].description);
for (const button of buttons) {
    button.props.onClick();
    assert.ok(!copied.includes('person@example.org') && !copied.includes('891234567'));
}
assert.ok(buttons.some(button => { button.props.onClick(); return copied === 'Python, SQL'; }));
console.log('PASS: skill filtering, saved JSON cleanup, unchanged contact fields, profile rendering, per-project copy and safe Skills clipboard text.');
