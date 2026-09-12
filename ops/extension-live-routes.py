"""Read-only deployment check: GETs without credentials, never generates or saves data."""
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

routes = ['overview', 'recent-jobs', 'agent-profile', 'profiles', 'documents', 'score',
          'generate', 'generate-all', 'cover-letter', 'outreach', 'plan-batch',
          'save-job', 'interview-prep', 'job-alerts']
results = []
for route in routes:
    req = Request('https://app.vignova.io/api/extension/' + route,
                  headers={'User-Agent': 'Vignova-release-check/2.0', 'Accept': 'application/json'})
    try:
        with urlopen(req, timeout=20) as response:
            results.append({'route': route, 'status': response.status, 'contentType': response.headers.get('Content-Type')})
    except HTTPError as error:
        results.append({'route': route, 'status': error.code, 'contentType': error.headers.get('Content-Type')})
    except URLError as error:
        results.append({'route': route, 'error': str(error.reason)})
report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'method': 'GET',
          'authenticated': False, 'note': '401/405 indicates routing only, not successful authenticated AI or database operations.', 'routes': results}
output = Path(__file__).resolve().parent / 'artifacts/extension-v2/live-routes.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
