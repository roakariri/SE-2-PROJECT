import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

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

// Resolve image key like Cap-Info: accept full URLs or plain keys, try a list of buckets
// using getPublicUrl(cleanKey), and if the key already contains a bucket/path try that directly.
const resolveImageKeyAsync = async (img) => {
    if (!img) return null;
    try {
        const s = String(img).trim();
        if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;

        const cleanKey = s.replace(/^\/+/, '');

        // Try a list of likely buckets (same order used in Cap-Info)
    // Default bucket order (generic)
    let bucketsToTry = ['accessoriesdecorations-images', 'apparel-images', '3d-prints-images', 'product-images', 'images', 'public'];
        // If this product looks like apparel, prefer apparel-images first (matches product pages)
        try {
            const look = String((productName || productTypes?.name || category || '')).toLowerCase();
            const apparelKeywords = ['apparel','shirt','t-shirt','tshirt','hoodie','sweatshirt','cap','hat','tote','bag','rtshirt','rounded_t-shirt','hoodie'];
            const isApparel = apparelKeywords.some(k => look.includes(k)) || String(category || '').toLowerCase().includes('apparel');
            if (isApparel) {
                bucketsToTry = ['apparel-images', 'accessoriesdecorations-images', 'accessories-images', 'images', 'product-images', 'public'];
            }
        } catch (e) { /* ignore */ }

        for (const bucket of bucketsToTry) {
            try {
                const { data, error } = supabase.storage.from(bucket).getPublicUrl(cleanKey);
                // Supabase sometimes returns data.publicUrl or data.publicURL
                const url = data?.publicUrl || data?.publicURL || null;
                if (url && !String(url).endsWith('/')) return url;
            } catch (e) {
                // ignore and try next bucket
            }
        }

        // If key looks like 'bucket/path/to/file.png', try using that bucket directly
        const parts = cleanKey.split('/');
        if (parts.length > 1) {
            const bucket = parts.shift();
            const path = parts.join('/');
            try {
                const { data, error } = supabase.storage.from(bucket).getPublicUrl(path);
                const url = data?.publicUrl || data?.publicURL || null;
                if (url && !String(url).endsWith('/')) return url;
            } catch (e) {
                // ignore
            }
        }

        // Try signed URL for the most-likely bucket names (non-blocking)
        for (const bucket of bucketsToTry) {
            try {
                const signed = await supabase.storage.from(bucket).createSignedUrl(cleanKey, 60);
                const signedUrl = signed?.data?.signedUrl || signed?.signedUrl || null;
                if (signedUrl) return signedUrl;
            } catch (e) {
                // ignore
            }
        }

        // Fallback: return the original key so caller can synthesize a URL if desired
        return cleanKey;
    } catch (e) {
        return null;
    }
};

