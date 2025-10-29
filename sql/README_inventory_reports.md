Inventory reports and helper queries

Files:
- inventory_reports.sql  -- queries for type-check, per-inventory problematic rows, product summaries, view + index recommendations

How to use (psql)

1) Inspect the array element type:

   psql -d yourdb -f sql/inventory_reports.sql

   Or run just the first check in a psql prompt:

   SELECT variants, pg_typeof(variants) FROM product_variant_combinations LIMIT 5;

2) If variants is integer[] (pg_typeof shows integer[]), run the "Per-inventory rows" query (the first long SELECT) to get resolved variant names.

3) If variants is text[] with names/slugs, run the "text[]" variant query present in the file (it matches variant_values.value_name).

4) For repeated reads: consider creating the materialized view (commented in the SQL) and set up a cron/worker to REFRESH it periodically.

Index recommendations are included in the SQL file; run those CREATE INDEX statements in a maintenance window if you plan to query large tables frequently.

If you'd like, I can:
- Generate a migration SQL file compatible with your migration tooling (eg. knex, supabase migrations) that adds the indexes and/or the materialized view.
- Tailor the variant-resolution joins to your exact schema if you paste one example row from product_variant_combinations.variants.
