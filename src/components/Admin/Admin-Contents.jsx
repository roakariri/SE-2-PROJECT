import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

// Small color name map reused across pages for hex -> friendly name
const colorNames = {
    "#c40233": "Red",
    "#000000": "Black",
    "#ffffff": "White",
    "#faf9f6": "Off-White",
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
    let s = String(value).trim().toLowerCase();
    if (!s.startsWith('#')) s = `#${s}`;
    // Expand 3-digit hex like #fff -> #ffffff
    const shortHex = /^#[0-9a-f]{3}$/i;
    if (shortHex.test(s)) {
        const r = s[1], g = s[2], b = s[3];
        s = `#${r}${r}${g}${g}${b}${b}`;
    }
    const hexRegex = /^#[0-9a-f]{6}$/i;
    return hexRegex.test(s) ? s : value;
};

// Color helpers (translate hex/rgb to friendly names) reused from Order pages
const hexToRgb = (hex) => {
    if (typeof hex !== "string") return null;
    let h = hex.trim();
    if (h.startsWith("#")) h = h.slice(1);
    if (h.length === 3) {
        h = h.split("").map((c) => c + c).join("");
    }
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    const num = parseInt(h, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};
const rgbToHsl = ({ r, g, b }) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = 0; s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
    }
    return { h, s, l };
};
const describeColor = ({ h, s, l }) => {
    if (s < 0.1) {
        if (l < 0.08) return "black";
        if (l < 0.2) return "very dark gray";
        if (l < 0.35) return "dark gray";
        if (l < 0.65) return "gray";
        if (l < 0.85) return "light gray";
        return "white";
    }
    let name = "";
    if (h < 15 || h >= 345) name = "red";
    else if (h < 45) name = "orange";
    else if (h < 75) name = "yellow";
    else if (h < 95) name = "lime";
    else if (h < 150) name = "green";
    else if (h < 195) name = "cyan";
    else if (h < 255) name = "blue";
    else if (h < 285) name = "purple";
    else if (h < 345) name = "magenta";
    let prefix = "";
    if (l < 0.25) prefix = "dark ";
    else if (l > 0.7) prefix = "light ";
    else if (s > 0.8 && l > 0.3 && l < 0.6) prefix = "vivid ";
    return (prefix + name).trim();
};
const toColorNameIfHex = (group, value) => {
    const normalizeHex = (val) => {
        const raw = String(val || '').trim();
        if (!raw) return null;
        let s = raw.startsWith('#') ? raw.slice(1) : raw;
        if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map(c => c + c).join('');
        if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
        return `#${s.toUpperCase()}`;
    };
    const HEX_NAME_MAPS = {
        'color': {
            '#000000': 'Black', '#FFFFFF': 'White', '#FAF9F6': 'Off-White', '#EDE8D0': 'Beige', '#808080': 'Gray', '#4169E1': 'Blue', '#C40233': 'Red'
        },
        'strap color': {
            '#000000': 'Black', '#FFFFFF': 'White', '#FAF9F6': 'Off-White', '#4169E1': 'Blue', '#C40233': 'Red', '#228B22': 'Green', '#EDE8D0': 'Beige'
        },
        'accessories color': {
            '#FFD700': 'Gold', '#C0C0C0': 'Silver', '#000000': 'Black', '#FFFFFF': 'White', '#FFC0CB': 'Pink', '#4169E1': 'Blue', '#228B22': 'Green', '#800080': 'Purple'
        },
        'trim color': {
            '#000000': 'Black', '#FFFFFF': 'White', '#4169E1': 'Blue', '#C40233': 'Red'
        }
    };
    const groupKey = (() => {
        const g = String(group || '').toLowerCase();
        if (g === 'color') return 'color';
        if (g.includes('strap')) return 'strap color';
        if (g.includes('accessories color')) return 'accessories color';
        if (g.includes('accessories') && g.includes('color')) return 'accessories color';
        if (g.includes('trim') && g.includes('color')) return 'trim color';
        if (g === 'trim color') return 'trim color';
        return null;
    })();
    const nx = normalizeHex(value);
    if (groupKey && nx && HEX_NAME_MAPS[groupKey] && HEX_NAME_MAPS[groupKey][nx]) {
        return HEX_NAME_MAPS[groupKey][nx];
    }
    const capFirst = (s) => (typeof s === 'string' && s.length > 0) ? (s[0].toUpperCase() + s.slice(1)) : s;
    if (!value) return value;
    const val = String(value).trim();
    const looksHex = /^#?[0-9a-fA-F]{3}$/.test(val) || /^#?[0-9a-fA-F]{6}$/.test(val);
    const groupIsColor = typeof group === 'string' && /color/i.test(group);
    if (looksHex) {
        const rgb = hexToRgb(val.startsWith('#') ? val : `#${val}`);
        if (rgb) return capFirst(describeColor(rgbToHsl(rgb)));
    }
    const m = val.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (m) {
        const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
        const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
        const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));
        return capFirst(describeColor(rgbToHsl({ r, g, b })));
    }
    if (groupIsColor) return val;
    return value;
};

