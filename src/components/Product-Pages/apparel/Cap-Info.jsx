import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { UserAuth } from "../../../context/AuthContext";
import UploadDesign from '../../UploadDesign';


const Cap= () => {
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
    const [fromCart, setFromCart] = useState(false);
    const [editingCartId, setEditingCartId] = useState(null);
    const [stockInfo, setStockInfo] = useState(null);

    const slug = location.pathname.split('/').filter(Boolean).pop();

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

    // Detect navigation from cart (edit mode)
    useEffect(() => {
        if (location.state?.fromCart && location.state?.cartRow) {
            const cartRow = location.state.cartRow;
            setFromCart(true);
            setEditingCartId(cartRow.cart_id);
            if (cartRow.quantity) setQuantity(Number(cartRow.quantity) || 1);
        }
    }, [location.state]);

    // Restore variants via cart_id
    useEffect(() => {
        const restore = async () => {
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
                    const map = {};
                    data.cart_variants.forEach(cv => {
                        const pv = cv.product_variant_values; const vv = pv?.variant_values; if (!vv) return;
                        const groupId = vv.variant_group_id ?? vv.variant_groups?.variant_group_id; if (groupId == null) return;
                        map[String(groupId)] = {
                            id: pv.product_variant_value_id,
                            cart_variant_id: cv.cart_variant_id,
                            variant_value_id: pv.product_variant_value_id,
                            name: vv.value_name,
                            value: vv.value_name,
                            price: Number(cv.price ?? pv.price ?? 0)
                        };
                    });
                    if (Object.keys(map).length) setSelectedVariants(prev => ({ ...map, ...prev }));
                }
            } catch (e) { console.debug('[EditCart] Cap restore failed', e); }
        };
        restore();
    }, [fromCart, editingCartId]);

    // Guarded defaults
    useEffect(() => {
        if (!variantGroups || variantGroups.length === 0) return;
        setSelectedVariants(prev => {
            const next = { ...prev };
            for (let group of variantGroups) {
                if (next[group.id]) continue;
                const def = group.values.find(v => v.is_default) || group.values[0];
                if (def) next[group.id] = def;
            }
            return next;
        });
    }, [variantGroups]);

    // Fetch stock info based on selected variants
    useEffect(() => {
        const fetchStockInfo = async () => {
            if (!productId || !variantGroups.length) {
                setStockInfo(null);
                return;
            }
            // Only fetch if all groups are selected
            const variantIds = Object.values(selectedVariants)
                .map(v => v.id)
                .filter(Boolean);

            if (variantIds.length !== variantGroups.length) {
                setStockInfo(null);
                return;
            }

            // Sort for consistency (if your DB stores sorted arrays)
            const sortedVariantIds = [...variantIds].sort((a, b) => a - b);

            // 1. Find the matching combination
            const { data: combinations, error: combError } = await supabase
                .from('product_variant_combinations')
                .select('combination_id, variants')
                .eq('product_id', productId);

            if (combError) {
                setStockInfo(null);
                return;
            }

            // Find the combination where variants array matches exactly
            const match = (combinations || []).find(row => {
                if (!row.variants || row.variants.length !== sortedVariantIds.length) return false;
                // Compare arrays (order-insensitive)
                const a = [...row.variants].sort((x, y) => x - y);
                return a.every((v, i) => v === sortedVariantIds[i]);
            });

            if (!match) {
                setStockInfo(null);
                return;
            }

            // 2. Get inventory for this combination_id
            const { data: inventory, error: invError } = await supabase
                .from('inventory')
                .select('quantity, low_stock_limit')
                .eq('combination_id', match.combination_id)
                .eq('status', 'in_stock')
                .single();

            if (invError || !inventory) {
                setStockInfo(null);
                return;
            }

            setStockInfo(inventory);
        };

        fetchStockInfo();
    }, [productId, selectedVariants, variantGroups]);

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
                const bucketsToTry = ['accessoriesdecorations-images', 'apparel-images', '3d-prints-images', 'product-images', 'images', 'public'];
                for (const bucket of bucketsToTry) {
                    try {
                        const { data, error } = supabase.storage.from(bucket).getPublicUrl(cleanKey);
                        console.debug('[ShakerKeychain] getPublicUrl attempt', { bucket, cleanKey, data, error });
                        if (error) continue; // try next bucket
                        const url = data?.publicUrl || data?.publicURL || null;
                        // Supabase returns a publicUrl that ends with '/' when the object isn't found.
                        if (url && !url.endsWith('/')) {
                            if (isMounted) setImageSrc(url);
                            return;
                        }
                    } catch (err) {
                        console.warn('[ShakerKeychain] bucket attempt failed', { bucket, err });
                        // continue trying other buckets
                    }
                }

                // Last-resort fallback to local public asset
                if (isMounted) setImageSrc('/apparel-images/caps.png');
                console.warn('[ShakerKeychain] could not resolve imageKey to a public URL, using fallback', { imageKey });
            } catch (err) {
                console.error('Error resolving image public URL:', err);
                if (isMounted) setImageSrc('/apparel-images/caps.png');
            }
        };
        resolveImage();
        return () => { isMounted = false; };
    }, [imageKey]);

    // Build thumbnails: 1) main product image as first thumb, 2) caps-black/white/beige from apparel-images storage, 3) fallbacks
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

            // first thumbnail: ensure caps.png is always first
            results.push('/apparel-images/caps.png');

            // desired variant thumbnails
            const desired = ['caps-black', 'caps-gray', 'caps-beige'];
            for (const name of desired) {
                if (results.length >= 4) break;
                const url = await tryGetPublic('apparel-images', name);
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
                    const url = await tryGetPublic('apparel-images', cand);
                    if (url) results.push(url);
                }
            }

            // last-resort local fallbacks
            const fallbacks = ['/apparel-images/caps.png', '/apparel-images/caps-1.png', '/apparel-images/caps-2.png', '/logo-icon/logo.png'];
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

    useEffect(() => {
        let isMounted = true;
        const fetchReviews = async () => {
            if (!productId) return;
            setReviewsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('reviews')
                    .select('rating')
                    .eq('product_id', productId);

                if (!isMounted) return;
                if (error) {
                    console.warn('[Cap-Info] reviews query error:', error.message || error);
                    setReviewsAvailable(false);
                    setReviewsCount(0);
                    setAverageRating(null);
                } else if (Array.isArray(data) && data.length > 0) {
                    const ratings = data.map((r) => Number(r.rating) || 0);
                    const sum = ratings.reduce((a, b) => a + b, 0);
                    const avg = ratings.length ? sum / ratings.length : null;
                    setReviewsAvailable(true);
                    setReviewsCount(ratings.length);
                    setAverageRating(avg);
                } else {
                    setReviewsAvailable(true);
                    setReviewsCount(0);
                    setAverageRating(null);
                }
            } catch (err) {
                console.error('[Cap-Info] unexpected error fetching reviews:', err);
                setReviewsAvailable(false);
                setReviewsCount(0);
                setAverageRating(null);
            } finally {
                if (isMounted) setReviewsLoading(false);
            }
        };
        fetchReviews();
        return () => { isMounted = false; };
    }, [productId]);

    // Gallery navigation helpers: move to previous/next available thumbnail, wrapping around.
    const prevImage = () => {
        const valid = thumbnails.map((t, i) => t ? i : -1).filter(i => i >= 0);
        if (!valid.length) return;
        const current = valid.includes(activeThumb) ? activeThumb : valid[0];
        const idx = valid.indexOf(current);
        const prevIdx = valid[(idx - 1 + valid.length) % valid.length];
        setActiveThumb(prevIdx);
        if (thumbnails[prevIdx]) setImageSrc(thumbnails[prevIdx]);
    };

    const nextImage = () => {
        const valid = thumbnails.map((t, i) => t ? i : -1).filter(i => i >= 0);
        if (!valid.length) return;
        const current = valid.includes(activeThumb) ? activeThumb : valid[0];
        const idx = valid.indexOf(current);
        const nextIdx = valid[(idx + 1) % valid.length];
        setActiveThumb(nextIdx);
        if (thumbnails[nextIdx]) setImageSrc(thumbnails[nextIdx]);
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

        setIsAdding(true);

        try {
            const userId = session?.user?.id ?? await getCurrentUserId();
            if (!userId) {
                setCartError("Please sign in to add to cart");
                setIsAdding(false);
                navigate("/signin");
                return;
            }

            setCartError(null);
            setCartSuccess(null);

            // EDIT MODE path
            if (fromCart && editingCartId) {
                const variantPriceForCart = Object.values(selectedVariants || {}).reduce((acc, val) => acc + (Number(val?.price) || 0), 0);
                const unitPriceForCart = (sizeDimensions ? Number(calculateSizePrice()) : Number(price) || 0) + variantPriceForCart;
                const newTotal = (Number(unitPriceForCart) || 0) * Number(quantity || 0);
                const { error: updErr } = await supabase
                    .from('cart')
                    .update({
                        quantity: quantity,
                        total_price: newTotal,
                        base_price: Number(unitPriceForCart) || Number(price) || 0,
                        route: location?.pathname || `/${slug}`,
                        slug: slug || null,
                    })
                    .eq('cart_id', editingCartId)
                    .eq('user_id', userId);
                if (updErr) throw updErr;
                const { error: delErr } = await supabase.from('cart_variants').delete().eq('cart_id', editingCartId).eq('user_id', userId);
                if (delErr) throw delErr;
                const variantInserts = Object.entries(selectedVariants).map(([groupId, value]) => ({
                    cart_id: editingCartId,
                    user_id: userId,
                    cartvariant_id: value?.variant_value_id ?? value?.id ?? value,
                    price: Number(value?.price) || 0,
                }));
                if (variantInserts.length > 0) {
                    const { error: insErr } = await supabase.from('cart_variants').insert(variantInserts);
                    if (insErr) throw insErr;
                }
                try {
                    if (uploadedFileMetas && uploadedFileMetas.length > 0) {
                        const ids = uploadedFileMetas.map(m => m.id).filter(Boolean);
                        if (ids.length > 0) {
                            const { data: updData, error: updErr } = await supabase.from('uploaded_files').update({ cart_id: editingCartId }).in('file_id', ids);
                            if (updErr) console.warn('Failed to link uploaded_files (edit mode):', updErr);
                            else if ((updData?.length ?? 0) === 0) console.warn('No uploaded_files rows linked (edit mode) for ids:', ids);
                        }
                    }
                } catch (e) { console.warn('[EditCart] Cap attach files failed', e); }
                setCartSuccess('Cart item updated!');
                setTimeout(() => setCartSuccess(null), 2500);
                setIsAdding(false);
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
                        .update({
                            quantity: newQuantity,
                            total_price: newTotal,
                            base_price: Number(unitPriceForCart) || Number(price) || 0,
                            // store current route and slug so Cart can navigate back to the product page
                            route: location?.pathname || `/${slug}`,
                            slug: slug || null,
                        })
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
                            // include the product route and slug on the cart row
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

                // If there are uploaded file metas, attach them to the cart row by updating uploaded_files.cart_id
                try {
                    if (uploadedFileMetas && uploadedFileMetas.length > 0) {
                        const ids = uploadedFileMetas.map(m => m.id).filter(Boolean);
                        if (ids.length > 0) {
                            const { data: updData, error: updErr } = await supabase.from('uploaded_files').update({ cart_id: cartId }).in('file_id', ids);
                            if (updErr) console.warn('Failed to link uploaded_files:', updErr);
                            else if ((updData?.length ?? 0) === 0) console.warn('No uploaded_files rows linked for ids:', ids);
                        }
                    }
                } catch (e) {
                    console.warn('Failed to attach uploaded_files to cart row:', e);
                }
            }

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
    const incrementQuantity = () => setQuantity((q) => {
        const maxStock = stockInfo?.quantity || Infinity;
        return Math.min(q + 1, maxStock);
    });
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
                        <Link to="/Homepage" className="text-gray-600">Home </Link>/ <Link to="/apparel" className="text-gray-600">Apparel </Link>
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
                            <div className="flex items-center gap-2 text-gray-300" aria-hidden>
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
                        <div className="mt-2 text-sm">
                            {variantGroups.length === 0 || Object.keys(selectedVariants).length !== variantGroups.length ? (
                                <span className="text-gray-500">Select all variants to see stock.</span>
                            ) : stockInfo === null ? (
                                 <span className="text font-semibold">Checking stocks.</span>
                            ) : stockInfo.quantity > 0 ? (
                                <span className="text-green-700 font-semibold">Stock: {stockInfo.quantity}</span>
                            ) : (
                                <span className="text-red-600 font-semibold">Out of stock</span>
                            )}
                        </div>
                        {stockInfo && stockInfo.low_stock_limit && stockInfo.quantity > 0 && stockInfo.quantity <= stockInfo.low_stock_limit && (
                            <div className="text-xs text-yellow-600 mt-1">Hurry! Only {stockInfo.quantity} left in stock.</div>
                        )}
                        <hr className="mb-6" />

                        
                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">TECHNIQUE</div>
                            {techniqueGroup && (
                                <div className="flex flex-wrap gap-3">
                                    {techniqueGroup.values.map(val => {
                                        const isSelected = selectedVariants[techniqueGroup.id]?.id === val.id;
                                        if (techniqueGroup.input_type === 'color') {
                                            // color swatches should match the same square shape and checked UI as the main COLOR row
                                            const isHexColorTech = typeof val.value === 'string' && val.value.startsWith('#') && val.value.length === 7;
                                            const bgTech = isHexColorTech ? val.value : '#000000';

                                            const getLuminanceTech = (hex) => {
                                                try {
                                                    const r = parseInt(hex.slice(1,3), 16) / 255;
                                                    const g = parseInt(hex.slice(3,5), 16) / 255;
                                                    const b = parseInt(hex.slice(5,7), 16) / 255;
                                                    const srgb = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
                                                    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
                                                } catch (e) {
                                                    return 0;
                                                }
                                            };

                                            const lumTech = isHexColorTech ? getLuminanceTech(bgTech) : 0;

                                            return (
                                                <button key={val.id} type="button" onClick={() => selectVariant(techniqueGroup.id, val)}
                                                    title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                                    className={`relative w-8 h-8 rounded-none cursor-pointer flex items-center justify-center ${isSelected ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'}`}
                                                    style={{ backgroundColor: bgTech }}
                                                    aria-pressed={isSelected}
                                                >
                                                    {isSelected && (
                                                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                            <span className="w-5 h-5 rounded-none" style={{ backgroundColor: lumTech > 0.6 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.95)' }} />
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3 h-3 absolute" aria-hidden>
                                                                <path d="M20 6L9 17l-5-5" fill="none" stroke={lumTech > 0.6 ? '#fff' : '#111'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        } else {
                                            return (
                                                <button
                                                    type="button"
                                                    key={val.id}
                                                    className={`inline-flex items-center justify-center px-4 py-2 rounded-md ${isSelected ? 'bg-gray-200 text-gray-700 font-semibold border border-[#111233]' : 'bg-white text-[#111233] border border-[#111233]'}  focus:outline-none focus:ring-0`}
                                                    onClick={() => selectVariant(techniqueGroup.id, val)}
                                                >
                                                    {val.name}
                                                </button>
                                            );
                                        }
                                    })}
                                </div>
                            )}

                            </div>
                           {/* COLOR (from variant groups) */}
                         <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">COLOR</div>
                            {colorGroup && (
                                <div className="flex items-center gap-3">
                                    {colorGroup.values.map(val => {
                                        const isSelected = selectedVariants[colorGroup.id]?.id === val.id;
                                        const isHexColor = typeof val.value === 'string' && val.value.startsWith('#') && val.value.length === 7;
                                        const bg = isHexColor ? val.value : '#000000';

                                        // compute simple relative luminance to decide check color for contrast
                                        const getLuminance = (hex) => {
                                            try {
                                                const r = parseInt(hex.slice(1,3), 16) / 255;
                                                const g = parseInt(hex.slice(3,5), 16) / 255;
                                                const b = parseInt(hex.slice(5,7), 16) / 255;
                                                const srgb = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
                                                return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
                                            } catch (e) {
                                                return 0;
                                            }
                                        };

                                        const lum = isHexColor ? getLuminance(bg) : 0;
                                        const checkColor = lum > 0.6 ? '#111111' : '#ffffff';

                                        return (
                                            <button
                                                key={val.id}
                                                type="button"
                                                onClick={() => selectVariant(colorGroup.id, val)}
                                                title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                                className={`relative w-10 h-10 rounded-none cursor-pointer flex items-center justify-center focus:outline-none ${isSelected ? 'ring-2 ring-gray-300' : 'ring-1 ring-gray-300'}`}
                                                style={{ backgroundColor: bg }}
                                                aria-pressed={isSelected}
                                            >
                                                {isSelected && (
                                                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none ">
                                                        {/* small contrasting badge behind the check for readability */}
                                                        <span
                                                            className="w-5 h-5 rounded-none"
                                                           
                                                        />
                                                        <img
                                                            src={lum > 0.6 ? '/logo-icon/black-check.svg' : '/logo-icon/white-check.svg'}
                                                            alt="selected"
                                                            className="w-5 h-5 absolute "
                                                        />
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
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
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">UPLOAD DESIGN</div>
                            <UploadDesign productId={productId} session={session} />
                        </div>

                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">QUANTITY</div>
                            <div className="inline-flex items-center border border-black rounded">
                                <button type="button" className="px-3 bg-white text-black focus:outline-none focus:ring-0" onClick={decrementQuantity} aria-label="Decrease quantity" disabled={quantity <= 1}>-</button>
                                <input
                                    type="number"
                                    min={1}
                                    max={stockInfo?.quantity || undefined}
                                    value={quantity}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        const maxStock = stockInfo?.quantity || Infinity;
                                        setQuantity(isNaN(v) || v < 1 ? 1 : Math.min(v, maxStock));
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                    }}
                                    className="w-20 text-center px-2 text-black outline-none"
                                    aria-label="Quantity input"
                                />
                                <button type="button" className="px-3 bg-white text-black focus:outline-none focus:ring-0" onClick={incrementQuantity} aria-label="Increase quantity" disabled={quantity >= (stockInfo?.quantity || Infinity)}>+</button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={isAdding}
                                aria-busy={isAdding}
                                className={`bg-[#ef7d66] text-black py-3 rounded w-full tablet:w-[314px] font-semibold focus:outline-none focus:ring-0 ${isAdding ? 'opacity-60 pointer-events-none' : ''}`}
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
                <div className="border border-black rounded-md overflow-hidden p-6">
                    <h2 className="text-[32px] font-bold text-[#111233] inline-block pb-2">Customer Reviews</h2>

                    <div className="mt-4 flex items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-300" aria-hidden>
                            {Array.from({ length: 5 }).map((_, i) => {
                                const fillStar = reviewsAvailable && averageRating != null && (i < Math.round(averageRating));
                                return (
                                    <svg key={i} className="h-5 w-5" viewBox="0 0 20 20" fill={fillStar ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
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
            </div>
        </div>
    );
};


export default Cap;

