"""Build a compact, offline-friendly graph from the column metadata export.

Edges are name-based inferences, NOT declared foreign keys.
Run: python3 build-data.py
"""
import json
import re
from collections import defaultdict
from pathlib import Path

SOURCE = Path('raw_schema_data.json')
rows = next(iter(json.loads(SOURCE.read_text()).values()))
tables = defaultdict(lambda: {'columns': [], 'type': ''})
for row in rows:
    table = tables[(row['table_schema'], row['table_name'])]
    table['columns'].append(row['column_name'])
    table['type'] = row['table_type']

keys = sorted(tables)
index = {key: i for i, key in enumerate(keys)}
nodes = [{'s': schema, 'n': name, 't': tables[key]['type'] == 'VIEW', 'c': tables[key]['columns']}
         for key, (schema, name) in zip(keys, keys)]
edges = []
seen = set()

def add(a, b, kind, label):
    if a == b:
        return
    pair = (min(a, b), max(a, b), kind)
    if pair not in seen:
        seen.add(pair)
        edges.append([a, b, kind, label])

# 0 = reference by column name; 1 = view of base table;
# 2 = naming variant; 3 = same-named table in another schema.
for (schema, name), i in index.items():
    columns = tables[(schema, name)]['columns']
    for col in columns:
        if len(col) < 4:
            continue
        candidates = [col]
        for suffix in ('_id', '_uuid', '_relation', '_lokalid'):
            if col.endswith(suffix):
                candidates.append(col[:-len(suffix)])
        for target in candidates:
            j = index.get((schema, target))
            if j is not None and j != i:
                add(i, j, 0, col)
                break

    match = re.match(r'dtbx_(?:dtbx_)?vw_(.+?)_aktuel(?:_med_.+)?$', name)
    if match:
        base = match.group(1)
        j = index.get((schema, base))
        if j is not None:
            add(i, j, 1, 'view of')

# An exact column/table-name match in another schema may indicate a cross-source
# reference. Exclude generic "address" and duplicate view columns; when multiple
# schemas contain that table name, connect to the alphabetically first counterpart.
by_base_name = defaultdict(list)
for (schema, name), i in index.items():
    if not name.startswith(('septima_', 'dtbx_')):
        by_base_name[name].append(i)
for (schema, name), i in index.items():
    if name.startswith(('septima_', 'dtbx_')):
        continue
    for col in tables[(schema, name)]['columns']:
        if len(col) < 6 or col == 'address' or (schema, col) in index:
            continue
        target = next((j for j in by_base_name.get(col, []) if nodes[j]['s'] != schema), None)
        if target is not None:
            add(i, target, 0, col)

# Group resolution, status and secondary-business variants within a schema.
def family(name):
    name = re.sub(r'_(?:10m|500m|2000m|10|25|50|100|250|500|1000|2500|ref)$', '', name)
    name = re.sub(r'_(?:forslag|vedtaget|aflyst)(?:_vindmoelle)?$', '', name)
    name = re.sub(r'_(?:se|sekundaerforretning\w*|stormfald)$', '', name)
    return name

families = defaultdict(list)
for (schema, name), i in index.items():
    if name.startswith(('septima_', 'dtbx_')):
        continue
    families[(schema, family(name))].append(i)
for (schema, stem), members in families.items():
    if len(members) < 2:
        continue
    hub = index.get((schema, stem), members[0])
    for i in members:
        if i != hub:
            add(i, hub, 2, 'variant of')

# Across schemas, equal names are a possible conceptual counterpart, not a key.
by_name = defaultdict(list)
for (schema, name), i in index.items():
    if not name.startswith(('septima_', 'dtbx_')):
        by_name[name].append(i)
for name, members in by_name.items():
    for i, j in zip(members, members[1:]):
        add(i, j, 3, 'same name')

payload = {'nodes': nodes, 'edges': edges}
Path('data.js').write_text('window.UNIVERSE_DATA=' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(f'{len(nodes)} tables, {len(rows)} columns, {len(edges)} inferred links ({[sum(e[2] == k for e in edges) for k in range(4)]}), {Path("data.js").stat().st_size // 1024} KB')