// Reusable modal wrapper
const Modal = ({ open, onClose, children, width }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100]">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="absolute inset-0 flex items-start justify-center overflow-y-auto">
                <div className={`mt-16 mb-8 ${width || 'w-[680px]'} max-w-[95vw] bg-white rounded-md shadow-lg border`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

// Add Product Modal content
const AddProductModal = ({ open, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [categoriesAll, setCategoriesAll] = useState([]);
    const [category, setCategory] = useState('');
    const [startingPrice, setStartingPrice] = useState('');
    const [status, setStatus] = useState('Active');
    const [details, setDetails] = useState('');
    const [images, setImages] = useState([]); // placeholder for future upload
    // DB-sourced variant groups and values
    const [allVariantGroups, setAllVariantGroups] = useState([]); // [{id,name}]
    const [variantValueMap, setVariantValueMap] = useState({}); // { groupId: [value_name] }
    // one empty variant group row by default, with two empty options
    const [variantGroups, setVariantGroups] = useState([
        { id: 1, groupId: '', groupName: '', options: [{ name: '', price: '' }, { name: '', price: '' }] }
    ]);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const loadCatsAndVariants = async () => {
            try {
                // Categories
                const { data: catData } = await supabase
                    .from('product_categories')
                    .select('id, name')
                    .order('name', { ascending: true });
                if (Array.isArray(catData)) {
                    const names = catData.map(c => c.name).filter(Boolean);
                    if (!cancelled) {
                        setCategoriesAll(names);
                        if (!category && names.length) setCategory(names[0]);
                    }
                }
            } catch {}
            try {
                // Variant groups
                const { data: vg } = await supabase
                    .from('variant_groups')
                    .select('variant_group_id, name')
                    .order('name', { ascending: true });
                if (!cancelled && Array.isArray(vg)) {
                    setAllVariantGroups(vg.map(g => ({ id: String(g.variant_group_id ?? g.id ?? ''), name: g.name || String(g.variant_group_id) })));
                }
            } catch {}
            try {
                // Variant values for suggestions
                const { data: vv } = await supabase
                    .from('variant_values')
                    .select('variant_value_id, value_name, variant_group_id');
                if (!cancelled && Array.isArray(vv)) {
                    const map = {};
                    vv.forEach(row => {
                        const gid = String(row.variant_group_id ?? '');
                        if (!gid) return;
                        if (!map[gid]) map[gid] = new Set();
                        if (row.value_name) map[gid].add(String(row.value_name));
                    });
                    const obj = {};
                    Object.entries(map).forEach(([k, set]) => { obj[k] = Array.from(set).sort((a,b) => a.localeCompare(b)); });
                    setVariantValueMap(obj);
                }
            } catch {}
        };
        loadCatsAndVariants();
        return () => { cancelled = true; };
    }, [open]);

    useEffect(() => {
        const onEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
        if (open) window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [open, onClose]);

    const addVariantGroup = () => {
        setVariantGroups(v => [...v, { id: (v[v.length-1]?.id || 0) + 1, groupId: '', groupName: '', options: [{ name: '', price: '' }, { name: '', price: '' }] }]);
    };
    const removeVariantGroup = (id) => setVariantGroups(v => v.filter(g => g.id !== id));
    const updateVariantGroup = (id, groupId) => setVariantGroups(v => v.map(g => {
        if (g.id !== id) return g;
        const vv = allVariantGroups.find(x => String(x.id) === String(groupId));
        return { ...g, groupId: groupId, groupName: vv?.name || '' };
    }));
    const updateVariantOptionName = (id, idx, val) => setVariantGroups(v => v.map(g => g.id === id ? { ...g, options: g.options.map((o,i) => i===idx ? { ...o, name: val } : o) } : g));
    const updateVariantOptionPrice = (id, idx, val) => setVariantGroups(v => v.map(g => g.id === id ? { ...g, options: g.options.map((o,i) => i===idx ? { ...o, price: val } : o) } : g));
    const addVariantOption = (id) => setVariantGroups(v => v.map(g => g.id === id ? { ...g, options: [...g.options, { name: '', price: '' }] } : g));
    const removeVariantOption = (id, idx) => setVariantGroups(v => v.map(g => g.id === id ? { ...g, options: g.options.filter((_,i) => i!==idx) } : g));

    const handleSubmit = () => {
        const payload = {
            name: name.trim(),
            category,
            starting_price: startingPrice === '' ? null : Number(startingPrice),
            status,
            details,
            images,
            variants: variantGroups.map(g => ({
                group_id: g.groupId || null,
                group_name: g.groupName || '',
                options: g.options
                    .map(o => ({ name: (o.name || '').trim(), price: (o.price === '' ? null : Number(o.price)) }))
                    .filter(o => o.name)
            })).filter(g => g.group_id || g.group_name || (g.options && g.options.length))
        };
        onSubmit?.(payload);
        onClose?.();
    };

    // Shared section divider
    const Divider = () => <div className="my-4 border-t" />;

    return (
        <Modal open={open} onClose={onClose}>
            <div className="p-5">
                {/* Title and Category */}
                <div className="mb-4">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder=""
                        className="w-full border-2 border-[#2B4269] rounded-md px-3 py-2"
                    />
                </div>
                <div className="mb-2">
                    <label className="font-semibold text-[#2B4269] mr-2">Category:</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="inline-block border border-[#2B4269] rounded px-3 py-1"
                    >
                        {categoriesAll.map(c => (<option key={c} value={c}>{c}</option>))}
                    </select>
                </div>

                <Divider />

                {/* Variants */}
                <div className="mb-2">
                    <div className="font-semibold text-[#2B4269] mb-2">Variants</div>
                    {variantGroups.map(group => {
                        const suggestions = group.groupId ? (variantValueMap[String(group.groupId)] || []) : [];
                        const datalistId = `variant-suggestions-${group.id}`;
                        return (
                            <div key={group.id} className="mb-3">
                                <div className="flex items-start gap-3 mb-2">
                                    <div className="w-56 flex items-center gap-2">
                                        <select
                                            value={group.groupId}
                                            onChange={(e) => updateVariantGroup(group.id, e.target.value)}
                                            className="w-full border-2 border-[#2B4269] rounded px-3 py-1"
                                        >
                                            <option value="">Select variant</option>
                                            {allVariantGroups.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            className="text-gray-500 hover:text-red-600"
                                            onClick={() => removeVariantGroup(group.id)}
                                            aria-label="Remove variant group"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {group.options.map((opt, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <input
                                                            list={datalistId}
                                                            value={opt.name}
                                                            onChange={(e) => updateVariantOptionName(group.id, idx, e.target.value)}
                                                            className="w-44 border-2 border-[#2B4269] rounded px-3 py-1"
                                                        />
                                                        {suggestions.length > 0 && (
                                                            <datalist id={datalistId}>
                                                                {suggestions.map(s => (<option key={s} value={s} />))}
                                                            </datalist>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-600">₱</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={opt.price}
                                                            onChange={(e) => updateVariantOptionPrice(group.id, idx, e.target.value)}
                                                            className="w-24 border-2 border-[#2B4269] rounded px-2 py-1"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="text-gray-500 hover:text-red-600"
                                                        onClick={() => removeVariantOption(group.id, idx)}
                                                        aria-label="Remove option"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                className="border border-dashed rounded px-3 py-1 text-gray-600"
                                                onClick={() => addVariantOption(group.id)}
                                            >
                                                Add option
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <button
                        type="button"
                        className="w-full border rounded px-3 py-2 text-gray-500"
                        onClick={addVariantGroup}
                    >
                        Add Variant
                    </button>
                </div>

                <Divider />

                {/* Pricing */}
                <div className="mb-2">
                    <div className="font-semibold text-[#2B4269] mb-2">Pricing</div>
                    <label className="block text-sm text-gray-700 mb-1">Starting Price</label>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600">₱</span>
                        <input
                            type="number"
                            min="0"
                            value={startingPrice}
                            onChange={(e) => setStartingPrice(e.target.value)}
                            className="w-40 border-2 border-[#2B4269] rounded px-3 py-1"
                        />
                    </div>
                </div>

                <Divider />

                {/* Product Status */}
                <div className="mb-4">
                    <div className="font-semibold text-[#2B4269] mb-2">Product Status</div>
                    <label className="block text-sm text-gray-700 mb-1">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="border border-[#2B4269] rounded px-3 py-1"
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                <Divider />

                {/* Images and Details (second screenshot style) */}
                <div className="mb-2">
                    <div className="font-semibold text-[#2B4269] mb-2">Images</div>
                    <div className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center text-sm text-gray-500">Add Image</div>
                </div>
                <div className="mb-6">
                    <div className="font-semibold text-[#2B4269] mb-2">Product Details</div>
                    <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder="Write the details of the product"
                        className="w-full min-h-[140px] border-2 border-[#2B4269] rounded px-3 py-2"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t">
                    <button
                        type="button"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2 font-semibold"
                        onClick={handleSubmit}
                    >
                        ADD
                    </button>
                    <button
                        type="button"
                        className="flex-1 bg-[#9E3E3E] hover:bg-[#7e3232] text-white rounded px-4 py-2 font-semibold"
                        onClick={onClose}
                    >
                        CANCEL
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Resolve image key fast: accept full URLs or plain keys, try common buckets via getPublicUrl.
// Avoid network HEAD/GET checks to keep Stocks load from hanging on many rows.
const resolveImageKeyAsync = async (img) => {
    if (!img) return null;
    try {
        const s = String(img).trim();
        if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;

        const cleanKey = s.replace(/^\/+/, '');

        // Default bucket order
        let bucketsToTry = ['apparel-images', 'accessoriesdecorations-images', 'accessories-images', '3d-prints-images', 'product-images', 'images', 'public'];
        // Heuristic: keep apparel-first order if possible (guarded by try so undefined vars don't throw)
        try {
            const look = String((productName || productTypes?.name || category || '')).toLowerCase();
            const apparelKeywords = ['apparel','shirt','t-shirt','tshirt','hoodie','sweatshirt','cap','hat','tote','bag','rtshirt','rounded_t-shirt'];
            const isApparel = apparelKeywords.some(k => look.includes(k)) || String(category || '').toLowerCase().includes('apparel');
            if (!isApparel) {
                bucketsToTry = ['accessoriesdecorations-images', 'accessories-images', 'product-images', 'images', 'apparel-images', '3d-prints-images', 'public'];
            }
        } catch (e) { /* ignore heuristic errors */ }

        for (const bucket of bucketsToTry) {
            try {
                const { data } = supabase.storage.from(bucket).getPublicUrl(cleanKey);
                const url = data?.publicUrl || data?.publicURL || null;
                if (url && !String(url).endsWith('/')) return url;
            } catch (e) { /* try next bucket */ }
        }

        // If key looks like 'bucket/path/to/file.png', try using that bucket directly
        const parts = cleanKey.split('/');
        if (parts.length > 1) {
            const bucket = parts.shift();
            const path = parts.join('/');
            try {
                const { data } = supabase.storage.from(bucket).getPublicUrl(path);
                const url = data?.publicUrl || data?.publicURL || null;
                if (url && !String(url).endsWith('/')) return url;
            } catch (e) { /* ignore */ }
        }

        // Fallback: synthesize public URL using SUPABASE_URL if bucket/key format is provided
        try {
            const base = SUPABASE_URL.replace(/\/$/, '');
            const split = cleanKey.split('/');
            if (base && split.length > 1) {
                const bucket = split.shift();
                const path = split.join('/');
                return `${base}/storage/v1/object/public/${bucket}/${path}`;
            }
        } catch (e) { /* ignore */ }

        return cleanKey;
    } catch (e) {
        return null;
    }
};

// Resolve uploaded product/design file public URL (used for uploaded_files entries)
// Ensure uploaded design image URLs are public and resolvable from the 'product-files' bucket
const resolveProductFilePublicUrl = (input) => {
    try {
        if (!input || typeof input !== 'string') return null;
        // Already a public URL
        if (/^https?:\/\//i.test(input)) return input;
        // If it's an absolute URL but not http(s), ignore transformation
        try {
            const u = new URL(input);
            if (u.protocol && /^https?:$/i.test(u.protocol)) return input;
        } catch {}
        // Try to extract the storage path after /product-files/
        let path = null;
        const marker = '/product-files/';
        const idx = input.indexOf(marker);
        if (idx !== -1) {
            path = input.slice(idx + marker.length);
        } else {
            // assume it's already a storage path like "userId/filename"
            path = input.replace(/^\/+/, '');
        }
        const { data } = supabase.storage.from('product-files').getPublicUrl(path);
        return (data && data.publicUrl) ? data.publicUrl : input;
    } catch {
        return input;
    }
};

const OrdersList = ({ externalSearch = '' }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Status dropdown states for Orders
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [statusFilters, setStatusFilters] = useState([]); // ['Delivered','Cancelled','In Progress']
    const [statusDraft, setStatusDraft] = useState([]);
    const statusMenuRef = useRef(null);

    // View / Update order modal state
    const [viewOrderDetails, setViewOrderDetails] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateStatusValue, setUpdateStatusValue] = useState('');

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
                const safeLower = (s) => (typeof s === 'string' ? s.toLowerCase() : '');
                const pickFirst = (...vals) => vals.find(v => v != null && String(v).trim() !== '');

                const extractUserId = (o) => {
                    if (!o || typeof o !== 'object') return null;
                    const direct = pickFirst(o.user_id, o.customer_id, o.userId, o.customerId, o.auth_user_id, o.authUserId, o.account_user_id);
                    if (isUuid(String(direct || ''))) return String(direct);
                    for (const k of Object.keys(o)) {
                        try {
                            const lk = safeLower(k);
                            if ((lk.includes('user') || lk.includes('customer')) && lk.includes('id')) {
                                const val = o[k];
                                if (typeof val === 'string' && isUuid(val)) return val;
                            }
                        } catch {}
                    }
                    const nestedCandidates = [o.user, o.customer, o.account, o.buyer, o.owner, o.created_by];
                    for (const obj of nestedCandidates) {
                        if (obj && typeof obj === 'object') {
                            const cand = extractUserId(obj);
                            if (cand) return cand;
                        }
                    }
                    return null;
                };

                const extractOrderEmail = (o) => {
                    if (!o || typeof o !== 'object') return '';
                    const direct = pickFirst(o.customer_email, o.email, o.contact_email, o.buyer_email, o.payer_email, o.user_email);
                    if (typeof direct === 'string' && direct.includes('@')) return direct;
                    for (const k of Object.keys(o)) {
                        const lk = safeLower(k);
                        if (lk.includes('email')) {
                            const val = o[k];
                            if (typeof val === 'string' && val.includes('@')) return val;
                        }
                    }
                    const nested = [o.customer, o.billing, o.shipping, o.contact, o.account];
                    for (const obj of nested) {
                        const v = extractOrderEmail(obj);
                        if (v) return v;
                    }
                    return '';
                };

                const extractOrderName = (o) => {
                    if (!o || typeof o !== 'object') return '';
                    const first = pickFirst(o.customer_first_name, o.first_name, o.first, o.given_name);
                    const last = pickFirst(o.customer_last_name, o.last_name, o.last, o.family_name);
                    const combo = [first, last].filter(Boolean).join(' ').trim();
                    const direct = pickFirst(
                        o.customer_name, o.display_name, o.full_name, o.name,
                        o.recipient_name, o.contact_name, o.shipping_name, o.billing_name, o.buyer_name, o.account_name,
                        o.customer_full_name,
                        combo
                    );
                    if (direct) return String(direct).trim();
                    const nested = [o.customer, o.billing, o.shipping, o.contact, o.account];
                    for (const obj of nested) {
                        const v = extractOrderName(obj);
                        if (v) return v;
                    }
                    return '';
                };

                const userIdsRaw = Array.from(new Set((all || []).map(extractUserId).filter(Boolean)));
                const userIds = userIdsRaw;
                const userIdsUuid = userIdsRaw.filter(isUuid);
                const nameMap = {};
                const avatarMap = {};
                const emailToName = {};
                const deriveName = (rec) => {
                    const first = rec.first_name ?? rec.given_name ?? rec.first ?? '';
                    const last = rec.last_name ?? rec.family_name ?? rec.last ?? '';
                    const emailLocal = typeof rec.email === 'string' ? rec.email.split('@')[0] : '';
                    const fullPref = rec.display_name ?? rec.full_name ?? rec.name ?? `${first} ${last}`.trim();
                    return (fullPref && fullPref !== ' ') ? fullPref : (emailLocal || rec.username || rec.handle || '');
                };

                // Seed with the current session user like Account page does
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const u = session?.user;
                    if (u?.id) {
                        const meta = u.user_metadata || {};
                        let displayName = meta.display_name || meta.full_name || meta.name || '';
                        if (!displayName) {
                            const emailLocal = (u.email || '').split('@')[0];
                            displayName = emailLocal || 'User';
                        }
                        // only set if not already mapped; profiles (below) will override if present
                        if (nameMap[String(u.id)] == null) nameMap[String(u.id)] = displayName;
                    }
                } catch {}

                if (userIdsUuid.length > 0) {
                    try {
                        // Try profiles by user_id
                        const p1 = await supabase
                            .from('profiles')
                            .select('user_id, id, display_name, full_name, name, first_name, last_name, email, avatar_url')
                            .in('user_id', userIdsUuid);
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
                        const missing = userIdsUuid.filter(uid => nameMap[String(uid)] == null);
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
                        const missingAuth = userIdsUuid.filter(uid => nameMap[String(uid)] == null);
                        const rpcIds = missingAuth.map(x => String(x));
                        if (rpcIds.length > 0) {
                            const { data: rpcData, error: rpcErr } = await supabase.rpc('get_user_public_names', { ids: rpcIds });
                            if (rpcErr) {
                                try { console.warn('[OrdersList] get_user_public_names RPC error:', rpcErr); } catch {}
                            }
                            if (!rpcErr && Array.isArray(rpcData)) {
                                rpcData.forEach(r => {
                                    if (r?.id && (r?.name || r?.email_local)) {
                                        nameMap[String(r.id)] = r.name || r.email_local || nameMap[String(r.id)] || '';
                                    }
                                });
                            }
                        }
                    } catch {}
                    try {
                        // Try auth.users directly for display_name
                        const stillMissingAuth = userIdsUuid.filter(uid => nameMap[String(uid)] == null);
                        if (stillMissingAuth.length > 0) {
                            // Note: querying auth.users directly may not be permitted from client
                            const { data: authData, error: authErr } = await supabase
                                .from('auth.users')
                                .select('id, raw_user_meta_data')
                                .in('id', stillMissingAuth);
                            if (!authErr && Array.isArray(authData)) {
                                authData.forEach(r => {
                                    const displayName = r.raw_user_meta_data?.display_name;
                                    if (displayName) {
                                        nameMap[String(r.id)] = displayName;
                                    }
                                });
                            }
                        }
                    } catch {}
                    try {
                        // Try customers table by id
                        const stillMissing = userIdsUuid.filter(uid => nameMap[String(uid)] == null);
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
                        const stillMissing2 = userIdsUuid.filter(uid => nameMap[String(uid)] == null);
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
                    try {
                        // Try addresses by user_id for any still-missing user IDs
                        const stillMissingUsers = userIdsUuid.filter(uid => nameMap[String(uid)] == null);
                        if (stillMissingUsers.length > 0) {
                            const aByUser = await supabase
                                .from('addresses')
                                .select('user_id, full_name, name, contact_name, first_name, last_name, email')
                                .in('user_id', stillMissingUsers);
                            if (!aByUser.error && Array.isArray(aByUser.data)) {
                                aByUser.data.forEach(r => {
                                    const nm = deriveName(r) || r.contact_name || [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
                                    if (r?.user_id && nm) nameMap[String(r.user_id)] = nm;
                                });
                            }
                        }
                    } catch {}
                    try {
                        // Try custom users table (if exists) by id as last resort
                        const stillMissingUsers2 = userIdsUuid.filter(uid => nameMap[String(uid)] == null);
                        if (stillMissingUsers2.length > 0) {
                            const u1 = await supabase
                                .from('users')
                                .select('id, display_name, full_name, name, first_name, last_name, email')
                                .in('id', stillMissingUsers2);
                            if (!u1.error && Array.isArray(u1.data)) {
                                u1.data.forEach(r => {
                                    const nm = deriveName(r);
                                    if (r?.id && nm) nameMap[String(r.id)] = nm;
                                });
                            }
                        }
                    } catch {}
                }

                // Also attempt resolution by email when orders contain emails but not user IDs
                try {
                    const orderEmails = Array.from(new Set((all || [])
                        .map(extractOrderEmail)
                        .filter(e => typeof e === 'string' && e.includes('@'))
                    ));
                    if (orderEmails.length > 0) {
                        try {
                            const pByEmail = await supabase
                                .from('profiles')
                                .select('email, display_name, full_name, name, first_name, last_name')
                                .in('email', orderEmails);
                            if (!pByEmail.error && Array.isArray(pByEmail.data)) {
                                pByEmail.data.forEach(r => {
                                    if (!r?.email) return;
                                    const nm = deriveName(r);
                                    emailToName[String(r.email).toLowerCase()] = nm;
                                });
                            }
                        } catch {}
                        try {
                            const cByEmail = await supabase
                                .from('customers')
                                .select('email, full_name, name, first_name, last_name')
                                .in('email', orderEmails);
                            if (!cByEmail.error && Array.isArray(cByEmail.data)) {
                                cByEmail.data.forEach(r => {
                                    if (!r?.email) return;
                                    const nm = deriveName(r);
                                    if (!emailToName[String(r.email).toLowerCase()]) {
                                        emailToName[String(r.email).toLowerCase()] = nm;
                                    }
                                });
                            }
                        } catch {}
                        // Fallback via secure RPC reading from auth.users when email-only orders exist
                        try {
                            const missingEmails = orderEmails
                                .map(e => String(e).toLowerCase())
                                .filter(e => !emailToName[e]);
                            if (missingEmails.length > 0) {
                                const { data: rpcEmailData, error: rpcEmailErr } = await supabase.rpc('get_user_names_by_emails', { emails: missingEmails });
                                if (rpcEmailErr) { try { console.warn('[OrdersList] get_user_names_by_emails RPC error:', rpcEmailErr); } catch {} }
                                if (!rpcEmailErr && Array.isArray(rpcEmailData)) {
                                    rpcEmailData.forEach(r => {
                                        const key = String(r?.email || '').toLowerCase();
                                        const nm = r?.name || r?.email_local || '';
                                        if (key && nm && !emailToName[key]) emailToName[key] = nm;
                                    });
                                }
                            }
                        } catch {}
                    }
                } catch {}

                // Fallback: resolve names via addresses table (by address_id and by user_id)
                const addressNameById = {};
                const addressNameByUser = {};
                try {
                    const addressIdsRaw = Array.from(new Set((all || []).map(o => o?.address_id).filter(v => v !== null && v !== undefined)));
                    if (addressIdsRaw.length > 0) {
                        const idsAsString = addressIdsRaw.map(v => String(v));
                        // Try multiple variants: match on id and address_id; do not assume UUID type
                        const picks = [];
                        try {
                            const q1 = await supabase
                                .from('addresses')
                                .select('id, address_id, user_id, full_name, name, contact_name, first_name, last_name, email')
                                .in('id', idsAsString);
                            if (!q1.error && Array.isArray(q1.data)) picks.push(...q1.data);
                        } catch {}
                        try {
                            const q2 = await supabase
                                .from('addresses')
                                .select('id, address_id, user_id, full_name, name, contact_name, first_name, last_name, email')
                                .in('address_id', idsAsString);
                            if (!q2.error && Array.isArray(q2.data)) picks.push(...q2.data);
                        } catch {}
                        // De-duplicate by primary identifiers
                        const seen = new Set();
                        picks.forEach(r => {
                            const key = String(r?.id ?? r?.address_id ?? Math.random());
                            if (seen.has(key)) return; seen.add(key);
                            const nm = deriveName(r) || r.contact_name || [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
                            const idKey = r?.id != null ? String(r.id) : (r?.address_id != null ? String(r.address_id) : null);
                            if (idKey && nm) addressNameById[idKey] = nm;
                            if (r?.user_id && nm && !addressNameByUser[String(r.user_id)]) addressNameByUser[String(r.user_id)] = nm;
                        });
                    }
                } catch {}

                // Attempt to compute totals from related tables (order items / payments) when orders don't expose a total
                const totalsMap = {};
                try {
                    const orderIds = Array.from(new Set((all || []).map(x => x?.order_id ?? x?.id ?? x?.reference ?? x?.number).filter(Boolean).map(String)));
                    if (orderIds.length > 0) {
                        const itemTables = ['order_items','order_lines','line_items','order_line_items','order_line','order_products'];
                        for (const tbl of itemTables) {
                            try {
                                const { data: items, error: itemsErr } = await supabase.from(tbl).select('order_id, amount, price, quantity').in('order_id', orderIds);
                                if (itemsErr || !Array.isArray(items) || items.length === 0) continue;
                                items.forEach(it => {
                                    try {
                                        const id = String(it.order_id);
                                        let val = null;
                                        if (it?.amount != null) val = Number(it.amount || 0);
                                        else if (it?.price != null) val = Number(it.price || 0) * (Number(it?.quantity || 1) || 1);
                                        if (val != null && !Number.isNaN(val)) totalsMap[id] = (totalsMap[id] || 0) + val;
                                    } catch (e) { /* ignore row */ }
                                });
                            } catch (e) { /* ignore table */ }
                        }

                        // Also try payments table for captured amounts
                        try {
                            const { data: pays, error: payErr } = await supabase.from('payments').select('order_id, amount').in('order_id', orderIds);
                            if (!payErr && Array.isArray(pays)) {
                                pays.forEach(p => {
                                    try {
                                        const id = String(p.order_id);
                                        const v = Number(p?.amount || 0);
                                        if (!Number.isNaN(v)) totalsMap[id] = (totalsMap[id] || 0) + v;
                                    } catch (e) {}
                                });
                            }
                        } catch (e) { /* ignore payments */ }
                    }
                } catch (e) { /* ignore totals aggregation errors */ }

                // Map flexible fields to UI shape
                const mapped = (all || []).map(o => {
                    const orderId = o.order_id ?? o.id ?? o.reference ?? o.number ?? null;
                    const dateRaw = o.date_ordered ?? o.created_at ?? o.createdAt ?? o.placed_at ?? null;
                    const status = o.status ?? o.order_status ?? 'In Progress';
                    const computed = orderId != null ? totalsMap[String(orderId)] : null;
                    const amount = (o?.total_price != null && !Number.isNaN(Number(o.total_price)))
                        ? Number(o.total_price)
                        : ((computed != null && !Number.isNaN(Number(computed))) ? Number(computed) : (o.total_amount ?? o.total ?? o.amount ?? 0));
                    const uId = extractUserId(o);
                    // Prefer profile/auth-derived names first (like Account page), then inline order fields
                    let customer = '';
                    if (uId != null && nameMap[String(uId)]) {
                        customer = nameMap[String(uId)];
                    }
                    // Address-derived name by user_id
                    if (!customer && uId != null && addressNameByUser[String(uId)]) {
                        customer = addressNameByUser[String(uId)];
                    }
                    // Address-derived name by address_id on the order
                    if (!customer && o?.address_id && addressNameById[String(o.address_id)]) {
                        customer = addressNameById[String(o.address_id)];
                    }
                    if (!customer) {
                        // Try an email on the order itself
                        const orderEmail = extractOrderEmail(o);
                        if (orderEmail) {
                            const key = String(orderEmail).toLowerCase();
                            if (emailToName[key]) {
                                customer = emailToName[key];
                            } else {
                                const local = String(orderEmail).split('@')[0];
                                if (local) customer = local;
                            }
                        }
                    }
                    if (!customer) {
                        customer = extractOrderName(o);
                    }
                    if (!customer) customer = 'Customer';

                    // Format date to YYYY-MM-DD
                    let date = '';
                    try {
                        if (dateRaw) {
                            const d = new Date(dateRaw);
                            if (!isNaN(d)) date = d.toISOString().slice(0, 10);
                        }
                    } catch {}

                    return { id: orderId, customer: customer || 'Customer', date, status, amount: Number(amount || 0) };
                }).filter(r => r.id != null);

                if (mounted) {
                    try {
                        const resolvedCount = Object.keys(nameMap).length;
                        const totalUsers = userIdsUuid.length;
                        const sampleEmails = Object.keys(emailToName).slice(0, 3);
                        console.debug('[OrdersList] name resolution', { totalOrders: all.length, totalUsers, resolvedCount, sampleEmails });
                        console.debug('[OrdersList] sample rows', (mapped || []).slice(0, 5));
                    } catch {}
                    setRows(mapped);
                }
            } catch (e) {
                if (mounted) setError(e?.message || String(e));
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, []);

    const q = String(externalSearch || '').trim().toLowerCase();

    // Helper to normalize order status into three buckets used by the UI
    const orderStatusLabel = (s) => {
        if (s === 'Delivered') return 'Delivered';
        if (s === 'Cancelled') return 'Cancelled';
        return 'In Progress';
    };

    // Apply status filters first (if any), then search
    let filtered = rows;
    if (Array.isArray(statusFilters) && statusFilters.length > 0) {
        const setSt = new Set(statusFilters);
        filtered = filtered.filter(r => setSt.has(orderStatusLabel(r.status)));
    }
    filtered = filtered.filter(r =>
        String(r.id).toLowerCase().includes(q) ||
        (r.customer || '').toLowerCase().includes(q)
    );

    const statusBadge = (s) => {
        const base = 'inline-flex items-center px-2 py-1 rounded text-sm';
        if (s === 'Delivered') return <span className={`${base} bg-green-100 text-green-800`}>Delivered</span>;
        if (s === 'Cancelled') return <span className={`${base} bg-red-100 text-red-700`}>Cancelled</span>;
        return <span className={`${base} bg-yellow-100 text-yellow-800`}>In Progress</span>;
    };

    const peso = (n) => `₱${Number(n).toFixed(2)}`;

    // Helpers to fetch a single order's details and any linked address rows
    const fetchAddressesByIds = async (ids = []) => {
        if (!Array.isArray(ids) || ids.length === 0) return [];
        const uniq = Array.from(new Set(ids.map(String).filter(Boolean)));
        if (uniq.length === 0) return [];
        const results = [];
        try {
            // Try to fetch by primary id
            try {
                const { data: byId, error: idErr } = await supabase.from('addresses').select('*').in('id', uniq);
                if (!idErr && Array.isArray(byId)) results.push(...byId);
            } catch (e) { /* ignore */ }
            // Try to fetch by address_id column (some schemas use address_id as UUID)
            try {
                const { data: byAddrId, error: addrErr } = await supabase.from('addresses').select('*').in('address_id', uniq);
                if (!addrErr && Array.isArray(byAddrId)) results.push(...byAddrId);
            } catch (e) { /* ignore */ }
            // De-dupe by primary key if both queries returned overlapping rows
            const seen = new Set();
            const deduped = [];
            results.forEach(r => {
                const key = String(r?.id ?? r?.address_id ?? Math.random());
                if (seen.has(key)) return; seen.add(key);
                deduped.push(r);
            });
            return deduped;
        } catch (e) {
            return [];
        }
    };

    const isLikelyUuid = (v) => typeof v === 'string' && /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(String(v));

    const fetchShippingAddressRow = async (orderRow) => {
        if (!orderRow) return { row: null, attempted: [] };
        const seen = new Set();
        const candidates = [];
        const push = (value, label) => {
            if (value === null || value === undefined) return;
            const str = String(value).trim();
            if (str === '') return;
            const key = `${label || 'value'}:${str}`;
            if (seen.has(key)) return;
            seen.add(key);
            candidates.push({ value: str, label: label || 'value' });
        };

        push(orderRow.shipping_address_id, 'shipping_address_id');
        push(orderRow.address_id, 'address_id');
        if (typeof orderRow.shipping_address === 'string' || typeof orderRow.shipping_address === 'number') {
            push(orderRow.shipping_address, 'shipping_address');
        }
        try {
            if (orderRow?.shipping?.address_id) push(orderRow.shipping.address_id, 'shipping.address_id');
            if (orderRow?.shipping?.id) push(orderRow.shipping.id, 'shipping.id');
        } catch (e) { /* ignore */ }

        const attempted = [];
        for (const cand of candidates) {
            attempted.push(`${cand.label}:${cand.value}`);
            try {
                const { data, error } = await supabase.from('addresses').select('*').eq('address_id', cand.value).maybeSingle();
                if (!error && data) return { row: data, attempted };
            } catch (e) { /* ignore */ }
            try {
                const { data, error } = await supabase.from('addresses').select('*').eq('id', cand.value).maybeSingle();
                if (!error && data) return { row: data, attempted };
            } catch (e) { /* ignore */ }
        }

        return { row: null, attempted };
    };

    const fetchOrderDetails = async (orderId) => {
        if (!orderId) return null;
        try {
            // Try multiple candidate columns
            let res = await supabase.from('orders').select('*').eq('order_id', orderId).maybeSingle();
            if (!res || res.error || !res.data) {
                res = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
            }
            if (res && !res.error && res.data) {
                const data = res.data;

                // Load order items using the same logic as the customer Order page
                try {
                    // Fetch items specifically from `order_items` using the exact order_id
                    let { data: rawItems, error: rawItemsErr } = await supabase
                        .from('order_items')
                        .select('*')
                        .eq('order_id', orderId)
                        .order('order_item_id', { ascending: true });
                    if (rawItemsErr || !Array.isArray(rawItems)) rawItems = [];
                    const oi = Array.isArray(rawItems) ? rawItems : [];
                    const productIds = [...new Set(oi.map((r) => r.product_id).filter(Boolean))];
                    let productsMap = {};
                    if (productIds.length > 0) {
                        try {
                            const { data: prodRows } = await supabase
                                .from('products')
                                .select('id, name, image_url, weight, tax, product_types ( name, product_categories ( name ) )')
                                .in('id', productIds);
                            productsMap = (prodRows || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
                        } catch (e) { productsMap = {}; }
                    }

                    // Fetch uploaded files linked to this order. Prefer exact order_id matches (supports multiple id columns) and
                    // also fetch files attached to specific order_item_id when available. We'll build maps by product_id and order_item_id
                    // so we can attach files to items reliably.
                    const uploadedFilesByProduct = {};
                    const uploadedFilesByOrderItem = {};
                    const uploadedFilesForOrder = [];
                    try {
                        // Try several order_id equality strategies (many projects store uploaded_files.order_id as numeric FK to orders.id)
                        const tried = new Set();
                        // 1) numeric orders.id
                        if (data?.id) {
                            try {
                                const { data: filesByOrderNum, error: fErrNum } = await supabase.from('uploaded_files').select('*').eq('order_id', data.id).order('uploaded_at', { ascending: false });
                                if (!fErrNum && Array.isArray(filesByOrderNum) && filesByOrderNum.length > 0) uploadedFilesForOrder.push(...filesByOrderNum);
                                tried.add(String(data.id));
                            } catch (e) { /* ignore */ }
                        }
                        // 2) orders.order_id (external string id)
                        if (data?.order_id && !tried.has(String(data.order_id))) {
                            try {
                                const { data: filesByOrderExt, error: fErrExt } = await supabase.from('uploaded_files').select('*').eq('order_id', data.order_id).order('uploaded_at', { ascending: false });
                                if (!fErrExt && Array.isArray(filesByOrderExt) && filesByOrderExt.length > 0) uploadedFilesForOrder.push(...filesByOrderExt);
                                tried.add(String(data.order_id));
                            } catch (e) { /* ignore */ }
                        }
                        // 3) function parameter (caller-supplied orderId)
                        if (orderId && !tried.has(String(orderId))) {
                            try {
                                const { data: filesByOrderParam, error: fErrParam } = await supabase.from('uploaded_files').select('*').eq('order_id', orderId).order('uploaded_at', { ascending: false });
                                if (!fErrParam && Array.isArray(filesByOrderParam) && filesByOrderParam.length > 0) uploadedFilesForOrder.push(...filesByOrderParam);
                                tried.add(String(orderId));
                            } catch (e) { /* ignore */ }
                        }
                        // 4) if still empty, try parsing orderId as number
                        if (uploadedFilesForOrder.length === 0 && orderId) {
                            const maybeNum = parseInt(orderId, 10);
                            if (!isNaN(maybeNum) && !tried.has(String(maybeNum))) {
                                try {
                                    const { data: filesByOrderNum2, error: fErrNum2 } = await supabase.from('uploaded_files').select('*').eq('order_id', maybeNum).order('uploaded_at', { ascending: false });
                                    if (!fErrNum2 && Array.isArray(filesByOrderNum2) && filesByOrderNum2.length > 0) uploadedFilesForOrder.push(...filesByOrderNum2);
                                    tried.add(String(maybeNum));
                                } catch (e) { /* ignore */ }
                            }
                        }
                    } catch (e) { /* ignore */ }
                    try {
                        // Also attempt to fetch files tied to specific order_item_id (if the uploaded_files table uses that linkage)
                        const orderItemIds = Array.isArray(oi) ? oi.map(r => r.order_item_id || r.id).filter(Boolean) : [];
                        if (orderItemIds.length > 0) {
                            const { data: filesByItem } = await supabase.from('uploaded_files').select('*').in('order_item_id', orderItemIds).order('uploaded_at', { ascending: false });
                            if (Array.isArray(filesByItem) && filesByItem.length > 0) uploadedFilesForOrder.push(...filesByItem);
                        }
                    } catch (e) { /* ignore */ }
                    try {
                        // Fallback: try to fetch by user_id and product_id for any missing product attachments when session user exists
                        if (session?.user?.id && productIds.length > 0) {
                            const { data: fallbackFiles } = await supabase.from('uploaded_files').select('*').eq('user_id', session.user.id).in('product_id', productIds).order('uploaded_at', { ascending: false }).limit(200);
                            if (Array.isArray(fallbackFiles) && fallbackFiles.length > 0) uploadedFilesForOrder.push(...fallbackFiles);
                        }
                    } catch (e) { /* ignore */ }

                    // Normalize and index
                    const normalizeFiles = (arr) => (arr || []).map((f) => ({
                        ...f,
                        id: f.id ?? f.file_id,
                        file_id: f.file_id ?? f.id,
                        image_url: resolveProductFilePublicUrl(f.image_url || f.file_path || f.path || f.file_key || f.file_name || ''),
                    }));
                    const uniqFiles = [];
                    const seenIds = new Set();
                    for (const f of uploadedFilesForOrder) {
                        const fid = String(f?.id ?? f?.file_id ?? '');
                        if (!fid) continue;
                        if (seenIds.has(fid)) continue;
                        seenIds.add(fid);
                        uniqFiles.push(f);
                    }
                    const norm = normalizeFiles(uniqFiles);
                    norm.forEach((f) => {
                        if (f.product_id) {
                            const list = uploadedFilesByProduct[f.product_id] || (uploadedFilesByProduct[f.product_id] = []);
                            list.push(f);
                        }
                        if (f.order_item_id) {
                            const list2 = uploadedFilesByOrderItem[f.order_item_id] || (uploadedFilesByOrderItem[f.order_item_id] = []);
                            list2.push(f);
                        }
                    });
                    try { console.debug('[OrdersList] uploaded_files resolved', { total: norm.length, byProduct: Object.keys(uploadedFilesByProduct).length, byOrderItem: Object.keys(uploadedFilesByOrderItem).length, sample: norm.slice(0,3).map(f=>({id:f.id,file_name:f.file_name,image_url:f.image_url,product_id:f.product_id,order_item_id:f.order_item_id})) }); } catch(e) {}

                    const resolveImage = async (product) => {
                        try {
                            const image_key = product?.image_url;
                            if (!image_key) return "/logo-icon/logo.png";
                            if (typeof image_key === 'string' && (image_key.startsWith('http') || image_key.startsWith('/'))) return image_key;
                            const key = String(image_key).replace(/^\/+/, '');
                            const categoryName = (product?.product_types?.product_categories?.name || product?.product_types?.name || '').toLowerCase();
                            let primaryBucket = null;
                            if (categoryName.includes('apparel')) primaryBucket = 'apparel-images';
                            else if (categoryName.includes('accessories')) primaryBucket = 'accessoriesdecorations-images';
                            else if (categoryName.includes('signage') || categoryName.includes('poster')) primaryBucket = 'signage-posters-images';
                            else if (categoryName.includes('cards') || categoryName.includes('sticker')) primaryBucket = 'cards-stickers-images';
                            else if (categoryName.includes('packaging')) primaryBucket = 'packaging-images';
                            else if (categoryName.includes('3d print')) primaryBucket = '3d-prints-images';
                            const buckets = [primaryBucket, 'apparel-images','accessoriesdecorations-images','signage-posters-images','cards-stickers-images','packaging-images','3d-prints-images','product-images','images','public'].filter(Boolean);
                            for (const b of buckets) {
                                try {
                                    const { data: urlData } = supabase.storage.from(b).getPublicUrl(key);
                                    const url = urlData?.publicUrl;
                                    if (url && !url.endsWith('/')) return url;
                                } catch (e) { /* ignore bucket */ }
                            }
                            return "/logo-icon/logo.png";
                        } catch { return "/logo-icon/logo.png"; }
                    };

                    const orderItemIds = oi.map((r) => r.order_item_id || r.id || null).filter(Boolean);
                    let variantsMap = {};
                    if (orderItemIds.length > 0) {
                        try {
                            const { data: varRows } = await supabase.from('order_item_variants').select('order_item_id, variant_group_name, variant_value_name').in('order_item_id', orderItemIds);
                            variantsMap = (varRows || []).reduce((acc, v) => { const list = acc[v.order_item_id] || (acc[v.order_item_id] = []); list.push({ group: v.variant_group_name, value: v.variant_value_name }); return acc; }, {});
                        } catch (e) { variantsMap = {}; }
                    }

                    const its = [];
                    let taxSumAcc = 0;
                    for (const it of oi) {
                        const prod = productsMap[it.product_id] || null;
                        const img = prod ? await resolveImage(prod) : "/logo-icon/logo.png";
                        const qty = Number(it.quantity || it.qty || 1);
                        const taxPerUnit = Number(prod?.tax || it.tax_per_unit || 0);
                        const taxAmount = Number((taxPerUnit * qty).toFixed(2));
                        taxSumAcc += taxAmount;
                        // Per your schema: uploaded_files are linked by `order_id` (numeric). Attach files for this order and product.
                        let uploadedFiles = [];
                        try {
                            const orderIds = new Set();
                            if (data?.id !== undefined && data?.id !== null) orderIds.add(String(data.id));
                            if (data?.order_id !== undefined && data?.order_id !== null) orderIds.add(String(data.order_id));
                            if (orderId !== undefined && orderId !== null) orderIds.add(String(orderId));
                            // Also try numeric parse of orderId
                            const parsed = parseInt(orderId, 10);
                            if (!isNaN(parsed)) orderIds.add(String(parsed));

                            if (Array.isArray(norm) && norm.length > 0) {
                                // Attach files whose order_id matches and (optionally) match product_id
                                uploadedFiles = norm.filter(f => {
                                    try {
                                        if (!f) return false;
                                        const fOrder = (f.order_id ?? f.orderId ?? f.order) || null;
                                        if (!fOrder) return false;
                                        if (!orderIds.has(String(fOrder))) return false;
                                        // If uploaded_files has a product_id, prefer matching product; otherwise include it
                                        if (f.product_id) {
                                            return String(f.product_id) === String(it.product_id);
                                        }
                                        return true;
                                    } catch (e) { return false; }
                                });
                            }
                            // If still empty, attach any order-level files (regardless of product)
                            if ((!uploadedFiles || uploadedFiles.length === 0) && Array.isArray(norm) && norm.length > 0) {
                                uploadedFiles = norm.filter(f => {
                                    try { return f && (orderIds.has(String(f.order_id ?? f.orderId ?? f.order ?? ''))); } catch(e) { return false; }
                                });
                            }
                        } catch (e) { /* non-fatal */ }
                        try { console.debug('[OrdersList] attached_files_for_item', { order_item_id: it.order_item_id ?? it.id, product_id: it.product_id, attached: Array.isArray(uploadedFiles) ? uploadedFiles.length : 0 }); } catch(e) {}
                        its.push({
                            order_item_id: it.order_item_id ?? it.id ?? null,
                            product_id: it.product_id,
                            quantity: it.quantity ?? it.qty ?? 1,
                            unit_price: (it.total_price != null && it.quantity) ? (Number(it.total_price) / Number(it.quantity)) : (it.base_price ?? it.price ?? 0),
                            total_price: it.total_price ?? ((it.base_price || it.total || 0) * (it.quantity || qty)),
                            product: { name: prod?.name || it.name || 'Product', image_url: img },
                            weight: Number(prod?.weight || it.weight || 0),
                            variants: Array.isArray(variantsMap[it.order_item_id]) ? variantsMap[it.order_item_id] : [],
                            tax_per_unit: taxPerUnit,
                            tax_amount: taxAmount,
                            uploaded_files: uploadedFiles,
                            raw: it,
                        });
                    }
                    data.items = its;
                    data._itemsSubtotal = its.reduce((s, it) => s + (Number(it.total_price || 0) || 0), 0);
                    data._itemsTax = taxSumAcc;
                } catch (e) { /* ignore items fetch errors */ }

                // Attempt to load payments related to this order (to display payment method / amount)
                try {
                    const payIds = Array.from(new Set([String(orderId), String(data?.id), String(data?.order_id)].filter(Boolean)));
                    const { data: pays, error: payErr } = await supabase.from('payments').select('*').in('order_id', payIds);
                    if (!payErr && Array.isArray(pays)) {
                        data._payments = pays;
                        // attempt to derive a payment summary
                        const first = pays[0];
                        if (first) {
                            data._payment_method = first.method || first.payment_method || first.type || first.gateway || null;
                            data._paid_amount = Number(first.amount || first.paid || 0) || null;
                        }
                    }
                } catch (e) { /* ignore payments */ }

                // Enrich order with user/profile contact info when order has a user_id
                try {
                    const uid = data.user_id ?? data.user ?? data.customer_id ?? data.account_id ?? null;
                    if (uid) {
                        // try profiles table first
                        try {
                            const { data: prof, error: profErr } = await supabase.from('profiles').select('user_id, id, display_name, full_name, name, first_name, last_name, email, phone, mobile, avatar_url').eq('user_id', String(uid)).maybeSingle();
                            if (!profErr && prof) {
                                data._user_profile = prof;
                                data.customer_email = data.customer_email || prof.email || data.email || null;
                                data.customer_phone = data.customer_phone || prof.phone || prof.mobile || data.phone || null;
                                try { data.customer_name = data.customer_name || (prof.display_name || prof.full_name || [prof.first_name, prof.last_name].filter(Boolean).join(' ').trim()) || null; } catch(e) {}
                            }
                        } catch (e) { /* ignore profile fetch */ }

                        // fallback: try customers table
                        if (!data._user_profile) {
                            try {
                                const { data: cust, error: custErr } = await supabase.from('customers').select('id, customer_id, full_name, name, first_name, last_name, email, phone').eq('id', String(uid)).maybeSingle();
                                if (!custErr && cust) {
                                    data._user_profile = cust;
                                    data.customer_email = data.customer_email || cust.email || null;
                                    data.customer_phone = data.customer_phone || cust.phone || null;
                                    try { data.customer_name = data.customer_name || (cust.full_name || cust.name || [cust.first_name, cust.last_name].filter(Boolean).join(' ').trim()) || null; } catch(e) {}
                                }
                            } catch (e) { /* ignore */ }
                        }

                        // fallback: try custom users table
                        if (!data._user_profile) {
                            try {
                                const { data: urec, error: uErr } = await supabase.from('users').select('id, display_name, full_name, name, first_name, last_name, email').eq('id', String(uid)).maybeSingle();
                                if (!uErr && urec) {
                                    data._user_profile = urec;
                                    data.customer_email = data.customer_email || urec.email || null;
                                    try { data.customer_name = data.customer_name || (urec.display_name || urec.full_name || [urec.first_name, urec.last_name].filter(Boolean).join(' ').trim()) || null; } catch(e) {}
                                }
                            } catch (e) { /* ignore */ }
                        }
                    }
                } catch (e) { /* ignore user/profile enrichment errors */ }

                const { row: shippingQuickRow, attempted: shippingQuickAttempts } = await fetchShippingAddressRow(data);
                const candidateLog = Array.isArray(shippingQuickAttempts) ? [...shippingQuickAttempts] : [];
                if (shippingQuickRow) {
                    const result = { ...data };
                    result.shipping_address_row = shippingQuickRow;
                    result._resolved_addresses = [shippingQuickRow];
                    result._address_candidates = candidateLog;
                    return result;
                }

                // Collect possible address identifiers from the order row
                const candidates = new Set();
                const attemptedCandidates = [];
                const push = (v, label) => { if (v !== null && v !== undefined && String(v).trim() !== '') { candidates.add(String(v)); if (label) attemptedCandidates.push(`${label}:${String(v)}`); else attemptedCandidates.push(String(v)); } };
                // Common field names for address references
                push(data.shipping_address_id, 'shipping_address_id');
                push(data.billing_address_id, 'billing_address_id');
                push(data.address_id, 'address_id');
                // Sometimes the columns may contain UUIDs or numeric ids in shipping_address/billing_address
                push(data.shipping_address, 'shipping_address');
                push(data.billing_address, 'billing_address');
                // Some schemas store nested objects with id fields
                try {
                    if (data?.shipping?.id) push(data.shipping.id, 'shipping.id');
                    if (data?.billing?.id) push(data.billing.id, 'billing.id');
                    if (data?.shipping?.address_id) push(data.shipping.address_id, 'shipping.address_id');
                    if (data?.billing?.address_id) push(data.billing.address_id, 'billing.address_id');
                } catch (e) { /* ignore */ }

                const ids = Array.from(candidates).filter(Boolean);
                let addrs = [];
                if (ids.length > 0) {
                    addrs = await fetchAddressesByIds(ids);
                }
                const attemptedSet = new Set(candidateLog);
                attemptedCandidates.forEach(c => attemptedSet.add(c));
                ids.forEach(id => attemptedSet.add(String(id)));
                const attempted = Array.from(attemptedSet);

                // If no addresses matched the id candidates, try common alternative lookups:
                // 1) addresses.order_id == orderId (some schemas store addresses per-order)
                // 2) addresses.user_id == data.user_id (addresses attached to the customer)
                try {
                    if ((!Array.isArray(addrs) || addrs.length === 0) && (orderId || data?.id || data?.order_id)) {
                        // Try by order_id using different possible values
                        const candidates = Array.from(new Set([String(orderId || ''), String(data?.id || ''), String(data?.order_id || '')].filter(Boolean)));
                        candidates.forEach(c => attemptedSet.add(`order_id:${c}`));
                        for (const cand of candidates) {
                            try {
                                const { data: byOrder, error: byOrderErr } = await supabase.from('addresses').select('*').eq('order_id', cand);
                                if (!byOrderErr && Array.isArray(byOrder) && byOrder.length > 0) {
                                    addrs.push(...byOrder);
                                }
                            } catch (e) { /* ignore per-candidate */ }
                            if (addrs.length > 0) break;
                        }
                    }
                } catch (e) { /* ignore */ }
                try {
                    if ((!Array.isArray(addrs) || addrs.length === 0) && data?.user_id) {
                        const uid = String(data.user_id);
                        attemptedSet.add(`user_id:${uid}`);
                        const { data: byUser, error: byUserErr } = await supabase.from('addresses').select('*').eq('user_id', uid);
                        if (!byUserErr && Array.isArray(byUser) && byUser.length > 0) addrs.push(...byUser);
                    }
                } catch (e) { /* ignore */ }

                if (Array.isArray(addrs) && addrs.length > 0) {
                    // De-duplicate
                    const seen = new Set();
                    const dedup = [];
                    addrs.forEach(a => {
                        const key = String(a?.id ?? a?.address_id ?? Math.random());
                        if (seen.has(key)) return; seen.add(key);
                        dedup.push(a);
                    });

                    const byId = {};
                    const byAddressId = {};
                    dedup.forEach(a => {
                        if (a?.id != null) byId[String(a.id)] = a;
                        if (a?.address_id) byAddressId[String(a.address_id)] = a;
                    });

                    const matchFor = (fieldVal) => {
                        if (fieldVal == null) return null;
                        const s = String(fieldVal);
                        if (byId[s]) return byId[s];
                        if (byAddressId[s]) return byAddressId[s];
                        if (isLikelyUuid(s)) {
                            const lower = s.toLowerCase();
                            if (byId[lower]) return byId[lower];
                            if (byAddressId[lower]) return byAddressId[lower];
                        }
                        return null;
                    };

                    const result = { ...data };
                    result.shipping_address_row = matchFor(data.shipping_address_id) || matchFor(data.shipping_address) || matchFor(data.shipping?.id) || matchFor(data.shipping?.address_id) || dedup[0] || null;
                    result.billing_address_row = matchFor(data.billing_address_id) || matchFor(data.billing_address) || matchFor(data.billing?.id) || matchFor(data.billing?.address_id) || (dedup.length > 1 ? dedup[1] : dedup[0]) || null;
                    result._resolved_addresses = dedup;
                    result._address_candidates = Array.from(attemptedSet);
                    return result;
                }

                // attach attempted candidates for debugging even when no addresses resolved
                try { data._address_candidates = Array.from(attemptedSet); } catch (e) {}
                return data;
            }
        } catch (e) {
            // ignore
        }
        return null;
    };

    const openViewModal = async (orderId) => {
        setViewLoading(true);
        setViewOrderDetails(null);
        try {
            const data = await fetchOrderDetails(orderId);
            if (data) {
                setViewOrderDetails(data);
                setUpdateStatusValue(data.status ?? 'In Progress');
            } else {
                // fallback: find in rows
                const fallback = rows.find(r => String(r.id) === String(orderId));
                if (fallback) {
                    setViewOrderDetails({ id: fallback.id, status: fallback.status, customer_name: fallback.customer });
                    setUpdateStatusValue(fallback.status ?? 'In Progress');
                }
            }
        } catch (e) {
            // ignore
        } finally {
            setViewLoading(false);
        }
    };

    const closeViewModal = () => { setViewOrderDetails(null); setShowUpdateModal(false); };

    const cancelOrder = async (orderId) => {
        try {
            await supabase.from('orders').update({ status: 'Cancelled' }).or(`order_id.eq.${orderId},id.eq.${orderId}`);
            // update local rows
            setRows(prev => prev.map(r => (String(r.id) === String(orderId) ? { ...r, status: 'Cancelled' } : r)));
            setViewOrderDetails(prev => prev ? { ...prev, status: 'Cancelled' } : prev);
        } catch (e) {
            console.error('Cancel order failed', e);
        }
    };

    const saveUpdatedStatus = async () => {
        if (!viewOrderDetails) return;
        const orderId = viewOrderDetails.order_id ?? viewOrderDetails.id ?? viewOrderDetails.reference ?? viewOrderDetails.number;
        try {
            const { error } = await supabase.from('orders').update({ status: updateStatusValue }).or(`order_id.eq.${orderId},id.eq.${orderId}`);
            if (!error) {
                setRows(prev => prev.map(r => (String(r.id) === String(orderId) ? { ...r, status: updateStatusValue } : r)));
                setViewOrderDetails(prev => prev ? { ...prev, status: updateStatusValue } : prev);
                setShowUpdateModal(false);
            }
        } catch (e) {
            console.error('Save status failed', e);
        }
    };

    return (
        <div className="p-0 px-0">
            <div className="flex items-center justify-between"></div>

            
            <div className="overflow-x-auto p-0">
                <div className="h-[700px] overflow-y-auto">
                    <table className="w-full table-fixed rounded-md">
                    <colgroup>
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '12%' }} />
                     
                    </colgroup>
                    <thead className="sticky top-0 bg-[#DFE7F4] border-b border-[#939393]">
                        <tr className="text-left text-[16px] text-gray-600">
                            <th className="px-4 py-2">Order ID</th>
                            <th className="px-4 py-2">Customer</th>
                            <th className="px-4 py-2">Date Ordered</th>
                            <th className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                    <span>Status</span>
                                    <div className="relative  p-0 z-30" ref={statusMenuRef}>
                                        <button
                                            type="button"
                                            aria-label="Filter by status"
                                            onClick={() => { setStatusDraft(statusFilters); setShowStatusDropdown(s => !s); }}
                                            className="bg-transparent  focus:outline-none"
                                        >
                                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-gray-600">
                                                <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        {showStatusDropdown && (
                                            <div className="absolute left-[-50px] mt-2 w-[244px] rounded-md border bg-white shadow z-20">
                                                <div className="p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-gray-800">Select Status</span>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto py-1 pr-1">
                                                        <div className="flex flex-wrap gap-2">
                                                            {['Delivered','Cancelled','In Progress'].map(name => {
                                                                const available = rows.some(r => orderStatusLabel(r.status) === name);
                                                                const active = statusDraft.includes(name);
                                                                const base = "px-3 py-1 rounded-full border border-black text-sm";
                                                                if (!available) {
                                                                    return (
                                                                        <button key={name} type="button" disabled className={`${base} bg-gray-200 text-gray-400 cursor-not-allowed`}>{name}</button>
                                                                    );
                                                                }
                                                                return (
                                                                    <button
                                                                        key={name}
                                                                        type="button"
                                                                        onClick={() => setStatusDraft(d => (d.includes(name) ? d.filter(x => x !== name) : [...d, name]))}
                                                                        className={`${base} ${active ? 'bg-[#2B4269] text-white border-[#2B4269]' : 'text-gray-700 hover:bg-gray-50'}`}
                                                                    >
                                                                        {name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 rounded-md border border-black text-sm text-red-600 hover:bg-red-50"
                                                            onClick={() => { setStatusDraft([]); setStatusFilters([]); setShowStatusDropdown(false); }}
                                                        >
                                                            Reset
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 rounded-md bg-[#2B4269] text-white text-sm"
                                                            onClick={() => { setStatusFilters(statusDraft); setShowStatusDropdown(false); }}
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                                )}
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-2">Total Amount</th>
                                    <th className="px-4 py-2"></th>
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
                                            <button onClick={() => openViewModal(r.id)} className="px-3 py-1 rounded-md w-[109px] border border-[#939393] text-sm text-gray-700 hover:bg-gray-50">View</button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                </div>

            {/* View Order Modal */}
            <Modal open={!!viewOrderDetails} onClose={closeViewModal} width={"w-[400px]"}>
                <div className="p-6 max-w-[520px]">
                    {viewLoading ? (
                        <div className="p-6 text-center">Loading…</div>
                    ) : (
                        <>
                        <div className="mb-4">
                            <div className="text-2xl font-bold text-[#12263F]">{`Order #${viewOrderDetails?.order_id ?? viewOrderDetails?.id ?? ''}`}</div>
                            <div className="mt-3 flex items-center gap-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded text-sm bg-yellow-100 text-yellow-800 font-medium">{viewOrderDetails?.status ?? 'In Progress'}</span>
                                <button className="inline-flex items-center gap-2 text-sm border rounded px-2 py-1 text-gray-700 bg-white">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    Print
                                </button>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
                            <h3 className="text-sm font-semibold text-[#12263F] mb-3">Contact</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <div className="text-xs text-gray-500">Email Address</div>
                                    <div className="text-sm text-blue-600 underline">
                                        {(viewOrderDetails?.shipping_address_row?.email)
                                            || (viewOrderDetails?.billing_address_row?.email)
                                            || viewOrderDetails?.customer_email
                                            || viewOrderDetails?.email
                                            || viewOrderDetails?.contact_email
                                            || '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Phone</div>
                                    <div className="text-sm">
                                        {(viewOrderDetails?.shipping_address_row?.phone_number)
                                            || (viewOrderDetails?.billing_address_row?.phone_number)
                                            || viewOrderDetails?.phone
                                            || viewOrderDetails?.contact_phone
                                            || viewOrderDetails?.mobile
                                            || '—'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Info */}
                        <div className="mt-6 border-t border-dashed border-gray-200 pt-4">
                            <h4 className="text-sm font-semibold mb-3">Order Info</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                                <div className="text-xs text-gray-500">Date Ordered</div>
                                <div>{(function(){ try { const d = new Date(viewOrderDetails?.date_ordered || viewOrderDetails?.created_at || viewOrderDetails?.placed_at || viewOrderDetails?.date); if (!isNaN(d)) return d.toISOString().slice(0,10); } catch(e){} return '—'; })()}</div>

                                <div className="text-xs text-gray-500">Payment</div>
                                <div>{viewOrderDetails?._payment_method || viewOrderDetails?.payment_method || (viewOrderDetails?._payments && viewOrderDetails._payments.length ? viewOrderDetails._payments[0].method || viewOrderDetails._payments[0].payment_method : null) || (viewOrderDetails?.payment_status ? `${viewOrderDetails.payment_status}` : '—')}</div>

                                <div className="text-xs text-gray-500">Delivery</div>
                                <div>{viewOrderDetails?.delivery_method || viewOrderDetails?.delivery || viewOrderDetails?.shipping_provider || '—'}</div>

                                <div className="text-xs text-gray-500">Tracking No.</div>
                                <div>{viewOrderDetails?.tracking_number || viewOrderDetails?.tracking_no || viewOrderDetails?.tracking || '—'}</div>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="mt-6 border-t border-dashed border-gray-200 pt-4">
                            <h4 className="text-sm font-semibold mb-3">Item(s) Ordered</h4>
                            <div className="space-y-4">
                                {Array.isArray(viewOrderDetails?.items) && viewOrderDetails.items.length > 0 ? (
                                    viewOrderDetails.items.map((it, idx) => {
                                        // Build full spec lines in the exact order used on Order page
                                        const buildSpecs = () => {
                                            const ORDER = [
                                                'Technique',
                                                'Printing',
                                                'Color',
                                                'Size',
                                                'Material',
                                                'Strap',
                                                'Type',
                                                'Accessories (Hook Clasp)',
                                                'Accessories Color',
                                                'Trim Color',
                                                'Base',
                                                'Hole',
                                                'Pieces',
                                                'Cut Style',
                                                'Size (Customize)',
                                                'Acrylic Pieces Quantity',
                                            ];
                                            const norm = (s) => String(s || '').trim();
                                            const labelFor = (group, value) => {
                                                const g = norm(group);
                                                const v = norm(value);
                                                if (/accessor/i.test(g) && /(hook|clasp)/i.test(v)) return 'Accessories (Hook Clasp)';
                                                return g || '—';
                                            };
                                            const rawSpecs = [];
                                            if (Array.isArray(it.variants)) {
                                                for (const v of it.variants) {
                                                    const label = labelFor(v?.group, v?.value);
                                                    const val = toColorNameIfHex(v?.group, v?.value);
                                                    rawSpecs.push({ label, value: val });
                                                }
                                            }
                                            const map = rawSpecs.reduce((acc, s) => { acc[s.label] = s.value; return acc; }, {});
                                            const lines = [];
                                            for (const label of ORDER) {
                                                if (map[label]) lines.push(`${label}: ${map[label]}`);
                                            }
                                            return lines;
                                        };
                                        const designFiles = Array.isArray(it.uploaded_files) ? it.uploaded_files : [];
                                        const designBlock = (() => {
                                            if (designFiles.length === 0) return null;
                                            const first = designFiles[0];
                                            const extra = Math.max(0, designFiles.length - 1);
                                            return (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="flex items-center gap-2 border rounded px-2 py-1 bg-white">
                                                        <div className="w-10 h-10 overflow-hidden rounded bg-gray-100 flex items-center justify-center">
                                                            {first?.image_url ? (
                                                                <img src={first.image_url} alt={first.file_name || 'design'} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <img src="/logo-icon/image.svg" alt="file" className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-600 truncate max-w-[140px]">{first?.file_name || 'uploaded design'}</div>
                                                    </div>
                                                    {extra > 0 && (
                                                        <div className="inline-flex items-center justify-center bg-transparent text-black text-[15px] font-semibold rounded-full w-6 h-6">+{extra}</div>
                                                    )}
                                                </div>
                                            );
                                        })();

                                        return (
                                            <div key={idx} className="flex items-start gap-4">
                                                <img src={it.product?.image_url || it.image_url || it.image || (it.raw && (it.raw.product_image || it.raw.thumbnail)) || '/logo-icon/profile-icon.svg'} alt="" className="w-12 h-12 rounded border bg-white p-1 object-cover" />
                                                <div className="flex-1">
                                                    <div className="font-semibold text-sm text-gray-800">{(it.product && it.product.name) || it.name || it.product_name}</div>
                                                    <div className="mt-2">
                                                        {designBlock ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 border rounded-md bg-white px-3 py-2">
                                                                        <div className="w-10 h-10 overflow-hidden rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                                            {designFiles[0]?.image_url ? (
                                                                                <img src={designFiles[0].image_url} alt={designFiles[0].file_name || 'design'} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <img src="/logo-icon/image.svg" alt="file" className="w-4 h-4" />
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-gray-700 truncate">{designFiles[0]?.file_name || 'uploaded design'}</div>
                                                                    </div>
                                                                </div>
                                                                {designFiles.length > 1 && (
                                                                    <div className="inline-flex items-center justify-center bg-gray-100 text-black text-[13px] font-semibold rounded-full w-7 h-7">+{designFiles.length - 1}</div>
                                                                )}
                                                            </div>
                                                        ) : null}

                                                        <div className="text-xs text-gray-600 mt-2">
                                                            {buildSpecs().map((line, i) => (<div key={i}>{line}</div>))}
                                                        </div>
                                                    </div>

                                                    <div className="text-xs text-gray-600 mt-2">Qty: {it.quantity ?? 1}</div>
                                                    <div className="text-sm text-gray-900 mt-1">{peso(it.total_price ?? it.line_total ?? (Number(it.price || 0) * (it.quantity || 1)))}</div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-sm text-gray-500">No item details available.</div>
                                )}
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="mt-6 border-t border-dashed border-gray-200 pt-4 text-sm text-gray-800">
                            <div className="flex items-center justify-between"><div>Subtotal</div><div>{peso(viewOrderDetails?._itemsSubtotal ?? viewOrderDetails?.subtotal ?? viewOrderDetails?.sub_total ?? 0)}</div></div>
                            <div className="flex items-center justify-between mt-2"><div>Shipping</div><div>{peso(viewOrderDetails?.shipping_amount ?? viewOrderDetails?.shipping_cost ?? viewOrderDetails?.shipping ?? 0)}</div></div>
                            <div className="flex items-center justify-between mt-2"><div>Taxes</div><div>{peso(viewOrderDetails?.taxes ?? viewOrderDetails?.tax ?? 0)}</div></div>
                            <div className="flex items-center justify-between mt-3 font-semibold text-gray-900"><div>Total</div><div>{peso(viewOrderDetails?.total ?? viewOrderDetails?.amount ?? ((viewOrderDetails?._itemsSubtotal ?? viewOrderDetails?.subtotal ?? viewOrderDetails?.sub_total ?? 0) + (viewOrderDetails?.shipping_amount ?? viewOrderDetails?.shipping_cost ?? viewOrderDetails?.shipping ?? 0)))}</div></div>
                        </div>

                        <div className="mt-6 pt-4 border-t flex items-center justify-between gap-4">
                            <button className="bg-[#9E3E3E] hover:bg-[#873434] text-white px-4 py-2 rounded-md font-semibold" onClick={() => cancelOrder(viewOrderDetails?.order_id ?? viewOrderDetails?.id)}>CANCEL ORDER</button>
                            <div className="flex items-center gap-3">
                                <button className="px-4 py-2 border border-gray-300 rounded-md text-sm" onClick={closeViewModal}>CLOSE</button>
                                <button className="px-4 py-2 bg-[#1F3A57] hover:bg-[#172a41] text-white rounded-md font-semibold" onClick={() => setShowUpdateModal(true)}>UPDATE</button>
                            </div>
                        </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Update Status Modal */}
            <Modal open={showUpdateModal} onClose={() => setShowUpdateModal(false)}>
                <div className="p-6 max-w-[420px]">
                    <div className="text-xl font-bold text-[#12263F] mb-4">{`Order #${viewOrderDetails?.order_id ?? viewOrderDetails?.id ?? ''}`}</div>
                    <div className="mb-4">
                        <label className="block text-sm text-gray-700 mb-2">Status</label>
                        <div className="flex items-center gap-3">
                            <select value={updateStatusValue} onChange={(e) => setUpdateStatusValue(e.target.value)} className="border rounded px-3 py-2 text-sm">
                                <option>In Progress</option>
                                <option>Delivered</option>
                                <option>Cancelled</option>
                            </select>
                            <button className="px-3 py-2 border rounded text-sm">Print</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold" onClick={saveUpdatedStatus}>SAVE</button>
                        <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md" onClick={() => setShowUpdateModal(false)}>CANCEL</button>
                    </div>
                </div>
            </Modal>

        </div>
        </div>
    );
};

// Admin > Products: list all products across all categories from products table
const ProductsList = ({ externalSearch = '' }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Category filter states (mirror StocksList)
    const [categories, setCategories] = useState([]);
    const [categoriesAll, setCategoriesAll] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [categoryDraft, setCategoryDraft] = useState([]);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const catMenuRef = useRef(null);
    // Status filter (Active/Inactive only for Products)
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [statusFilters, setStatusFilters] = useState([]); // ['Active','Inactive']
    const [statusDraft, setStatusDraft] = useState([]);
    const statusMenuRef = useRef(null);

    // Small helper for status badge — same scheme as Stocks tab
    const statusBadge = (s) => {
        const base = 'inline-flex items-center px-2 py-1 rounded text-sm';
        if (s === 'Out of Stock') return <span className={`${base} bg-red-100 text-red-700`}>Out of Stock</span>;
        if (s === 'Low Stock') return <span className={`${base} bg-yellow-100 text-yellow-800`}>Low Stock</span>;
        return <span className={`${base} bg-green-100 text-green-800`}>Active</span>;
    };

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1) Fetch all products (paged) with their category
                const pageSize = 1000;
                let page = 0;
                let allProducts = [];
                while (true) {
                    const start = page * pageSize;
                    const end = (page + 1) * pageSize - 1;
                    const { data, error } = await supabase
                        .from('products')
                        .select('id, name, starting_price, image_url, product_types(id, name, category_id, product_categories(id, name))')
                        .order('id', { ascending: false })
                        .range(start, end);
                    if (error) throw error;
                    const chunk = data || [];
                    allProducts = allProducts.concat(chunk);
                    if (chunk.length < pageSize) break;
                    page += 1;
                }

                // 2) Fetch inventory with joined product_id to aggregate total stock per product
                //    and derive a product-level status matching the Stocks tab.
                const productAgg = {}; // { [productId]: { total: number, lowStock: boolean } }
                try {
                    const invPageSize = 1000;
                    let invPage = 0;
                    const allInv = [];
                    while (true) {
                        const start = invPage * invPageSize;
                        const end = (invPage + 1) * invPageSize - 1;
                        const { data: inv, error: invErr } = await supabase
                            .from('inventory')
                            .select('combination_id, quantity, low_stock_limit, product_variant_combinations(product_id)')
                            .range(start, end);
                        if (invErr) throw invErr;
                        const chunk = inv || [];
                        allInv.push(...chunk);
                        if (chunk.length < invPageSize) break;
                        invPage += 1;
                    }

                    // Build a set of combination_ids that still need product_id mapping
                    const missingComboIds = new Set();
                    for (const row of allInv) {
                        const hasJoin = !!(row?.product_variant_combinations?.product_id
                            ?? (Array.isArray(row?.product_variant_combinations) ? row.product_variant_combinations[0]?.product_id : null));
                        if (!hasJoin && row?.combination_id != null) missingComboIds.add(String(row.combination_id));
                    }

                    let comboToProduct = {};
                    if (missingComboIds.size > 0) {
                        try {
                            const ids = Array.from(missingComboIds);
                            const batchSize = 1000;
                            for (let i = 0; i < ids.length; i += batchSize) {
                                const batch = ids.slice(i, i + batchSize);
                                const { data: combos, error: cErr } = await supabase
                                    .from('product_variant_combinations')
                                    .select('combination_id, product_id')
                                    .in('combination_id', batch);
                                if (!cErr && Array.isArray(combos)) {
                                    combos.forEach(c => { if (c?.combination_id != null && c?.product_id != null) comboToProduct[String(c.combination_id)] = String(c.product_id); });
                                }
                            }
                        } catch {}
                    }

                    // Aggregate totals per product by summing all variant (combination) stocks
                    for (const row of allInv) {
                        const q = Number(row?.quantity || 0);
                        const low = row?.low_stock_limit != null ? Number(row.low_stock_limit) : null;
                        let pid = row?.product_variant_combinations?.product_id
                            ?? (Array.isArray(row?.product_variant_combinations) ? row.product_variant_combinations[0]?.product_id : null);
                        if (pid == null && row?.combination_id != null) {
                            const mapped = comboToProduct[String(row.combination_id)];
                            if (mapped != null) pid = mapped;
                        }
                        if (pid != null) {
                            const key = String(pid);
                            const agg = productAgg[key] || { total: 0, lowStock: false };
                            agg.total += q;
                            if (q > 0 && low != null && q <= low) agg.lowStock = true;
                            productAgg[key] = agg;
                        }
                    }
                } catch (e) {
                    // Non-fatal: if we fail to load inventory, default to 0 stock
                }

                // 3) Map products to UI rows
                const mapped = (allProducts || []).map(p => {
                    const pt = Array.isArray(p?.product_types) ? p.product_types[0] : p?.product_types;
                    const category = pt?.product_categories?.name || pt?.name || '';
                    const productId = p?.id;
                    const agg = productAgg[String(productId)] || { total: 0, lowStock: false };
                    const stock = agg.total || 0;
                    // Derive status like Stocks tab
                    let status = 'Active';
                    if (stock <= 0) status = 'Out of Stock';
                    else if (agg.lowStock) status = 'Low Stock';
                    return {
                        id: productId,
                        name: p?.name || '',
                        category,
                        price: p?.starting_price ?? null,
                        image_key: p?.image_url || null,
                        status,
                        total_stock: stock,
                    };
                });

                if (mounted) {
                    setRows(mapped);
                    try {
                        const cats = Array.from(new Set((mapped || []).map(r => r.category).filter(Boolean))).sort((a,b) => String(a).localeCompare(String(b)));
                        setCategories(cats);
                    } catch {}
                }
            } catch (e) {
                if (mounted) setError(e?.message || String(e));
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();

        // Realtime refresh when products or inventory change
        const channel = supabase.channel('public:admin-products');
        try {
            channel
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => load())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => load())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variant_combinations' }, () => load())
                .subscribe();
        } catch {}
        return () => { try { channel.unsubscribe(); } catch {} mounted = false; };
    }, []);

    // Load all categories for dropdown (so unavailable ones render disabled but visible)
    useEffect(() => {
        let cancelled = false;
        const loadCats = async () => {
            try {
                const { data, error } = await supabase
                    .from('product_categories')
                    .select('id, name')
                    .order('name', { ascending: true });
                if (!error && Array.isArray(data)) {
                    if (!cancelled) setCategoriesAll(data.map(c => c.name).filter(Boolean));
                }
            } catch {}
        };
        loadCats();
        return () => { cancelled = true; };
    }, []);

    // Close the category dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showCategoryDropdown && catMenuRef.current && !catMenuRef.current.contains(e.target)) {
                setShowCategoryDropdown(false);
                setCategoryDraft(selectedCategories); // revert draft on outside click
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showCategoryDropdown, selectedCategories]);

    // Close the status dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showStatusDropdown && statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
                setShowStatusDropdown(false);
                setStatusDraft(statusFilters);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showStatusDropdown, statusFilters]);

    const q = String(externalSearch || '').trim().toLowerCase();
    let filtered = rows;
    // Apply category filters first
    if (Array.isArray(selectedCategories) && selectedCategories.length > 0) {
        const setSel = new Set(selectedCategories);
        filtered = filtered.filter(r => setSel.has(r.category || ''));
    }
    // Apply Active/Inactive status filter
    if (Array.isArray(statusFilters) && statusFilters.length > 0) {
        const setSt = new Set(statusFilters);
        filtered = filtered.filter(r => {
            const isActive = r.status === 'Active';
            const label = isActive ? 'Active' : 'Inactive';
            return setSt.has(label);
        });
    }
    // Then apply search filter
    if (q !== '') {
        filtered = filtered.filter(r =>
            (r.name || '').toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q)
        );
    }

    const peso = (n) => n == null ? '—' : `₱${Number(n).toFixed(2)}`;

    return (
        <div className="">
            
            <div className="overflow-x-auto p-0">
                <div className="h-[700px] overflow-y-auto">
                    <table className="w-full table-fixed rounded-md">
                        <colgroup>
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '10%' }} />
                        </colgroup>
                        <thead className="sticky  top-0 bg-[#DFE7F4]">
                        <tr className="text-left h-[41px] p-5 text-[16px] text-gray-600">
                            <th className="px-4 py-2">Product Name</th>
                            <th className="px-4 py-2 ">
                                <div className="flex items-center gap-2">
                                    <span>Category</span>
                                    <div className="relative p-0 z-30" ref={catMenuRef}>
                                        <button
                                            type="button"
                                            aria-label="Filter by category"
                                            onClick={() => { setCategoryDraft(selectedCategories); setShowCategoryDropdown((s) => !s); }}
                                            className="bg-transparent focus:outline-none "
                                        >
                                            <svg
                                                aria-hidden="true"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                className="h-4 w-4  text-gray-600"
                                            >
                                                <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        {showCategoryDropdown && (
                                            <div className="absolute left-[-80px] mt-2 w-80 max-w-[22rem] rounded-md border bg-white shadow z-20">
                                                <div className="p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-gray-800">Select Category</span>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto py-1 pr-1">
                                                        <div className="flex flex-wrap gap-2">
                                                            {(categoriesAll.length > 0 ? categoriesAll : categories).map(name => {
                                                                const available = categories.includes(name);
                                                                const active = categoryDraft.includes(name);
                                                                const base = "px-3 py-1 rounded-full border border-black text-sm";
                                                                if (!available) {
                                                                    return (
                                                                        <button key={name} type="button" disabled className={`${base} bg-gray-200 text-gray-400 cursor-not-allowed`}>{name}</button>
                                                                    );
                                                                }
                                                                return (
                                                                    <button
                                                                        key={name}
                                                                        type="button"
                                                                        onClick={() => setCategoryDraft(d => (d.includes(name) ? d.filter(x => x !== name) : [...d, name]))}
                                                                        className={`${base} ${active ? 'bg-[#2B4269] text-white border-[#2B4269]' : 'text-gray-700 hover:bg-gray-50'}`}
                                                                    >
                                                                        {name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 border border-black rounded-md border text-sm text-red-600 hover:bg-red-50"
                                                            onClick={() => { setCategoryDraft([]); setSelectedCategories([]); setShowCategoryDropdown(false); }}
                                                        >
                                                            Reset
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 rounded-md bg-[#2B4269] text-white text-sm"
                                                            onClick={() => { setSelectedCategories(categoryDraft); setShowCategoryDropdown(false); }}
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </th>
                            <th className="px-4 py-2 ml-[100px]">Starting Price</th>
                            <th className="px-4 py-2">Total Stock</th>
                            <th className="px-4 py-2 ">
                                <div className="flex items-center gap-2">
                                    <span>Status</span>
                                    <div className="relative p-0 z-30" ref={statusMenuRef}>
                                        <button
                                            type="button"
                                            aria-label="Filter by status"
                                            onClick={() => { setStatusDraft(statusFilters); setShowStatusDropdown(s => !s); }}
                                            className="bg-transparent focus:outline-none "
                                        >
                                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-gray-600">
                                                <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        {showStatusDropdown && (
                                            <div className="absolute left-[-50px] mt-2 w-[244px] rounded-md border bg-white shadow z-20">
                                                <div className="p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-black ">Select Status</span>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto py-1 pr-1">
                                                        <div className="flex flex-wrap gap-2">
                                                            {['Active','Inactive'].map(name => {
                                                                const available = rows.some(r => {
                                                                    const isActive = r.status === 'Active';
                                                                    return name === 'Active' ? isActive : !isActive;
                                                                });
                                                                const active = statusDraft.includes(name);
                                                                const base = "px-3 py-1 rounded-full border border-black text-sm";
                                                                if (!available) {
                                                                    return (
                                                                        <button key={name} type="button" disabled className={`${base} bg-gray-200 text-gray-400 cursor-not-allowed`}>{name}</button>
                                                                    );
                                                                }
                                                                return (
                                                                    <button
                                                                        key={name}
                                                                        type="button"
                                                                        onClick={() => setStatusDraft(d => (d.includes(name) ? d.filter(x => x !== name) : [...d, name]))}
                                                                        className={`${base} ${active ? 'bg-[#2B4269] text-white border-[#2B4269]' : 'text-gray-700 hover:bg-gray-50'}`}
                                                                    >
                                                                        {name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 rounded-md border border-black text-sm text-red-600 hover:bg-red-50"
                                                            onClick={() => { setStatusDraft([]); setStatusFilters([]); setShowStatusDropdown(false); }}
                                                        >
                                                            Reset
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 rounded-md bg-[#2B4269] text-white text-sm"
                                                            onClick={() => { setStatusFilters(statusDraft); setShowStatusDropdown(false); }}
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </th>
                            <th className="px-4 py-2"></th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map(p => (
                            <tr key={p.id} className="border-t">
                                <td className="px-4 py-3 align-top">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={(() => {
                                                const key = p.image_key;
                                                if (!key) return '/apparel-images/caps.png';
                                                const categoryName = (p.category || '').toLowerCase();
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
                                            alt={p.name || 'product'}
                                            className="w-14 h-14 object-cover rounded"
                                            onError={(e) => { try { e.currentTarget.src = '/apparel-images/caps.png'; } catch (ee) {} }}
                                        />
                                        <div>
                                            <div className="text-gray-900 font-medium">{p.name || '—'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 align-center  text-gray-700">{p.category || '—'}</td>
                                <td className="px-4 py-3 align-center text-gray-800">{peso(p.price)}</td>
                                <td className="px-8 py-3 align-center text-gray-800">{p.total_stock ?? 0}</td>
                                <td className="px-4 py-3 align-center">{statusBadge(p.status)}</td>
                                <td className="px-4 py-3 align-center">
                                    <button className="px-3 py-1 rounded-md w-[109px] border border-[#939393] text-sm text-gray-700 hover:bg-gray-50">View</button>
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

// Admin > Users: list rows from user_info table
const UsersList = ({ externalSearch = '' }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch up to 2000 users (adjust as needed)
                const pageSize = 2000;
                const { data, error } = await supabase
                    .from('user_info')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(pageSize);
                if (error) throw error;
                const mapped = (data || []).map(u => {
                    const full = u.full_name || u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || (u.email ? u.email.split('@')[0] : 'User');
                    const email = u.email || u.email_address || u.contact_email || '';
                    const joined = (u.created_at || u.date_joined || u.joined_at) ? (new Date(u.created_at || u.date_joined || u.joined_at)).toISOString().slice(0,10) : '';
                    const role = u.role || u.user_role || u.type || 'Customer';
                    // Prefer last_signed_in_at for last activity (timestampz). Fallback to other known columns.
                    const lastActivityRaw = u.last_signed_in_at || u.last_activity || u.last_active_at || u.updated_at;
                    const lastAct = lastActivityRaw ? (new Date(lastActivityRaw)).toISOString().slice(0,10) : '';
                    return { id: u.id || u.user_id || u.uid || u.email, full, email, joined, role, lastAct };
                });
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

    const q = String(externalSearch || '').trim().toLowerCase();
    const filtered = q ? rows.filter(r => (r.full || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q)) : rows;

    // View modal state
    const [viewUser, setViewUser] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);

    // inline validation errors for admin edit (match Account page rules)
    const [firstNameError, setFirstNameError] = useState('');
    const [lastNameError, setLastNameError] = useState('');

    const openViewModal = async (userIdOrEmail) => {
        setViewLoading(true);
        setViewUser(null);
        try {
            // Try to fetch user by id first, otherwise try by email
            let userRow = null;
            try {
                const { data, error } = await supabase.from('user_info').select('*').eq('id', userIdOrEmail).maybeSingle();
                if (!error && data) userRow = data;
            } catch (e) { /* ignore */ }
            if (!userRow) {
                try {
                    const { data, error } = await supabase.from('user_info').select('*').eq('email', userIdOrEmail).maybeSingle();
                    if (!error && data) userRow = data;
                } catch (e) { /* ignore */ }
            }

            // Fallback: if the passed id is actually an email string present in rows, try match by email
            if (!userRow && String(userIdOrEmail || '').includes('@')) {
                try {
                    const { data, error } = await supabase.from('user_info').select('*').eq('email', userIdOrEmail).maybeSingle();
                    if (!error && data) userRow = data;
                } catch (e) { /* ignore */ }
            }

            // Compute order aggregates: total orders and last order date
            let totalOrders = 0;
            let lastOrderDate = '';
            try {
                if (userRow) {
                    // Try by user id first, then by email fields
                    const userId = userRow.id;
                    const byId = await supabase.from('orders').select('order_id, created_at').or(`user_id.eq.${userId}`).order('created_at', { ascending: false }).limit(1);
                    if (!byId.error && Array.isArray(byId.data)) {
                        // count separately
                        const { count, error: cntErr } = await supabase.from('orders').select('*', { count: 'exact', head: true }).or(`user_id.eq.${userId}`);
                        if (!cntErr) totalOrders = Number(count || 0);
                        if (byId.data.length > 0) lastOrderDate = (new Date(byId.data[0].created_at)).toISOString().slice(0,10);
                    } else {
                        // fallback by email
                        const email = userRow.email;
                        if (email) {
                            const byEmail = await supabase.from('orders').select('order_id, created_at').or(`customer_email.eq.${email},email.eq.${email}`).order('created_at', { ascending: false }).limit(1);
                            if (!byEmail.error && Array.isArray(byEmail.data)) {
                                const { count, error: cntErr } = await supabase.from('orders').select('*', { count: 'exact', head: true }).or(`customer_email.eq.${email},email.eq.${email}`);
                                if (!cntErr) totalOrders = Number(count || 0);
                                if (byEmail.data.length > 0) lastOrderDate = (new Date(byEmail.data[0].created_at)).toISOString().slice(0,10);
                            }
                        }
                    }
                }
            } catch (e) { /* ignore order aggregation errors */ }

            // Prefer authoritative display name from auth.users when available,
            // then derive first/last name similar to Account page logic
            let authDisplayName = null;
            try {
                const { data: authData, error: authErr } = await supabase.from('auth.users').select('id, raw_user_meta_data').eq('id', userRow?.id).maybeSingle();
                if (!authErr && authData) {
                    authDisplayName = authData.raw_user_meta_data?.display_name || authData.raw_user_meta_data?.full_name || authData.raw_user_meta_data?.name || null;
                }
            } catch (e) {
                // ignore access errors (client may not have permission); will try RPC next
            }
            if (!authDisplayName) {
                try {
                    const ids = userRow?.id ? [String(userRow.id)] : [];
                    if (ids.length > 0) {
                        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_user_public_names', { ids });
                        if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
                            authDisplayName = rpcData[0]?.name || rpcData[0]?.display_name || null;
                        }
                    }
                } catch (e) {
                    // ignore RPC errors
                }
            }

            // derive first/last
            let derivedFirst = userRow?.first_name || '';
            let derivedLast = userRow?.last_name || '';
            const finalDisplayName = (authDisplayName || userRow?.display_name || userRow?.full_name || '').trim();
            if (finalDisplayName) {
                const parts = finalDisplayName.split(/\s+/).filter(Boolean);
                // If display name has three words, treat last two as the surname
                if (parts.length === 3) {
                    derivedFirst = parts[0] || derivedFirst;
                    derivedLast = `${parts[1]} ${parts[2]}`.trim() || derivedLast;
                } else {
                    derivedFirst = parts[0] || derivedFirst;
                    derivedLast = parts[1] || derivedLast;
                }
            }

            const out = {
                id: userRow?.id || null,
                first_name: derivedFirst || '',
                last_name: derivedLast || '',
                full_name: userRow?.full_name || userRow?.display_name || finalDisplayName || '',
                email: userRow?.email || '',
                role: userRow?.role || userRow?.user_role || 'Customer',
                date_joined: userRow?.created_at ? (new Date(userRow.created_at)).toISOString().slice(0,10) : (userRow?.date_joined ? (new Date(userRow.date_joined)).toISOString().slice(0,10) : ''),
                last_activity: userRow?.last_signed_in_at ? (new Date(userRow.last_signed_in_at)).toISOString().slice(0,10) : (userRow?.last_activity ? (new Date(userRow.last_activity)).toISOString().slice(0,10) : ''),
                total_orders: totalOrders,
                last_order: lastOrderDate,
            };
            setViewUser(out);
        } catch (e) {
            console.error('openViewModal error', e);
            setViewUser(null);
        } finally {
            setViewLoading(false);
        }
    };

    const closeViewModal = () => { setViewUser(null); };

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', role: '' });
    const [editSaving, setEditSaving] = useState(false);

    // Name validation helpers copied from Account page to keep rules identical
    const validateName = (name) => {
        if (typeof name !== 'string' || name.trim().length === 0) return false;
        const allowed = /^[A-Za-z'\- ]+$/;
        if (!allowed.test(name)) return false;
        for (let i = 1; i < name.length; i++) {
            const prev = name[i - 1];
            const cur = name[i];
            if ((prev === ' ' || prev === '-' || prev === "'") && prev === cur) {
                return false;
            }
        }
        return true;
    };

    const isLikelyInvalidName = (raw) => {
        try {
            const s = String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
            if (!s) return false;
            const counts = {};
            for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
            const maxCount = Math.max(...Object.values(counts));
            if (s.length >= 3 && maxCount / s.length >= 0.7) return true;
            for (let L = 1; L <= 3; L++) {
                if (s.length % L !== 0) continue;
                const part = s.slice(0, L);
                if (part.repeat(s.length / L) === s && s.length / L >= 2) return true;
            }
            return false;
        } catch (e) { return false; }
    };

    const handleEditFirstNameChange = (e) => {
        const raw = e?.target?.value || '';
        let val = String(raw).replace(/[0-9]/g, '');
        if (val.length > 32) {
            val = val.slice(0, 32);
            setEditForm(f => ({ ...f, first_name: val }));
            setFirstNameError('First name cannot exceed 32 characters.');
            return;
        }
        if (val && String(val).trim().includes(' ')) {
            setEditForm(f => ({ ...f, first_name: val }));
            setFirstNameError('Choose only one of your first names.');
            return;
        }
        if (isLikelyInvalidName(val)) {
            setFirstNameError('Please enter a valid name.');
            return;
        }
        setEditForm(f => ({ ...f, first_name: val }));
        if (val === '') { setFirstNameError(''); return; }
        if (!validateName(val)) setFirstNameError('Only letters and special characters are allowed. No consecutive repeated special characters.');
        else setFirstNameError('');
    };

    const handleEditLastNameChange = (e) => {
        const raw = e?.target?.value || '';
        let val = String(raw).replace(/[0-9]/g, '');
        if (val.length > 32) {
            val = val.slice(0, 32);
            setEditForm(f => ({ ...f, last_name: val }));
            setLastNameError('Last name cannot exceed 32 characters.');
            return;
        }
        if (isLikelyInvalidName(val)) {
            setLastNameError('Please enter a valid last name.');
            return;
        }
        setEditForm(f => ({ ...f, last_name: val }));
        if (val === '') { setLastNameError(''); return; }
        const words = String(val).trim().split(/\s+/).filter(Boolean);
        if (words.length > 2) {
            setLastNameError('Last name may contain at most two words (e.g., "De La").');
            return;
        }
        if (!validateName(val)) setLastNameError('Only letters and special characters are allowed. No consecutive repeated special characters.');
        else setLastNameError('');
    };

    const startEdit = () => {
        if (!viewUser) return;
        setEditForm({
            first_name: viewUser.first_name || '',
            last_name: viewUser.last_name || '',
            email: viewUser.email || '',
            role: viewUser.role || 'Customer',
        });
        // clear previous inline errors
        setFirstNameError('');
        setLastNameError('');
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setIsEditing(false);
        // reset editForm to viewUser values
        if (viewUser) setEditForm({ first_name: viewUser.first_name || '', last_name: viewUser.last_name || '', email: viewUser.email || '', role: viewUser.role || 'Customer' });
        // clear inline errors
        setFirstNameError('');
        setLastNameError('');
    };

    const saveEdit = async () => {
        if (!viewUser) return;
        setEditSaving(true);
        try {
            // The `user_info` table in some schemas stores a single full/display name
            // instead of separate first_name/last_name columns. Update only columns
            // that are present to avoid schema cache errors (see runtime error: "Could not find the 'first_name' column").
            const firstVal = String(editForm.first_name || '').trim();
            const lastVal = String(editForm.last_name || '').trim();
            const fullVal = `${firstVal} ${lastVal}`.trim() || null;
            const payload = {
                // prefer full_name and display_name which are commonly present on `user_info`
                full_name: fullVal,
                display_name: fullVal,
            };
            // Validate name rules like Account page: first name single word, last name max 2 words and required
            if (!lastVal || String(lastVal).trim() === '') {
                window.alert('Last name is required.');
                setEditSaving(false);
                return;
            }
            if (String(firstVal || '').trim().includes(' ')) {
                window.alert('First name must be a single word (no spaces).');
                setEditSaving(false);
                return;
            }
            const lnWordsCheck = String(lastVal || '').trim().split(/\s+/).filter(Boolean);
            if (lnWordsCheck.length > 2) {
                window.alert('Last name may contain at most two words (e.g., "De La").');
                setEditSaving(false);
                return;
            }

            // First, attempt to update auth.users via a secure RPC (if available).
            // This RPC should be implemented server-side (SECURITY DEFINER) to allow updating auth user metadata.
            let authUpdated = false;
            try {
                const rpcPayload = {
                    id: String(viewUser.id),
                    first_name: payload.first_name,
                    last_name: payload.last_name,
                    display_name: payload.full_name,
                };
                const { data: rpcData, error: rpcErr } = await supabase.rpc('update_user_public_name', rpcPayload);
                if (!rpcErr) {
                    authUpdated = true;
                } else {
                    console.warn('update_user_public_name RPC error', rpcErr);
                }
            } catch (e) {
                // RPC may not exist or client may not have permission; ignore and fallback
                console.warn('rpc update_user_public_name failed', e);
            }

            // Always update user_info for consistency/fallback.
            // However column names vary by schema. Re-fetch the existing row to decide which column(s) we can update.
            const { data: existingRow, error: existErr } = await supabase.from('user_info').select('*').eq('id', viewUser.id).maybeSingle();
            if (existErr) throw existErr;
            const dbPayload = {};
            // prefer separate first/last when available
            if (existingRow && Object.prototype.hasOwnProperty.call(existingRow, 'first_name')) dbPayload.first_name = firstVal || null;
            if (existingRow && Object.prototype.hasOwnProperty.call(existingRow, 'last_name')) dbPayload.last_name = lastVal || null;
            // prefer full_name / display_name / name / full in that order
            if (existingRow && Object.prototype.hasOwnProperty.call(existingRow, 'full_name')) dbPayload.full_name = fullVal;
            if (existingRow && Object.prototype.hasOwnProperty.call(existingRow, 'display_name')) dbPayload.display_name = fullVal;
            if (existingRow && Object.prototype.hasOwnProperty.call(existingRow, 'name') && !dbPayload.full_name && !dbPayload.display_name) dbPayload.name = fullVal;
            if (existingRow && Object.prototype.hasOwnProperty.call(existingRow, 'full') && !dbPayload.full_name && !dbPayload.display_name && !dbPayload.name) dbPayload.full = fullVal;

            // If no known name column found, as a last resort attempt to update nothing to avoid schema errors
            if (Object.keys(dbPayload).length === 0) {
                console.warn('No writable name columns found on user_info for id', viewUser.id);
            }

            const { data, error } = Object.keys(dbPayload).length > 0
                ? await supabase.from('user_info').update(dbPayload).eq('id', viewUser.id).select().maybeSingle()
                : { data: existingRow, error: null };
            if (error) throw error;
            // Update local rows and viewUser (do NOT change email or role here)
            const newFull = (data && (data.full_name || data.display_name || data.name || data.full)) || fullVal || (viewUser.full_name || `${viewUser.first_name || ''} ${viewUser.last_name || ''}`.trim());
            setRows(prev => (prev || []).map(r => (String(r.id) === String(viewUser.id) ? { ...r, full: newFull } : r)));
            // Keep the viewUser first/last values in sync in the UI even if user_info stores only full_name
            setViewUser(prev => ({ ...prev, first_name: firstVal || '', last_name: lastVal || '', full_name: newFull }));
            setIsEditing(false);
            if (authUpdated) {
                window.alert('User saved (auth profile updated)');
            } else {
                window.alert('User saved (auth update not available; user_info updated)');
            }
        } catch (e) {
            console.error('saveEdit error', e);
            window.alert('Failed to save user: ' + (e.message || String(e)));
        } finally {
            setEditSaving(false);
        }
    };

    const deleteUser = async (id) => {
        if (!id) return;
        if (!window.confirm('Delete this user? This action cannot be undone.')) return;
        try {
            const { error } = await supabase.from('user_info').delete().eq('id', id);
            if (error) throw error;
            // remove from local rows
            setRows(prev => (prev || []).filter(r => String(r.id) !== String(id)));
            setViewUser(null);
            window.alert('User deleted');
        } catch (e) {
            console.error('deleteUser error', e);
            window.alert('Failed to delete user: ' + (e.message || String(e)));
        }
    };

    return (
        <div>
            {loading && (
                <div className="flex items-center gap-2 text-gray-600 px-4 py-2">Loading users…</div>
            )}
            <div className="overflow-x-auto p-0">
                <div className="h-[700px] overflow-y-auto">
                    <table className="w-full table-fixed rounded-md">
                        <colgroup>
                            <col style={{ width: '18%' }} />
                            <col style={{ width: '29%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '10%' }} />
                        </colgroup>
                        <thead className="sticky top-0 bg-[#DFE7F4] border-b border-[#939393]">
                            <tr className="text-left text-[16px] text-gray-600">
                                <th className="px-4 py-2">Full Name</th>
                                <th className="px-4 py-2">Email Address</th>
                                <th className="px-4 py-2">Date Joined</th>
                                <th className="px-4 py-2">Role</th>
                                <th className="px-4 py-2">Last Activity</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => (
                                <tr key={String(u.id)} className="border-t">
                                    <td className="px-4 py-3 align-top flex items-center gap-3">
                                        <img src="/logo-icon/profile-icon.svg" alt="" aria-hidden className="w-8 h-8 rounded-full" />
                                        <div className="text-gray-800 font-medium">{u.full}</div>
                                    </td>
                                    <td className="px-4 py-3 align-top text-gray-700">{u.email || '—'}</td>
                                    <td className="px-4 py-3 align-top text-gray-700">{u.joined || '—'}</td>
                                    <td className="px-4 py-3 align-top">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${u.role && String(u.role).toLowerCase().includes('admin') ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>{u.role}</span>
                                    </td>
                                    <td className="px-4 py-3 align-top text-gray-700">{u.lastAct || '—'}</td>
                                    <td className="px-4 py-3 align-top">
                                        <button onClick={() => openViewModal(u.id || u.email)} className="px-3 py-1 rounded-md w-[92px] border border-[#939393] text-sm text-gray-700 hover:bg-gray-50">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* View User Modal */}
            <Modal open={!!viewUser || viewLoading} onClose={closeViewModal} width="w-[450px]">
                <div className="p-6 w-full">
                    {viewLoading ? (
                        <div className="p-6 text-center">Loading…</div>
                    ) : (
                        viewUser ? (
                            <div>
                                <div className="flex flex-col items-center">
                                    <img src="/logo-icon/profile-icon.svg" alt="avatar" className="w-16 h-16 rounded-full mb-3" />
                                    <div className="text-[20px] font-semibold text-[#12263F]">{viewUser.full_name || `${viewUser.first_name} ${viewUser.last_name}`}</div>
                                </div>

                                <div className="mt-4 border-t pt-4">
                                    <h4 className="text-[16px] font-semibold mb-3">Basic Info</h4>
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                                            <div className="text-[14px] font-semibold text-gray-500">First Name</div>
                                            <div>
                                                <input type="text" value={editForm.first_name} onChange={handleEditFirstNameChange} className="w-full border rounded px-2 py-1 text-sm" />
                                                {firstNameError && <p className="text-red-600 text-sm mt-1">{firstNameError}</p>}
                                            </div>

                                            <div className="text-[14px] font-semibold text-gray-500">Last Name</div>
                                            <div>
                                                <input type="text" value={editForm.last_name} onChange={handleEditLastNameChange} className="w-full border rounded px-2 py-1 text-sm" />
                                                {lastNameError && <p className="text-red-600 text-sm mt-1">{lastNameError}</p>}
                                            </div>

                                            <div className="text-[14px] font-semibold text-gray-500">Email Address</div>
                                            <div>
                                                <div className="text-sm font-medium text-blue-700 underline">{viewUser.email || '—'}</div>
                                            </div>

                                            <div className="text-[14px] font-semibold text-gray-500">Role</div>
                                            <div>
                                                <div className="text-sm font-medium">{viewUser.role || 'Customer'}</div>
                                            </div>

                                            <div className="text-[14px] font-semibold text-gray-500">Date Joined</div>
                                            <div className="text-sm font-medium">{viewUser.date_joined || '—'}</div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-1 text-sm text-gray-700">
                                            <div className="text-[14px] font-semibold text-gray-500">First Name</div>
                                            <div className="text-sm font-medium">{viewUser.first_name || '—'}</div>
                                            <div className="text-[14px] font-semibold text-gray-500">Last Name</div>
                                            <div className="text-sm font-medium">{viewUser.last_name || '—'}</div>

                                            <div className="text-[14px] font-semibold text-gray-500">Email Address</div>
                                            <div className="text-sm text-blue-600 underline font-medium">{viewUser.email || '—'}</div>
                                            <div className="text-[14px] font-semibold text-gray-500">Role</div>
                                            <div className="text-sm font-medium">{viewUser.role || 'Customer'}</div>
                                            <div className="text-[14px] font-semibold text-gray-500">Date Joined</div>
                                            <div className="text-sm font-medium">{viewUser.date_joined || '—'}</div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 border-t pt-4">
                                    <h4 className="text-[16px] font-semibold mb-3">Activity Logs</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                                        <div className="text-[14px] font-semibold text-gray-500">Last Activity</div>
                                        <div className="text-sm font-medium">{viewUser.last_activity || '—'}</div>
                                        <div className="text-[14px] font-semibold text-gray-500">Total Orders</div>
                                        <div className="text-sm font-medium">{viewUser.total_orders ?? 0}</div>
                                        <div className="text-[14px] font-semibold text-gray-500">Last Order</div>
                                        <div className="text-sm font-medium">{viewUser.last_order || '—'}</div>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between gap-3">
                                    {isEditing ? (
                                        <div className="flex items-center justify-between gap-3">
                                            <button
                                                onClick={saveEdit}
                                                disabled={editSaving || Boolean(firstNameError) || Boolean(lastNameError) || !String(editForm.last_name || '').trim() || String(editForm.first_name || '').trim().includes(' ') || (String(editForm.last_name || '').trim().split(/\s+/).filter(Boolean).length > 2)}
                                                className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {editSaving ? 'Saving…' : 'SAVE'}
                                            </button>
                                            <button onClick={cancelEdit} disabled={editSaving} className="bg-red-600 text-white px-4 py-2 rounded-md font-semibold">CANCEL</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-end">
                                            <button onClick={closeViewModal} className="px-4 py-2 border rounded-md text-sm">CLOSE</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center">User not found</div>
                        )
                    )}
                </div>
            </Modal>
        </div>
    );
};

const StocksList = ({ externalSearch = '' }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingInventory, setEditingInventory] = useState(null);
    const [editQuantity, setEditQuantity] = useState(0);
    const [editLoading, setEditLoading] = useState(false);
    const [categories, setCategories] = useState([]); // available in current rows
    const [categoriesAll, setCategoriesAll] = useState([]); // all categories from DB
    const [selectedCategories, setSelectedCategories] = useState([]); // applied filters (multi)
    const [categoryDraft, setCategoryDraft] = useState([]); // pre-apply selection
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const catMenuRef = useRef(null);
    // Status filter states
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [statusFilters, setStatusFilters] = useState([]); // ['Active','Low Stock','Out of Stock']
    const [statusDraft, setStatusDraft] = useState([]);
    const statusMenuRef = useRef(null);
    // Variant filter states
    const [showVariantDropdown, setShowVariantDropdown] = useState(false);
    const [variantFilters, setVariantFilters] = useState([]); // applied filters
    const [variantDraft, setVariantDraft] = useState([]); // selections before apply
    const variantMenuRef = useRef(null);
    const [variantGroups, setVariantGroups] = useState([]); // [{ id, name, values: [valueName] }]

    // Close the category dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showCategoryDropdown && catMenuRef.current && !catMenuRef.current.contains(e.target)) {
                setShowCategoryDropdown(false);
                setCategoryDraft(selectedCategories); // revert draft on outside click
            }
            if (showVariantDropdown && variantMenuRef.current && !variantMenuRef.current.contains(e.target)) {
                setShowVariantDropdown(false);
                setVariantDraft(variantFilters); // revert any un-applied changes when closing by outside click
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showCategoryDropdown, showVariantDropdown, variantFilters, selectedCategories]);

    // Close the status dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showStatusDropdown && statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
                setShowStatusDropdown(false);
                setStatusDraft(statusFilters);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showStatusDropdown, statusFilters]);

    // Load all product categories for the dropdown (so we can show disabled ones too)
    useEffect(() => {
        let cancelled = false;
        const loadCats = async () => {
            try {
                const { data, error } = await supabase
                    .from('product_categories')
                    .select('id, name')
                    .order('name', { ascending: true });
                if (!error && Array.isArray(data)) {
                    if (!cancelled) setCategoriesAll(data.map(c => c.name).filter(Boolean));
                }
            } catch (e) { /* ignore */ }
        };
        loadCats();
        return () => { cancelled = true; };
    }, []);

    // Load all variant groups and their values for the Variant filter dropdown
    useEffect(() => {
        let cancelled = false;
        const loadVariantGroups = async () => {
            try {
                const { data: groups, error: gErr } = await supabase
                    .from('variant_groups')
                    .select('variant_group_id, name')
                    .order('name', { ascending: true });
                if (gErr) throw gErr;
                const { data: values, error: vErr } = await supabase
                    .from('variant_values')
                    .select('variant_value_id, value_name, variant_group_id')
                    .order('value_name', { ascending: true });
                if (vErr) throw vErr;

                const mapped = (groups || []).map(g => {
                    const gid = g.variant_group_id ?? g.id;
                    let vals = (values || []).filter(v => String(v.variant_group_id) === String(gid)).map(v => v.value_name).filter(Boolean);
                    const groupName = (g.name || '').toLowerCase();
                    if (groupName.includes('color') || groupName.includes('colour') || groupName.includes('strap')) {
                        vals = vals.map(v => {
                            const n = normalizeHexCode(v);
                            return colorNames[n] || colorNames[String(v).trim().toLowerCase()] || v;
                        });
                    }
                    // dedupe and sort
                    const uniq = Array.from(new Set(vals)).sort((a,b) => String(a).localeCompare(String(b)));
                    return { id: gid, name: g.name || String(gid), values: uniq };
                }).filter(grp => (grp.values && grp.values.length > 0));
                if (!cancelled) setVariantGroups(mapped);
            } catch (e) {
                // Non-fatal; keep dropdown empty if it fails
                if (!cancelled) setVariantGroups([]);
            }
        };
        loadVariantGroups();
        return () => { cancelled = true; };
    }, []);

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
                            if (group.includes('color') || group.includes('colour') || group.includes('strap')) {
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

    // Render loading state inside JSX to keep hook order consistent

    // Build unique variant options from current rows
    const uniqueVariants = useMemo(() => {
        const set = new Set();
        (rows || []).forEach(r => {
            if (Array.isArray(r.variantList)) r.variantList.forEach(v => { if (v) set.add(String(v)); });
        });
        return Array.from(set).sort((a,b) => a.localeCompare(b));
    }, [rows]);

    let filteredRows = rows;
    if (Array.isArray(selectedCategories) && selectedCategories.length > 0) {
        const setSel = new Set(selectedCategories);
        filteredRows = filteredRows.filter(r => setSel.has(r.product?.category || ''));
    }
    // Helper to compute status per row
    const computeStatus = (r) => {
        const q = Number(r.quantity ?? 0);
        const low = r.low_stock_limit != null ? Number(r.low_stock_limit) : null;
        if (q <= 0) return 'Out of Stock';
        if (low != null && q <= low) return 'Low Stock';
        return 'Active';
    };
    // Filter by selected statuses
    if (Array.isArray(statusFilters) && statusFilters.length > 0) {
        const setSt = new Set(statusFilters);
        filteredRows = filteredRows.filter(r => setSt.has(computeStatus(r)));
    }
    const effectiveSearch = (externalSearch && String(externalSearch).trim() !== '') ? externalSearch : searchQuery;
    if (effectiveSearch && String(effectiveSearch).trim() !== '') {
        const q = String(effectiveSearch).trim().toLowerCase();
        filteredRows = filteredRows.filter(r => (r.product?.name || '').toLowerCase().includes(q));
    }
    if (Array.isArray(variantFilters) && variantFilters.length > 0) {
        filteredRows = filteredRows.filter(r => {
            const list = Array.isArray(r.variantList) ? r.variantList.map(String) : [];
            return list.some(v => variantFilters.includes(v));
        });
    }

    return (
        <div>
            {loading && (
                <div className="flex items-center gap-2 text-gray-600 px-4 py-2">
                    <svg className="h-4 w-4 animate-spin text-gray-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <span>Loading inventory…</span>
                </div>
            )}
                     
        <div className="overflow-x-auto p-0">
            <div className="h-[700px] overflow-y-auto">
                <table className="w-full table-fixed rounded rounded-md ">
                    <colgroup>
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '7%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '7%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead className="sticky h-[41px] top-0 bg-[#DFE7F4] ">
                        <tr className="text-left text-[16px] text-gray-600">
                            <th className="px-4 py-2">Product Name</th>
                            <th className="px-4 py-2 ">
                                <div className="flex items-center gap-2">
                                    <span>Category</span>
                                    <div className="relative p-0 z-30" ref={catMenuRef}>
                                        <button
                                            type="button"
                                            aria-label="Filter by category"
                                            onClick={() => { setCategoryDraft(selectedCategories); setShowCategoryDropdown((s) => !s); }}
                                            className="bg-transparent focus:outline-none "
                                        >
                                            <svg
                                                aria-hidden="true"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                className="h-4 w-4  text-gray-600"
                                            >
                                                <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                           
                                        </button>
                                        {showCategoryDropdown && (
                                            <div className="absolute left-[-80px] mt-2 w-80 max-w-[22rem] rounded-md border bg-white shadow z-20">
                                                <div className="p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-gray-800">Select Category</span>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto py-1 pr-1">
                                                        <div className="flex flex-wrap gap-2">
                                                            {(categoriesAll.length > 0 ? categoriesAll : categories).map(name => {
                                                                const available = categories.includes(name);
                                                                const active = categoryDraft.includes(name);
                                                                const base = "px-3 py-1 rounded-full border border-black text-sm";
                                                                if (!available) {
                                                                    return (
                                                                        <button key={name} type="button" disabled className={`${base} bg-gray-200 text-gray-400 cursor-not-allowed`}>{name}</button>
                                                                    );
                                                                }
                                                                return (
                                                                    <button
                                                                        key={name}
                                                                        type="button"
                                                                        onClick={() => setCategoryDraft(d => (d.includes(name) ? d.filter(x => x !== name) : [...d, name]))}
                                                                        className={`${base} ${active ? 'bg-[#2B4269] text-white border-[#2B4269]' : 'text-gray-700 hover:bg-gray-50'}`}
                                                                    >
                                                                        {name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 border border-black rounded-md border text-sm text-red-600 hover:bg-red-50"
                                                            onClick={() => { setCategoryDraft([]); setSelectedCategories([]); setShowCategoryDropdown(false); }}
                                                        >
                                                            Reset
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 rounded-md bg-[#2B4269] text-white text-sm"
                                                            onClick={() => { setSelectedCategories(categoryDraft); setShowCategoryDropdown(false); }}
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </th>
                            <th className="px-4 py-2 ">Price</th>
                            <th className="px-4 py-2 ">
                                <div className="flex items-center gap-2">
                                    <span>Variant</span>
                                    <div className="relative p-0 z-30" ref={variantMenuRef}>
                                        <button
                                            type="button"
                                            aria-label="Filter by variant"
                                            onClick={() => {
                                                setShowVariantDropdown(s => !s);
                                                // initialize draft from applied filters when opening
                                                setVariantDraft(prev => (prev && prev.length ? prev : variantFilters));
                                            }}
                                            className="bg-transparent focus:outline-none "
                                        >
                                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-gray-600">
                                                <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        {showVariantDropdown && (
                                            <div className="absolute left-[-70px] mt-2 w-[414px] rounded-md border bg-white shadow z-20">
                                                <div className="p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-gray-800">Select Variant</span>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto py-1 pr-1">
                                                        {Array.isArray(variantGroups) && variantGroups.length > 0 ? (
                                                            variantGroups.map(group => (
                                                                <div key={group.id} className="mb-3">
                                                                    <div className="text-[13px] font-semibold text-black mb-2">{String(group.name || '').toUpperCase()}</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {group.values.map(v => {
                                                                            const active = variantDraft.includes(v);
                                                                            return (
                                                                                <button
                                                                                    key={`${group.id}-${v}`}
                                                                                    type="button"
                                                                                    onClick={() => setVariantDraft(d => (d.includes(v) ? d.filter(x => x !== v) : [...d, v]))}
                                                                                    className={`px-3 py-1 rounded-full border border-black text-sm ${active ? 'bg-[#2B4269] text-white border-[#2B4269]' : 'text-gray-700 hover:bg-gray-50'}`}
                                                                                >
                                                                                    {v}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="flex flex-wrap gap-2">
                                                                {uniqueVariants.length === 0 ? (
                                                                    <span className="text-sm text-gray-500">No variants</span>
                                                                ) : uniqueVariants.map(v => {
                                                                    const active = variantDraft.includes(v);
                                                                    return (
                                                                        <button
                                                                            key={v}
                                                                            type="button"
                                                                            onClick={() => setVariantDraft(d => (d.includes(v) ? d.filter(x => x !== v) : [...d, v]))}
                                                                            className={`px-3 py-1 rounded-full border text-sm ${active ? 'bg-[#2B4269] text-white border-[#2B4269]' : 'text-gray-700 hover:bg-gray-50'}`}
                                                                        >
                                                                            {v}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 rounded-md border border-black text-sm text-red-600 hover:bg-red-50"
                                                            onClick={() => { setVariantDraft([]); setVariantFilters([]); setShowVariantDropdown(false); }}
                                                        >
                                                            Reset
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 rounded-md bg-[#2B4269] text-white text-sm"
                                                            onClick={() => { setVariantFilters(variantDraft); setShowVariantDropdown(false); }}
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </th>
                            <th className="px-4 py-2 ">Stock</th>
                            <th className="px-4 py-2 ">
                                <div className="flex items-center gap-2">
                                    <span>Status</span>
                                    <div className="relative p-0 z-30" ref={statusMenuRef}>
                                        <button
                                            type="button"
                                            aria-label="Filter by status"
                                            onClick={() => { setStatusDraft(statusFilters); setShowStatusDropdown(s => !s); }}
                                            className="bg-transparent focus:outline-none "
                                        >
                                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-gray-600">
                                                <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        {showStatusDropdown && (
                                            <div className="absolute left-[-50px] mt-2 w-40 max-w-[22rem] rounded-md border bg-white shadow z-20">
                                                <div className="p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-gray-800">Select Status</span>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto py-1 pr-1">
                                                        <div className="flex flex-wrap gap-2">
                                                            {['Active','Low Stock','Out of Stock'].map(name => {
                                                                const available = rows.some(r => {
                                                                    const q = Number(r.quantity ?? 0);
                                                                    const low = r.low_stock_limit != null ? Number(r.low_stock_limit) : null;
                                                                    if (name === 'Out of Stock') return q <= 0;
                                                                    if (name === 'Low Stock') return q > 0 && low != null && q <= low;
                                                                    return (q > 0 && !(low != null && q <= low)); // Active
                                                                });
                                                                const active = statusDraft.includes(name);
                                                                const base = "px-3 py-1 rounded-full border text-sm";
                                                                if (!available) {
                                                                    return (
                                                                        <button key={name} type="button" disabled className={`${base} bg-gray-200 text-gray-400 cursor-not-allowed`}>{name}</button>
                                                                    );
                                                                }
                                                                return (
                                                                    <button
                                                                        key={name}
                                                                        type="button"
                                                                        onClick={() => setStatusDraft(d => (d.includes(name) ? d.filter(x => x !== name) : [...d, name]))}
                                                                        className={`${base} ${active ? 'bg-[#2B4269] text-white border-[#2B4269]' : 'text-gray-700 hover:bg-gray-50'}`}
                                                                    >
                                                                        {name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 rounded-md border text-sm text-red-600 hover:bg-red-50"
                                                            onClick={() => { setStatusDraft([]); setStatusFilters([]); setShowStatusDropdown(false); }}
                                                        >
                                                            Reset
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="px-3 py-1 rounded-md bg-[#2B4269] text-white text-sm"
                                                            onClick={() => { setStatusFilters(statusDraft); setShowStatusDropdown(false); }}
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </th>
                            <th className="px-4 py-2 "></th>
                        </tr>
                    </thead>
                    <tbody>
                    {filteredRows.map(r => (
                        <tr key={r.inventory_id || r.combination_id} className="border-t">
                            <td className="px-4 py-3 align-middle">
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

                            <td className="px-4 py-3 align-middle text-gray-700">{r.product?.category || '—'}</td>

                            <td className="px-4 py-3 align-middle text-gray-800">{r.product?.price != null ? `₱${Number(r.product.price).toFixed(2)}` : '—'}</td>

                            <td className="px-4 py-3 align-middle text-gray-700">
                                {Array.isArray(r.variantList) && r.variantList.length > 0 ? (
                                    <div className="flex flex-col gap-0.5">
                                        {r.variantList.map((v, idx) => (
                                            <span key={idx} className="block">{v}</span>
                                        ))}
                                    </div>
                                ) : (r.variantDesc || '—')}
                            </td>

                            <td className="px-8 py-3 align-middle text-gray-800">
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

                            <td className="px-4 py-3 align-middle">
                                {((r.quantity ?? 0) <= 0) ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-red-100 text-red-700">Out of Stock</span>
                                ) : ((r.low_stock_limit != null && (r.quantity ?? 0) <= r.low_stock_limit) ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-yellow-100 text-yellow-800">Low Stock</span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-green-100 text-green-800">Active</span>
                                ))}
                            </td>

                            <td className="px-4 py-3 align-middle">
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
    const [productsSearch, setProductsSearch] = useState('');
    const [ordersSearch, setOrdersSearch] = useState('');
    const [usersSearch, setUsersSearch] = useState('');
    const [showAddProduct, setShowAddProduct] = useState(false);
    // Dashboard stats
    const [db_totalUsers, setDbTotalUsers] = useState(0);
    const [db_totalOrders, setDbTotalOrders] = useState(0);
    const [db_totalSales, setDbTotalSales] = useState(0);
    const [db_totalPending, setDbTotalPending] = useState(0);
    const [db_recentOrders, setDbRecentOrders] = useState([]);
    const [db_recentCustomers, setDbRecentCustomers] = useState([]);
    const [db_lowStock, setDbLowStock] = useState([]);

    // Create product and link variants in Supabase
    const createProductInSupabase = async (payload) => {
        const { name, category, starting_price, images, variants } = payload || {};
        // 1) Resolve category_id
        let categoryId = null;
        try {
            if (category) {
                const { data: cats } = await supabase
                    .from('product_categories')
                    .select('id, name')
                    .ilike('name', category)
                    .limit(1);
                if (Array.isArray(cats) && cats[0]?.id != null) categoryId = cats[0].id;
            }
        } catch {}
        // 2) Resolve a product_type_id within that category (pick first if multiple)
        let productTypeId = null;
        try {
            if (categoryId != null) {
                const { data: pts } = await supabase
                    .from('product_types')
                    .select('id, category_id')
                    .eq('category_id', categoryId)
                    .limit(1);
                if (Array.isArray(pts) && pts[0]?.id != null) productTypeId = pts[0].id;
            }
        } catch {}

        // 3) Insert product
        const productInsert = {
            name: name || '',
            starting_price: starting_price == null ? null : Number(starting_price),
            image_url: null,
            product_type_id: productTypeId || null,
        };
        let productId = null;
        const { data: productRows, error: productErr } = await supabase
            .from('products')
            .insert(productInsert)
            .select('id')
            .single();
        if (productErr) throw productErr;
        productId = productRows?.id;
        if (!productId) throw new Error('Product insert did not return id');

        // 4) Link variant options to this product via product_variant_values
        if (Array.isArray(variants)) {
            for (const grp of variants) {
                const grpId = grp?.group_id || null;
                const grpName = grp?.group_name || null;
                if (!grpId && !grpName) continue;
                for (const opt of (grp.options || [])) {
                    const optName = (opt?.name || '').trim();
                    if (!optName) continue;
                    const optPrice = (opt?.price == null || opt?.price === '') ? null : Number(opt.price);
                    // Find or create variant_values for this group/name
                    let variantValueId = null;
                    // Try by group id first
                    try {
                        if (grpId) {
                            const { data: vv } = await supabase
                                .from('variant_values')
                                .select('variant_value_id')
                                .eq('variant_group_id', grpId)
                                .ilike('value_name', optName)
                                .limit(1);
                            if (Array.isArray(vv) && vv[0]?.variant_value_id != null) variantValueId = vv[0].variant_value_id;
                        }
                    } catch {}
                    // If not found and we only have group name, try resolve group by name
                    let resolvedGroupId = grpId;
                    if (!variantValueId && !resolvedGroupId && grpName) {
                        try {
                            const { data: g } = await supabase
                                .from('variant_groups')
                                .select('variant_group_id, name')
                                .ilike('name', grpName)
                                .limit(1);
                            if (Array.isArray(g) && g[0]?.variant_group_id != null) resolvedGroupId = g[0].variant_group_id;
                        } catch {}
                    }
                    if (!variantValueId && resolvedGroupId) {
                        try {
                            const { data: vv2 } = await supabase
                                .from('variant_values')
                                .select('variant_value_id')
                                .eq('variant_group_id', resolvedGroupId)
                                .ilike('value_name', optName)
                                .limit(1);
                            if (Array.isArray(vv2) && vv2[0]?.variant_value_id != null) variantValueId = vv2[0].variant_value_id;
                        } catch {}
                    }
                    // If still not found, attempt to create variant_values under resolvedGroupId
                    if (!variantValueId && resolvedGroupId) {
                        try {
                            const { data: created, error: cErr } = await supabase
                                .from('variant_values')
                                .insert({ value_name: optName, variant_group_id: resolvedGroupId })
                                .select('variant_value_id')
                                .single();
                            if (!cErr && created?.variant_value_id != null) variantValueId = created.variant_value_id;
                        } catch {}
                    }
                    if (!variantValueId) continue; // skip if cannot resolve

                    // Insert product_variant_values
                    try {
                        await supabase
                            .from('product_variant_values')
                            .insert({ product_id: productId, variant_value_id: variantValueId, price: optPrice });
                    } catch {}
                }
            }
        }

        // Optional: you may create product_variant_combinations here based on selections.
        // For now, skip creating combinations/inventory; totals will be 0 until stock is added.

        return productId;
    };

    useEffect(() => {
        const handler = (e) => {
            const sec = e?.detail?.section;
            if (sec) setSelected(sec);
        };
        window.addEventListener('admin-nav-select', handler);
        const addHandler = () => setShowAddProduct(true);
        window.addEventListener('admin-products-add', addHandler);
        return () => {
            window.removeEventListener('admin-nav-select', handler);
            window.removeEventListener('admin-products-add', addHandler);
        };
    }, []);

    // Dashboard data loader
    useEffect(() => {
        let mounted = true;
        const loadDashboard = async () => {
            try {
                // total users (profiles or customers)
                try {
                    const { data: usersRows } = await supabase.from('profiles').select('user_id').neq('user_id', null).limit(1);
                    if (Array.isArray(usersRows)) {
                        // count via rpc to avoid scanning large tables if available
                        const { count } = await (async () => {
                            try {
                                const { count: c } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true });
                                return { count: c };
                            } catch { return { count: null }; }
                        })();
                        if (mounted && count != null) setDbTotalUsers(Number(count));
                    }
                } catch (e) {
                    // fallback to customers table
                    try {
                        const { count } = await supabase.from('customers').select('id', { count: 'exact', head: true });
                        if (mounted && count != null) setDbTotalUsers(Number(count));
                    } catch (ee) { /* ignore */ }
                }

                // total orders and total sales and pending
                try {
                    const { count: ordersCount } = await supabase.from('orders').select('order_id', { count: 'exact', head: true });
                    if (mounted && ordersCount != null) setDbTotalOrders(Number(ordersCount));
                    // sum total_price
                    const { data: sumRows } = await supabase.rpc('sum_orders_total_price');
                    if (mounted && sumRows && typeof sumRows === 'number') setDbTotalSales(Number(sumRows));
                } catch (e) {
                    // fallback: fetch limited aggregate
                    try {
                        const { data: ords } = await supabase.from('orders').select('total_price').limit(1000);
                        if (Array.isArray(ords)) {
                            const sum = ords.reduce((s, r) => s + Number(r.total_price || 0), 0);
                            if (mounted) setDbTotalSales(sum);
                        }
                    } catch (ee) {}
                }
                try {
                    const { count: pendingCount } = await supabase.from('orders').select('order_id', { count: 'exact', head: true }).or('status.eq.Pending,status.eq.pending,status.eq.In Progress,status.eq.in_progress');
                    if (mounted && pendingCount != null) setDbTotalPending(Number(pendingCount));
                } catch (e) { /* ignore */ }

                // recent orders
                try {
                    const { data: recent } = await supabase.from('orders').select('order_id, created_at, total_price, customer_name, user_id').order('created_at', { ascending: false }).limit(2);
                    if (mounted && Array.isArray(recent)) setDbRecentOrders(recent);
                } catch (e) { /* ignore */ }

                // recent customers (profiles)
                try {
                    const { data: recentUsers } = await supabase.from('profiles').select('user_id, email, first_name, last_name').order('created_at', { ascending: false }).limit(2);
                    if (mounted && Array.isArray(recentUsers)) setDbRecentCustomers(recentUsers);
                } catch (e) { /* ignore */ }

                // low stock notifications (inventory rows with low_stock_limit)
                try {
                    const { data: low } = await supabase.from('inventory').select('inventory_id, quantity, low_stock_limit, combination_id, status').lte('quantity', 'low_stock_limit').order('inventory_id', { ascending: false }).limit(5);
                    if (mounted && Array.isArray(low)) setDbLowStock(low);
                } catch (e) { /* ignore */ }

            } catch (e) {
                console.error('Failed to load dashboard', e);
            }
        };
        if (selected === 'Dashboard') loadDashboard();
        return () => { mounted = false; };
    }, [selected]);

    const containerClass = 'bg-white border border-black';

    return (
        <>
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
                    {selected === 'Products' && (
                        <div className="flex items-center gap-3 w-full max-w-md justify-end">
                            <div className="relative w-[241px]">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.8l3.613 3.614a.75.75 0 1 0 1.06-1.06l-3.614-3.614A5.5 5.5 0 0 0 9 3.5Zm-4 5.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={productsSearch}
                                    onChange={(e) => setProductsSearch(e.target.value)}
                                    placeholder="Search product name"
                                    className="w-[241px] pl-9 pr-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20"
                                />
                            </div>
                            {/* Add Product button removed */}
                        </div>
                    )}
                    {selected === 'Orders' && (
                        <div className="flex items-center gap-3 w-full max-w-md justify-end">
                            <div className="relative w-[241px]">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.8l3.613 3.614a.75.75 0 1 0 1.06-1.06l-3.614-3.614A5.5 5.5 0 0 0 9 3.5Zm-4 5.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={ordersSearch}
                                    onChange={(e) => setOrdersSearch(e.target.value)}
                                    placeholder="Search order id or customer"
                                    className="w-[241px] pl-9 pr-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20"
                                />
                            </div>
                        </div>
                    )}
                    {selected === 'Users' && (
                        <div className="flex items-center gap-3 w-full max-w-md justify-end">
                            <div className="relative w-[241px]">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.8l3.613 3.614a.75.75 0 1 0 1.06-1.06l-3.614-3.614A5.5 5.5 0 0 0 9 3.5Zm-4 5.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={usersSearch}
                                    onChange={(e) => setUsersSearch(e.target.value)}
                                    placeholder="Search user"
                                    className="w-[241px] pl-9 pr-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div style={{ display: selected === 'Dashboard' ? 'block' : 'none' }} >
                 
                    <div className="p-4">
                        {/* Top metrics */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="border rounded p-4 bg-white">
                                <div className="text-sm text-gray-500">Total Users</div>
                                <div className="text-2xl font-bold">{db_totalUsers ?? 0}</div>
                                <div className="text-sm text-green-600 mt-1">+10%</div>
                            </div>
                            <div className="border rounded p-4 bg-white">
                                <div className="text-sm text-gray-500">Total Orders</div>
                                <div className="text-2xl font-bold">{db_totalOrders ?? 0}</div>
                                <div className="text-sm text-green-600 mt-1">+8%</div>
                            </div>
                            <div className="border rounded p-4 bg-white">
                                <div className="text-sm text-gray-500">Total Sales</div>
                                <div className="text-2xl font-bold">₱{Number(db_totalSales || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                                <div className="text-sm text-green-600 mt-1">+55%</div>
                            </div>
                            <div className="border rounded p-4 bg-white">
                                <div className="text-sm text-gray-500">Total Pending</div>
                                <div className="text-2xl font-bold">{db_totalPending ?? 0}</div>
                                <div className="text-sm text-green-600 mt-1">+12%</div>
                            </div>
                        </div>

                        {/* Charts and status */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="col-span-2 border rounded p-4 bg-white">
                                <div className="font-semibold mb-2">Orders By Status</div>
                                <div className="w-full h-48 flex items-center justify-center text-gray-400">[Pie chart placeholder]</div>
                            </div>
                            <div className="border rounded p-4 bg-white">
                                <div className="font-semibold mb-2">Stock Status</div>
                                <div className="w-full h-48 flex items-center justify-center text-gray-400">[Bar chart placeholder]</div>
                            </div>
                        </div>

                        {/* Bottom panels: Recent Orders, New Customers, Stock Notifications */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="border rounded p-4 bg-white">
                                <div className="font-semibold mb-3">Recent Orders</div>
                                <div className="text-sm">
                                    {db_recentOrders && db_recentOrders.length > 0 ? (
                                        db_recentOrders.map((o) => (
                                            <div key={o.order_id} className="mb-2 border-b pb-2">
                                                <div className="text-xs text-gray-500">Order ID</div>
                                                <div className="text-sm">Order #{o.order_id}</div>
                                                <div className="text-xs text-gray-400">{(o.created_at ? new Date(o.created_at).toISOString().slice(0,10) : '')} • ₱{Number(o.total_price||0).toFixed(2)}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-gray-500">No recent orders</div>
                                    )}
                                </div>
                                <div className="mt-3 text-center">
                                    <button className="px-4 py-2 border rounded text-sm text-gray-600">View All Orders</button>
                                </div>
                            </div>

                            <div className="border rounded p-4 bg-white">
                                <div className="font-semibold mb-3">New Customers</div>
                                <div className="text-sm">
                                    {db_recentCustomers && db_recentCustomers.length > 0 ? (
                                        db_recentCustomers.map((u) => (
                                            <div key={u.user_id} className="mb-2 border-b pb-2 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">👤</div>
                                                <div>
                                                    <div className="text-sm font-semibold">{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.user_id}</div>
                                                    <div className="text-xs text-gray-500">{u.email || ''}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-gray-500">No recent customers</div>
                                    )}
                                </div>
                                <div className="mt-3 text-center">
                                    <button className="px-4 py-2 border rounded text-sm text-gray-600">View All Users</button>
                                </div>
                            </div>

                            <div className="border rounded p-4 bg-white">
                                <div className="font-semibold mb-3">Stock Notifications</div>
                                <div className="text-sm space-y-3">
                                    {db_lowStock && db_lowStock.length > 0 ? (
                                        db_lowStock.map((s) => (
                                            <div key={s.inventory_id} className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-semibold">Inventory #{s.inventory_id}</div>
                                                    <div className="text-xs text-gray-500">Qty: {s.quantity}</div>
                                                </div>
                                                <div className="text-xs text-red-500">{s.quantity <= (s.low_stock_limit || 0) ? 'Low Stock' : ''}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-gray-500">No notifications</div>
                                    )}
                                </div>
                                <div className="mt-3 text-center">
                                    <button className="px-4 py-2 border rounded text-sm text-gray-600">View All Stocks</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: selected === 'Stocks' ? 'block' : 'none' }} className={`${containerClass} mt-1`}>
                    <StocksList externalSearch={stocksSearch} />
                </div>

                <div style={{ display: selected === 'Products' ? 'block' : 'none' }} className={`${containerClass} mt-6`}>
                    <ProductsList externalSearch={productsSearch} />
                </div>

                <div style={{ display: selected === 'Orders' ? 'block' : 'none' }} className={`${containerClass} mt-6`}>
                    <OrdersList externalSearch={ordersSearch} />
                    
                </div>
                <div style={{ display: selected === 'Users' ? 'block' : 'none' }} className={`${containerClass} mt-6`}>
                    <UsersList externalSearch={usersSearch} />
                </div>
            </div>
        </div>
        <AddProductModal
            open={showAddProduct}
            onClose={() => setShowAddProduct(false)}
            onSubmit={async (payload) => {
                try {
                    const id = await createProductInSupabase(payload);
                    try { window.dispatchEvent(new CustomEvent('admin-products-refresh')); } catch {}
                    window.alert('Product added');
                } catch (e) {
                    console.error('Failed to add product', e);
                    window.alert('Failed to add product: ' + (e?.message || String(e)));
                }
            }}
        />
        </>
    );
};

export default AdminContents;
