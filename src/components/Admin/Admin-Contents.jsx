import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

// Small color name map reused from Cart page for hex -> friendly name
const colorNames = {
    "#c40233": "Red",
    "#000000": "Black",
    "#ffffff": "White",
    "#ede8d0": "Beige",
    "#808080": "Gray",
    "#228b22": "Green",
    "#0000ff": "Blue",
    "#ffd700": "Yellow",
    "#c0c0c0": "Silver",
    "#ffc0cb": "Pink",
    "#4169e1": "Blue",
    "#800080": "Purple"
};

const normalizeHexCode = (value) => {
    if (!value) return null;
    let normalized = String(value).trim().toLowerCase();
    if (!normalized.startsWith('#')) normalized = `#${normalized}`;
    const hexRegex = /^#[0-9a-f]{6}$/i;
    return hexRegex.test(normalized) ? normalized : value;
};

const StocksList = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingInventory, setEditingInventory] = useState(null);
    const [editQuantity, setEditQuantity] = useState(0);
    const [editLoading, setEditLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            // helper to fetch and normalize rows (kept local so the realtime handler can call it)
            try {
                // helper to normalize raw inventory rows into the UI shape (reused for joined or simple fallback)
                const normalizeInventoryData = async (rawData) => {
                    const data = rawData || [];
                    // First collect all product_variant_value ids referenced in combinations so we can resolve names
                    const allVariantIds = new Set();
                    data.forEach(inv => {
                        const combo = Array.isArray(inv.product_variant_combinations) ? inv.product_variant_combinations[0] : inv.product_variant_combinations;
                        const variantsArr = Array.isArray(combo?.variants) ? combo.variants : (combo?.variants != null ? [combo.variants] : []);
                        variantsArr.forEach(v => { if (v != null) allVariantIds.add(v); });
                    });

                    // Map of product_variant_value_id -> { valueName, groupName }
                    let pvvMap = {};
                    // Build a product-scoped lookup cache so we can prefer product-specific mappings and avoid cross-product mismatches
                    const variantsByProduct = new Map();
                    data.forEach(inv => {
                        const combo = Array.isArray(inv.product_variant_combinations) ? inv.product_variant_combinations[0] : inv.product_variant_combinations;
                        const productId = combo?.product_id ?? combo?.products?.id ?? (Array.isArray(combo?.products) ? combo.products[0]?.id : null);
                        const variantsArr = Array.isArray(combo?.variants) ? combo.variants : (combo?.variants != null ? [combo.variants] : []);
                        const key = productId == null ? 'global' : String(productId);
                        const set = variantsByProduct.get(key) || new Set();
                        variantsArr.forEach(v => { if (v != null) set.add(v); });
                        variantsByProduct.set(key, set);
                    });

                    const productLookupCache = {};
                    if (allVariantIds.size > 0) {
                        try {
                            const { data: pvvData, error: pvvErr } = await supabase
                                .from('product_variant_values')
                                .select('product_variant_value_id, variant_value_id, price, variant_values(value_name, variant_group_id, variant_groups(variant_group_id, name))')
                                .in('product_variant_value_id', Array.from(allVariantIds));

                            if (!pvvErr && Array.isArray(pvvData) && pvvData.length > 0) {
                                pvvData.forEach(pvv => {
                                    const id = pvv.product_variant_value_id ?? pvv.id;
                                    const vv = pvv.variant_values;
                                    const valueName = vv?.value_name || '';
                                    const groupName = vv?.variant_groups?.name || (vv?.variant_group_id != null ? String(vv.variant_group_id) : '');
                                    pvvMap[String(id)] = { valueName, groupName, price: Number(pvv.price || 0), variant_value_id: pvv.variant_value_id };
                                });
                            }

                            const { data: pvvByVv, error: pvvByVvErr } = await supabase
                                .from('product_variant_values')
                                .select('product_variant_value_id, variant_value_id, price, variant_values(value_name, variant_group_id, variant_groups(variant_group_id, name))')
                                .in('variant_value_id', Array.from(allVariantIds));
                            if (!pvvByVvErr && Array.isArray(pvvByVv) && pvvByVv.length > 0) {
                                pvvByVv.forEach(pvv => {
                                    const id = pvv.product_variant_value_id ?? pvv.id;
                                    const vv = pvv.variant_values;
                                    const valueName = vv?.value_name || '';
                                    const groupName = vv?.variant_groups?.name || (vv?.variant_group_id != null ? String(vv.variant_group_id) : '');
                                    pvvMap[String(id)] = { valueName, groupName, price: Number(pvv.price || 0), variant_value_id: pvv.variant_value_id };
                                    if (pvv.variant_value_id != null) pvvMap[String(pvv.variant_value_id)] = { valueName, groupName, price: Number(pvv.price || 0), variant_value_id: pvv.variant_value_id };
                                });
                            }

                            for (const [prodKey, idSet] of variantsByProduct.entries()) {
                                const ids = Array.from(idSet);
                                if (!ids.length) continue;
                                if (prodKey !== 'global') {
                                    try {
                                        const { data: scoped, error: scopedErr } = await supabase
                                            .from('product_variant_values')
                                            .select('product_variant_value_id, variant_value_id, price, variant_values(value_name, variant_group_id, variant_groups(variant_group_id, name))')
                                            .eq('product_id', prodKey)
                                            .in('product_variant_value_id', ids);
                                        if (!scopedErr && Array.isArray(scoped) && scoped.length > 0) {
                                            productLookupCache[prodKey] = productLookupCache[prodKey] || {};
                                            scoped.forEach(pvv => {
                                                const id = pvv.product_variant_value_id ?? pvv.id;
                                                const vv = pvv.variant_values;
                                                const valueName = vv?.value_name || '';
                                                const groupName = vv?.variant_groups?.name || (vv?.variant_group_id != null ? String(vv.variant_group_id) : '');
                                                productLookupCache[prodKey][String(id)] = { valueName, groupName, price: Number(pvv.price || 0), variant_value_id: pvv.variant_value_id };
                                                if (pvv.variant_value_id != null) productLookupCache[prodKey][String(pvv.variant_value_id)] = { valueName, groupName, price: Number(pvv.price || 0), variant_value_id: pvv.variant_value_id };
                                            });
                                        }
                                    } catch (e) {
                                        // ignore per-product fetch errors — we'll fallback to global map
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to fetch product_variant_values for variant name/price resolution', e);
                        }

                        if (Object.keys(pvvMap).length === 0) {
                            try {
                                const { data: vvData, error: vvErr } = await supabase
                                    .from('variant_values')
                                    .select('variant_value_id, value_name, variant_group_id, variant_groups(variant_group_id, name)')
                                    .in('variant_value_id', Array.from(allVariantIds));
                                if (!vvErr && Array.isArray(vvData)) {
                                    vvData.forEach(vv => {
                                        const id = vv.variant_value_id ?? vv.id;
                                        const valueName = vv.value_name || '';
                                        const groupName = vv?.variant_groups?.name || (vv?.variant_group_id != null ? String(vv.variant_group_id) : '');
                                        pvvMap[String(id)] = { valueName, groupName, price: 0, variant_value_id: id };
                                    });
                                }
                            } catch (ee) {
                                console.warn('Failed to fetch variant_values fallback', ee);
                            }
                        }
                    }

                    const mapped = data.map(inv => {
                        const combo = Array.isArray(inv.product_variant_combinations) ? inv.product_variant_combinations[0] : inv.product_variant_combinations;
                        const prod = combo?.products || combo?.product || (Array.isArray(combo?.products) ? combo.products[0] : null) || null;
                        const product = Array.isArray(prod) ? prod[0] : prod;
                        const productName = product?.name || '';
                        // product_types may be an object or array; prefer first element when array
                        const productTypes = Array.isArray(product?.product_types) ? product.product_types[0] : product?.product_types || null;
                        const category = productTypes?.product_categories?.name || productTypes?.name || '';
                        const category_id = productTypes?.category_id || productTypes?.product_categories?.id || null;
                        const price = product?.starting_price ?? product?.price ?? null;
                        const image = product?.image_url || product?.image || null;

                        const variantsArr = Array.isArray(combo?.variants) ? combo.variants : (combo?.variants != null ? [combo.variants] : []);
                        let variantPriceTotal = 0;
                        const productKey = String(product?.id ?? 'global');
                        const variantParts = variantsArr.map(vId => {
                            const key = String(vId);
                            const scoped = (productLookupCache[productKey] && productLookupCache[productKey][key]) || null;
                            const global = pvvMap[key] || null;
                            const m = scoped || global || null;
                            let display = m?.valueName || String(vId);
                            const group = (m?.groupName || '').toLowerCase();
                            if (group.includes('color') || group.includes('colour')) {
                                const normalized = normalizeHexCode(display);
                                display = colorNames[normalized] || colorNames[display] || display;
                            }
                            const priceForVariant = Number(scoped?.price ?? global?.price ?? 0);
                            variantPriceTotal += priceForVariant;
                            return display;
                        }).filter(Boolean);

                        const variantDesc = variantParts.length ? variantParts.join(', ') : (Array.isArray(combo?.variants) ? combo.variants.join(', ') : combo?.variants || '');

                        const basePrice = Number(price ?? 0);
                        const totalPrice = basePrice + variantPriceTotal;

                        return {
                            inventory_id: inv.inventory_id,
                            combination_id: inv.combination_id,
                            quantity: inv.quantity,
                            low_stock_limit: inv.low_stock_limit,
                            status: inv.status,
                            updated_at: inv.updated_at,
                            product: { id: product?.id, name: productName, category, category_id, price: totalPrice, image, basePrice },
                            variantDesc,
                        };
                    });

                    // If some rows lack a category name but have a category_id, fetch category names
                    const missingCatIds = Array.from(new Set((mapped || []).filter(m => (!m.product?.category || m.product.category === '') && m.product?.category_id).map(m => m.product.category_id)));
                    if (missingCatIds.length > 0) {
                        try {
                            const { data: catData, error: catErr } = await supabase
                                .from('product_categories')
                                .select('id, name')
                                .in('id', missingCatIds);
                            if (!catErr && Array.isArray(catData)) {
                                const catMap = {};
                                catData.forEach(c => { catMap[String(c.id)] = c.name; });
                                mapped.forEach(m => {
                                    const cid = m.product?.category_id;
                                    if ((!m.product?.category || m.product.category === '') && cid && catMap[String(cid)]) {
                                        m.product.category = catMap[String(cid)];
                                    }
                                });
                            }
                        } catch (ee) {
                            console.warn('Failed to load product_categories for category_id fallback', ee);
                        }
                    }

                    if (mounted) {
                        setRows(mapped);
                        const cats = Array.from(new Set((mapped || []).map(r => r.product?.category).filter(Boolean)));
                        cats.sort();
                        setCategories(['All', ...cats]);
                    }
                };

                // Try to fetch inventory with related combination -> product -> product_types -> product_categories
                // Fetch inventory in pages to avoid server-side limits (e.g. 1000 rows max)
                const pageSize = 1000;
                let page = 0;
                let allData = [];
                let error = null;
                while (true) {
                    const start = page * pageSize;
                    const end = (page + 1) * pageSize - 1;
                    const res = await supabase
                        .from('inventory')
                        .select(
                            `inventory_id, combination_id, quantity, low_stock_limit, updated_at, status,
                             product_variant_combinations(combination_id, variants, product_id, products(id, name, starting_price, image_url, product_types(id, name, product_categories(id, name))))`
                        )
                        .order('inventory_id', { ascending: false })
                        .range(start, end);
                    if (res.error) {
                        error = res.error;
                        break;
                    }
                    const chunk = res.data || [];
                    allData = allData.concat(chunk);
                    if (chunk.length < pageSize) break;
                    page += 1;
                }
                const data = allData;
                if (error) {
                    console.warn('inventory fetch error (joined)', error);
                    // Fallback to simple fetch
                    // Paginate simple fetch as well
                    const simplePageSize = 1000;
                    let simplePage = 0;
                    let allSimple = [];
                    let simpleErr = null;
                    while (true) {
                        const sstart = simplePage * simplePageSize;
                        const send = (simplePage + 1) * simplePageSize - 1;
                        const res = await supabase
                            .from('inventory')
                            .select('inventory_id, combination_id, quantity, low_stock_limit, updated_at, status')
                            .order('inventory_id', { ascending: false })
                            .range(sstart, send);
                        if (res.error) {
                            simpleErr = res.error;
                            break;
                        }
                        const chunk = res.data || [];
                        allSimple = allSimple.concat(chunk);
                        if (chunk.length < simplePageSize) break;
                        simplePage += 1;
                    }
                    const simpleData = allSimple;
                    if (simpleErr) {
                        console.warn('inventory simple fetch failed', simpleErr);
                        if (mounted) setRows([]);
                    } else {
                        // enrich simple rows by fetching combinations/products so normalization can run unchanged
                        const comboIds = Array.from(new Set((simpleData || []).map(d => d.combination_id).filter(Boolean)));
                            let combos = [];
                            if (comboIds.length > 0) {
                                try {
                                    const chunkSize = 500;
                                    for (let i = 0; i < comboIds.length; i += chunkSize) {
                                        const batch = comboIds.slice(i, i + chunkSize);
                                        const { data: comboData, error: comboErr } = await supabase
                                            .from('product_variant_combinations')
                                            .select('combination_id, variants, product_id, products(id, name, starting_price, image_url, product_types(id, name, product_categories(id, name)))')
                                            .in('combination_id', batch);
                                        if (!comboErr && Array.isArray(comboData)) combos = combos.concat(comboData);
                                    }
                                } catch (ee) {
                                    console.warn('Failed to fetch combos for fallback rows', ee);
                                }
                            }

                        const enriched = (simpleData || []).map(d => ({
                            ...d,
                            product_variant_combinations: (combos.find(c => String(c.combination_id) === String(d.combination_id)) ? [combos.find(c => String(c.combination_id) === String(d.combination_id))] : [])
                        }));

                        // Normalize enriched rows
                        await normalizeInventoryData(enriched);
                    }
                } else {
                    // Normalize rows to a consistent shape for rendering
                    await normalizeInventoryData(data);
                }
            } catch (err) {
                console.error('inventory load error', err);
                if (mounted) setRows([]);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        // Initial load
        load();

        // Subscribe to realtime changes for inventory/products/combinations and refetch when changes occur
        const channel = supabase.channel('public:admin-stocks');
        try {
            channel
                .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => { load(); })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { load(); })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variant_combinations' }, () => { load(); })
                .subscribe();
        } catch (e) {
            console.warn('Realtime subscription failed', e);
        }

        // Listen for edit-stock events to open inline editor
        const editHandler = (e) => {
            const inv = e?.detail?.inventory;
            if (!inv) return;
            setEditingInventory(inv);
            setEditQuantity(Number(inv.quantity ?? 0));
        };
        window.addEventListener('edit-stock', editHandler);

        // Listen for programmatic refresh requests (update flow will dispatch this)
        const refreshHandler = () => { load(); };
        window.addEventListener('admin-stocks-refresh', refreshHandler);

        return () => {
            mounted = false;
            // cleanup subscription
            try { if (channel && typeof channel.unsubscribe === 'function') channel.unsubscribe(); } catch (e) { /* ignore */ }
            window.removeEventListener('edit-stock', editHandler);
            window.removeEventListener('admin-stocks-refresh', refreshHandler);
        };
    }, []);

    if (loading) return <div className="text-gray-600">Loading inventory...</div>;

    const filteredRows = selectedCategory && selectedCategory !== 'All' ? rows.filter(r => (r.product?.category || '') === selectedCategory) : rows;

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div />
                <div className="relative">
                    <button className="bg-white border px-3 py-1 rounded-md text-sm" onClick={() => setShowCategoryDropdown(s => !s)}>
                        Category: {selectedCategory}
                    </button>
                    {showCategoryDropdown && (
                        <div className="absolute right-0 mt-1 bg-white border rounded shadow-md z-10 w-48">
                            {categories.map(cat => (
                                <div key={cat} className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${cat === selectedCategory ? 'font-semibold' : ''}`} onClick={() => { setSelectedCategory(cat); setShowCategoryDropdown(false); }}>
                                    {cat}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full table-auto">
                <thead>
                    <tr className="text-left text-sm text-gray-600">
                        <th className="px-4 py-2">Product Name</th>
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2">Price</th>
                        <th className="px-4 py-2">Variant</th>
                        <th className="px-4 py-2">Stock</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredRows.map(r => (
                        <tr key={r.inventory_id || r.combination_id} className="border-t">
                            <td className="px-4 py-3 align-top">
                                <div className="flex items-center gap-3">
                                    <img src={r.product?.image || '/apparel-images/caps.png'} alt="thumb" className="w-14 h-14 object-cover rounded" />
                                    <div>
                                        <div className="text-gray-900 font-medium">{r.product?.name || '—'}</div>
                                        <div className="text-xs text-gray-500">{r.product?.id ? `TOTAL: ${r.quantity ?? '—'}` : ''}</div>
                                    </div>
                                </div>
                            </td>

                            <td className="px-4 py-3 align-top text-gray-700">{r.product?.category || '—'}</td>

                            <td className="px-4 py-3 align-top text-gray-800">{r.product?.price != null ? `₱${Number(r.product.price).toFixed(2)}` : '—'}</td>

                            <td className="px-4 py-3 align-top text-gray-700">{r.variantDesc || '—'}</td>

                            <td className="px-4 py-3 align-top text-gray-800">{r.quantity ?? 0}</td>

                            <td className="px-4 py-3 align-top">
                                {((r.quantity ?? 0) <= 0) ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-red-100 text-red-700">Out of Stock</span>
                                ) : ((r.low_stock_limit != null && (r.quantity ?? 0) <= r.low_stock_limit) ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-yellow-100 text-yellow-800">Low Stock</span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-green-100 text-green-800">Active</span>
                                ))}
                            </td>

                            <td className="px-4 py-3 align-top">
                                {editingInventory && (editingInventory.inventory_id === r.inventory_id || editingInventory.combination_id === r.combination_id) ? (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center border rounded-md overflow-hidden">
                                            <button className="px-2" onClick={() => setEditQuantity(q => Math.max(0, q - 1))}>-</button>
                                            <input className="w-16 text-center px-2" type="number" value={editQuantity} onChange={(e) => setEditQuantity(Number(e.target.value ?? 0))} />
                                            <button className="px-2" onClick={() => setEditQuantity(q => q + 1)}>+</button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                                                disabled={editLoading}
                                                onClick={async () => {
                                                        try {
                                                            setEditLoading(true);
                                                            const updateData = { quantity: Number(editQuantity) };
                                                            let upData = null;
                                                            let upErr = null;
                                                            const attempts = [];

                                                            // Candidate columns to try
                                                            const candidates = [
                                                                { col: 'inventory_id', val: r.inventory_id },
                                                                { col: 'id', val: r.inventory_id },
                                                                { col: 'inventoryid', val: r.inventory_id },
                                                                { col: 'combination_id', val: r.combination_id },
                                                            ];

                                                            for (const c of candidates) {
                                                                if (c.val == null) continue;
                                                                // try as-is and as numeric (some DBs store ints)
                                                                const trialVals = [c.val, Number(c.val)];
                                                                for (const tv of trialVals) {
                                                                    try {
                                                                        const res = await supabase
                                                                            .from('inventory')
                                                                            .update(updateData)
                                                                            .eq(c.col, tv)
                                                                            .select();
                                                                        attempts.push({ col: c.col, val: tv, rows: Array.isArray(res.data) ? res.data.length : (res.data ? 1 : 0), error: res.error });
                                                                        if (!res.error && res.data && ((Array.isArray(res.data) && res.data.length > 0) || (!Array.isArray(res.data) && res.data))) {
                                                                            upData = res.data;
                                                                            upErr = res.error;
                                                                            break;
                                                                        }
                                                                    } catch (e2) {
                                                                        attempts.push({ col: c.col, val: tv, rows: 0, error: e2 });
                                                                    }
                                                                }
                                                                if (upData) break;
                                                            }

                                                            console.debug('Inventory update attempts', attempts);
                                                            if (!upData && !upErr) {
                                                                // As a last resort, try match() with possible keys present in the row
                                                                const candidatesObj = {};
                                                                if (r.inventory_id != null) candidatesObj.inventory_id = r.inventory_id;
                                                                if (r.combination_id != null) candidatesObj.combination_id = r.combination_id;
                                                                if (Object.keys(candidatesObj).length > 0) {
                                                                    try {
                                                                        const res = await supabase.from('inventory').update(updateData).match(candidatesObj).select();
                                                                        attempts.push({ col: 'match', val: candidatesObj, rows: Array.isArray(res.data) ? res.data.length : (res.data ? 1 : 0), error: res.error });
                                                                        upData = res.data;
                                                                        upErr = res.error;
                                                                    } catch (e3) {
                                                                        attempts.push({ col: 'match', val: candidatesObj, rows: 0, error: e3 });
                                                                    }
                                                                }
                                                            }

                                                            console.debug('Inventory update response', { upData, upErr });
                                                            if (upErr) {
                                                                console.warn('Failed to update inventory', upErr);
                                                                window.alert('Failed to update inventory: ' + JSON.stringify(upErr));
                                                            } else if (!upData || (Array.isArray(upData) && upData.length === 0)) {
                                                                console.warn('Update returned no rows', upData);
                                                                window.alert('Update did not return any rows.');
                                                            } else {
                                                                // Optimistically update local rows so UI immediately reflects change
                                                                try {
                                                                    setRows(prev => (prev || []).map(rw => {
                                                                        const match = (upData && Array.isArray(upData) && upData.length > 0) ? upData.some(d => (d.inventory_id && rw.inventory_id && String(d.inventory_id) === String(rw.inventory_id)) || (d.combination_id && rw.combination_id && String(d.combination_id) === String(rw.combination_id))) : false;
                                                                        if (match) {
                                                                            return { ...rw, quantity: Number(editQuantity) };
                                                                        }
                                                                        return rw;
                                                                    }));
                                                                } catch (e) { /* ignore optimistic update errors */ }

                                                                // notify other listeners and refresh (refresh will re-run load)
                                                                window.dispatchEvent(new CustomEvent('admin-stocks-refresh'));
                                                                setEditingInventory(null);
                                                                window.alert('Inventory updated');
                                                            }
                                                        } catch (e) {
                                                            console.error('Update inventory exception', e);
                                                            window.alert('Error updating inventory: ' + (e.message || e));
                                                        } finally {
                                                            setEditLoading(false);
                                                        }
                                                    }}
                                            >
                                                {editLoading ? 'Updating...' : 'UPDATE'}
                                            </button>
                                            <button className="bg-red-600 text-white px-3 py-1 rounded text-sm" onClick={() => setEditingInventory(null)}>CANCEL</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className="bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
                                        onClick={() => window.dispatchEvent(new CustomEvent('edit-stock', { detail: { inventory: r } }))}
                                    >
                                        Edit Stock
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
    );
};

const AdminContents = () => {
    const [selected, setSelected] = useState('Dashboard');

    useEffect(() => {
        const handler = (e) => {
            const sec = e?.detail?.section;
            if (sec) setSelected(sec);
        };
        window.addEventListener('admin-nav-select', handler);
        return () => window.removeEventListener('admin-nav-select', handler);
    }, []);

    const containerClass = 'p-6 bg-white rounded-lg shadow-sm border border-gray-200';

    return (
        <div className="flex-1 ml-[263px] p-8 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Admin • {selected}</h1>
                <p className="text-gray-600 mt-1">Use the sidebar to switch sections. Content containers are shown in-page.</p>
            </div>

            <div>
                <div style={{ display: selected === 'Dashboard' ? 'block' : 'none' }} className={containerClass}>
                    <h2 className="text-lg font-semibold mb-3">Dashboard</h2>
                    <p className="text-gray-700">Overview and quick stats go here.</p>
                </div>

                <div style={{ display: selected === 'Stocks' ? 'block' : 'none' }} className={`${containerClass} mt-6`}>
                    <h2 className="text-lg font-semibold mb-3">Stocks</h2>
                    <p className="text-gray-700 mb-4">Inventory and stock controls — fetched from the <code>inventory</code> table.</p>
                    <StocksList />
                </div>

                <div style={{ display: selected === 'Products' ? 'block' : 'none' }} className={`${containerClass} mt-6`}>
                    <h2 className="text-lg font-semibold mb-3">Products</h2>
                    <p className="text-gray-700">Manage products in this container.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminContents;
