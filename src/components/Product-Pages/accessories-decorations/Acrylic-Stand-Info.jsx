import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { UserAuth } from "../../../context/AuthContext";
import UploadDesign from '../../UploadDesign';

const Acrylicstand = () => {
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
    const [editingCartId, setEditingCartId] = useState(null);
    const [fromCart, setFromCart] = useState(false);

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

    // Handle cart editing state
    useEffect(() => {
        if (location.state?.fromCart && location.state?.cartRow) {
            const cartRow = location.state.cartRow;
            setFromCart(true);
            setEditingCartId(cartRow.cart_id);
            setQuantity(cartRow.quantity || 1);

            // Prefill dimensions if available
            if (cartRow.length) setLength(cartRow.length);
            if (cartRow.width) setWidth(cartRow.width);
        }
    }, [location.state]);

    // Keep quantity in sync during edit session
    useEffect(() => {
        if (fromCart && location.state?.cartRow) {
            const q = Number(location.state.cartRow.quantity);
            if (q > 0 && q !== quantity) setQuantity(q);
        }
    }, [fromCart, location.state, quantity]);

    // Restore full cart details by cart_id
    useEffect(() => {
        const loadCartDetails = async () => {
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
                        ),
                        cart_dimensions ( length, width, price )
                    `)
                    .eq('cart_id', editingCartId)
                    .limit(1)
                    .single();
                if (error || !data) return;
                if (Number(data.quantity) > 0) setQuantity(Number(data.quantity));
                if (Array.isArray(data.cart_dimensions) && data.cart_dimensions.length > 0) {
                    const dim = data.cart_dimensions[0];
                    if (dim.length != null) setLength(Number(dim.length));
                    if (dim.width != null) setWidth(Number(dim.width));
                }
                if (Array.isArray(data.cart_variants)) {
                    const vMap = {};
                    data.cart_variants.forEach(cv => {
                        const pv = cv.product_variant_values; const vv = pv?.variant_values; if (!vv) return;
                        const groupId = (vv.variant_group_id ?? vv.variant_groups?.variant_group_id); if (groupId == null) return;
                        vMap[String(groupId)] = {
                            id: pv.product_variant_value_id,
                            cart_variant_id: cv.cart_variant_id,
                            variant_value_id: pv.product_variant_value_id,
                            name: vv.value_name,
                            value: vv.value_name,
                            price: Number(cv.price ?? pv.price ?? 0)
                        };
                    });
                    if (Object.keys(vMap).length) setSelectedVariants(vMap);
                }
            } catch (e) {
                console.debug('[EditCart] restore stand cart failed', e);
            }
        };
        loadCartDetails();
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
            results.push('/accessories-images/acrylic-stand.png');

            // desired variant thumbnails
            const desired = ['acrylic-stand-1', 'acrylic-stand-2', 'acrylic-stand-3'];
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
            const fallbacks = ['/accessories-images/acrylic-stand.png', '/accessories-images/acrylic-stand-1.png', '/accessories-images/acrylic-stand-2.png', '/logo-icon/logo.png'];
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

    // Cart UI state and Add-to-Cart logic (copied from BasicTBag-Info)
    const [cartError, setCartError] = useState(null);
    const [cartSuccess, setCartSuccess] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    const computedUnitPrice = (Number(price) || 0) + Object.values(selectedVariants).reduce((acc, val) => acc + (Number(val?.price) || 0), 0);

    const handleAddToCart = async () => {
        console.debug('[AcrylicStand] handleAddToCart invoked', { productId, sessionAvailable: !!session, quantity, selectedVariants, sizeDimensions });

        if (isAdding) return;

        if (!productId) {
            console.debug('[AcrylicStand] no productId, aborting add to cart');
            setCartError("No product selected");
            return;
        }

        setIsAdding(true);

        const userId = session?.user?.id ?? await getCurrentUserId();
        if (!userId) {
            console.debug('[AcrylicStand] user not signed in, redirecting to signin');
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

                // Update dimensions if applicable
                if (sizeDimensions) {
                    const { data: existingDims, error: fetchDimErr } = await supabase.from('cart_dimensions').select('*').eq('cart_id', editingCartId).limit(1);
                    if (fetchDimErr) console.debug('[Cart] fetch existing dimensions error', fetchDimErr);
                    if (existingDims && existingDims.length > 0) {
                        const { error: updDimErr } = await supabase.from('cart_dimensions').update({ length: Number(length) || 0, width: Number(width) || 0, price: Number(calculateSizePrice()) || 0 }).eq('cart_id', editingCartId);
                        if (updDimErr) console.debug('[Cart] failed updating cart_dimensions for existing cart', updDimErr);
                    } else {
                        const { error: insDimErr } = await supabase.from('cart_dimensions').insert([{ cart_id: editingCartId, dimension_id: null, length: Number(length) || 0, width: Number(width) || 0, price: Number(calculateSizePrice()) || 0, user_id: userId }]);
                        if (insDimErr) console.debug('[Cart] failed inserting cart_dimensions for existing cart', insDimErr);
                    }
                }

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

            // compute current per-unit price including size adjustments (if any) and selected variant prices
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
                // Build selectedVarSet but ignore synthetic/non-numeric ids (e.g., 'custom_size')
                const selectedVarIds = Object.values(selectedVariants || {}).map((val) => (val?.variant_value_id ?? val?.id ?? val));
                const selectedVarSet = new Set(selectedVarIds.reduce((acc, id) => {
                    const n = Number(id);
                    if (!isNaN(n) && Number.isFinite(n)) acc.push(String(n));
                    return acc;
                }, []));

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
                    // Upsert dimensions for existing cart if customizable size is present
                    try {
                        if (sizeDimensions) {
                            // Try to update an existing dimensions row first
                            const { data: existingDims, error: fetchDimErr } = await supabase.from('cart_dimensions').select('*').eq('cart_id', cartId).limit(1);
                            if (fetchDimErr) console.debug('[Cart] fetch existing dimensions error', fetchDimErr);
                            if (existingDims && existingDims.length > 0) {
                                const { error: updDimErr } = await supabase.from('cart_dimensions').update({ length: Number(length) || 0, width: Number(width) || 0, price: Number(calculateSizePrice()) || 0 }).eq('cart_id', cartId);
                                if (updDimErr) console.debug('[Cart] failed updating cart_dimensions for existing cart', updDimErr);
                            } else {
                                const { error: insDimErr } = await supabase.from('cart_dimensions').insert([{ cart_id: cartId, dimension_id: null, length: Number(length) || 0, width: Number(width) || 0, price: Number(calculateSizePrice()) || 0, user_id: userId }]);
                                if (insDimErr) console.debug('[Cart] failed inserting cart_dimensions for existing cart', insDimErr);
                            }
                        }
                    } catch (dimEx) {
                        console.debug('[Cart] error handling cart_dimensions for existing cart', dimEx);
                    }
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
                            // total_price must include size adjustments when applicable (unitPriceForCart already accounts for size + variants)
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

                // Only insert variants that have numeric IDs (skip synthetic custom_size/custom_base_size)
                const variantInserts = Object.entries(selectedVariants).map(([groupId, value]) => {
                    const rawId = value?.variant_value_id ?? value?.id ?? value;
                    const numericId = Number(rawId);
                    return {
                        cart_id: cartId,
                        user_id: userId,
                        cartvariant_id: numericId,
                        price: Number(value?.price) || 0,
                        _raw_id: rawId,
                    };
                }).filter(item => !isNaN(item.cartvariant_id) && Number.isFinite(item.cartvariant_id)).map(({_raw_id, ...keep}) => keep);
                // Log any skipped synthetic variants for debugging
                const skipped = Object.entries(selectedVariants || {}).map(([g, v]) => v?.variant_value_id ?? v?.id ?? v).filter(id => isNaN(Number(id)));
                if (skipped.length > 0) console.debug('[AcrylicStand] skipped synthetic variant ids when inserting cart_variants', { skipped });

                if (variantInserts.length > 0) {
                    console.debug('[AcrylicStand] inserting cart_variants', { cartId, variantInserts });
                    const { error: variantsError } = await supabase.from("cart_variants").insert(variantInserts);
                    if (variantsError) {
                        console.error('[AcrylicStand] cart_variants insert error', variantsError);
                        await supabase.from("cart").delete().eq("cart_id", cartId).eq("user_id", userId);
                        throw variantsError;
                    }
                    console.debug('[AcrylicStand] cart_variants inserted successfully');
                }
                // Insert customizable size into cart_dimensions if applicable
                try {
                    if (sizeDimensions) {
                        const { error: dimError } = await supabase.from('cart_dimensions').insert([{ 
                            cart_id: cartId,
                            // dimension_id can be null if not mapped to a predefined dimension
                            dimension_id: null,
                            length: Number(length) || 0,
                            width: Number(width) || 0,
                            price: Number(calculateSizePrice()) || 0,
                            user_id: userId,
                        }]);
                        if (dimError) {
                            // cleanup before throwing
                            await supabase.from('cart_variants').delete().eq('cart_id', cartId).eq('user_id', userId);
                            await supabase.from('cart').delete().eq('cart_id', cartId).eq('user_id', userId);
                            throw dimError;
                        }
                    }
                } catch (dimErr) {
                    throw dimErr;
                }
            }

            console.debug('[AcrylicStand] addToCart succeeded, cartId:', cartId);
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
    const incrementQuantity = () => setQuantity((q) => q + 1);
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
    const [baseSizeDimensions, setBaseSizeDimensions] = useState(null);
    const [length, setLength] = useState(0);
    const [width, setWidth] = useState(0);
    const [baseLength, setBaseLength] = useState(0);
    const [baseWidth, setBaseWidth] = useState(0);
    const incrementLength = () => {
        const inc = sizeDimensions?.length_increment ?? 0.1;
        const max = sizeDimensions?.max_length ?? Infinity;
        setLength(l => Math.min(max, Number((l + inc).toFixed(2))));
    };
    const decrementLength = () => {
        const inc = sizeDimensions?.length_increment ?? 0.1;
        const min = sizeDimensions?.min_length ?? 0;
        setLength(l => Math.max(min, Number((l - inc).toFixed(2))));
    };
    const incrementWidth = () => {
        const inc = sizeDimensions?.width_increment ?? 0.1;
        const max = sizeDimensions?.max_width ?? Infinity;
        setWidth(w => Math.min(max, Number((w + inc).toFixed(2))));
    };
    const decrementWidth = () => {
        const inc = sizeDimensions?.width_increment ?? 0.1;
        const min = sizeDimensions?.min_width ?? 0;
        setWidth(w => Math.max(min, Number((w - inc).toFixed(2))));
    };

    // Base size logic uses a separate baseSizeDimensions object when available
    // Increments for base length/width should prefer the length_increment/width_increment columns
    const incrementBaseLength = () => {
        // prefer explicit length_increment on the base row, else fall back to main size increment
        const inc = baseSizeDimensions?.length_increment ?? sizeDimensions?.length_increment ?? 0.1;
        const max = baseSizeDimensions?.max_base_length ?? sizeDimensions?.max_length ?? Infinity;
        setBaseLength(b => Math.min(max, Number((b + inc).toFixed(2))));
    };
    const decrementBaseLength = () => {
        const inc = baseSizeDimensions?.length_increment ?? sizeDimensions?.length_increment ?? 0.1;
        const min = baseSizeDimensions?.min_base_length ?? sizeDimensions?.min_length ?? 0;
        setBaseLength(b => Math.max(min, Number((b - inc).toFixed(2))));
    };
    const incrementBaseWidth = () => {
        const inc = baseSizeDimensions?.width_increment ?? sizeDimensions?.width_increment ?? 0.1;
        const max = baseSizeDimensions?.max_base_width ?? sizeDimensions?.max_width ?? Infinity;
        setBaseWidth(b => Math.min(max, Number((b + inc).toFixed(2))));
    };
    const decrementBaseWidth = () => {
        const inc = baseSizeDimensions?.width_increment ?? sizeDimensions?.width_increment ?? 0.1;
        const min = baseSizeDimensions?.min_base_width ?? sizeDimensions?.min_width ?? 0;
        setBaseWidth(b => Math.max(min, Number((b - inc).toFixed(2))));
    };
    const formatSize = (v) => (v == null ? 0 : v.toString());
    
    const calculateSizePrice = () => {
    const basePrice = price || 0;
    const lengthInc = sizeDimensions?.length_increment ?? 0.1;
    const widthInc = sizeDimensions?.width_increment ?? 0.1;
    const minLength = sizeDimensions?.min_length ?? 0;
    const minWidth = sizeDimensions?.min_width ?? 0;

    const baseLengthInc = baseSizeDimensions?.length_increment ?? sizeDimensions?.length_increment ?? lengthInc ?? 0.1;
    const baseWidthInc = baseSizeDimensions?.width_increment ?? sizeDimensions?.width_increment ?? widthInc ?? 0.1;
    const minBaseLength = baseSizeDimensions?.min_base_length ?? sizeDimensions?.min_length ?? 0;
    const minBaseWidth = baseSizeDimensions?.min_base_width ?? sizeDimensions?.min_width ?? 0;

    const lengthIncrements = Math.max(0, Math.floor(((length || 0) - minLength) / lengthInc));
    const widthIncrements = Math.max(0, Math.floor(((width || 0) - minWidth) / widthInc));
    const baseLengthIncrements = Math.max(0, Math.floor(((baseLength || 0) - minBaseLength) / baseLengthInc));
    const baseWidthIncrements = Math.max(0, Math.floor(((baseWidth || 0) - minBaseWidth) / baseWidthInc));
    const pricePerIncrement = 0.5; // placeholder until DB provides a rate
    return basePrice + (lengthIncrements + widthIncrements + baseLengthIncrements + baseWidthIncrements) * pricePerIncrement;
    };

    useEffect(() => {
        const base = calculateSizePrice();
        const variantPrice = Object.values(selectedVariants).reduce((acc, val) => acc + (val?.price || 0), 0);
        const total = (base + variantPrice) * (quantity || 1);
        setTotalPrice(total);
    }, [quantity, selectedVariants, length, width, baseLength, baseWidth, sizeDimensions, baseSizeDimensions, price]);
    

    // If there's no sizeGroup in the DB, sync custom numeric size into selectedVariants so cart receives it
    useEffect(() => {
        if (sizeGroup) return; // DB group exists — selectedVariants handled elsewhere
        // Only add when sizeDimensions available (i.e., customization allowed)
        if (!sizeDimensions) return;
        const formatted = `${length || 0}x${width || 0}`;
        const baseFormatted = `${baseLength || 0}x${baseWidth || 0}`;
        setSelectedVariants(prev => ({ 
            ...prev, 
            custom_size: { id: 'custom_size', name: 'Custom Size', value: formatted, price: 0 },
            custom_base_size: { id: 'custom_base_size', name: 'Custom Base Size', value: baseFormatted, price: 0 }
        }));
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
                // fetch standee/default rows for main dimensions (query only common columns first)
                const { data, error } = await supabase
                    .from('size_dimension_customizable')
                    .select('product_id, target, min_length, max_length, length_increment, min_width, max_width, width_increment')
                    .eq('product_id', productId);

                if (!isMounted) return;
                if (error) {
                    console.error('Error fetching size dimensions:', error);
                } else if (data && data.length > 0) {
                    const preferred = data.find(d => String(d.target || '').toLowerCase() === 'standee') || data.find(d => String(d.target || '').toLowerCase() === 'default') || data[0];
                    setSizeDimensions(preferred);
                    setLength(preferred.min_length || 0);
                    setWidth(preferred.min_width || 0);
                }

                // fetch base-specific row independently (request common columns — some schemas store base values on the same columns)
                const { data: baseData, error: baseError } = await supabase
                    .from('size_dimension_customizable')
                    .select('min_length, max_length, length_increment, min_width, max_width, width_increment, target')
                    .eq('product_id', productId)
                    .eq('target', 'base');

                if (!isMounted) return;
                if (baseError) {
                    console.error('Error fetching base dimensions:', baseError);
                } else if (Array.isArray(baseData) && baseData.length > 0) {
                    const b = baseData[0];
                    // map base row common columns into baseSizeDimensions so other logic can read length_increment/width_increment
                    const mapped = {
                        // prefer explicit length_increment/width_increment on base row
                        length_increment: b.length_increment,
                        width_increment: b.width_increment,
                        // map min_length/min_width to base min equivalents
                        min_base_length: b.min_length,
                        max_base_length: b.max_length,
                        min_base_width: b.min_width,
                        max_base_width: b.max_width,
                        target: b.target
                    };
                    setBaseSizeDimensions(mapped);
                    setBaseLength(mapped.min_base_length ?? (sizeDimensions?.min_length ?? 0));
                    setBaseWidth(mapped.min_base_width ?? (sizeDimensions?.min_width ?? 0));
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
                        <hr className="mb-6" />

                        {/* PRINTING (from variant groups) */}
                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">PRINTING</div>
                            {printingRow ? (
                                <div className="flex gap-3">
                                    {printingRow.values.map(val => {
                                        const isSelected = selectedVariants[printingRow.id]?.id === val.id;
                                        if ((printingRow.input_type || '').toLowerCase() === 'color') {
                                            const bg = String(val.value || '#000');
                                            return (
                                                <div
                                                    key={val.id}
                                                    className={`w-8 h-8 rounded-full cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'}`}
                                                    style={{ backgroundColor: bg }}
                                                    onClick={() => selectVariant(printingRow.id, val)}
                                                    title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                                />
                                            );
                                        }
                                        return (
                                            <button
                                                type="button"
                                                key={val.id}
                                                className={`px-4 py-2 rounded ${isSelected ? 'bg-gray-200 text-gray-500 font-bold border border-gray-500' : 'bg-white text-[#111233] border border-[#111233]'} focus:outline-none focus:ring-0`}
                                                onClick={() => selectVariant(printingRow.id, val)}
                                            >
                                                {val.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500">No printing options</div>
                            )}
                        </div>


                         <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">TECHNIQUE</div>
                            {techniqueGroup && (
                                <div className="flex flex-wrap gap-3">
                                    {techniqueGroup.values.map(val => {
                                        const isSelected = selectedVariants[techniqueGroup.id]?.id === val.id;
                                        if (techniqueGroup.input_type === 'color') {
                                            // keep color swatches small but centered within the grid cell
                                            return (
                                                <div key={val.id} className="flex items-center justify-center" onClick={() => selectVariant(techniqueGroup.id, val)}>
                                                    <div
                                                        className={`w-8 h-8 rounded-full cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'}`}
                                                        style={{ backgroundColor: val.value }}
                                                        title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                                    />
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <button
                                                    type="button"
                                                    key={val.id}
                                                    className={`inline-flex items-center justify-center px-4 py-2 rounded-md ${isSelected ? 'bg-gray-200 text-gray-700 font-semibold border border-[#111233]' : 'bg-white text-[#111233] border border-[#111233]'} hover:bg-gray-50 focus:outline-none focus:ring-0`}
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


                            <div className="mb-6">
                                {/* BASE / BACKING options (render under TECHNIQUE when available) */}
                                {baseGroup && (
                                    <div className="mt-3">
                                        <div className="text-[16px] font-semibold text-gray-700 mb-2">NUMBER OF STANDEE (FOR 1 BASE)</div>
                                        <div className="flex gap-3">
                                            {baseGroup.values.map(val => {
                                                const isSelected = selectedVariants[baseGroup.id]?.id === val.id;
                                                const isHexColor = String(val.value || '').startsWith('#') && String(val.value || '').length >= 4;
                                                if (baseGroup.input_type === 'color' || isHexColor) {
                                                    return (
                                                        <div
                                                            key={val.id}
                                                            className={`w-8 h-8 rounded-full cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'}`}
                                                            style={{ backgroundColor: isHexColor ? val.value : '#000000' }}
                                                            onClick={() => selectVariant(baseGroup.id, val)}
                                                            title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                                        />
                                                    );
                                                }
                                                return (
                                                    <button
                                                        type="button"
                                                        key={val.id}
                                                        className={`px-3 py-1 rounded ${isSelected ? 'bg-gray-200 text-gray-500 font-bold border border-gray-500' : 'bg-white text-[#111233] border border-[#111233]'} focus:outline-none focus:ring-0`}
                                                        onClick={() => selectVariant(baseGroup.id, val)}
                                                    >
                                                        {val.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                           <div className="mb-6">
                                {/* SIZE / CUSTOM SIZE (render under BASE when available) */}
                                {(sizeGroup || sizeDimensions) && (
                                    <div className="mt-3">
                                        <div className="text-[16px] font-semibold text-gray-700 mb-2">SIZE (CUSTOMIZABLE)</div>
                                        <div className="flex flex-wrap gap-2">
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

                                            {/* Numeric custom size controls: two rows with two controls each */}
                                            <div className="w-full">
                                                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                                    <div className="flex-1">
                                                        <label className="text-sm text-gray-700">Height (cm)</label>
                                                    </div>
                                                    <div className="inline-flex items-center border rounded-md overflow-hidden">
                                                        <button type="button" onClick={decrementWidth} className="px-3 py-1 bg-white text-black  focus:outline-none">-</button>
                                                        <div className="px-4 py-1 bg-white text-black min-w-[48px] text-center">{formatSize(width)}</div>
                                                        <button type="button" onClick={incrementWidth} className="px-3 py-1 bg-white text-black  focus:outline-none">+</button>
                                                    </div>
                                                    <div className="flex-1 text-right">
                                                        <label className="text-sm text-gray-700">Width (cm)</label>
                                                    </div>
                                                    <div className="inline-flex items-center border rounded-md overflow-hidden">
                                                        <button type="button" onClick={decrementBaseLength} className="px-3 py-1 bg-white text-black  focus:outline-none">-</button>
                                                        <div className="px-4 py-1 bg-white text-black min-w-[48px] text-center">{formatSize(baseLength)}</div>
                                                        <button type="button" onClick={incrementBaseLength} className="px-3 py-1 bg-white text-black  focus:outline-none">+</button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex-1">
                                                        <label className="text-sm text-gray-700">Base Length (cm)</label>
                                                    </div>
                                                    <div className="inline-flex items-center border rounded-md overflow-hidden">
                                                        <button type="button" onClick={decrementLength} className="px-3 py-1 bg-white text-black  focus:outline-none">-</button>
                                                        <div className="px-4 py-1 bg-white text-black min-w-[48px] text-center">{formatSize(length)}</div>
                                                        <button type="button" onClick={incrementLength} className="px-3 py-1 bg-white text-black  focus:outline-none">+</button>
                                                    </div>
                                                    <div className="flex-1 text-right">
                                                        <label className="text-sm text-gray-700">Base Width (cm)</label>
                                                    </div>
                                                    <div className="inline-flex items-center border rounded-md overflow-hidden">
                                                <button type="button" onClick={decrementBaseWidth} className="px-3 py-1 bg-white text-black  focus:outline-none">-</button>
                                                <div className="px-4 py-1 bg-white text-black min-w-[48px] text-center">{formatSize(baseWidth)}</div>
                                                <button type="button" onClick={incrementBaseWidth} className="px-3 py-1 bg-white text-black  focus:outline-none">+</button>
                                            </div>
                                                </div>
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
                                <div className="px-4 text-black" aria-live="polite">{quantity}</div>
                                <button type="button" className="px-3 bg-white text-black focus:outline-none focus:ring-0" onClick={incrementQuantity} aria-label="Increase quantity">+</button>
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
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Material: Acrylic</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Size: <span className="italic">Customizable</span></p></li>
                            <li>
                                <ul className="list-disc list-inside ml-4">
                                    <li className="m-0 font-normal text-black text-[16px] font-dm-sans">Minimum: 2.4 x 2.4 inches</li>
                                    <li className="m-0 font-normal text-black text-[16px] font-dm-sans">Maximum: 2.5 x 4 inches</li>
                                </ul>
                            </li>
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

export default Acrylicstand;