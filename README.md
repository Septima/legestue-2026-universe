# Datatank universe

Interactive, offline-friendly constellation of datasets from the [Datatank Dashboard](https://datatank-dashboard.k8s-test-132.septima.dk/) default database (`datatank-12 / prod_datatank_daily`). Open `index.html` directly in a browser; no server or dependencies required.

The checked-in dashboard snapshot contains 630 datasets in 31 schemas, including descriptions, sources, update schedules, rights, approximate sizes/row counts and schema customer counts. `raw_schema_data.json` is a separate column export with columns for 405 of those datasets (10,100 columns); the remaining 225 are explicitly shown as unavailable, not as having zero columns. Search dataset names, descriptions, sources and available column names; filter schemas; click a dataset to inspect its columns, metadata and connections. Customer counts use publication schemas, not database grants. Column data may be from a different point in time than the dashboard snapshot.

## Foreign keys

The dashboard's `/api/schemas` and `/api/schemas/{name}` responses do **not** expose columns or declared foreign keys. The column export contains no constraint metadata either. Thus the available data **cannot establish whether any actual foreign keys exist** in the production database; the 267 checked-in links are unverified naming hints, not foreign keys. Column-based hints match a column to another dataset's name (in the same schema, or unambiguously across schemas); generic names such as `link` and `address` are excluded. The object inspector shows other-schema hints, local hints, and matched columns with clickable dataset links. Hints are not proof of a real key relationship. Do not interpret the absence of an FK export as zero FKs.

If you have read access to the **same PostgreSQL database**, export declared `pg_constraint` foreign keys (including composite keys) with:

```sh
psql -X -q -t -A -d "$DATATANK_DSN" -f foreign-keys.sql > foreign_keys.json
python3 build-data.py
```

`DATATANK_DSN` must connect to `prod_datatank_daily` on `datatank-12` for the checked-in snapshot. The build matches both ends to dashboard datasets; unmatched constraints are reported and omitted. Each matched directed FK pair is drawn in teal, distinguished from naming hints, with constraint names and source/target columns in the inspector. A verified FK replaces any naming hint between the same two datasets. If the export is an empty array, that establishes no *declared* FKs in the queried database (not that data has no logical relationships). Keep `foreign_keys.json` alongside `data.js` when regenerating, or use `--foreign-keys /path/to/export.json`. Only import trusted catalog exports.

To refresh dashboard metadata, run `python3 build-data.py --refresh`; this updates `dashboard_snapshot.json` and generates `data.js`. Run `python3 build-data.py` to regenerate `data.js` offline from both checked-in snapshots, or pass `--columns /path/to/export.json` for a newer column export in the same format. The app shows snapshots, not live API data.
