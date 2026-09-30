# Datatank universe

Interactive, offline-friendly constellation of datasets from the [Datatank Dashboard](https://datatank-dashboard.k8s-test-132.septima.dk/) default database (`datatank-12 / prod_datatank_daily`). Open `index.html` directly in a browser; no server or dependencies required.

- View universe site at https://septima.dk/legestue-2026-universe/
- View data map at https://septima.dk/legestue-2026-universe/datamodel-app/

## Foreign keys

The dashboard's `/api/schemas` and `/api/schemas/{name}` responses do **not** expose columns or declared foreign keys. The column export contains no constraint metadata either. Thus the available data **cannot establish whether any actual foreign keys exist** in the production database; the 267 checked-in links are unverified naming hints, not foreign keys. Column-based hints match a column to another dataset's name (in the same schema, or unambiguously across schemas); generic names such as `link` and `address` are excluded. The object inspector shows other-schema hints, local hints, and matched columns with clickable dataset links. Hints are not proof of a real key relationship. Do not interpret the absence of an FK export as zero FKs.

The JSON contains no declared foreign keys, so the links are clearly labeled as name-based inferences, not confirmed relationships. Run python3 build-data.py to regenerate data.js from the source JSON.

## Interactive data map

The separate [Danish data map](datamodel-app/index.html) shows 22 connected elements covering properties and addresses. Open `datamodel-app/index.html` directly in a browser; it requires no installation or live database connection. Alternatively, run `python -m http.server 8000` from the repository root and visit `http://localhost:8000/datamodel-app/`.

The details panel shows a static, dated snapshot of selected table metadata from the [Datatank Dashboard](https://datatank-dashboard.k8s-test-132.septima.dk/), alongside representative column names from the local schema export. It contains source, update frequency, approximate row counts and sizes, and links to usage terms where available. These are dataset-level estimates, not live values or records. Customer, replication, and job information are intentionally excluded. To refresh the snapshot, run `python datamodel-app/build-metadata.py` with access to the dashboard API and review the generated `datamodel-app/dashboard-metadata.js` before publishing. The published data map makes no requests to the dashboard.
