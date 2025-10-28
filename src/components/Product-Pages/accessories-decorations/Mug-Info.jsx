import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { v4 as uuidv4 } from 'uuid';
import { UserAuth } from "../../../context/AuthContext";
import UploadDesign from '../../UploadDesign';


const ButtonPin = () => {
    // Optional: Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, []);

    // Fetch product data (name, price) from Supabase using the last path segment as slug
    const location = useLocation();
    const navigate = useNavigate();
    const { session } = UserAuth();

    const [productId, setProductId] = useState(null);
    const [productName, setProductName] = useState("");
    const [price, setPrice] = useState(null);
    const [imageKey, setImageKey] = useState("");
    const [imageSrc, setImageSrc] = useState("");
    const [thumbnails, setThumbnails] = useState([]);
    const [activeThumb, setActiveThumb] = useState(0);
    const [isFavorited, setIsFavorited] = useState(false);
    const [loading, setLoading] = useState(true);
    const [favLoading, setFavLoading] = useState(false);
    const favVerifyTimer = useRef(null);
    const [lastFavResp, setLastFavResp] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [variantGroups, setVariantGroups] = useState([]);
    const [selectedVariants, setSelectedVariants] = useState({});
    const [stockInfo, setStockInfo] = useState(null);
    const [editingCartId, setEditingCartId] = useState(null);
    const [fromCart, setFromCart] = useState(false);
    const [uploadedFileMetas, setUploadedFileMetas] = useState([]); // DB rows
    const [uploadResetKey, setUploadResetKey] = useState(0);
    const [showUploadUI, setShowUploadUI] = useState(true);
    const [showUploadError, setShowUploadError] = useState(false);

    const slug = location.pathname.split('/').filter(Boolean).pop();
    const hasLoggedViewRef = useRef(false);

    useEffect(() => {
        let isMounted = true;
        const fetchProduct = async () => {
            setLoading(true);
            if (!slug) {
                setLoading(false);
                return;
            }
            try {
                let { data, error } = await supabase
                    .from('products')
                    .select('id, name, starting_price, image_url')
                    .eq('route', slug)
                    .single();

                if (error || !data) {
                    const fallback = await supabase
                        .from('products')
                        .select('id, name, starting_price, image_url')
                        .eq('slug', slug)
                        .single();
                    data = fallback.data;
                    error = fallback.error;
                }

                if (!isMounted) return;
                if (error) {
                    console.error('Error fetching product:', error.message || error);
                } else if (data) {
                    setProductId(data.id ?? null);
                    setProductName(data.name || "");
                    setPrice(data.starting_price ?? null);
                    setImageKey(data.image_url || "");
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('Unexpected error fetching product:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchProduct();
        return () => { isMounted = false; };
    }, [slug]);

    // Record recently viewed (once per page view)
    useEffect(() => {
        const logRecentlyViewed = async () => {
            try {
                const userId = session?.user?.id;
                if (!userId || !productId) return;
                if (hasLoggedViewRef.current) return;

                const nowIso = new Date().toISOString();

                const { data: updData, error: updError } = await supabase
                    .from('recently_viewed')
                    .update({ viewed_at: nowIso })
                    .eq('user_id', userId)
                    .eq('product_id', productId)
                    .select('id');

                if (updError) {
                    console.warn('[Mug-Info] recently_viewed update error:', updError);
                }

                if (Array.isArray(updData) && updData.length > 0) {
                    hasLoggedViewRef.current = true;
                    return;
                }

                const newId = (typeof crypto !== 'undefined' && crypto?.randomUUID) ? crypto.randomUUID() : uuidv4();
                const { error: insError } = await supabase
                    .from('recently_viewed')
                    .insert([{ id: newId, user_id: userId, product_id: productId, viewed_at: nowIso }]);
                if (insError) {
                    console.warn('[Mug-Info] recently_viewed insert error:', insError);
                } else {
                    hasLoggedViewRef.current = true;
                }
            } catch (err) {
                console.warn('[Mug-Info] recently_viewed log error:', err);
            }
        };
        logRecentlyViewed();
    }, [productId, session?.user?.id]);
    // Handle cart editing state
    useEffect(() => {
        if (location.state?.fromCart && location.state?.cartRow) {
            const cartRow = location.state.cartRow;
            setFromCart(true);
            setEditingCartId(cartRow.cart_id);
            setQuantity(cartRow.quantity || 1);
        }
    }, [location.state]);

    useEffect(() => {
        if (fromCart && location.state?.cartRow) {
            const q = Number(location.state.cartRow.quantity);
            if (q > 0 && q !== quantity) setQuantity(q);
        }
    }, [fromCart, location.state, quantity]);

    // Restore variants by cart_id
    useEffect(() => {
        const loadCart = async () => {
            if (!fromCart || !editingCartId) return;
            try {
                const { data, error } = await supabase
                    .from('cart')
                    .select(`
                        cart_id,
                        quantity,
                        cart_variants (
                            cart_variant_id,
                            price,
                            product_variant_values (
                                product_variant_value_id,
                                price,
                                variant_values (
                                    value_name,
                                    variant_group_id,
                                    variant_groups ( variant_group_id, name, input_type )
                                )
                            )
                        )
                    `)
                    .eq('cart_id', editingCartId)
                    .limit(1)
                    .single();
                if (error || !data) return;
                if (Number(data.quantity) > 0) setQuantity(Number(data.quantity));
                if (Array.isArray(data.cart_variants)) {
                    const vMap = {};
                    data.cart_variants.forEach(cv => {
                        const pv = cv.product_variant_values; const vv = pv?.variant_values; if (!vv) return;
                        const groupId = (vv.variant_group_id ?? vv.variant_groups?.variant_group_id); if (groupId == null) return;
                        vMap[String(groupId)] = {
                            id: pv.product_variant_value_id,
                            cart_variant_id: cv.cart_variant_id,
                            // use the true variant_value_id, not the product_variant_value_id
                            variant_value_id: vv.variant_value_id,
                            name: vv.value_name,
                            value: vv.value_name,
                            price: Number(cv.price ?? pv.price ?? 0)
                        };
                    });
                    if (Object.keys(vMap).length) {
                        setSelectedVariants(vMap);
                    } else {
                        // Fallback: try to hydrate from the cartRow provided via navigation state
                        // This helps when cart_variants joined rows don't include nested product_variant_values
                        const cartRow = location.state?.cartRow;
                        const navVariants = Array.isArray(cartRow?.variants) ? cartRow.variants : null;
                        if (navVariants && Array.isArray(variantGroups) && variantGroups.length) {
                            const fallback = {};
                            const normalize = (s) => String(s || '').toLowerCase().trim();
                            for (const nv of navVariants) {
                                const gName = normalize(nv.group);
                                const vName = normalize(nv.value);
                                const group = variantGroups.find(gg => normalize(gg.name) === gName || normalize(gg.name).includes(gName) || gName.includes(normalize(gg.name)));
                                if (!group) continue;
                                const match = (group.values || []).find(v => normalize(v.name) === vName || normalize(v.value) === vName || String(v.id) === String(nv.product_variant_value_id ?? nv.product_variant_value_id));
                                if (match) fallback[String(group.id)] = match;
                            }
                            if (Object.keys(fallback).length) setSelectedVariants(fallback);
                        }
                    }
                }
            } catch (e) { console.debug('[EditCart] restore mug cart failed', e); }
        };
        loadCart();
    }, [fromCart, editingCartId]);

    // Fetch variants with nested joins
    useEffect(() => {
        let isMounted = true;
        const fetchVariants = async () => {
            if (!productId) {
                console.log('No productId available for fetching variants');
                return;
            }
            try {
                console.log('Attempting to fetch variants for productId:', productId);

                const { data: pvvData, error: pvvError } = await supabase
                    .from('product_variant_values')
                    .select(`
                        product_variant_value_id,
                        price,
                        is_default,
                        variant_value_id,
                        variant_values (
                            variant_value_id,
                            value_name,
                            variant_group_id,
                            variant_groups (
                                variant_group_id,
                                name,
                                input_type
                            )
                        )
                    `)
                    .eq('product_id', productId);

                if (pvvError) throw pvvError;
                if (!pvvData || pvvData.length === 0) {
                    console.log('No product_variant_values found for productId:', productId);
                    return;
                }

                console.log('Raw product variant values data:', pvvData);

                if (!isMounted) return;

                // Group by variant_group_id to handle duplicates and structure data
                const groupsMap = new Map();

                pvvData.forEach(pvv => {
                    const vv = pvv.variant_values;
                    if (vv && vv.variant_groups) {
                        const group = vv.variant_groups;
                        const groupId = group.variant_group_id;
                        if (!groupsMap.has(groupId)) {
                            groupsMap.set(groupId, {
                                id: groupId,
                                name: group.name || 'Unknown',
                                input_type: group.input_type || 'radio',
                                values: []
                            });
                        }
                        const groupEntry = groupsMap.get(groupId);
                        // Add value if not already present (to dedup)
                        if (!groupEntry.values.some(v => v.id === pvv.product_variant_value_id)) {
                            groupEntry.values.push({
                                id: pvv.product_variant_value_id,
                                name: vv.value_name || '',
                                value: vv.value_name || '', // Using value_name as value
                                price: pvv.price ?? 0,
                                is_default: pvv.is_default ?? false
                            });
                        }
                    }
                });

                const groups = Array.from(groupsMap.values()).filter(g => g.name && g.values.length > 0);

                console.log('Processed variant groups:', groups);

                setVariantGroups(groups);
            } catch (err) {
                console.error('Error fetching variants:', err);
            }
        };
        fetchVariants();
        return () => { isMounted = false; };
    }, [productId]);

    // Initialize defaults only for groups not already set (avoid overwriting restored cart selections)
    useEffect(() => {
        if (!variantGroups || variantGroups.length === 0) return;
        setSelectedVariants(prev => {
            const updated = { ...prev };
            for (let group of variantGroups) {
                if (updated[group.id]) continue;
                const def = group.values.find(v => v.is_default) || group.values[0];
                if (def) updated[group.id] = def;
            }
            return updated;
        });
    }, [variantGroups]);

    // Fast-path: hydrate from navigation state when editing from Cart. This attempts a
    // tolerant match of nav-provided variants to the loaded variantGroups before
    // hitting the DB restore path.
    useEffect(() => {
        try {
            if (!variantGroups || !variantGroups.length) return;
            const cartRow = location.state?.cartRow;
            if (!cartRow || !location.state?.fromCart) return;
            if (Object.keys(selectedVariants || {}).length) return;

            const navVariants = Array.isArray(cartRow?.variants) ? cartRow.variants : null;
            if (!navVariants) return;

            const normalize = (s) => String(s || '').toLowerCase().trim();
            const fallback = {};

            for (const nv of navVariants) {
                const gName = normalize(nv.group || nv.group_name || nv.groupName);
                const vName = normalize(nv.value || nv.value_name || nv.valueName);
                const group = variantGroups.find(gg => {
                    const gn = normalize(gg.name || '');
                    return gn === gName || gn.includes(gName) || gName.includes(gn);
                });
                if (!group) continue;
                const match = (group.values || []).find(v => normalize(v.name || v.value || '') === vName || String(v.id) === String(nv.product_variant_value_id ?? nv.id ?? nv.variant_value_id));
                if (match) fallback[String(group.id)] = match;
            }

            if (Object.keys(fallback).length) {
                setSelectedVariants(fallback);
                if (Number(cartRow.quantity) > 0) setQuantity(Number(cartRow.quantity));
                setFromCart(true);
                setEditingCartId(cartRow.cart_id || editingCartId);
            }
        } catch (e) {
            console.debug('[tryHydrateFromNav][Mug] failed', e);
        }
    }, [variantGroups, location.state]);

    useEffect(() => {
        let isMounted = true;
        const fetchStockInfo = async () => {
            console.log('[Stock][Mug] start', { productId, variantGroupsLen: variantGroups.length, selectedVariants });
            if (!productId) { console.debug('[Stock][Mug] no productId'); return; }
            if (!variantGroups || variantGroups.length === 0) { console.debug('[Stock][Mug] no variantGroups'); return; }
            if (Object.keys(selectedVariants).length !== variantGroups.length) { console.debug('[Stock][Mug] not all selected'); if (isMounted) setStockInfo(null); return; }
            try {
                // Build both sets: true variant_value_ids and product_variant_value_ids
                const selectedValueIds = Object.values(selectedVariants)
                    .map(v => Number(v?.variant_value_id))
                    .filter(Boolean)
                    .sort((a,b) => a-b);
                const selectedPVVIds = Object.values(selectedVariants)
                    .map(v => Number(v?.product_variant_value_id ?? v?.id))
                    .filter(Boolean)
                    .sort((a,b) => a-b);
                console.log('[Stock][Mug] selectedIds', { selectedValueIds, selectedPVVIds });

                // Query combinations; fallback if variant_value_ids is not a valid column
                let combos = null; let comboError = null;
                let resp = await supabase
                    .from('product_variant_combinations')
                    .select('combination_id, variants, variant_value_ids')
                    .eq('product_id', productId);
                if (resp.error) {
                    console.log('[Stock][Mug] combos first select failed, falling back to variants-only', resp.error);
                    const resp2 = await supabase
                        .from('product_variant_combinations')
                        .select('combination_id, variants')
                        .eq('product_id', productId);
                    combos = resp2.data; comboError = resp2.error;
                } else {
                    combos = resp.data; comboError = resp.error;
                }
                console.log('[Stock][Mug] combos fetched', { combosLen: (combos || []).length, comboError });
                if (comboError || !combos) { if (isMounted) setStockInfo({ quantity: 0 }); return; }

                const match = combos.find(c => {
                    const vvids = (Array.isArray(c.variant_value_ids) ? c.variant_value_ids : []).map(Number).filter(Boolean).sort((a,b)=>a-b);
                    const variants = (Array.isArray(c.variants) ? c.variants : []).map(Number).filter(Boolean).sort((a,b)=>a-b);
                    const vvMatch = selectedValueIds.length > 0 && vvids.length === selectedValueIds.length && vvids.every((v,i)=>v === selectedValueIds[i]);
                    if (vvMatch) return true;
                    const varMatch = selectedPVVIds.length > 0 && variants.length === selectedPVVIds.length && variants.every((v,i)=>v === selectedPVVIds[i]);
                    return varMatch;
                });
                console.log('[Stock][Mug] match', { match });
                if (!match || !match.combination_id) { if (isMounted) setStockInfo({ quantity: 0 }); return; }

                const { data: inv, error: invError } = await supabase
                    .from('inventory')
                    .select('inventory_id, quantity, low_stock_limit')
                    .eq('combination_id', match.combination_id)
                    .eq('status', 'in_stock')
                    .single();
                console.log('[Stock][Mug] inventory', { inv, invError });
                if (invError || !inv) {
                    // Fallback: query without status filter and pick most recent
                    const { data: invList, error: invAnyErr } = await supabase
                        .from('inventory')
                        .select('inventory_id, quantity, low_stock_limit, status')
                        .eq('combination_id', match.combination_id)
                        .order('inventory_id', { ascending: false })
                        .limit(1);
                    const inv2 = Array.isArray(invList) ? invList[0] : null;
                    console.log('[Stock][Mug] inventory fallback', { inv2, invAnyErr });
                    if (isMounted) setStockInfo(inv2 || { quantity: 0 });
                    return;
                }
                if (isMounted) setStockInfo(inv);
            } catch (err) {
                console.error('Error fetching stock info [Mug]:', err);
                if (isMounted) setStockInfo({ quantity: 0 });
            }
        };
        fetchStockInfo();
        return () => { isMounted = false; };
    }, [productId, variantGroups, selectedVariants]);

    // Resolve imageKey to a public URL (robust: accepts full urls, leading slashes, and tries common buckets)
    useEffect(() => {
        let isMounted = true;
        const resolveImage = async () => {
            if (!imageKey) {
                if (isMounted) setImageSrc('/logo-icon/logo.png');
                return;
            }

            // If already a full URL or a path starting with '/', use it directly
            try {
                if (/^https?:\/\//i.test(imageKey) || imageKey.startsWith('/')) {
                    if (isMounted) setImageSrc(imageKey);
                    console.debug('[ShakerKeychain] using provided imageKey as src', { imageKey });
                    return;
                }

                const cleanKey = String(imageKey).replace(/^\/+/, ''); // remove leading slash(es)

                // Try buckets in the same order used elsewhere for accessories -> apparel fallback
        const bucketsToTry = ['accessoriesdecorations-images', 'accessories-images', 'apparel-images', '3d-prints-images', 'product-images', 'images', 'public'];
                for (const bucket of bucketsToTry) {
                    try {
            const { data, error } = supabase.storage.from(bucket).getPublicUrl(cleanKey);
            console.debug('[Mug] getPublicUrl attempt', { bucket, cleanKey, data, error });
                        if (error) continue; // try next bucket
                        const url = data?.publicUrl || data?.publicURL || null;
                        // Supabase returns a publicUrl that ends with '/' when the object isn't found.
                        if (url && !url.endsWith('/')) {
                            if (isMounted) setImageSrc(url);
                            return;
                        }
                    } catch (err) {
            console.warn('[Mug] bucket attempt failed', { bucket, err });
                        // continue trying other buckets
                    }
                }

                // Last-resort fallback to local public asset
        if (isMounted) setImageSrc('/accessories-images/mugs.png');
        console.warn('[Mug] could not resolve imageKey to a public URL, using fallback', { imageKey });
            } catch (err) {
                console.error('Error resolving image public URL:', err);
        if (isMounted) setImageSrc('/accessories-images/mugs.png');
            }
        };
        resolveImage();
        return () => { isMounted = false; };
    }, [imageKey]);

    // Build thumbnails: 1) main product image as first thumb, 2) variants from accessories-images storage, 3) fallbacks
    useEffect(() => {
        let isMounted = true;
        const tryGetPublic = async (bucket, keyBase) => {
            const exts = ['.png', '.jpg', '.jpeg', '.webp'];
            for (const ext of exts) {
                try {
                    const { data } = supabase.storage.from(bucket).getPublicUrl(keyBase + ext);
                    const url = data?.publicUrl;
                    if (url && !url.endsWith('/')) {
                        try {
                            const head = await fetch(url, { method: 'HEAD' });
                            if (head.ok) return url;
                        } catch (e) { /* ignore */ }
                    }
                } catch (e) { /* ignore */ }
            }
            return null;
        };

        const buildThumbnails = async () => {
            const results = [];

            // first thumbnail: main product image
            results.push('/accessories-images/mugs.png');

            // desired variant thumbnails
            const desired = ['mugs-1', 'mugs-2', 'mugs-3'];
            for (const name of desired) {
                if (results.length >= 4) break;
                const url = await tryGetPublic('accessoriesdecorations-images', name);
                if (url) results.push(url);
            }

            // if still short, try deriving from imageKey variants (numbered suffixes)
            if (results.length < 4 && imageKey) {
                const key = imageKey.toString().replace(/^\/+/, '');
                const m = key.match(/(.+?)\.(png|jpg|jpeg|webp|gif)$/i);
                const base = m ? m[1] : key;
                const extras = [base + '-1', base + '-2', base + '-3'];
                for (const cand of extras) {
                    if (results.length >= 4) break;
                    const url = await tryGetPublic('accessoriesdecorations-images', cand);
                    if (url) results.push(url);
                }
            }

            // last-resort local fallbacks
            const fallbacks = ['/accessories-images/mugs.png', '/accessories-images/mugs-1.png', '/accessories-images/mugs-2.png', '/logo-icon/logo.png'];
            for (const f of fallbacks) {
                if (results.length >= 4) break;
                try {
                    const r = await fetch(f, { method: 'HEAD' });
                    if (r.ok) results.push(f);
                } catch (e) { /* ignore */ }
            }

            if (!isMounted) return;

            // Deduplicate while preserving order
            const seen = new Set();
            const ordered = [];
            for (const u of results) {
                if (!u) continue;
                if (!seen.has(u)) { seen.add(u); ordered.push(u); }
            }

            let padded = ordered.slice(0, 4);
            while (padded.length < 4) padded.push(undefined);

            setThumbnails(padded);

            // Preserve the user's clicked thumbnail when possible. If the previous active index
            // still points to a valid thumbnail, keep it. Otherwise choose the first available
            // thumbnail (fallback to 0).
            setActiveThumb(prev => {
                if (padded[prev]) return prev;
                const firstAvailable = padded.findIndex(u => !!u);
                return firstAvailable === -1 ? 0 : firstAvailable;
            });
        };

        buildThumbnails();
        return () => { isMounted = false; };
    }, [imageKey, imageSrc]);

    // Gallery navigation helpers: move to previous/next available thumbnail, wrapping around.
    const prevImage = () => {
        const valid = thumbnails.map((t, i) => t ? i : -1).filter(i => i >= 0);
        if (valid.length === 0) return;
        const current = valid.includes(activeThumb) ? activeThumb : valid[0];
        const currentIdx = valid.indexOf(current);
        const prevIdx = currentIdx > 0 ? valid[currentIdx - 1] : valid[valid.length - 1];
        if (thumbnails[prevIdx]) setImageSrc(thumbnails[prevIdx]);
        setActiveThumb(prevIdx);
    };

    const nextImage = () => {
        const valid = thumbnails.map((t, i) => t ? i : -1).filter(i => i >= 0);
        if (valid.length === 0) return;
        const current = valid.includes(activeThumb) ? activeThumb : valid[0];
        const currentIdx = valid.indexOf(current);
        const nextIdx = currentIdx < valid.length - 1 ? valid[currentIdx + 1] : valid[0];
        if (thumbnails[nextIdx]) setImageSrc(thumbnails[nextIdx]);
        setActiveThumb(nextIdx);
    };

    // Helpers
    const getCurrentUserId = async () => {
        if (session?.user?.id) return session.user.id;
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data?.user) return null;
            return data.user.id;
        } catch (err) {
            console.error('Error getting current user:', err);
            return null;
        }
    };

    const checkFavoriteStatus = async () => {
        if (!productId) return false;
        try {
            const userId = await getCurrentUserId();
            if (!userId) return false;
            const { data, error } = await supabase
                .from('favorites')
                .select('favorites_id')
                .eq('user_id', userId)
                .eq('product_id', productId)
                .limit(1);
            setLastFavResp({ action: 'check', userId, productId, data, error });
            if (error) {
                console.error('Error querying favorites table:', error);
                return false;
            }
            return Array.isArray(data) ? data.length > 0 : !!data;
        } catch (err) {
            console.error('Unexpected error checking favorites:', err);
            return false;
        }
    };

    useEffect(() => {
        let isMounted = true;
        const run = async () => {
            if (!productId) return;
            if (session === undefined) return;
            if (session === null) { if (isMounted) setIsFavorited(false); return; }
            const fav = await checkFavoriteStatus();
            if (!isMounted) return;
            setIsFavorited(!!fav);
        };
        run();
        const onFocus = () => { run(); };
        window.addEventListener('focus', onFocus);
        return () => { isMounted = false; window.removeEventListener('focus', onFocus); };
    }, [productId, session]);

    // Toggle favorite
    const toggleFavorite = async (e) => {
        e?.stopPropagation();
        if (!productId) return;
        const userId = session?.user?.id ?? await getCurrentUserId();
        if (!userId) { navigate('/signin'); return; }

        const prev = isFavorited;
        setIsFavorited(!prev);
        setFavLoading(true);
        try {
            if (!prev) {
                const { data, error } = await supabase
                    .from('favorites')
                    .insert([{ user_id: userId, product_id: productId }])
                    .select();
                console.log('[Cap-Info] insert favorite response:', { data, error });
                setLastFavResp({ action: 'insert', userId, productId, data, error });
                if (error) {
                    if (error.code === '23505' || (error.details && error.details.includes('already exists'))) {
                        console.warn('[Cap-Info] insert conflict (already exists), treating as success', error);
                    } else {
                        throw error;
                    }
                }
            } else {
                const { data, error } = await supabase
                    .from('favorites')
                    .delete()
                    .eq('user_id', userId)
                    .eq('product_id', productId)
                    .select();
                console.log('[Cap-Info] delete favorite response:', { data, error });
                setLastFavResp({ action: 'delete', userId, productId, data, error });
                if (error) throw error;
            }
            const fav = await checkFavoriteStatus();
            setIsFavorited(!!fav);
        } catch (err) {
            console.error('Error toggling favorite:', err);
            const fav = await checkFavoriteStatus();
            setIsFavorited(!!fav);
        } finally {
            setFavLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            if (favVerifyTimer.current) clearTimeout(favVerifyTimer.current);
        };
    }, []);

    // Reviews
    const [reviewsCount, setReviewsCount] = useState(0);
    const [averageRating, setAverageRating] = useState(null);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsAvailable, setReviewsAvailable] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [starFilterRating, setStarFilterRating] = useState(0);
    const [reviewAuthors, setReviewAuthors] = useState({});
    const [verifiedBuyerMap, setVerifiedBuyerMap] = useState({});
    const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHoverRating, setReviewHoverRating] = useState(null);
    const [reviewText, setReviewText] = useState("");
    const [reviewFiles, setReviewFiles] = useState([]);
    const [reviewUploadError, setReviewUploadError] = useState(null);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const reviewFileInputRef = useRef(null);

    // Mask a name keeping only first and last character visible
    const maskName = (input) => {
        try {
            const s = String(input ?? '').trim();
            if (s.length <= 2) return s;
            const first = s[0];
            const last = s[s.length - 1];
            return first + '*'.repeat(s.length - 2) + last;
        } catch {
            return input;
        }
    };

    // Parse Supabase timestamp robustly: treat no-TZ strings as UTC
    const parseReviewDate = (val) => {
        if (!val) return null;
        try {
            if (typeof val === 'string') {
                const s = val.trim();
                if (/Z|[+\-]\d{2}:?\d{2}$/.test(s)) {
                    const d = new Date(s);
                    return Number.isNaN(d.getTime()) ? null : d;
                }
                const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/);
                if (m) {
                    const isoUtc = `${m[1]}T${m[2]}Z`;
                    const dUtc = new Date(isoUtc);
                    return Number.isNaN(dUtc.getTime()) ? null : dUtc;
                }
                const d2 = new Date(s);
                if (!Number.isNaN(d2.getTime())) return d2;
            }
            const d3 = new Date(val);
            return Number.isNaN(d3.getTime()) ? null : d3;
        } catch {
            return null;
        }
    };

    // Simple fullscreen lightbox for review images
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxItems, setLightboxItems] = useState([]);
    const [lightboxIdx, setLightboxIdx] = useState(0);
    const openLightbox = (imgs, startIdx = 0) => {
        if (!imgs || imgs.length === 0) return;
        setLightboxItems(imgs);
        setLightboxIdx(Math.max(0, Math.min(startIdx, imgs.length - 1)));
        setIsLightboxOpen(true);
    };
    const closeLightbox = () => setIsLightboxOpen(false);
    const prevLightbox = () => { if (lightboxItems.length) setLightboxIdx(i => (i - 1 + lightboxItems.length) % lightboxItems.length); };
    const nextLightbox = () => { if (lightboxItems.length) setLightboxIdx(i => (i + 1) % lightboxItems.length); };
    useEffect(() => {
        if (!isLightboxOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowLeft') prevLightbox();
            else if (e.key === 'ArrowRight') nextLightbox();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isLightboxOpen, lightboxItems]);

    // Time-ago label
    const formatTimeAgo = (date) => {
        try {
            const now = new Date();
            let diffMs = now - date;
            if (diffMs < 0) diffMs = 0;
            const sec = Math.floor(diffMs / 1000);
            if (sec < 60) return 'just now';
            const min = Math.floor(sec / 60);
            if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`;
            const hr = Math.floor(min / 60);
            if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`;
            const day = Math.floor(hr / 24);
            if (day < 7) return `${day} day${day !== 1 ? 's' : ''} ago`;
            const wk = Math.floor(day / 7);
            return `${wk} week${wk !== 1 ? 's' : ''} ago`;
        } catch { return ''; }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchReviews = async () => {
            if (!productId) return;
            setReviewsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('user_reviews')
                    .select('id, user_id, product_id, rating, comment, image_1_url, image_2_url, image_3_url, created_at')
                    .eq('product_id', productId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (!isMounted) return;
                if (error) {
                    console.warn('[Mug-Info] reviews query error:', error.message || error);
                    setReviewsAvailable(false);
                    setReviewsCount(0);
                    setAverageRating(null);
                    setReviews([]);
                } else if (Array.isArray(data) && data.length > 0) {
                    setReviews(data);
                    const ratings = data.map((r) => Number(r.rating) || 0);
                    const sum = ratings.reduce((a, b) => a + b, 0);
                    const avg = ratings.length ? sum / ratings.length : null;
                    setReviewsAvailable(true);
                    setReviewsCount(ratings.length);
                    setAverageRating(avg);

                    const userIds = Array.from(new Set(data.map(r => r.user_id).filter(Boolean)));
                    if (userIds.length) {
                        const nameMap = {};
                        try {
                            const { data: authNames, error: authErr } = await supabase.rpc('get_user_public_names', { ids: userIds });
                            if (!authErr && Array.isArray(authNames)) {
                                for (const row of authNames) {
                                    const best = (row?.name && String(row.name).trim()) || (row?.email_local || null);
                                    if (row?.id && best) nameMap[row.id] = best;
                                }
                            }
                        } catch (e) { /* ignore */ }

                        try {
                            let profs = null; let profErr = null;
                            {
                                const res = await supabase
                                    .from('profiles')
                                    .select('user_id, display_name, full_name, first_name, last_name, username')
                                    .in('user_id', userIds.filter(id => !nameMap[id]));
                                profs = res.data; profErr = res.error;
                            }
                            if (profErr) {
                                const res2 = await supabase
                                    .from('profiles')
                                    .select('id, display_name, full_name, first_name, last_name, username')
                                    .in('id', userIds.filter(id => !nameMap[id]));
                                profs = res2.data; profErr = res2.error;
                                if (!profErr && Array.isArray(profs)) {
                                    for (const p of profs) {
                                        const name = p.display_name || p.full_name || ((p.first_name || p.last_name) ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : null) || p.username || null;
                                        if (name && !nameMap[p.id]) nameMap[p.id] = name;
                                    }
                                }
                            } else if (!profErr && Array.isArray(profs)) {
                                for (const p of profs) {
                                    const name = p.display_name || p.full_name || ((p.first_name || p.last_name) ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : null) || p.username || null;
                                    if (name && !nameMap[p.user_id]) nameMap[p.user_id] = name;
                                }
                            }
                        } catch (e) { /* ignore */ }

                        setReviewAuthors(nameMap);

                        try {
                            const { data: items, error: itemsErr } = await supabase
                                .from('order_items')
                                .select('order_id, product_id')
                                .eq('product_id', productId);
                            if (!itemsErr && Array.isArray(items) && items.length) {
                                const orderIds = Array.from(new Set(items.map(i => i.order_id).filter(Boolean)));
                                if (orderIds.length) {
                                    const { data: ords, error: ordErr } = await supabase
                                        .from('orders')
                                        .select('id, user_id')
                                        .in('id', orderIds);
                                    if (!ordErr && Array.isArray(ords)) {
                                        const vmap = {};
                                        for (const o of ords) { vmap[o.user_id] = true; }
                                        setVerifiedBuyerMap(vmap);
                                    }
                                }
                            }
                        } catch (e) { /* ignore */ }
                    }
                } else {
                    setReviewsAvailable(true);
                    setReviewsCount(0);
                    setAverageRating(null);
                    setReviews([]);
                }
            } catch (err) {
                console.error('[Mug-Info] unexpected error fetching reviews:', err);
                setReviewsAvailable(false);
                setReviewsCount(0);
                setAverageRating(null);
                setReviews([]);
            } finally {
                if (isMounted) setReviewsLoading(false);
            }
        };
        fetchReviews();
        return () => { isMounted = false; };
    }, [productId]);

    // Review form handlers
    const openReviewForm = async () => {
        const userId = session?.user?.id ?? await getCurrentUserId();
        if (!userId) { navigate('/signin'); return; }
        setIsReviewFormOpen(true);
        try { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); } catch {}
    };
    const resetReviewForm = () => {
        setReviewRating(0);
        setReviewHoverRating(null);
        setReviewText("");
        setReviewFiles([]);
        setReviewUploadError(null);
        if (reviewFileInputRef.current) reviewFileInputRef.current.value = "";
    };
    const cancelReview = () => { resetReviewForm(); setIsReviewFormOpen(false); };
    const onPickReviewFiles = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setReviewUploadError(null);
        const MAX_BYTES = 10 * 1024 * 1024;
        const allowedMime = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/svg', 'text/xml'];
        const toAdd = [];
        for (const file of files) {
            if (file.size > MAX_BYTES) { setReviewUploadError('File is too large'); try { if (reviewFileInputRef.current) reviewFileInputRef.current.value = null; } catch {} return; }
            const ext = (file.name || '').toLowerCase().split('.').pop();
            const fileType = (file.type || '').toLowerCase();
            const isSvg = ext === 'svg' || fileType.includes('svg');
            const isAllowed = allowedMime.includes(fileType) || ['png', 'jpg', 'jpeg'].includes(ext) || isSvg;
            if (!isAllowed) { setReviewUploadError('File format not supported.'); try { if (reviewFileInputRef.current) reviewFileInputRef.current.value = null; } catch {} return; }
            toAdd.push(file);
        }
        setReviewFiles(prev => {
            const combined = [...prev, ...toAdd];
            if (combined.length > 3) setReviewUploadError('You can upload up to 3 images.');
            return combined.slice(0, 3);
        });
        try { if (reviewFileInputRef.current) reviewFileInputRef.current.value = null; } catch {}
    };
    const removeReviewFileAt = (index) => { setReviewFiles(prev => prev.filter((_, i) => i !== index)); setReviewUploadError(null); };
    const submitReview = async () => {
        if (!productId) return;
        const userId = session?.user?.id ?? await getCurrentUserId();
        if (!userId) { navigate('/signin'); return; }
        if (!reviewRating || reviewRating < 1) return;
        setIsSubmittingReview(true);
        try {
            const bucket = 'reviews';
            const urls = [];
            for (let i = 0; i < Math.min(reviewFiles.length, 3); i++) {
                const f = reviewFiles[i];
                try {
                    const safeName = (f.name || 'image').toLowerCase().replace(/[^a-z0-9_.-]/g, '-');
                    const key = `user-reviews/${productId}/${userId}/${Date.now()}_${i}_${uuidv4()}_${safeName}`;
                    const ext = (f.name || '').toLowerCase().split('.').pop();
                    const contentType = f.type || (ext === 'svg' ? 'image/svg+xml' : 'application/octet-stream');
                    const { error: upErr } = await supabase.storage.from(bucket).upload(key, f, { contentType, upsert: false });
                    if (upErr) { console.warn('Review image upload error:', upErr?.message || upErr); continue; }
                    const { data } = supabase.storage.from(bucket).getPublicUrl(key);
                    const publicUrl = data?.publicUrl || data?.publicURL || null;
                    if (publicUrl && !publicUrl.endsWith('/')) urls.push(publicUrl);
                } catch (e) { console.warn('Review image upload failed:', e); }
            }
            if (reviewFiles.length > 0 && urls.length === 0) { setReviewUploadError('Failed to upload images. Please try again.'); return; }
            const payload = {
                product_id: productId,
                user_id: userId,
                rating: reviewRating,
                comment: reviewText.trim() || null,
                image_1_url: urls[0] || null,
                image_2_url: urls[1] || null,
                image_3_url: urls[2] || null,
            };
            const { error } = await supabase.from('user_reviews').insert([payload]);
            if (error) throw error;
            const prevCount = Number(reviewsCount) || 0;
            const prevAvg = averageRating == null ? 0 : Number(averageRating);
            const newCount = prevCount + 1;
            const newAvg = prevCount === 0 ? reviewRating : ((prevAvg * prevCount) + reviewRating) / newCount;
            setReviewsCount(newCount);
            setAverageRating(newAvg);
            setReviewsAvailable(true);
            resetReviewForm();
            setIsReviewFormOpen(false);
            window.location.reload();
        } catch (e) {
            console.warn('Failed to submit review:', e);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // Cart UI state and Add-to-Cart logic (copied from BasicTBag-Info)
    const [cartError, setCartError] = useState(null);
    const [cartSuccess, setCartSuccess] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    const computedUnitPrice = (Number(price) || 0) + Object.values(selectedVariants).reduce((acc, val) => acc + (Number(val?.price) || 0), 0);

    const handleAddToCart = async () => {
        if (isAdding) return;

        if (!productId) {
            setCartError("No product selected");
            return;
        }

        if (!uploadedFileMetas || uploadedFileMetas.length === 0) {
            setShowUploadError(true);
            setTimeout(() => setShowUploadError(false), 2000);
            return;
        }

        setIsAdding(true);

        const userId = session?.user?.id ?? await getCurrentUserId();
        if (!userId) {
            setCartError("Please sign in to add to cart");
            navigate("/signin");
            return;
        }

        setCartError(null);
        setCartSuccess(null);

        try {
            // If editing from cart, update the existing cart item directly
            if (fromCart && editingCartId) {
                const variantPriceForCart = Object.values(selectedVariants || {}).reduce((acc, val) => acc + (Number(val?.price) || 0), 0);
                const unitPriceForCart = (sizeDimensions ? Number(calculateSizePrice()) : Number(price) || 0) + variantPriceForCart;
                const newTotal = (Number(unitPriceForCart) || 0) * Number(quantity || 0);

                // Update the existing cart item
                const { error: updateError } = await supabase
                    .from("cart")
                    .update({
                        quantity: quantity,
                        total_price: newTotal,
                        base_price: Number(unitPriceForCart) || Number(price) || 0,
                        route: location?.pathname || `/${slug}`,
                        slug: slug || null
                    })
                    .eq("cart_id", editingCartId)
                    .eq("user_id", userId);

                if (updateError) throw updateError;

                // Update cart variants
                const { error: deleteVariantsError } = await supabase
                    .from("cart_variants")
                    .delete()
                    .eq("cart_id", editingCartId)
                    .eq("user_id", userId);

                if (deleteVariantsError) throw deleteVariantsError;

                const variantInserts = Object.entries(selectedVariants).map(([groupId, value]) => ({
                    cart_id: editingCartId,
                    user_id: userId,
                    cartvariant_id: value?.variant_value_id ?? value?.id ?? value,
                    price: Number(value?.price) || 0,
                }));

                if (variantInserts.length > 0) {
                    const { error: variantsError } = await supabase.from("cart_variants").insert(variantInserts);
                    if (variantsError) throw variantsError;
                }

                // Dispatch a window-level event so UploadDesign (if mounted) can attach any pending uploads
                window.dispatchEvent(new CustomEvent('cart-created', { detail: { cartId: editingCartId } }));

                // Fallback: if uploadedFileMetas exists in this parent, try to attach by ids (try file_id and id columns)
                if (uploadedFileMetas && uploadedFileMetas.length > 0) {
                    const ids = uploadedFileMetas.map(m => m.id ?? m.file_id).filter(Boolean);
                    if (ids.length > 0) {
                        try {
                            // Try file_id column first
                            let res1 = await supabase.from('uploaded_files').update({ cart_id: editingCartId }).in('file_id', ids);
                            if (res1.error) {
                                console.warn('[Mug] attach by file_id failed, trying id column:', res1.error);
                                // Fallback to id column
                                const res2 = await supabase.from('uploaded_files').update({ cart_id: editingCartId }).in('id', ids);
                                if (res2.error) console.warn('[Mug] attach by id fallback failed:', res2.error);
                                else if ((res2.data?.length ?? 0) === 0) console.warn('[Mug] attach: no rows linked for ids (file_id/id):', ids);
                            } else if ((res1.data?.length ?? 0) === 0) {
                                console.warn('[Mug] attach: no rows linked for file_id:', ids);
                            } else {
                                console.debug('[Mug] attached uploaded files by file_id:', res1.data?.length ?? 0);
                            }
                        } catch (err) {
                            console.warn('[Mug] Failed to link uploaded_files by ids (both columns):', err);
                        }
                    }
                }

                // Reset UploadDesign to clear thumbnails while keeping the upload UI visible
                setUploadResetKey(prev => prev + 1);
                setShowUploadUI(false);

                setCartSuccess("Cart item updated!");
                setTimeout(() => setCartSuccess(null), 3000);
                setIsAdding(false);

                // Navigate back to cart
                navigate('/cart');
                return;
            }

            const { data: existingCarts, error: checkError } = await supabase
                .from("cart")
                .select("cart_id, quantity, total_price")
                .eq("user_id", userId)
                .eq("product_id", productId);

            if (checkError) throw checkError;

            let cartId;
            let cartMatched = false;

            const variantPriceForCart = Object.values(selectedVariants || {}).reduce((acc, val) => acc + (Number(val?.price) || 0), 0);
            const unitPriceForCart = (sizeDimensions ? Number(calculateSizePrice()) : Number(price) || 0) + variantPriceForCart;

            for (const cart of existingCarts || []) {
                const { data: cartVariants, error: varError } = await supabase
                    .from("cart_variants")
                    .select("cartvariant_id, cart_id")
                    .eq("cart_id", cart.cart_id)
                    .eq("user_id", userId);

                if (varError) throw varError;

                const existingVarSet = new Set((cartVariants || []).map((v) => `${v.cartvariant_id}`));
                const selectedVarSet = new Set(Object.values(selectedVariants || {}).map((val) => `${val?.variant_value_id ?? val?.id ?? val}`));

                if (existingVarSet.size === selectedVarSet.size && [...existingVarSet].every((v) => selectedVarSet.has(v))) {
                    cartMatched = true;
                    const newQuantity = (Number(cart.quantity) || 0) + Number(quantity || 0);
                    const newTotal = (Number(unitPriceForCart) || 0) * newQuantity;
                    const { error: updateError } = await supabase
                        .from("cart")
                        .update({ quantity: newQuantity, total_price: newTotal, base_price: Number(unitPriceForCart) || Number(price) || 0, route: location?.pathname || `/${slug}`, slug: slug || null })
                        .eq("cart_id", cart.cart_id)
                        .eq("user_id", userId);
                    if (updateError) throw updateError;
                    cartId = cart.cart_id;
                    break;
                }
            }

                if (!cartMatched) {
                const { data: cartData, error: cartError } = await supabase
                    .from("cart")
                    .insert([
                        {
                            user_id: userId,
                            product_id: productId,
                            quantity: quantity,
                            base_price: Number(unitPriceForCart) || Number(price) || 0,
                            total_price: Number(unitPriceForCart * quantity) || 0,
                            route: location?.pathname || `/${slug}`,
                            slug: slug || null,
                        },
                    ])
                    .select("cart_id")
                    .single();

                if (cartError) throw cartError;
                if (!cartData || !cartData.cart_id) throw new Error("Failed to retrieve cart_id after insertion");

                cartId = cartData.cart_id;

                const variantInserts = Object.entries(selectedVariants).map(([groupId, value]) => ({
                    cart_id: cartId,
                    user_id: userId,
                    cartvariant_id: value?.variant_value_id ?? value?.id ?? value,
                    price: Number(value?.price) || 0,
                }));

                if (variantInserts.length > 0) {
                    const { error: variantsError } = await supabase.from("cart_variants").insert(variantInserts);
                    if (variantsError) {
                        await supabase.from("cart").delete().eq("cart_id", cartId).eq("user_id", userId);
                        throw variantsError;
                    }
                }
            }

            // Dispatch a window-level event so UploadDesign (if mounted) can attach any pending uploads
            window.dispatchEvent(new CustomEvent('cart-created', { detail: { cartId } }));

            // Fallback: if uploadedFileMetas exists in this parent, try to attach by ids (try file_id and id columns)
            if (uploadedFileMetas && uploadedFileMetas.length > 0) {
                const ids = uploadedFileMetas.map(m => m.id ?? m.file_id).filter(Boolean);
                if (ids.length > 0) {
                    try {
                        // Try file_id column first
                        let res1 = await supabase.from('uploaded_files').update({ cart_id: cartId }).in('file_id', ids);
                        if (res1.error) {
                            console.warn('[Mug] attach by file_id failed, trying id column:', res1.error);
                            // Fallback to id column
                            const res2 = await supabase.from('uploaded_files').update({ cart_id: cartId }).in('id', ids);
                            if (res2.error) console.warn('[Mug] attach by id fallback failed:', res2.error);
                            else if ((res2.data?.length ?? 0) === 0) console.warn('[Mug] attach: no rows linked for ids (file_id/id):', ids);
                        } else if ((res1.data?.length ?? 0) === 0) {
                            console.warn('[Mug] attach: no rows linked for file_id:', ids);
                        } else {
                            console.debug('[Mug] attached uploaded files by file_id:', res1.data?.length ?? 0);
                        }
                    } catch (err) {
                        console.warn('[Mug] Failed to link uploaded_files by ids (both columns):', err);
                    }
                }
            }

            // Reset UploadDesign to clear thumbnails while keeping the upload UI visible
            setUploadResetKey(prev => prev + 1);
            setShowUploadUI(false);

            setCartSuccess("Item added to cart!");
            setQuantity(1);
            setTimeout(() => setCartSuccess(null), 3000);
        } catch (err) {
            console.error("Error adding to cart - Details:", { message: err.message, code: err.code, details: err.details });
            if (err.code === "23505") {
                setCartError("This item with the same variants is already in your cart");
            } else {
                setCartError("Failed to add to cart: " + (err.message || "Unknown error"));
            }
        } finally {
            setIsAdding(false);
        }
    };

    const toggleDetails = () => setDetailsOpen((s) => !s);
    const incrementQuantity = () => setQuantity((q) => Math.min(q + 1, stockInfo?.quantity || Infinity));
    const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));

    const selectVariant = (groupId, value) => {
        setSelectedVariants(prev => ({ ...prev, [groupId]: value }));
    };

    // totalPrice is derived state: base price + selected variant prices + size adjustments, multiplied by quantity
    const [totalPrice, setTotalPrice] = useState(0);

    const printingGroup = variantGroups.find(g => g.name.toUpperCase() === 'PRINTING');
    const colorGroup = variantGroups.find(g => g.name.toUpperCase() === 'COLOR');
    // helper normalizer for robust group matching
    const normalize = (n) => String(n || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Broaden size group detection to include names like "SIZE (CUSTOMIZABLE)", "CUSTOM SIZE", "DIMENSION"
    const sizeGroup = variantGroups.find(g => {
        const n = normalize(g.name || '');
        return n.includes('SIZE') || n.includes('CUSTOM') || n.includes('DIMENSION') || n.includes('SIZECUSTOM') || n.includes('CUSTOMIZABLE');
    });
    const materialGroup = variantGroups.find(g => ['MATERIAL', 'MATERIALS'].includes(String(g.name).toUpperCase()));
    // Backwards-compatible alias: some components use printingRow variable name
    const printingRow = printingGroup;
    // Backwards-compatible alias: many templates reference techniqueGroup
    const techniqueGroup = variantGroups.find(g => ['TECHNIQUE', 'TECHNIQUES'].includes(String(g.name).toUpperCase()));
    // Derive trim group (TRIM / TRIM COLOR / EDGE / BORDER)
    const trimGroup = variantGroups.find(g => {
        const n = String(g.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return n === 'TRIM' || n.includes('TRIM') || n.includes('EDGE') || n.includes('BORDER');
    });
    // Base group (BASE / BASE TYPE / BACKING)
    const baseGroup = variantGroups.find(g => {
        const n = String(g.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return n === 'BASE' || n.includes('BASE') || n.includes('BACKING') || n.includes('BASETYPE');
    });
    // Color row: prefer a robust derived state (handles COLOR/COLOUR/plurals)
    const [colorRowState, setColorRowState] = useState(null);
    const colorRow = colorRowState || colorGroup;

    useEffect(() => {
        if (!variantGroups || variantGroups.length === 0) {
            setColorRowState(null);
            return;
        }
        const normalize = (n) => String(n || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

        let found = variantGroups.find(g => normalize(g.name || '') === 'COLOR') || null;
        if (!found) {
            found = variantGroups.find(g => {
                const name = normalize(g.name || '');
                return name === 'COLOUR' || name === 'COLORS' || name === 'COLOURS' || name.includes('COLOR') || name.includes('COLOUR');
            }) || null;
        }
        setColorRowState(found);
    }, [variantGroups]);
    // Size state (will be fetched from DB if available)
    const [sizeDimensions, setSizeDimensions] = useState(null);
    const [length, setLength] = useState(0);
    const [width, setWidth] = useState(0);
    const incrementLength = () => {
        if (!sizeDimensions) return;
        const inc = sizeDimensions.length_increment || 0.1;
        setLength(l => Math.min((sizeDimensions.max_length || l), Number((l + inc).toFixed(2))));
    };
    const decrementLength = () => {
        if (!sizeDimensions) return;
        const inc = sizeDimensions.length_increment || 0.1;
        setLength(l => Math.max((sizeDimensions.min_length || l), Number((l - inc).toFixed(2))));
    };
    const incrementWidth = () => {
        if (!sizeDimensions) return;
        const inc = sizeDimensions.width_increment || 0.1;
        setWidth(w => Math.min((sizeDimensions.max_width || w), Number((w + inc).toFixed(2))));
    };
    const decrementWidth = () => {
        if (!sizeDimensions) return;
        const inc = sizeDimensions.width_increment || 0.1;
        setWidth(w => Math.max((sizeDimensions.min_width || w), Number((w - inc).toFixed(2))));
    };
    const formatSize = (v) => (v == null ? 0 : v.toString());
    
    const calculateSizePrice = () => {
        if (!sizeDimensions) return price || 0;
        const basePrice = price || 0;
        const lengthInc = sizeDimensions.length_increment || 0.1;
        const widthInc = sizeDimensions.width_increment || 0.1;
        const lengthIncrements = Math.max(0, Math.floor(((length || 0) - (sizeDimensions.min_length || 0)) / lengthInc));
        const widthIncrements = Math.max(0, Math.floor(((width || 0) - (sizeDimensions.min_width || 0)) / widthInc));
        const pricePerIncrement = 0.5; // placeholder until DB provides a rate
        return basePrice + (lengthIncrements + widthIncrements) * pricePerIncrement;
    };

    useEffect(() => {
        const base = calculateSizePrice();
        const variantPrice = Object.values(selectedVariants).reduce((acc, val) => acc + (val?.price || 0), 0);
        const total = (base + variantPrice) * (quantity || 1);
        setTotalPrice(total);
    }, [quantity, selectedVariants, length, width, sizeDimensions, price]);

    // If there's no sizeGroup in the DB, sync custom numeric size into selectedVariants so cart receives it
    useEffect(() => {
        if (sizeGroup) return; // DB group exists — selectedVariants handled elsewhere
        // Only add when sizeDimensions available (i.e., customization allowed)
        if (!sizeDimensions) return;
        const formatted = `${length || 0}x${width || 0}`;
        setSelectedVariants(prev => ({ ...prev, custom_size: { id: 'custom_size', name: 'Custom Size', value: formatted, price: 0 } }));
    }, [length, width, sizeDimensions]);
    // Accessories state and fallback
    const [accessoriesRowState, setAccessoriesRowState] = useState(null);
    const [accessoryImagesState, setAccessoryImagesState] = useState({});
    // Backwards-compatible: expose variables used in JSX
    const accessoriesRow = accessoriesRowState;
    const accessoryImages = accessoryImagesState;
    // Pieces / quantity state (for acrylic pieces quantity)
    const [piecesRowState, setPiecesRowState] = useState(null);
    const piecesRow = piecesRowState;
    // Backwards-compatible alias: some templates reference colorRow (handled via colorRowState above)

    // derive accessories row (e.g., Hook Clasp / ACCESSORY / CLAMP) from variantGroups
    useEffect(() => {
        if (!variantGroups || variantGroups.length === 0) {
            setAccessoriesRowState(null);
            return;
        }
        const normalize = (n) => String(n || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

        let found = variantGroups.find(g => normalize(g.name || '') === 'ACCESSORIES') || null;
        if (!found) {
            found = variantGroups.find(g => {
                const name = normalize(g.name || '');
                return name.includes('HOOK') || name.includes('CLASP') || name.includes('CLAMP') || name.includes('ACCESSORY');
            }) || null;
        }
        setAccessoriesRowState(found);
    }, [variantGroups]);

    // derive pieces/quantity row (PIECES / QUANTITY / QTY) from variantGroups
    useEffect(() => {
        if (!variantGroups || variantGroups.length === 0) {
            setPiecesRowState(null);
            return;
        }
        const normalize = (n) => String(n || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

        let found = variantGroups.find(g => normalize(g.name || '') === 'PIECES') || null;
        if (!found) {
            found = variantGroups.find(g => {
                const name = normalize(g.name || '');
                return name.includes('PIECE') || name.includes('QUANTITY') || name === 'QTY' || name.includes('QTY');
            }) || null;
        }
        setPiecesRowState(found);
    }, [variantGroups]);

    // Resolve accessory images to public URLs (try storage buckets then fallbacks)
    useEffect(() => {
        let isMounted = true;
        const fetchImages = async () => {
            if (!accessoriesRowState || !accessoriesRowState.values || accessoriesRowState.values.length === 0) return;
            const cache = {};
            const tryBuckets = ['clamp', 'accessoriesdecorations-images', 'accessories-images', 'images', 'logo-icon'];
            for (const val of accessoriesRowState.values) {
                const keyCandidates = [];
                if (val.value) keyCandidates.push(String(val.value).trim());
                if (val.name) keyCandidates.push(String(val.name).trim());
                keyCandidates.push(`${val.name || val.value}`.toLowerCase().replace(/\s+/g, '-'));
                let resolved = null;
                for (const key of keyCandidates) {
                    if (!key) continue;
                    for (const bucket of tryBuckets) {
                        try {
                            const { data } = supabase.storage.from(bucket).getPublicUrl(key);
                            const url = data?.publicUrl;
                            if (!url) continue;
                            try {
                                const head = await fetch(url, { method: 'HEAD' });
                                if (head.ok) { resolved = url; break; }
                            } catch (e) {
                                // continue to next
                            }
                        } catch (e) {
                            // ignore
                        }
                        if (resolved) break;
                    }
                    if (resolved) break;
                }

                // fallback to predictable public paths
                if (!resolved) {
                    const candidatePaths = [
                        `/accessories-images/${(val.name || val.value || '').toString().toLowerCase().replace(/\s+/g, '-')}.png`,
                        `/accessoriesdecorations-images/${(val.name || val.value || '').toString().toLowerCase().replace(/\s+/g, '-')}.png`,
                        `/logo-icon/logo.png`
                    ];
                    for (const p of candidatePaths) {
                        try {
                            const r = await fetch(p, { method: 'HEAD' });
                            if (r.ok) { resolved = p; break; }
                        } catch (e) {
                            // ignore
                        }
                    }
                }

                cache[val.id] = resolved || '/logo-icon/logo.png';
            }
            if (isMounted) setAccessoryImagesState(cache);
        };
        fetchImages();
        return () => { isMounted = false; };
    }, [accessoriesRowState]);

    // Fetch sizeDimensions similar to Acrylic-Keychain pattern
    useEffect(() => {
        let isMounted = true;
        const fetchSizeDimensions = async () => {
            if (!productId) return;
            try {
                const { data, error } = await supabase
                    .from('size_dimension_customizable')
                    .select('product_id, target, min_length, max_length, length_increment, min_width, max_width, width_increment')
                    .eq('product_id', productId);

                if (!isMounted) return;
                if (error) {
                    console.error('Error fetching size dimensions:', error);
                } else if (data && data.length > 0) {
                    // Prefer a 'default' target if present, otherwise pick the first matching row
                    const preferred = data.find(d => String(d.target || '').toLowerCase() === 'default') || data[0];
                    setSizeDimensions(preferred);
                    setLength(preferred.min_length || 0);
                    setWidth(preferred.min_width || 0);
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('Unexpected error fetching size dimensions:', err);
            }
        };
        fetchSizeDimensions();
        return () => { isMounted = false; };
    }, [productId]);

    return (
        <div className="font-dm-sans w-full bg-cover bg-white phone:pt-[210px] tablet:pt-[220px] laptop:pt-[161px] phone:pb-40 tablet:pb-32 laptop:pb-24 z-0">
            <div className="max-w-[1201px] mx-auto mt-8 flex flex-col">
                <div className="phone:p-2 tablet:p-2">
                    <p className="pt-5 font-dm-sans">
                        <Link to="/Homepage" className="text-gray-600">Home </Link>/ <Link to="/accessories-decorations" className="text-gray-600">Accessories & Decorations </Link>
                    </p>
                </div>

                <div className="flex flex-col tablet:flex-row laptop:gap-2 tablet:gap-[50px] phone:p-2 tablet:p-2 justify-center w-full items-stretch">
                    {/* Left: Gallery */}
                    <div className="bg-white w-full tablet:w-[573px] h-auto">
                        <div className="rounded-md p-6 h-full flex flex-col">
                            <div className="relative w-full h-64 tablet:h-[480px] flex-1 flex items-center justify-center bg-[#f7f7f7]">
                                <img
                                    src={imageSrc || "/apparel-images/caps.png"}
                                    alt=""
                                    className="w-full max-h-64 tablet:max-h-[420px] object-contain"
                                    onError={(e) => {
                                        console.debug('[ShakerKeychain] main image failed to load, src=', e.target.src);
                                        // try resolving fallback from supabase buckets directly
                                        try {
                                            const { data } = supabase.storage.from('apparel-images').getPublicUrl('caps.png');
                                            if (data?.publicUrl && !data.publicUrl.endsWith('/')) e.target.src = data.publicUrl;
                                            else e.target.src = '/apparel-images/caps.png';
                                        } catch (err) {
                                            e.target.src = '/apparel-images/caps.png';
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    aria-label="Previous image"
                                    onClick={prevImage}
                                    aria-disabled={thumbnails.filter(Boolean).length < 2}
                                    className={`absolute left-1 top-1/2 -translate-y-1/2 p-2 bg-transparent focus:outline-none focus:ring-0 ${thumbnails.filter(Boolean).length < 2 ? 'opacity-40 pointer-events-none' : ''}`}
                                >
                                    <img src="/logo-icon/arrow-left.svg" alt="Previous" className="h-6 w-6" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next image"
                                    onClick={nextImage}
                                    aria-disabled={thumbnails.filter(Boolean).length < 2}
                                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-2 bg-transparent focus:outline-none focus:ring-0 ${thumbnails.filter(Boolean).length < 2 ? 'opacity-40 pointer-events-none' : ''}`}
                                >
                                    <img src="/logo-icon/arrow-right.svg" alt="Next" className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="mt-4 grid grid-cols-4 gap-4">
                                {(() => {
                                    // this make the our thumbnail sa baba ng pic to 4 
                                    const cells = [];
                                    for (let i = 0; i < 4; i++) {
                                        const src = thumbnails[i];
                                        if (src) {
                                            const isActive = i === activeThumb;
                                            cells.push(
                                                <button
                                                    key={`thumb-${i}`}
                                                    type="button"
                                                    onClick={() => { setActiveThumb(i); setImageSrc(src); }}
                                                    className={`border rounded p-1 overflow-hidden flex items-center justify-center ${isActive ? 'ring-2 ring-offset-1 ring-black focus:outline-none' : ''}`}
                                                    style={{ width: 120, height: 135 }}
                                                >
                                                    <img
                                                        src={src}
                                                        alt={`Thumbnail ${i + 1}`}
                                                        className={`h-full w-full object-cover transition-transform duration-200 ease-in-out transform ${isActive ? 'scale-110' : 'hover:scale-110'}`}
                                                    />
                                                </button>
                                            );
                                        } else {
                                            cells.push(<div key={`placeholder-${i}`} className="border rounded p-2 bg-[#f7f7f7]"  aria-hidden />);
                                        }
                                    }
                                    return cells;
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Right: Details */}
                     <div className="border border-black rounded-md p-6 w-full tablet:w-[601px] h-[732px] flex flex-col overflow-y-auto pr-2">
                        <h1 className="text-[36px] font-bold text-[#111233] mt-4 mb-2">{loading ? "" : productName}</h1>

                        {/* Stars */}
                        <div className="flex flex-row gap-2">
                            <div className="flex items-center gap-2 text-yellow-400" aria-hidden>
                                {Array.from({ length: 5 }).map((_, i) => {
                                    const fillStar = reviewsAvailable && averageRating != null && (i < Math.round(averageRating));
                                    return (
                                        <svg key={i} className="h-5 w-5" viewBox="0 0 20 20" fill={fillStar ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3 .921-.755 1.688-1.54 1.118L10 15.347l-3.488 2.679c-.784 .57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                                        </svg>
                                    );
                                })}
                            </div>
                            <div className="text-sm text-gray-700">
                                {reviewsAvailable
                                    ? (reviewsCount > 0
                                        ? `${averageRating ? averageRating.toFixed(1) : '—'}/5 ${reviewsCount} review${reviewsCount !== 1 ? 's' : ''}`
                                        : '(—/5) 0 reviews')
                                    : '(—/5) 0 reviews'}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-4" aria-hidden />

                        <div className="text-3xl text-[#EF7D66] font-bold mb-4">
                            {loading ? "" : `₱${totalPrice.toFixed(2)}`}
                            <p className="italic text-[12px]">Shipping calculated at checkout.</p>
                        </div>
                        <div className="mb-2">
                            {Object.values(selectedVariants).filter(v => v?.id).length > 0 ? (
                                stockInfo ? (
                                    stockInfo.quantity === 0 ? (
                                        <span className="text-black font-semibold">Out of stock</span>
                                    ) : stockInfo.quantity === 1 ? (
                                        <span className="text-black font-semibold">Stock: {stockInfo.quantity}</span>
                                    ) : (
                                        <span className="text-black font-semibold">Stocks: {stockInfo.quantity}</span>
                                    )
                                ) : (
                                    <span className="text font-semibold">Checking stock.</span>
                                )
                            ) : (
                                <span className="text-gray-500">Select all variants to see stock.</span>
                            )}
                        </div>
                        <hr className="mb-6" />

                        
                           {/* COLOR (from variant groups) */}
                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">COLOR</div>
                            {colorRow ? (
                                <div className="flex gap-3 items-center text-center flex-wrap">
                                    {colorRow.values.map(val => {
                                        const isSelected = selectedVariants[colorRow.id]?.id === val.id;
                                        return (
                                            <button
                                                key={val.id}
                                                type="button"
                                                onClick={() => selectVariant(colorRow.id, val)}
                                                className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm min-w-[80px] ${isSelected ? 'bg-gray-200 text-gray-700 border border-gray-300 font-semibold' : 'bg-white text-[#111233] border border-[#111233]'}`}
                                                title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                            >
                                                <span className="text-sm text-center">{val.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500">No color options</div>
                            )}
                        </div>

                           <div className="mb-6">
                                {/* SIZE / CUSTOM SIZE (render under BASE when available) */}
                                {(sizeGroup || sizeDimensions) && (
                                    <div className="mt-3">
                                        <div className="text-[16px] font-semibold text-gray-700 mb-2">SIZE</div>
                                        <div className="flex flex-col gap-2">
                                            {/* Preset buttons (if any) */}
                                            <div className="flex gap-2 flex-wrap">
                                                {(sizeGroup?.values || []).map(val => {
                                                    const label = String(val.name || val.value || '').trim();
                                                    const isSelected = selectedVariants[sizeGroup.id]?.id === val.id;
                                                    const handlePreset = () => {
                                                        // try to parse formats like "150x130", "6 x 4", "150mm x 130mm"
                                                        const s = String(val.value || val.name || '').replace(/\s+/g, '');
                                                        const m = s.match(/(\d+(?:\.\d+)?)[xX](\d+(?:\.\d+)?)/);
                                                        if (m) {
                                                            const L = Number(m[1]);
                                                            const W = Number(m[2]);
                                                            setLength(L);
                                                            setWidth(W);
                                                            // also select the variant so it appears in selectedVariants
                                                            if (sizeGroup) selectVariant(sizeGroup.id, val);
                                                            else {
                                                                // no sizeGroup in DB -> persist as synthetic custom_size
                                                                setSelectedVariants(prev => ({ ...prev, custom_size: { id: 'custom_size', name: label, value: `${L}x${W}`, price: 0 } }));
                                                            }
                                                        } else {
                                                            // fallback: just select variant or store synthetic value
                                                            if (sizeGroup) selectVariant(sizeGroup.id, val);
                                                            else setSelectedVariants(prev => ({ ...prev, custom_size: { id: 'custom_size', name: label, value: label, price: 0 } }));
                                                        }
                                                    };
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={val.id}
                                                            onClick={handlePreset}
                                                            className={`px-3 py-1 rounded ${isSelected ? 'bg-gray-200 text-gray-700 font-semibold border border-[#111233]' : 'bg-white text-[#111233] border border-[#111233]'} focus:outline-none focus:ring-0`}
                                                        >
                                                            {label}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            
                                        
                                        </div>
                                    </div>
                                )}

                           </div>
                           
                            
                           
                            
               
                        
                        

                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">UPLOAD DESIGN{showUploadError && <span className="text-red-600 text-sm"> *Required</span>}</div>
                            <UploadDesign key={uploadResetKey} productId={productId} session={session} hidePreviews={!showUploadUI} isEditMode={fromCart && !!editingCartId} cartId={fromCart ? editingCartId : null} setUploadedFileMetas={setUploadedFileMetas} />
                        </div>

                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">QUANTITY</div>
                            <div className="inline-flex items-center border border-black rounded">
                                <button type="button" className="px-3 bg-white text-black focus:outline-none focus:ring-0" onClick={decrementQuantity} aria-label="Decrease quantity" disabled={quantity <= 1 || (stockInfo && stockInfo.quantity <= 0)}>-</button>
                                <div className="px-4 text-black" aria-live="polite">{quantity}</div>
                                <button type="button" className="px-3 bg-white text-black focus:outline-none focus:ring-0" onClick={incrementQuantity} aria-label="Increase quantity" disabled={quantity >= (stockInfo?.quantity || Infinity) || (stockInfo && stockInfo.quantity <= 0)}>+</button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={isAdding || (stockInfo && stockInfo.quantity <= 0)}
                                aria-busy={isAdding}
                                className={`bg-[#ef7d66] text-black py-3 rounded w-full tablet:w-[314px] font-semibold focus:outline-none focus:ring-0 ${(isAdding || (stockInfo && stockInfo.quantity <= 0)) ? 'opacity-60 pointer-events-none' : ''}`}
                            >
                                {cartSuccess ? cartSuccess : (isAdding ? (fromCart ? 'UPDATING...' : 'ADDING...') : (fromCart ? 'UPDATE CART' : 'ADD TO CART'))}
                            </button>
                            <button
                                type="button"
                                className="bg-white p-1.5 rounded-full shadow-md focus:outline-none focus:ring-0"
                                onClick={toggleFavorite}
                                aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                                disabled={favLoading}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isFavorited ? 'text-red-600 fill-red-600' : 'text-gray-700'}`} fill={isFavorited ? 'red' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Details */}
            <div className="max-w-[1200px] mx-auto mt-8 w-full laptop:px-2 phone:p-2 tablet:p-2">
                <div className="border border-black rounded-md overflow-hidden">
                    <div className="w-full flex items-center justify-between bg-white p-3 tablet:p-4 border-b border-b-black">
                        <h2 className="text-[32px] font-bold text-[#111233]">Product Details</h2>
                        <button
                            type="button"
                            aria-label={detailsOpen ? 'Collapse product details' : 'Expand product details'}
                            aria-expanded={detailsOpen}
                            onClick={toggleDetails}
                            className="p-0 bg-white rounded focus:outline-none focus:ring-0"
                        >
                            <img
                                src="/logo-icon/arrow-up.svg"
                                alt=""
                                aria-hidden
                                className={`h-6 w-6 rounded object-cover transform transition-transform duration-200 ${detailsOpen ? '' : 'rotate-180'}`}
                            />
                        </button>
                    </div>
                    <div
                        aria-hidden={!detailsOpen}
                        className={`bg-gray-50 overflow-hidden transition-all duration-300 ease-in-out ${detailsOpen ? 'p-4 tablet:p-6 max-h-[500px] opacity-100' : 'px-4 py-0 tablet:px-6 tablet:py-0 max-h-0 opacity-0 pointer-events-none'}`}
                    >
                        <ul className="text-sm text-gray-700 space-y-2 text-black text-[16px] font-dm-sans">
                            <li><p className="mb-2 text-[16px] font-normal text-black font-dm-sans">Product Name:  {productName || 'Custom Rounded T-shirt'}</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Printing Color: CMYK</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Material: Tinplate Steel</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Size: 1.25 inches, 1.5 inches, 1.75 inches, 2.25 inches</p></li>
                            
                        </ul>
                    </div>
                </div>
            </div>

            {/* Customer Reviews */}
            <div className="max-w-[1200px] mx-auto mt-8 w-full laptop:px-2 phone:p-2 tablet:p-2">
                <div className={`border border-black ${reviews && reviews.length > 0 ? 'border-b-0 rounded-b-none' : ''} rounded-md overflow-hidden`}>
                    <div className=" rounded-md rounded-b-none p-4  flex flex-col tablet:flex-row tablet:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-[28px] tablet:text-[32px] font-bold text-[#111233]">Customer Reviews</h2>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="flex items-center gap-2" aria-hidden>
                                    {Array.from({ length: 5 }).map((_, i) => {
                                        const fillStar = reviewsAvailable && averageRating != null && (i < Math.round(averageRating));
                                        return (
                                            <svg key={i} className={`h-5 w-5 ${fillStar ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill={fillStar ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3 .921-.755 1.688-1.54 1.118L10 15.347l-3.488 2.679c-.784 .57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                                            </svg>
                                        );
                                    })}
                                </div>
                                <div className="text-sm text-black">
                                    {reviewsAvailable
                                        ? (reviewsCount > 0
                                            ? `${averageRating ? averageRating.toFixed(1) : '—'}/5 ${reviewsCount} review${reviewsCount !== 1 ? 's' : ''}`
                                            : '(—/5) 0 reviews')
                                        : '(—/5) 0 reviews'}
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0 ">
                            <button
                                type="button"
                                onClick={openReviewForm}
                                className="uppercase tracking-wide border border-black px-4 py-2 rounded bg-[#2B4269] text-white font-semibold focus:outline-none focus:ring-0"
                            >
                                WRITE A REVIEW
                            </button>
                        </div>
                    </div>
                    <div className="px-4 tablet:px-6">
                        <hr className="mt-2 border-t border-gray-300" />
                    </div>
                    {/* Star Filter Section */}
                    {!isReviewFormOpen && (
                        <div className="px-4 tablet:px-6 pt-4">
                            <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-[#111233]">Filter by:</div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStarFilterRating(0)}
                                        className={`px-3 py-1 text-sm rounded border ${starFilterRating === 0 ? 'bg-gray-200 text-gray-700 font-semibold border-gray-400' : 'bg-white text-gray-700 border-gray-300'} focus:outline-none focus:ring-0`}
                                    >
                                        All
                                    </button>
                                    {[5, 4, 3, 2, 1].map((rating) => (
                                        <button
                                            key={rating}
                                            type="button"
                                            onClick={() => setStarFilterRating(rating)}
                                            className={`px-3 py-1 text-sm rounded border flex items-center gap-1 ${starFilterRating === rating ? 'bg-gray-200 text-gray-700 font-semibold border-gray-400' : 'bg-white text-gray-700 border-gray-300'} focus:outline-none focus:ring-0`}
                                        >
                                            <svg className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3 .921-.755 1.688-1.54 1.118L10 15.347l-3.488 2.679c-.784 .57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                                            </svg>
                                            {rating}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {isReviewFormOpen && (
                        <div className="px-4 pb-4 tablet:px-6 tablet:pb-6 pt-4">
                            <div className="space-y-3">
                                <div>
                                    <div className="text-sm font-medium text-[#111233] mb-1">Your Rating:</div>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: 5 }).map((_, i) => {
                                            const idx = i + 1;
                                            const active = (reviewHoverRating ?? reviewRating) >= idx;
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onMouseEnter={() => setReviewHoverRating(idx)}
                                                    onMouseLeave={() => setReviewHoverRating(null)}
                                                    onClick={() => setReviewRating(idx)}
                                                    aria-label={`Rate ${idx} star${idx>1?'s':''}`}
                                                    className="p-0.5 bg-transparent focus:outline-none focus:ring-0"
                                                >
                                                    <svg className={`h-5 w-5 ${active ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3 .921-.755 1.688-1.54 1.118L10 15.347l-3.488 2.679c-.784 .57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                                                    </svg>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <textarea
                                        value={reviewText}
                                        onChange={(e) => setReviewText(e.target.value.slice(0, 300))}
                                        rows={4}
                                        placeholder="Share your experience with this product..."
                                        className="w-full border border-black rounded-md p-3 outline-none focus:ring-0 resize-y"
                                    />
                                    <div className="text-right text-sm text-gray-500 mt-1">
                                        {reviewText.length}/300
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-4">
                                        <input
                                            ref={reviewFileInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/svg+xml,.svg"
                                            className="hidden"
                                            multiple
                                            onChange={onPickReviewFiles}
                                        />
                                        <button
                                            type="button"
                                            disabled={reviewFiles && reviewFiles.length >= 3}
                                            className={`bg-[#27496d] text-white px-4 py-2 rounded flex items-center gap-2 focus:outline-none focus:ring-0 ${(reviewFiles && reviewFiles.length >= 3) ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            onClick={() => reviewFileInputRef.current && reviewFileInputRef.current.click()}
                                        >
                                            <img src="/logo-icon/upload.svg" alt="upload" className="h-4 w-4" />
                                            <span>UPLOAD FILE</span>
                                        </button>
                                        <p className="text-[12px] italic font-dm-sans">Upload up to 3 images only.</p>

                                        {reviewFiles && reviewFiles.length > 0 && (
                                            <div className="flex gap-2 flex-wrap">
                                                {reviewFiles.map((f, i) => (
                                                    <div key={i} className="relative">
                                                        <div className="border border-dashed rounded flex flex-row items-center justify-center gap-2 px-3 h-10" style={{ borderColor: '#d1d5db', minWidth: '160px' }}>
                                                            <div className="w-6 h-6 flex items-center justify-center rounded bg-[#f7f7f7] overflow-hidden">
                                                                {f && f.type && f.type.startsWith('image/') ? (
                                                                    <img src={URL.createObjectURL(f)} alt={`uploaded preview ${i + 1}`} className="w-full h-full object-cover" onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} />
                                                                ) : (
                                                                    <img src="/logo-icon/image.svg" alt="file" className="w-4 h-4" />
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-600 italic text-center truncate" style={{ maxWidth: 120 }}>{f?.name || 'file'}</div>
                                                        </div>
                                                        <button type="button" className="absolute -top-2 -right-2 bg-white rounded-full p-1.5 border focus:outline-none focus:ring-0" onClick={() => removeReviewFileAt(i)} aria-label="Remove uploaded file">
                                                            <img src="/logo-icon/close.svg" alt="remove" className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {reviewUploadError && <div className="text-sm text-red-600 italic ml-2">{reviewUploadError}</div>}
                                </div>

                                <div className="flex items-center gap-3 justify-end">
                                    <button
                                        type="button"
                                        onClick={cancelReview}
                                        className="px-4 py-2 rounded border border-black bg-white justify-center  text-[#111233] font-semibold focus:outline-none focus:ring-0"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isSubmittingReview || !reviewRating}
                                        onClick={submitReview}
                                        className={`px-4 py-2 rounded bg-[#EF7D66] text-black font-semibold focus:outline-none focus:ring-0 ${(!reviewRating || isSubmittingReview) ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        {isSubmittingReview ? 'SUBMITTING...' : 'SUBMIT'}
                                    </button>
                                </div>
                            </div>
                            <div className="w-full mt-5">
                                <hr className="mt-2 border-t border-gray-300" />
                            </div>
                            <div className="pt-4">
                                <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium text-[#111233]">Filter by:</div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setStarFilterRating(0)}
                                            className={`px-3 py-1 text-sm rounded border ${starFilterRating === 0 ? 'bg-gray-200 text-gray-700 font-semibold border-gray-400' : 'bg-white text-gray-700 border-gray-300'} focus:outline-none focus:ring-0`}
                                        >
                                            All
                                        </button>
                                        {[5, 4, 3, 2, 1].map((rating) => (
                                            <button
                                                key={rating}
                                                type="button"
                                                onClick={() => setStarFilterRating(rating)}
                                                className={`px-3 py-1 text-sm rounded border flex items-center gap-1 ${starFilterRating === rating ? 'bg-gray-200 text-gray-700 font-semibold border-gray-400' : 'bg-white text-gray-700 border-gray-300'} focus:outline-none focus:ring-0`}
                                            >
                                                <svg className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3 .921-.755 1.688-1.54 1.118L10 15.347l-3.488 2.679c-.784 .57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                                                </svg>
                                                {rating}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {reviews && reviews.length > 0 && (
                <div className="max-w-[1200px] mx-auto w-full laptop:px-2 phone:p-2 tablet:p-2 mt-2">
                    <div className="border border-black mt-[-30px] rounded-md border-t-0 rounded-t-none p-4 tablet:p-6">
                        <div className="divide-y max-h-[60vh] overflow-y-auto pr-1">
                            {(starFilterRating === 0 ? reviews : reviews.filter(rev => Number(rev.rating) === starFilterRating)).length > 0 ? (
                                (starFilterRating === 0 ? reviews : reviews.filter(rev => Number(rev.rating) === starFilterRating)).map((rev) => {
                                const name = reviewAuthors[rev.user_id] || (rev?.user_id ? `User-${String(rev.user_id).slice(0, 8)}` : 'User');
                                const masked = maskName(name);
                                const created = parseReviewDate(rev.created_at);
                                const timeLabel = created ? formatTimeAgo(created) : '';
                                const isVerified = !!verifiedBuyerMap[rev.user_id];
                                const images = [rev.image_1_url, rev.image_2_url, rev.image_3_url].filter(Boolean);
                                return (
                                    <div key={rev.id} className="py-5">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs select-none">{(name || 'U').charAt(0)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-[14px] text-[#111233]">
                                                    <span className="font-semibold">{masked}</span>
                                                    {isVerified && (
                                                        <span className="text-[10px] uppercase tracking-wide bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">Verified</span>
                                                    )}
                                                </div>
                                                {timeLabel && (
                                                    <div className="text-[12px] text-gray-500 mt-0.5">{timeLabel}</div>
                                                )}
                                                <div className="mt-2 flex items-left  ml-[-50px] gap-1">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <svg key={i} className={`h-4 w-4 ${i < (Number(rev.rating)||0) ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill={i < (Number(rev.rating)||0) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3 .921-.755 1.688-1.54 1.118L10 15.347l-3.488 2.679c-.784 .57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                                                        </svg>
                                                    ))}
                                                </div>
                                                {rev.comment && (
                                                    <p className="mt-5 ml-[-50px] font-dm-sans text-[14px] text-[#111233] break-words">{rev.comment}</p>
                                                )}
                                                {images.length > 0 && (
                                                    <div className="mt-3 ml-[-50px] flex flex-wrap gap-2">
                                                        {images.map((src, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                className="block p-0 m-0 bg-transparent focus:outline-none focus:ring-0 w-20 h-20 aspect-square shrink-0 border border-black rounded"
                                                                onClick={() => openLightbox(images, idx)}
                                                                aria-label="Open image"
                                                            >
                                                                <img src={src} alt={`review-${rev.id}-${idx}`} className="w-full h-full object-cover" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })) : (
                                <div className="py-8 text-center">
                                    <p className="font-dm-sans text-gray-500">No helpful reviews.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isLightboxOpen && (
                <div
                    className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center"
                    role="dialog"
                    aria-modal="true"
                    onClick={closeLightbox}
                >
                    <button
                        type="button"
                        aria-label="Close"
                        className="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 focus:outline-none focus:ring-0"
                        onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
                    >
                        <img src="/logo-icon/close.svg" alt="close" className="w-5 h-5" />
                    </button>
                    {lightboxItems.length > 1 && (
                        <button
                            type="button"
                            aria-label="Previous image"
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-3 focus:outline-none focus:ring-0"
                            onClick={(e) => { e.stopPropagation(); prevLightbox(); }}
                        >
                            <img src="/logo-icon/arrow-left.svg" alt="prev" className="w-5 h-5" />
                        </button>
                    )}
                    <div className="w-screen h-screen flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <img src={lightboxItems[lightboxIdx]} alt="review full" className="max-w-screen max-h-screen w-auto h-auto object-contain" />
                    </div>
                    {lightboxItems.length > 1 && (
                        <button
                            type="button"
                            aria-label="Next image"
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-3 focus:outline-none focus:ring-0"
                            onClick={(e) => { e.stopPropagation(); nextLightbox(); }}
                        >
                            <img src="/logo-icon/arrow-right.svg" alt="next" className="w-5 h-5" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};


export default ButtonPin;
