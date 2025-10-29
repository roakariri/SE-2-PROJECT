-- inventory_reports.sql
-- Helpful queries to inspect product_variant_combinations, inventory low-stock/out-of-stock rows,
-- expand variant arrays to human-friendly names, aggregate per-product summaries, and recommended indexes.

-- 1) Type check: see how the 'variants' array is stored
-- Run this first to decide which query variant to use below
SELECT variants, pg_typeof(variants) AS variants_type
FROM product_variant_combinations
LIMIT 5;

-- =====================================================================
-- 2) Per-inventory rows: combinations with low/out-of-stock status
-- This variant assumes the elements in product_variant_combinations.variants are numeric
-- IDs referencing product_variant_values.product_variant_value_id OR variant_values.variant_value_id.
-- It tries to resolve product-scoped product_variant_values first, then falls back to variant_values.

-- Returns: product, inventory row, quantity, status, and a JSON array of {group, value} for the combination
SELECT
  p.id AS product_id,
  p.name AS product_name,
  i.inventory_id,
  i.combination_id,
  i.quantity,
  i.low_stock_limit,
  i.status,
  COALESCE(var.variants_json, '[]'::json) AS variants
FROM inventory i
JOIN product_variant_combinations pvc ON pvc.combination_id = i.combination_id
JOIN products p ON p.id = pvc.product_id
LEFT JOIN LATERAL (
  SELECT json_agg(json_build_object('group', COALESCE(vg.name, 'unknown'), 'value', COALESCE(vv.value_name, pv.value_name, v_item::text)) ORDER BY COALESCE(vg.name, '')) AS variants_json
  FROM unnest(pvc.variants) AS v_item
  LEFT JOIN product_variant_values pv ON pv.product_variant_value_id = (v_item::int) -- try product-scoped id
  LEFT JOIN variant_values vv ON vv.variant_value_id = COALESCE(pv.variant_value_id, (v_item::int)) -- fallback to variant_value id
  LEFT JOIN variant_groups vg ON vg.variant_group_id = vv.variant_group_id
) var ON true
WHERE i.status IN ('Out of Stock', 'Low on Stocks')
ORDER BY i.status, i.quantity ASC, p.id;

-- =====================================================================
-- 3) Per-inventory variant-expansion when pvc.variants stores textual keys (value_name or slug)
-- Use this if pg_typeof(variants) shows text[] or you inspected elements and they are names/slugs.

SELECT
  p.id AS product_id,
  p.name AS product_name,
  i.inventory_id,
  i.combination_id,
  i.quantity,
  i.low_stock_limit,
  i.status,
  COALESCE(var.variants_json, '[]'::json) AS variants
FROM inventory i
JOIN product_variant_combinations pvc ON pvc.combination_id = i.combination_id
JOIN products p ON p.id = pvc.product_id
LEFT JOIN LATERAL (
  SELECT json_agg(json_build_object('group', COALESCE(vg.name, 'unknown'), 'value', COALESCE(vv.value_name, v_item::text)) ORDER BY COALESCE(vg.name, '')) AS variants_json
  FROM unnest(pvc.variants) AS v_item
  LEFT JOIN variant_values vv ON vv.value_name = v_item::text -- match by name
  LEFT JOIN variant_groups vg ON vg.variant_group_id = vv.variant_group_id
) var ON true
WHERE i.status IN ('Out of Stock', 'Low on Stocks')
ORDER BY i.status, i.quantity ASC, p.id;

-- =====================================================================
-- 4) Product-level summary: counts of problematic combinations per product
SELECT
  p.id AS product_id,
  p.name AS product_name,
  COUNT(i.inventory_id) FILTER (WHERE i.status = 'Out of Stock') AS out_of_stock_count,
  COUNT(i.inventory_id) FILTER (WHERE i.status = 'Low on Stocks') AS low_stock_count,
  SUM(i.quantity) AS total_quantity,
  MIN(i.quantity) AS min_quantity,
  MAX(i.quantity) AS max_quantity
FROM products p
JOIN product_variant_combinations pvc ON pvc.product_id = p.id
JOIN inventory i ON i.combination_id = pvc.combination_id
GROUP BY p.id, p.name
HAVING COUNT(i.inventory_id) > 0
ORDER BY out_of_stock_count DESC, low_stock_count DESC, total_quantity ASC;