// Synchronous best-effort resolver used in render paths to avoid async/await.
// It will return a publicUrl when possible (getPublicUrl is synchronous in the client).
const resolveImageUrl = (img) => {
    if (!img) return null;
    try {
        const s = String(img).trim();
        if (s.startsWith('http://') || s.startsWith('https://')) return s;
        const key = s.replace(/^\//, '');
        const parts = key.split('/');
        if (parts.length < 2) return s;
        const bucket = parts.shift();
        const path = parts.join('/');
        try {
            const res = supabase.storage.from(bucket).getPublicUrl(path);
            const publicUrl = res?.data?.publicUrl || res?.publicUrl || null;
            return publicUrl || s;
        } catch (e) {
            return s;
        }
    } catch (e) {
        return null;
    }
};

const OrdersList = () => {
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        const pageSize = 500; // large enough; adjust if needed
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                let all = [];
                let page = 0;
                // Determine a valid order-by column
                const orderCandidates = ['order_id', 'created_at', 'date_ordered', 'id'];
                let chosenOrder = null;
                for (const cand of orderCandidates) {
                    try {
                        const probe = await supabase
                            .from('orders')
                            .select('*')
                            .order(cand, { ascending: false })
                            .range(0, 0);
                        if (!probe.error) { chosenOrder = cand; break; }
                    } catch (e) {
                        // ignore and try next candidate
                    }
                }

                while (true) {
                    const start = page * pageSize;
                    const end = (page + 1) * pageSize - 1;
                    let res;
                    if (chosenOrder) {
                        res = await supabase
                            .from('orders')
                            .select('*')
                            .order(chosenOrder, { ascending: false })
                            .range(start, end);
                    } else {
                        res = await supabase
                            .from('orders')
                            .select('*')
                            .range(start, end);
                    }
                    if (res.error) throw res.error;
                    const chunk = res.data || [];
                    all = all.concat(chunk);
                    if (chunk.length < pageSize) break;
                    page += 1;
                }

                // Build a userId -> name map from related tables if available
                const isUuid = (v) => typeof v === 'string' && /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(v);
                const userIds = Array.from(new Set((all || []).map(o => (
                    o.user_id ?? o.customer_id ?? o.userId ?? o.customerId ?? null
                )).filter(Boolean)));
                const nameMap = {};
                const avatarMap = {};
                const deriveName = (rec) => {
                    const first = rec.first_name ?? rec.given_name ?? rec.first ?? '';
                    const last = rec.last_name ?? rec.family_name ?? rec.last ?? '';
                    const fullPref = rec.display_name ?? rec.full_name ?? rec.name ?? `${first} ${last}`.trim();
                    return (fullPref && fullPref !== ' ') ? fullPref : (rec.email ?? rec.username ?? rec.handle ?? '');
                };

                if (userIds.length > 0) {
                    try {
                        // Try profiles by user_id
                        const p1 = await supabase
                            .from('profiles')
                            .select('user_id, id, display_name, full_name, name, first_name, last_name, email, avatar_url')
                            .in('user_id', userIds);
                        if (!p1.error && Array.isArray(p1.data)) {
                            p1.data.forEach(r => {
                                const nm = deriveName(r);
                                if (r.user_id) nameMap[String(r.user_id)] = nm;
                                if (r.id) nameMap[String(r.id)] = nm;
                                if (r.user_id && r.avatar_url) avatarMap[String(r.user_id)] = r.avatar_url;
                            });
                        }
                    } catch {}
                    try {
                        // Try profiles by id if user_id didn't cover
                        const missing = userIds.filter(uid => nameMap[String(uid)] == null);
                        if (missing.length > 0) {
                            const p2 = await supabase
                                .from('profiles')
                                .select('user_id, id, display_name, full_name, name, first_name, last_name, email, avatar_url')
                                .in('id', missing);
                            if (!p2.error && Array.isArray(p2.data)) {
                                p2.data.forEach(r => {
                                    const nm = deriveName(r);
                                    if (r.user_id) nameMap[String(r.user_id)] = nm;
                                    if (r.id) nameMap[String(r.id)] = nm;
                                    if (r.user_id && r.avatar_url) avatarMap[String(r.user_id)] = r.avatar_url;
                                });
                            }
                        }
                    } catch {}
                    // Note: querying auth.users directly is not permitted from client.
                    // Prefer a secure RPC (SECURITY DEFINER) that reads from auth.users.
                    // Only attempt RPC when there is a Supabase auth session; otherwise skip to avoid 404/400 noise.
                    try {
                        const missingAuth = userIds.filter(uid => nameMap[String(uid)] == null);
                        const rpcIds = missingAuth.map(x => String(x)).filter(isUuid);
                        if (rpcIds.length > 0) {
                            const { data: sessionData } = await supabase.auth.getSession();
                            if (sessionData?.session) {
                                const { data: rpcData, error: rpcErr } = await supabase.rpc('get_user_public_names', { ids: rpcIds });
                                if (!rpcErr && Array.isArray(rpcData)) {
                                    rpcData.forEach(r => {
                                        if (r?.id && (r?.name || r?.email_local)) {
                                            nameMap[String(r.id)] = r.name || r.email_local || nameMap[String(r.id)] || '';
                                        }
                                    });
                                }
                            }
                        }
                    } catch {}
                    try {
                        // Try customers table by id
                        const stillMissing = userIds.filter(uid => nameMap[String(uid)] == null);
                        if (stillMissing.length > 0) {
                            const c1 = await supabase
                                .from('customers')
                                .select('id, customer_id, full_name, name, first_name, last_name, email')
                                .in('id', stillMissing);
                            if (!c1.error && Array.isArray(c1.data)) {
                                c1.data.forEach(r => {
                                    const nm = deriveName(r);
                                    if (r.customer_id) nameMap[String(r.customer_id)] = nm;
                                    if (r.id) nameMap[String(r.id)] = nm;
                                });
                            }
                        }
                    } catch {}
                    try {
                        // Try customers table by customer_id
                        const stillMissing2 = userIds.filter(uid => nameMap[String(uid)] == null);
                        if (stillMissing2.length > 0) {
                            const c2 = await supabase
                                .from('customers')
                                .select('id, customer_id, full_name, name, first_name, last_name, email')
                                .in('customer_id', stillMissing2);
                            if (!c2.error && Array.isArray(c2.data)) {
                                c2.data.forEach(r => {
                                    const nm = deriveName(r);
                                    if (r.customer_id) nameMap[String(r.customer_id)] = nm;
                                    if (r.id) nameMap[String(r.id)] = nm;
                                });
                            }
                        }
                    } catch {}
                }

                // Map flexible fields to UI shape
                const mapped = (all || []).map(o => {
                    const orderId = o.order_id ?? o.id ?? o.reference ?? o.number ?? null;
                    const dateRaw = o.date_ordered ?? o.created_at ?? o.createdAt ?? o.placed_at ?? null;
                    const status = o.status ?? o.order_status ?? 'In Progress';
                    const amount = o.total_amount ?? o.total ?? o.amount ?? 0;
                    const uId = o.user_id ?? o.customer_id ?? o.userId ?? o.customerId ?? null;

                    // Base fallback from inline fields
                    const first = o.customer_first_name ?? o.first_name ?? o.first ?? '';
                    const last = o.customer_last_name ?? o.last_name ?? o.last ?? '';
                    let customer = o.customer_name ?? o.name ?? `${first} ${last}`.trim();
                    if (!customer && uId != null) {
                        const nm = nameMap[String(uId)];
                        if (nm) customer = nm;
                    }

                    // Format date to YYYY-MM-DD
                    let date = '';
                    try {
                        if (dateRaw) {
                            const d = new Date(dateRaw);
                            if (!isNaN(d)) date = d.toISOString().slice(0, 10);
                        }
                    } catch {}

                    return { id: orderId, customer: customer || '—', date, status, amount: Number(amount || 0) };
                }).filter(r => r.id != null);

                if (mounted) setRows(mapped);
            } catch (e) {
                if (mounted) setError(e?.message || String(e));
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, []);

    const filtered = rows.filter(r =>
        String(r.id).toLowerCase().includes(search.toLowerCase()) ||
        (r.customer || '').toLowerCase().includes(search.toLowerCase())
    );

    const statusBadge = (s) => {
        const base = 'inline-flex items-center px-2 py-1 rounded text-sm';
        if (s === 'Delivered') return <span className={`${base} bg-green-100 text-green-800`}>Delivered</span>;
        if (s === 'Cancelled') return <span className={`${base} bg-red-100 text-red-700`}>Cancelled</span>;
        return <span className={`${base} bg-yellow-100 text-yellow-800`}>In Progress</span>;
    };

    const peso = (n) => `₱${Number(n).toFixed(2)}`;

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-[24px] font-bold text-gray-900">Orders</h2>
                <div className="relative w-[241px]">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.8l3.613 3.614a.75.75 0 1 0 1.06-1.06l-3.614-3.614A5.5 5.5 0 0 0 9 3.5Zm-4 5.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search order"
                        className="w-[241px] pl-9 pr-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20"
                    />
                </div>
            </div>

            {error && (
                <div className="mb-2 text-red-600 text-sm">{error}</div>
            )}
            {loading && (
                <div className="mb-2 text-gray-600 text-sm">Loading orders…</div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full table-fixed rounded-md">
                    <colgroup>
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead className="sticky top-0 bg-[#DFE7F4]">
                        <tr className="text-left text-[16px] text-gray-600">
                            <th className="px-4 py-2">Order ID</th>
                            <th className="px-4 py-2">Customer</th>
                            <th className="px-4 py-2">Date Ordered</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Total Amount</th>
                            <th className="px-4 py-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((r) => (
                            <tr key={r.id} className="border-t">
                                <td className="px-4 py-3 align-top text-[#2B4269] font-medium">{`Order #${r.id}`}</td>
                                <td className="px-4 py-3 align-top flex items-center gap-2">
                                    <img src="/logo-icon/profile-icon.svg" alt="" aria-hidden className="w-6 h-6 rounded-full" />
                                    <span className="text-gray-800">{r.customer}</span>
                                </td>
                                <td className="px-4 py-3 align-top text-gray-700">{r.date}</td>
                                <td className="px-4 py-3 align-top">{statusBadge(r.status)}</td>
                                <td className="px-4 py-3 align-top text-gray-800">{peso(r.amount)}</td>
                                <td className="px-4 py-3 align-top">
                                    <button className="px-3 py-1 rounded-md border text-sm text-gray-700 hover:bg-gray-50">View</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StocksList = ({ externalSearch = '' }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingInventory, setEditingInventory] = useState(null);
    const [editQuantity, setEditQuantity] = useState(0);
    const [editLoading, setEditLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const catMenuRef = useRef(null);

    // Close the category dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showCategoryDropdown && catMenuRef.current && !catMenuRef.current.contains(e.target)) {
                setShowCategoryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showCategoryDropdown]);

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
                                    setCategories(cats);
                                        const groupName = vv?.variant_groups?.name || (vv?.variant_group_id != null ? String(vv.variant_group_id) : '');
                                        pvvMap[String(id)] = { valueName, groupName, price: 0, variant_value_id: id };
                                    });
                                }
                            } catch (ee) {
                                console.warn('Failed to fetch variant_values fallback', ee);
                            }
                        }
                    }

                    const mapped = [];
                    for (const inv of data) {
                        const combo = Array.isArray(inv.product_variant_combinations) ? inv.product_variant_combinations[0] : inv.product_variant_combinations;
                        const prod = combo?.products || combo?.product || (Array.isArray(combo?.products) ? combo.products[0] : null) || null;
                        const product = Array.isArray(prod) ? prod[0] : prod;
                        const productName = product?.name || '';
                        // product_types may be an object or array; prefer first element when array
                        const productTypes = Array.isArray(product?.product_types) ? product.product_types[0] : product?.product_types || null;
                        const category = productTypes?.product_categories?.name || productTypes?.name || '';
                        const category_id = productTypes?.category_id || productTypes?.product_categories?.id || null;
                        const price = product?.starting_price ?? product?.price ?? null;
                        const rawImageUrl = product?.image_url ?? null;
                        const rawImage = rawImageUrl || product?.image || null;
                        let resolvedFromImageUrl = null;
                        try {
                            resolvedFromImageUrl = rawImageUrl ? await resolveImageKeyAsync(rawImageUrl) : null;
                        } catch (e) {
                            resolvedFromImageUrl = rawImageUrl || null;
                        }
                        let image = null;
                        try {
                            image = rawImage ? await resolveImageKeyAsync(rawImage) : null;
                        } catch (e) {
                            image = rawImage || null;
                        }

                        // If resolution returned a non-http value (e.g. just "bucket/path.png"),
                        // synthesize the public storage URL as a best-effort fallback.
                        const buildPublicUrlFromKey = (key) => {
                            if (!key) return null;
                            try {
                                const s = String(key).trim().replace(/^\//, '');
                                if (s.startsWith('http://') || s.startsWith('https://')) return s;
                                const parts = s.split('/');
                                if (parts.length < 2) return null;
                                const bucket = parts.shift();
                                const path = parts.join('/');
                                const base = SUPABASE_URL.replace(/\/$/, '');
                                if (!base) return `/${bucket}/${path}`;
                                return `${base}/storage/v1/object/public/${bucket}/${path}`;
                            } catch (e) {
                                return null;
                            }
                        };

                        if ((!resolvedFromImageUrl || !(String(resolvedFromImageUrl).startsWith('http://') || String(resolvedFromImageUrl).startsWith('https://'))) && rawImageUrl) {
                            const candidate = buildPublicUrlFromKey(rawImageUrl);
                            if (candidate) resolvedFromImageUrl = candidate;
                        }
                        if ((!image || !(String(image).startsWith('http://') || String(image).startsWith('https://'))) && rawImage) {
                            const candidate = buildPublicUrlFromKey(rawImage);
                            if (candidate) image = candidate;
                        }

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

                        // Keep both a list (for line-by-line rendering) and a string (fallback)
                        const variantList = variantParts.length
                            ? variantParts
                            : (Array.isArray(combo?.variants)
                                ? combo.variants.map(v => String(v))
                                : (combo?.variants != null ? [String(combo.variants)] : []));

                        const variantDesc = variantList.length ? variantList.join(', ') : '';

                        const basePrice = Number(price ?? 0);
                        const totalPrice = basePrice + variantPriceTotal;

                        mapped.push({
                            inventory_id: inv.inventory_id,
                            combination_id: inv.combination_id,
                            quantity: inv.quantity,
                            low_stock_limit: inv.low_stock_limit,
                            status: inv.status,
                            updated_at: inv.updated_at,
                            product: { id: product?.id, name: productName, category, category_id, price: totalPrice, image, image_url: resolvedFromImageUrl, image_key: rawImageUrl, basePrice },
                            variantDesc,
                            variantList,
                        });
                    }

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
                        // Debug: log first few resolved image URLs so we can inspect why thumbnails are broken
                        try {
                            const sample = (mapped || []).slice(0, 12).map(m => ({ id: m.product?.id, name: m.product?.name, image_url: m.product?.image_url, image: m.product?.image }));
                            console.debug('Stocks - resolved image samples', sample);
                        } catch (e) {
                            console.debug('Stocks - image sample debug failed', e);
                        }
                        const cats = Array.from(new Set((mapped || []).map(r => r.product?.category).filter(Boolean)));
                        cats.sort();
                        setCategories(cats);
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

    let filteredRows = rows;
    if (selectedCategory && selectedCategory !== 'All') {
        filteredRows = filteredRows.filter(r => (r.product?.category || '') === selectedCategory);
    }
    const effectiveSearch = (externalSearch && String(externalSearch).trim() !== '') ? externalSearch : searchQuery;
    if (effectiveSearch && String(effectiveSearch).trim() !== '') {
        const q = String(effectiveSearch).trim().toLowerCase();
        filteredRows = filteredRows.filter(r => (r.product?.name || '').toLowerCase().includes(q));
    }

    return (
        <div>
           
        <div className="overflow-x-auto p-0">
            <div className="max-h-[65vh] overflow-y-auto">
                <table className="w-full table-fixed rounded rounded-md ">
                    <colgroup>
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead className="sticky top-0 bg-[#DFE7F4] ">
                        <tr className="text-left text-[16px] text-gray-600">
                            <th className="px-4 py-2">Product Name</th>
                            <th className="px-4 py-2 ">
                                <div className="flex items-center gap-2">
                                    <span>Category</span>
                                    <div className="relative p-0 z-30" ref={catMenuRef}>
                                        <button
                                            type="button"
                                            aria-label="Filter by category"
                                            onClick={() => setShowCategoryDropdown((s) => !s)}
                                            className="inline-flex items-center justify-center h-6 w-6 bg-transparent rounded hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20"
                                        >
                                            <svg
                                                aria-hidden="true"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                className="h-4 w-4 text-gray-600"
                                            >
                                                <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                           
                                        </button>
                                        {showCategoryDropdown && (
                                            <div className="absolute left-0 mt-2 w-44 rounded-md border bg-white shadow z-20">
                                                <div className="max-h-60 overflow-y-auto py-1">
                                                    <button
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${selectedCategory === 'All' ? 'font-semibold' : ''}`}
                                                        onClick={() => { setSelectedCategory('All'); setShowCategoryDropdown(false); }}
                                                    >
                                                        All categories
                                                    </button>
                                                    {categories.map((c) => (
                                                        <button
                                                            key={c}
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${selectedCategory === c ? 'font-semibold' : ''}`}
                                                            onClick={() => { setSelectedCategory(c); setShowCategoryDropdown(false); }}
                                                        >
                                                            {c}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </th>
                            <th className="px-4 py-2 ">Price</th>
                            <th className="px-4 py-2 ">Variant</th>
                            <th className="px-4 py-2 ">Stock</th>
                            <th className="px-4 py-2 ">Status</th>
                            <th className="px-4 py-2 ">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                    {filteredRows.map(r => (
                        <tr key={r.inventory_id || r.combination_id} className="border-t">
                            <td className="px-4 py-3 align-top">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={(() => {
                                            const key = r.product?.image_key || r.product?.image_url || r.product?.image;
                                            if (!key) return '/apparel-images/caps.png';
                                            const categoryName = (r.product?.category || '').toLowerCase();
                                            try {
                                                if (categoryName.includes('apparel')) return supabase.storage.from('apparel-images').getPublicUrl(key).data.publicUrl;
                                                else if (categoryName.includes('accessories')) return supabase.storage.from('accessoriesdecorations-images').getPublicUrl(key).data.publicUrl;
                                                else if (categoryName.includes('signage') || categoryName.includes('poster')) return supabase.storage.from('signage-posters-images').getPublicUrl(key).data.publicUrl;
                                                else if (categoryName.includes('cards') || categoryName.includes('sticker')) return supabase.storage.from('cards-stickers-images').getPublicUrl(key).data.publicUrl;
                                                else if (categoryName.includes('packaging')) return supabase.storage.from('packaging-images').getPublicUrl(key).data.publicUrl;
                                                else if (categoryName.includes('3d print')) return supabase.storage.from('3d-prints-images').getPublicUrl(key).data.publicUrl;
                                                else return supabase.storage.from('apparel-images').getPublicUrl(key).data.publicUrl;
                                            } catch (e) {
                                                return '/apparel-images/caps.png';
                                            }
                                        })()}
                                        alt={r.product?.name || 'product'}
                                        className="w-14 h-14 object-cover rounded"
                                        onError={(e) => { try { e.currentTarget.src = '/apparel-images/caps.png'; } catch (ee) {} }}
                                    />
                                    <div>
                                        <div className="text-gray-900 font-medium">{r.product?.name || '—'}</div>
                                        <div className="text-xs text-gray-500">{r.product?.id ? `TOTAL: ${r.quantity ?? '—'}` : ''}</div>
                                    </div>
                                </div>
                            </td>

                            <td className="px-4 py-3 align-top text-gray-700">{r.product?.category || '—'}</td>

                            <td className="px-4 py-3 align-top text-gray-800">{r.product?.price != null ? `₱${Number(r.product.price).toFixed(2)}` : '—'}</td>

                            <td className="px-4 py-3 align-top text-gray-700">
                                {Array.isArray(r.variantList) && r.variantList.length > 0 ? (
                                    <div className="flex flex-col gap-0.5">
                                        {r.variantList.map((v, idx) => (
                                            <span key={idx} className="block">{v}</span>
                                        ))}
                                    </div>
                                ) : (r.variantDesc || '—')}
                            </td>

                            <td className="px-8 py-3 align-top text-gray-800">
                                {editingInventory && (editingInventory.inventory_id === r.inventory_id || editingInventory.combination_id === r.combination_id) ? (
                                    <div className="flex items-center border rounded-md overflow-hidden w-fit">
                                        <button className="px-2" onClick={() => setEditQuantity(q => {
                                            const cur = Number(q) || 0;
                                            return Math.max(0, cur - 1);
                                        })}>-</button>
                                        <input
                                            className="w-16 text-center px-2"
                                            type="number"
                                            value={editQuantity}
                                            onFocus={() => { if (editQuantity === 0) setEditQuantity(''); }}
                                            onBlur={() => { if (editQuantity === '') setEditQuantity(0); }}
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                if (raw === '') { setEditQuantity(''); return; }
                                                const num = Number(raw);
                                                if (Number.isNaN(num)) return;
                                                const clamped = Math.min(20, Math.max(0, Math.floor(num)));
                                                setEditQuantity(clamped);
                                            }}
                                        />
                                        <button className="px-2" onClick={() => setEditQuantity(q => {
                                            const cur = Number(q) || 0;
                                            return Math.min(20, cur + 1);
                                        })}>+</button>
                                    </div>
                                ) : (
                                    r.quantity ?? 0
                                )}
                            </td>

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
                                        <button
                                            className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                                            disabled={editLoading}
                                            onClick={async () => {
                                                        try {
                                                                    setEditLoading(true);
                                                                    // Ensure quantity is within allowed bounds 0..20
                                                                    const sanitized = Math.min(20, Math.max(0, Number(editQuantity) || 0));
                                                                    const updateData = { quantity: sanitized };
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
                                ) : (
                                    <button
                                        className="bg-[#2B4269] text-white px-3 py-2 rounded-md text-sm"
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
    </div>
    );
};

const AdminContents = () => {
    const [selected, setSelected] = useState('Dashboard');
    const [stocksSearch, setStocksSearch] = useState('');

    useEffect(() => {
        const handler = (e) => {
            const sec = e?.detail?.section;
            if (sec) setSelected(sec);
        };
        window.addEventListener('admin-nav-select', handler);
        return () => window.removeEventListener('admin-nav-select', handler);
    }, []);

    const containerClass = 'bg-white border border-black';

    return (
        <div className="flex-1 ml-[263px] p-8 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <div className="flex items-center justify-between gap-3 ">
                    <p className="text-[32px] font-bold font-dm-sans text-gray-900">{selected}</p>
                    {selected === 'Stocks' && (
                        <div className="flex flex-col  gap-2 w-full max-w-md  items-end">
                            <div className="relative w-[241px] ">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.8l3.613 3.614a.75.75 0 1 0 1.06-1.06l-3.614-3.614A5.5 5.5 0 0 0 9 3.5Zm-4 5.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={stocksSearch}
                                    onChange={(e) => setStocksSearch(e.target.value)}
                                    placeholder="Search product name"
                                    className="w-[241px] pl-9 pr-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div style={{ display: selected === 'Dashboard' ? 'block' : 'none' }} className={containerClass}>
                    <h2 className="text-lg font-semibold mb-3">Dashboard</h2>
                    <p className="text-gray-700">Overview and quick stats go here.</p>
                </div>

                <div style={{ display: selected === 'Stocks' ? 'block' : 'none' }} className={`${containerClass} mt-1`}>
                    <StocksList externalSearch={stocksSearch} />
                </div>

                <div style={{ display: selected === 'Products' ? 'block' : 'none' }} className={`${containerClass} mt-6`}>
                    <h2 className="text-lg font-semibold mb-3">Products</h2>
                    <p className="text-gray-700">Manage products in this container.</p>
                </div>

                <div style={{ display: selected === 'Orders' ? 'block' : 'none' }} className={`${containerClass} mt-6`}>
                    <OrdersList />
                </div>
            </div>
        </div>
    );
};

export default AdminContents;
