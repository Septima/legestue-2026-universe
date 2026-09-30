"""Generate a small static snapshot for the tables used by the data map."""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent
API = 'https://datatank-dashboard.k8s-test-132.septima.dk/api/schemas'
source = (ROOT / 'app.js').read_text(encoding='utf-8')
match = re.search(r'const schemaDetails = \{(.*?)\n\};', source, re.S)
if not match:
    raise ValueError('Could not find data-map table mappings')
tables = set(re.findall(r"table: '([a-z0-9_]+\.[a-z0-9_]+)'", match.group(1)))
if not tables:
    raise ValueError('No mapped tables found')

with urlopen(API, timeout=30) as response:
    schemas = json.load(response)

snapshot = {}
for schema in schemas:
    for row in schema['rows']:
        name = schema['schema'] + '.' + row['tabelnavn']
        if name not in tables:
            continue
        record = {
            'source': row.get('kilde') or None,
            'updateInterval': row.get('opdateringsinterval') or None,
            'approxRows': row.get('approx_row_count'),
            'approxSize': row.get('approx_size_pretty') or None,
        }
        description = (row.get('beskrivelse') or '').strip()
        if description and description != row['tabelnavn'] and description[0].isupper() and len(description) <= 160:
            record['description'] = description
        update = (row.get('opdateringsbeskrivelse') or '').strip()
        if update and update != '-' and 10 <= len(update) <= 160:
            record['updateDescription'] = update
        rights = (row.get('rettigheder_url') or '').strip()
        if rights.startswith('https://'):
            record['rightsUrl'] = rights
        snapshot[name] = record

missing = tables - snapshot.keys()
if missing:
    raise ValueError(f'Dashboard has no metadata for: {sorted(missing)}')

result = {
    'retrievedAt': datetime.now(timezone.utc).isoformat(timespec='minutes'),
    'tables': dict(sorted(snapshot.items())),
}
(ROOT / 'dashboard-metadata.js').write_text(
    'window.DATAMAP_METADATA = ' + json.dumps(result, ensure_ascii=False, indent=2) + ';\n',
    encoding='utf-8',
)
print(f'Wrote {len(snapshot)} mapped tables')
