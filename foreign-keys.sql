-- Run against the SAME database as the dashboard snapshot (by default
-- datatank-12 / prod_datatank_daily). Requires catalog read access only.
-- psql -X -q -t -A -d "$DATATANK_DSN" -f foreign-keys.sql > foreign_keys.json
-- One JSON array, including [] if no foreign keys are declared.
SELECT COALESCE(json_agg(json_build_object(
    'name', c.conname,
    'schema', source_ns.nspname,
    'table', source_table.relname,
    'columns', source_cols.names,
    'referenced_schema', target_ns.nspname,
    'referenced_table', target_table.relname,
    'referenced_columns', target_cols.names
) ORDER BY source_ns.nspname, source_table.relname, c.conname), '[]'::json)
FROM pg_constraint c
JOIN pg_class source_table ON source_table.oid = c.conrelid
JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
JOIN pg_class target_table ON target_table.oid = c.confrelid
JOIN pg_namespace target_ns ON target_ns.oid = target_table.relnamespace
CROSS JOIN LATERAL (
    SELECT array_agg(a.attname ORDER BY k.ord) AS names
    FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
) source_cols
CROSS JOIN LATERAL (
    SELECT array_agg(a.attname ORDER BY k.ord) AS names
    FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum
) target_cols
WHERE c.contype = 'f';
