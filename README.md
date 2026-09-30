# Databox universe

A "universe" type interactive canvas displaying data types in Databox.

- View universe site at https://septima.dk/legestue-2026-universe/
- View data map at https://septima.dk/legestue-2026-universe/datamodel-app/

Open index.html directly in a browser to get started. (No server or dependencies needed.)

The visualization plots 514 tables across 23 schemas, with 245 inferred links. 
You can drag to orbit, scroll to zoom, search tables or columns, filter by schema, and click a table to inspect
its columns and connections.

The JSON contains no declared foreign keys, so the links are clearly labeled as name-based inferences, not confirmed relationships. Run python3 build-data.py to regenerate data.js from the source JSON.

## Interactive data map

The separate [Danish data map](datamodel-app/index.html) shows 22 connected elements covering properties and addresses. Open `datamodel-app/index.html` directly in a browser; it requires no installation or live database connection. Alternatively, run `python -m http.server 8000` from the repository root and visit `http://localhost:8000/datamodel-app/`.