-- =====================================================================
-- 5) Product with combinations array (one row per product, combos as JSON)
SELECT
  p.id,
  p.name,
  json_agg(
    json_build_object(
      'combination_id', pvc.combination_id,
      'quantity', i.quantity,
      'low_stock_limit', i.low_stock_limit,
      'status', i.status,
      'variants', COALESCE(var.variants_json, '[]'::json)
    ) ORDER BY i.quantity ASC
  ) AS combos
FROM products p
JOIN product_variant_combinations pvc ON pvc.product_id = p.id
JOIN inventory i ON i.combination_id = pvc.combination_id
LEFT JOIN LATERAL (
  SELECT json_agg(json_build_object('group', COALESCE(vg.name, 'unknown'), 'value', COALESCE(vv.value_name, pv.value_name, v_item::text)) ORDER BY COALESCE(vg.name, '')) AS variants_json
  FROM unnest(pvc.variants) AS v_item
  LEFT JOIN product_variant_values pv ON pv.product_variant_value_id = (v_item::int)
  LEFT JOIN variant_values vv ON vv.variant_value_id = COALESCE(pv.variant_value_id, (v_item::int))
  LEFT JOIN variant_groups vg ON vg.variant_group_id = vv.variant_group_id
) var ON true
WHERE i.status IN ('Out of Stock', 'Low on Stocks')
GROUP BY p.id, p.name
ORDER BY p.name;

-- =====================================================================
-- 6) Materialized view: pre-resolve variants for fast read queries (optional)
-- Creates a materialized view that stores inventory rows with resolved variants JSON.
-- Refresh periodically or concurrently when supported.

-- CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_with_variants AS
-- SELECT
--   i.*,
--   pvc.product_id,
--   (SELECT json_agg(json_build_object('group', COALESCE(vg.name, 'unknown'), 'value', COALESCE(vv.value_name, pv.value_name, v_item::text)) ORDER BY COALESCE(vg.name, ''))
--    FROM unnest(pvc.variants) AS v_item
--    LEFT JOIN product_variant_values pv ON pv.product_variant_value_id = (v_item::int)
--    LEFT JOIN variant_values vv ON vv.variant_value_id = COALESCE(pv.variant_value_id, (v_item::int))
--    LEFT JOIN variant_groups vg ON vg.variant_group_id = vv.variant_group_id
--   ) AS variants_json
-- FROM inventory i
-- JOIN product_variant_combinations pvc ON pvc.combination_id = i.combination_id;

-- To refresh (concurrently if supported and indexed):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_with_variants;

-- =====================================================================
-- 7) Index recommendations (apply as needed)
-- Ensure foreign-key columns have indexes (Postgres usually creates them for primary keys but not always for FK columns)
CREATE INDEX IF NOT EXISTS idx_inventory_combination_id ON inventory (combination_id);
CREATE INDEX IF NOT EXISTS idx_pvc_product_id ON product_variant_combinations (product_id);
-- Partial index to speed up low/out stock filters
CREATE INDEX IF NOT EXISTS idx_inventory_out_or_low ON inventory (combination_id) WHERE status IN ('Out of Stock', 'Low on Stocks');
-- GIN index to accelerate searches inside the variants array
CREATE INDEX IF NOT EXISTS idx_pvc_variants_gin ON product_variant_combinations USING GIN (variants);

-- Variant/value lookup indexes
CREATE INDEX IF NOT EXISTS idx_pvv_product_variant_value_id ON product_variant_values (product_variant_value_id);
CREATE INDEX IF NOT EXISTS idx_variant_values_id ON variant_values (variant_value_id);
CREATE INDEX IF NOT EXISTS idx_variant_groups_id ON variant_groups (variant_group_id);

-- =====================================================================
-- 8) Quick helpers: find combinations that reference a particular variant value id
-- (works when variants is an int[] or text[] that can be cast)
-- Example: find combinations that reference variant_value_id = 123
SELECT pvc.*
FROM product_variant_combinations pvc
WHERE pvc.variants @> ARRAY[123]::int[]
LIMIT 50;

-- If variants is text[] and stores numeric-like values, cast accordingly
-- WHERE pvc.variants @> ARRAY['123']::text[]

-- =====================================================================
-- End of file
