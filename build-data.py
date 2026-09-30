"""Build the offline universe from the Datatank Dashboard's default database.

Run `python3 build-data.py --refresh` to fetch a new snapshot, then commit both
snapshot and data.js. Run without --refresh to reproduce data.js offline.
Naming hints are NOT database foreign keys. Optional verified FK metadata may be
imported from a pg_constraint export (see README.md). Column metadata is
joined by exact schema/table name from raw_schema_data.json, when available.
"""
import argparse
import json
import re
from collections import defaultdict
from itertools import combinations
from pathlib import Path
from urllib.request import urlopen

BASE = 'https://datatank-dashboard.k8s-test-132.septima.dk'
SOURCE = Path(__file__).with_name('dashboard_snapshot.json')
OUTPUT = Path(__file__).with_name('data.js')
FOREIGN_KEYS = Path(__file__).with_name('foreign_keys.json')
COLUMNS = Path(__file__).with_name('raw_schema_data.json')


def refresh():
    # The dashboard defaults to datatank-12 (prod_datatank_daily). No db query
    # parameter is supplied, exactly as in the dashboard's initial requests.
    snapshot = {}
    for name in ('databases', 'schemas', 'customers'):
        with urlopen(f'{BASE}/api/{name}', timeout=30) as response:
            snapshot[name] = json.load(response)
    SOURCE.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')


def build(snapshot, foreign_keys=None, column_rows=()):
    schemas = snapshot['schemas']
    customers = snapshot['customers']
    nodes = []
    schema_info = []
    for schema in schemas:
        name = schema['schema']
        schema_info.append({
            'name': name,
            'size': schema['approx_total_size_pretty'],
            'customers': sum(name in c['publication_schemas'] for c in customers),
        })
        for row in schema['rows']:
            nodes.append({
                's': name, 'n': row['tabelnavn'],
                'm': {key: row[key] for key in (
                    'beskrivelse', 'kilde', 'rettigheder', 'rettigheder_url',
                    'attributtering', 'attributtering_url', 'opdateringsmetode',
                    'opdateringsinterval', 'opdateringsbeskrivelse', 'note',
                    'approx_row_count', 'approx_size_pretty',
                ) if row.get(key) is not None},
            })
    index = {(n['s'], n['n']): i for i, n in enumerate(nodes)}
    # Do not add tables from the column export: it includes views and datasets
    # not present in the dashboard snapshot. Missing columns remain unknown.
    for row in column_rows:
        i = index.get((row['table_schema'], row['table_name']))
        if i is None:
            continue
        node = nodes[i]
        node.setdefault('c', []).append([
            row['column_name'], row['data_type'], row['is_nullable'] == 'YES',
            row.get('column_comment'), row.get('column_default'), row.get('character_maximum_length'),
        ])
    edges = []
    seen = set()

    def add(a, b, kind, label=None):
        pair = (min(a, b), max(a, b))
        if a != b and pair not in seen:
            seen.add(pair)
            # Column hints retain source -> target direction and the matching column.
            edges.append([a, b, kind, label] if kind == 4 else [*pair, kind])

    # 0: named view of an existing dataset, 1: naming variant,
    # 2: same-named dataset across schemas. None imply a declared relation.
    def family(name):
        name = re.sub(r'_(?:10m|500m|2000m|10|25|50|100|250|500|1000|2500|ref)$', '', name)
        name = re.sub(r'_(?:forslag|vedtaget|aflyst)(?:_vindmoelle)?$', '', name)
        return re.sub(r'_(?:se|sekundaerforretning\w*|stormfald)$', '', name)

    families = defaultdict(list)
    by_name = defaultdict(list)
    for i, node in enumerate(nodes):
        schema, name = node['s'], node['n']
        match = re.fullmatch(r'dtbx_(?:dtbx_)?vw_(.+?)_aktuel(?:_med_.+)?', name)
        if match and (schema, match[1]) in index:
            add(i, index[(schema, match[1])], 0)
        if not name.startswith(('septima_', 'dtbx_')):
            families[(schema, family(name))].append(i)
            by_name[name].append(i)
    for (schema, stem), members in families.items():
        if len(members) > 1:
            hub = index.get((schema, stem), members[0])
            for i in members:
                add(i, hub, 1)
    # Every same-name counterpart should be reachable from either dataset,
    # even when the name appears in three or more different schemas.
    for members in by_name.values():
        for a, b in combinations(members, 2):
            if nodes[a]['s'] != nodes[b]['s']:
                add(a, b, 2)

    # Exact column/table-name matches only. Prefer a dataset in the same
    # schema; across schemas require a UNIQUE candidate and exclude generic
    # words that happen to be table names (e.g. "link" and "address").
    generic = {'address', 'link', 'id', 'status', 'name', 'type', 'value', 'date'}
    for i, node in enumerate(nodes):
        for column in node.get('c', []):
            col = column[0]
            candidates = [col] + [col[:-len(suffix)] for suffix in ('_id', '_uuid', '_lokalid', '_relation') if col.endswith(suffix)]
            for target in candidates:
                if len(target) < 4 or target == node['n'] or target in generic:
                    continue
                local = index.get((node['s'], target))
                if local is not None:
                    add(i, local, 4, col)
                    break
                matches = [j for j in by_name.get(target, []) if nodes[j]['s'] != node['s']]
                if len(target) >= 6 and len(matches) == 1:
                    add(i, matches[0], 4, col)
                    break

    # Only catalog constraints can become verified edges. Group multiple
    # constraints between the same directed pair without losing column details.
    confirmed = defaultdict(list)
    skipped = 0
    for fk in foreign_keys or []:
        source = index.get((fk['schema'], fk['table']))
        target = index.get((fk['referenced_schema'], fk['referenced_table']))
        columns, referenced = fk['columns'], fk['referenced_columns']
        if not columns or len(columns) != len(referenced):
            raise ValueError(f"Invalid foreign key columns: {fk['name']}")
        if source is None or target is None or source == target:
            skipped += 1  # Not two distinct datasets on the current dashboard.
            continue
        confirmed[(source, target)].append({'name': fk['name'], 'columns': columns,
                                             'referenced_columns': referenced})
    confirmed_pairs = {(min(a, b), max(a, b)) for a, b in confirmed}
    edges = [edge for edge in edges if (min(edge[0], edge[1]), max(edge[0], edge[1])) not in confirmed_pairs]
    edges.extend([a, b, 3, constraints] for (a, b), constraints in sorted(confirmed.items()))
    return {'database': snapshot['databases'][0]['label'], 'schemas': schema_info,
            'nodes': nodes, 'edges': edges, 'foreignKeyStatus': 'imported' if foreign_keys is not None else 'unavailable',
            'skippedForeignKeys': skipped}



