import fs from 'fs';
import path from 'path';

// Load .env values (simple parser)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\n/).forEach(line => {
    const l = line.trim();
    if (!l || l.startsWith('#')) return;
    const eq = l.indexOf('=');
    if (eq === -1) return;
    const key = l.slice(0, eq).trim();
    let val = l.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment or .env');
  process.exit(2);
}

// dynamic import of supabase client (ESM)
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function findProduct(route) {
  // Try multiple heuristics to find the product record
  const tried = [];

  // 1) exact route
  try {
    const { data, error } = await supabase.from('products').select('id, name, route, image_url').eq('route', route).limit(1).maybeSingle();
    if (error && !/column .* does not exist/.test(String(error.message))) {
      console.warn('Route lookup error:', error.message || error);
    }
    if (data && data.id) return { data, method: 'route' };
    tried.push('route');
  } catch (e) { tried.push('route-error'); }

  // 2) route ilike
  try {
    const { data, error } = await supabase.from('products').select('id, name, route, image_url').ilike('route', `%${route}%`).limit(1).maybeSingle();
    if (!error && data && data.id) return { data, method: 'route_ilike' };
    tried.push('route_ilike');
  } catch (e) { tried.push('route_ilike_error'); }

  // 3) name ilike
  try {
    const { data, error } = await supabase.from('products').select('id, name, route, image_url').ilike('name', `%${route}%`).limit(1).maybeSingle();
    if (!error && data && data.id) return { data, method: 'name_ilike' };
    tried.push('name_ilike');
  } catch (e) { tried.push('name_ilike_error'); }

  // 4) image_url ilike
  try {
    const { data, error } = await supabase.from('products').select('id, name, route, image_url').ilike('image_url', `%${route}%`).limit(1).maybeSingle();
    if (!error && data && data.id) return { data, method: 'image_url_ilike' };
    tried.push('image_url_ilike');
  } catch (e) { tried.push('image_url_ilike_error'); }

  return { data: null, tried };
}

async function run() {
  try {
    const route = 'stamp-seal';

    const found = await findProduct(route);
    if (!found || !found.data) {
      console.error('Product not found for route heuristics. Tried:', found.tried || []);

      // Broad search fallback: look for 'stamp' or 'seal' in name or route to help locate candidates
      try {
        const { data: candidates, error: candErr } = await supabase
          .from('products')
          .select('id, name, route, image_url')
          .or(`name.ilike.%stamp%,name.ilike.%seal%,route.ilike.%stamp%,route.ilike.%seal%`)
          .limit(20);

        if (candErr) {
          console.error('Candidates lookup error:', candErr);
        } else {
            console.log('Candidate products matching stamp/seal (up to 20):');
            console.log(JSON.stringify(candidates, null, 2));

            if (Array.isArray(candidates) && candidates.length > 0) {
              console.log('Proceeding with the first candidate to fetch inventory.');
              const product = candidates[0];

              // Fetch inventory rows for this product id. Include combination info if available.
              // First get combinations for this product (if the schema uses combination-based inventory)
              const { data: combinations, error: combErr } = await supabase
                .from('product_variant_combinations')
                .select('combination_id, variants')
                .eq('product_id', product.id);

              if (combErr) {
                console.error('Error fetching product_variant_combinations:', combErr);
                process.exit(4);
              }

              let inventoryRows = [];

              if (Array.isArray(combinations) && combinations.length > 0) {
                const comboIds = combinations.map(c => c.combination_id).filter(Boolean);
                if (comboIds.length > 0) {
                  const { data: invByCombo, error: invErr } = await supabase
                    .from('inventory')
                    .select('quantity, low_stock_limit, status, combination_id, product_variant_combinations(variants)')
                    .in('combination_id', comboIds);

                  if (invErr) {
                    console.error('Inventory query error (by combination_id):', invErr);
                    process.exit(4);
                  }

                  inventoryRows = invByCombo || [];
                }
              }

              // If no inventory rows found via combinations, try a more general inventory scan (no product_id filtering available)
              if (!inventoryRows || inventoryRows.length === 0) {
                // Try to find any inventory row that references this product in a combination via a join
                // (some schemas don't expose product_id on inventory)
                const { data: joined, error: joinedErr } = await supabase
                  .from('inventory')
                  .select('quantity, low_stock_limit, status, combination_id, product_variant_combinations(variants)');

                if (joinedErr) {
                  console.error('Inventory general scan error:', joinedErr);
                } else {
                  // Narrow down to rows whose combination_id appears in combinations
                  if (Array.isArray(combinations) && combinations.length > 0) {
                    const comboSet = new Set((combinations || []).map(c => c.combination_id));
                    inventoryRows = (joined || []).filter(r => comboSet.has(r.combination_id));
                  } else {
                    inventoryRows = joined || [];
                  }
                }
              }

              if (!inventoryRows || inventoryRows.length === 0) {
                console.log('No inventory rows found for product id', product.id);
                console.log('total_stock: 0');
                return;
              }

              const total = inventoryRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
              console.log('Using product id', product.id, 'name="' + product.name + '"');
              console.log('inventory_rows_count:', inventoryRows.length);
              console.log('total_stock:', total);
              console.log('inventory_rows:');
              console.log(JSON.stringify(inventoryRows, null, 2));
              return;
            }
          }
        } catch (e) {
          console.error('Candidates lookup unexpected error:', e);
        }

        process.exit(3);
      }

      const product = found.data;
      console.log('Found product (method=' + found.method + '):', product);

    // Fetch inventory rows for this product id. Include combination info if available.
    const { data: inventoryRows, error: invErr } = await supabase
      .from('inventory')
      .select('id, quantity, low_stock_limit, status, combination_id, product_variant_combinations(variants)')
      .eq('product_id', product.id);

    if (invErr) {
      console.error('Inventory query error:', invErr);
      process.exit(4);
    }

    if (!inventoryRows || inventoryRows.length === 0) {
      console.log('No inventory rows found for product id', product.id);
      console.log('total_stock: 0');
      return;
    }

    const total = inventoryRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    console.log('inventory_rows_count:', inventoryRows.length);
    console.log('total_stock:', total);
    console.log('inventory_rows:');
    console.log(JSON.stringify(inventoryRows, null, 2));
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(5);
  }
}

run();
