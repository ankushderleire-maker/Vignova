"""Validate and package the local 2.0.0 candidate; never publishes or deploys it."""
import ast
import hashlib
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

workspace = Path(__file__).resolve().parent.parent
root = workspace / 'Browser_Extension'
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
assert manifest['version'] == '2.0.0' and manifest['manifest_version'] == 3
assert 'alarms' not in manifest['permissions']
assert 'notifications' not in manifest.get('optional_permissions', [])
allowed = {'.js', '.css', '.html', '.json', '.svg', '.png', '.woff2', '.lottie'}
files = sorted(p for p in root.rglob('*') if p.is_file() and p.suffix in allowed)
assert all(not part.startswith('.') and part != 'node_modules' for p in files for part in p.relative_to(root).parts)
for file in files:
    if file.suffix == '.js':
        subprocess.run(['node', '--check', str(file)], check=True, capture_output=True)
refs = [manifest['background']['service_worker'], *manifest['icons'].values()]
for script in manifest['content_scripts']:
    refs.extend(script.get('js', []) + script.get('css', []))
for ref in refs:
    assert (root / ref).is_file(), ref
class Popup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.refs = [], []
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if 'id' in data:
            self.ids.append(data['id'])
        if tag in {'script', 'link'}:
            ref = data.get('src') or data.get('href')
            if ref:
                self.refs.append(ref)
html = (root / 'popup/popup.html').read_text(encoding='utf-8')
popup = Popup()
popup.feed(html)
assert len(popup.ids) == len(set(popup.ids)), 'Duplicate popup IDs'
for ref in popup.refs:
    assert (root / 'popup' / ref).resolve().is_file(), ref
source = (root / 'popup/popup.js').read_text(encoding='utf-8')
for element_id in re.findall(r"\$\('([^']+)'\)", source):
    assert element_id in popup.ids, 'Missing element ' + element_id
assert all(label not in html for label in ['Auto Apply', 'Job Alerts', 'Check ATS Score'])
ast.parse((workspace / 'Backend/Full_Backend/app/routes/score.py').read_text(encoding='utf-8'))
output = workspace / 'VignovaExtension_v2.0.0_TEST_ONLY.zip'
with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
    for file in files:
        archive.write(file, file.relative_to(root).as_posix())
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert json.loads(archive.read('manifest.json')) == manifest
    for file in files:
        assert archive.read(file.relative_to(root).as_posix()) == file.read_bytes()
report = {'package': output.name, 'version': manifest['version'], 'files': len(files),
          'bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
          'checks': ['JavaScript syntax', 'manifest resources', 'popup references/IDs',
                     'removed feature labels/permissions', 'Python score syntax', 'ZIP integrity and source equality']}
(workspace / 'ops/artifacts/extension-v2/package.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