if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true', help='fetch the current dashboard snapshot')
    parser.add_argument('--columns', type=Path, default=COLUMNS,
                        help='column metadata export (default: raw_schema_data.json)')
    parser.add_argument('--foreign-keys', type=Path, default=FOREIGN_KEYS,
                        help='JSON export from foreign-keys.sql (default: foreign_keys.json if present)')
    args = parser.parse_args()
    if args.refresh:
        refresh()
    if not args.foreign_keys.exists() and args.foreign_keys != FOREIGN_KEYS:
        parser.error(f'foreign-key export not found: {args.foreign_keys}')
    foreign_keys = json.loads(args.foreign_keys.read_text()) if args.foreign_keys.exists() else None
    if foreign_keys is not None and not isinstance(foreign_keys, list):
        parser.error('foreign-key export must be a JSON array')
    if not args.columns.exists():
        parser.error(f'column export not found: {args.columns}')
    raw = json.loads(args.columns.read_text())
    if len(raw) != 1 or not isinstance(next(iter(raw.values())), list):
        parser.error('column export must contain one SQL query mapped to a row array')
    data = build(json.loads(SOURCE.read_text()), foreign_keys, next(iter(raw.values())))
    OUTPUT.write_text('window.UNIVERSE_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    verified = sum(e[2] == 3 for e in data['edges'])
    covered = sum('c' in n for n in data['nodes'])
    print(f"{len(data['nodes'])} datasets ({covered} with columns), {len(data['schemas'])} schemas, "
          f"{len(data['edges']) - verified} naming hints, {verified} verified FK pairs "
          f"({data['skippedForeignKeys']} constraints outside the dataset list)")
