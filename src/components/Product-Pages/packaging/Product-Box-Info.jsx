import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { v4 as uuidv4 } from 'uuid';
import { UserAuth } from "../../../context/AuthContext";
import UploadDesign from '../../UploadDesign';

const ProductBox = () => {
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
    const [cartError, setCartError] = useState(null);
    const [cartSuccess, setCartSuccess] = useState(null);

    // upload design state (added for UploadDesign integration)
    const [uploadedFileMetas, setUploadedFileMetas] = useState([]);
    const [uploadResetKey, setUploadResetKey] = useState(0);
    const [showUploadUI, setShowUploadUI] = useState(true);
    const [fromCart, setFromCart] = useState(!!location.state?.fromCart);
    const [editingCartId, setEditingCartId] = useState(location.state?.cartRow?.cart_id || null);
    const [isAdding, setIsAdding] = useState(false);

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
                    console.warn('[Product-Box-Info] recently_viewed update error:', updError);
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
                    console.warn('[Product-Box-Info] recently_viewed insert error:', insError);
                } else {
                    hasLoggedViewRef.current = true;
                }
            } catch (err) {
                console.warn('[Product-Box-Info] recently_viewed log error:', err);
            }
        };
        logRecentlyViewed();
    }, [productId, session?.user?.id]);

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

    // Set initial selected variants to defaults
    useEffect(() => {
        const initial = {};
        for (let group of variantGroups) {
            const def = group.values.find(v => v.is_default) || group.values[0];
            if (def) initial[group.id] = def;
        }
        setSelectedVariants(initial);
    }, [variantGroups]);

    // Fetch stock info based on selected variants (Cap logic)
    useEffect(() => {
        const fetchStockInfo = async () => {
            if (!productId || !variantGroups.length) {
                setStockInfo(null);
                return;
            }
            const variantIds = Object.values(selectedVariants)
                .map(v => v?.id)
                .filter(Boolean);

            // Proceed when at least one relevant variant is selected (do not require all groups)
            if (variantIds.length === 0) {
                setStockInfo(null);
                return;
            }

            // Coerce to numbers for reliable comparison
            const sortedVariantIds = [...variantIds].map(n => Number(n)).sort((a, b) => a - b);

            const { data: combinations, error: combError } = await supabase
                .from('product_variant_combinations')
                .select('combination_id, variants')
                .eq('product_id', productId);

            if (combError) {
                setStockInfo(null);
                return;
            }

            // Find all candidate combinations that are a subset of the selected variant IDs
            const selectedSet = new Set(sortedVariantIds);
            const candidates = (combinations || []).filter(row => Array.isArray(row.variants) && row.variants.length > 0 && row.variants.every(v => selectedSet.has(Number(v))));

            if (!candidates || candidates.length === 0) {
                setStockInfo({ quantity: 0, low_stock_limit: 0 });
                return;
            }

            const combinationIds = candidates.map(c => c.combination_id);
            const { data: inventoryRows, error: invError } = await supabase
                .from('inventory')
                .select('quantity, low_stock_limit, status, combination_id')
                .in('combination_id', combinationIds);

            if (invError || !inventoryRows || inventoryRows.length === 0) {
                setStockInfo({ quantity: 0, low_stock_limit: 0 });
                return;
            }

            const totalQty = (inventoryRows || []).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
            const lowLimit = (inventoryRows && inventoryRows[0] && typeof inventoryRows[0].low_stock_limit === 'number') ? inventoryRows[0].low_stock_limit : 0;
            setStockInfo({ quantity: totalQty, low_stock_limit: lowLimit });
        };

        fetchStockInfo();
    }, [productId, selectedVariants, variantGroups]);

    // Clamp quantity when stock changes
    useEffect(() => {
        if (stockInfo && typeof stockInfo.quantity === 'number') {
            setQuantity(q => {
                if (stockInfo.quantity <= 0) return q;
                return Math.min(q, stockInfo.quantity);
            });
        }
    }, [stockInfo?.quantity]);

    // Resolve imageKey to a public URL (robust: accepts full urls, leading slashes, and tries common buckets)
    useEffect(() => {
        let isMounted = true;
        const resolveImage = async () => {
            // If imageKey is not provided, prefer the packaging-image bucket's mailer-box.png
            if (!imageKey) {
                try {
                    const { data } = supabase.storage.from('packaging-image').getPublicUrl('mailer-box.png');
                    const url = data?.publicUrl;
                    if (url && !url.endsWith('/')) {
                        if (isMounted) setImageSrc(url);
                        return;
                    }
                } catch (err) {
                    // ignore and fall back to defaults
                }
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

                // Try buckets in order; include sinage-posters-images first for retractable banners
                const bucketsToTry = ['packaging-images', 'product-images', 'cards-stickers-images', 'accessoriesdecorations-images', 'apparel-images', '3d-prints-images', 'images', 'public'];
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
                if (isMounted) setImageSrc('/logo-icon/logo.png');
                console.warn('[ShakerKeychain] could not resolve imageKey to a public URL, using fallback', { imageKey });
            } catch (err) {
                console.error('Error resolving image public URL:', err);
                if (isMounted) setImageSrc('/logo-icon/logo.png');
            }
        };
        resolveImage();
        return () => { isMounted = false; };
    }, [imageKey]);

    // Build thumbnails for Product-Box
    useEffect(() => {
        let isMounted = true;
        const tryGetPublic = async (bucket, keyBase) => {
            const exts = ['.png', '.jpg', '.jpeg', '.webp'];
            for (const ext of exts) {
                try {
                    const { data } = supabase.storage.from(bucket).getPublicUrl(keyBase + ext);
                    const url = data?.publicUrl || data?.publicURL;
                    if (url && !url.endsWith('/')) {
                        try { const head = await fetch(url, { method: 'HEAD' }); if (head.ok) return url; } catch (_) {}
                    }
                } catch (_) {}
            }
            return null;
        };
        const buildThumbnails = async () => {
            const results = [];
            results.push('/packaging/product-box.png');
            for (const base of ['product-box-1','product-box-2','product-box-3']) {
                if (results.length >= 4) break;
                const url = await tryGetPublic('packaging-images', base);
                if (url) results.push(url);
            }
            if (results.length < 4 && imageKey) {
                const key = String(imageKey).replace(/^\/+/, '');
                const m = key.match(/(.+?)\.(png|jpg|jpeg|webp|gif)$/i);
                const base = m ? m[1] : key;
                for (const suf of ['-1','-2','-3']) {
                    if (results.length >= 4) break;
                    const url = await tryGetPublic('packaging-images', base + suf);
                    if (url) results.push(url);
                }
            }
            for (const f of ['/packaging/product-box.png','/packaging/product-box-1.png','/packaging/product-box-2.png','/logo-icon/logo.png']) {
                if (results.length >= 4) break;
                try { const r = await fetch(f, { method: 'HEAD' }); if (r.ok) results.push(f); } catch (_) {}
            }
            if (!isMounted) return;
            const seen = new Set(); const ordered = [];
            for (const u of results) { if (u && !seen.has(u)) { seen.add(u); ordered.push(u); } }
            let padded = ordered.slice(0,4); while (padded.length < 4) padded.push(undefined);
            setThumbnails(padded);
            setActiveThumb(prev => padded[prev] ? prev : (padded.findIndex(Boolean) === -1 ? 0 : padded.findIndex(Boolean)));
            const idx = padded.findIndex(Boolean); if (idx >= 0 && !imageSrc) setImageSrc(padded[idx]);
        };
        buildThumbnails();
        return () => { isMounted = false; };
    }, [imageKey, imageSrc]);

    const prevImage = () => {
        const valid = thumbnails.map((t,i)=>t?i:-1).filter(i=>i>=0);
        if (!valid.length) return;
        const current = valid.includes(activeThumb)?activeThumb:valid[0];
        const idx = valid.indexOf(current);
        const prevIdx = valid[(idx-1+valid.length)%valid.length];
        setActiveThumb(prevIdx);
        if (thumbnails[prevIdx]) setImageSrc(thumbnails[prevIdx]);
    };
    const nextImage = () => {
        const valid = thumbnails.map((t,i)=>t?i:-1).filter(i=>i>=0);
        if (!valid.length) return;
        const current = valid.includes(activeThumb)?activeThumb:valid[0];
        const idx = valid.indexOf(current);
        const nextIdx = valid[(idx+1)%valid.length];
        setActiveThumb(nextIdx);
        if (thumbnails[nextIdx]) setImageSrc(thumbnails[nextIdx]);
    };

    // Cart editing: detect if coming from cart and restore state
    useEffect(() => {
        if (location?.state?.fromCart && location?.state?.cartId) {
            setFromCart(true);
            setEditingCartId(location.state.cartId);
        }
    }, [location?.state]);

    // Cart editing: restore variants and quantity from cart data
    useEffect(() => {
        if (!fromCart || !editingCartId) return;

        const restoreCartData = async () => {
            try {
                // Fetch cart data
                const { data: cartData, error: cartError } = await supabase
                    .from('cart')
                    .select('quantity, total_price')
                    .eq('cart_id', editingCartId)
                    .single();

                if (cartError) throw cartError;

                // Set quantity from cart
                if (cartData.quantity) {
                    setQuantity(cartData.quantity);
                }

                // Fetch and set variants
                const { data: cartVariants, error: varError } = await supabase
                    .from('cart_variants')
                    .select(`
                        cartvariant_id,
                        variant_values (
                            id,
                            name,
                            price,
                            variant_groups (
                                id,
                                name
                            )
                        )
                    `)
                    .eq('cart_id', editingCartId);

                if (varError) throw varError;

                const restoredVariants = {};
                (cartVariants || []).forEach(cv => {
                    if (cv.variant_values?.variant_groups?.id) {
                        restoredVariants[cv.variant_values.variant_groups.id] = {
                            ...cv.variant_values,
                            variant_value_id: cv.cartvariant_id
                        };
                    }
                });
                setSelectedVariants(restoredVariants);
            } catch (err) {
                console.error('Error restoring cart data:', err);
            }
        };

        restoreCartData();
    }, [fromCart, editingCartId]);

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

    // Handle Add to Cart (copied/adapted from BasicTBag)
    // Handle Add to Cart (copied/adapted from BasicTBag)
    const handleAddToCart = async () => {
        if (isAdding) return;

        if (!productId) {
            setCartError("No product selected");
            return;
        }

        setIsAdding(true);

        const userId = session?.user?.id ?? await getCurrentUserId();
        if (!userId) {
            setCartError("Please sign in to add to cart");
            setIsAdding(false);
            navigate("/signin");
            return;
        }

        setCartError(null);
        setCartSuccess(null);

        try {
            let cartId;

            // Handle cart editing case
            if (fromCart && editingCartId) {
                // Update existing cart row
                const { error: updateError } = await supabase
                    .from("cart")
                    .update({ 
                        quantity: quantity,
                        total_price: totalPrice,
                        base_price: Number(unitPrice) || Number(price) || 0,
                        route: location?.pathname || `/${slug}`,
                        slug: slug || null,
                    })
                    .eq("cart_id", editingCartId)
                    .eq("user_id", userId);

                if (updateError) throw updateError;

                // Delete existing variants and insert new ones
                await supabase.from("cart_variants").delete().eq("cart_id", editingCartId).eq("user_id", userId);

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

                cartId = editingCartId;
            } else {
                // Original logic for adding new items
                const { data: existingCarts, error: checkError } = await supabase
                    .from("cart")
                    .select("cart_id, quantity, total_price")
                    .eq("user_id", userId)
                    .eq("product_id", productId);

                if (checkError) throw checkError;

                let cartMatched = false;

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
                        const newTotal = (Number(unitPrice) || 0) * newQuantity;
                        const { error: updateError } = await supabase
                            .from("cart")
                            .update({ quantity: newQuantity, total_price: newTotal, base_price: Number(unitPrice) || Number(price) || 0, route: location?.pathname || `/${slug}`, slug: slug || null })
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
                                base_price: Number(unitPrice) || Number(price) || 0,
                                total_price: totalPrice,
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
            }

            if (fromCart) {
                setCartSuccess("Cart updated!");
                setTimeout(() => {
                    navigate('/cart');
                }, 1000);
            } else {
                setCartSuccess("Item added to cart!");
                setTimeout(() => setCartSuccess(null), 3000);
            }

            // Dispatch a window-level event so UploadDesign (if mounted) can attach any pending uploads
            window.dispatchEvent(new CustomEvent('cart-created', { detail: { cartId } }));

            // Fallback: if uploadedFileMetas exists in this parent, try to attach by ids (try file_id and id columns)
            try {
                if (uploadedFileMetas && uploadedFileMetas.length > 0) {
                    try {
                        const { error: attachError1 } = await supabase
                            .from('uploaded_files')
                            .update({ cart_id: cartId })
                            .in('file_id', uploadedFileMetas.map(m => m.file_id).filter(Boolean));
                        if (attachError1) console.warn('Failed to attach by file_id:', attachError1);
                    } catch (fb) {
                        console.warn('Fallback attach by file_id failed:', fb);
                    }
                    try {
                        const { error: attachError2 } = await supabase
                            .from('uploaded_files')
                            .update({ cart_id: cartId })
                            .in('id', uploadedFileMetas.map(m => m.id).filter(Boolean));
                        if (attachError2) console.warn('Failed to attach by id:', attachError2);
                    } catch (fb) {
                        console.warn('Fallback attach by id failed:', fb);
                    }
                }
            } catch (e) {
                console.warn('Failed to attach uploaded_files to cart row (Product-Box):', e);
            }

            // Reset UploadDesign to clear thumbnails while keeping the upload UI visible
            try { setUploadResetKey(k => (k || 0) + 1); } catch (e) { /* no-op if reset key missing */ }
            try { setShowUploadUI(true); } catch (e) { /* no-op if showUploadUI missing */ }
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
    const [reviews, setReviews] = useState([]);
    const [reviewsCount, setReviewsCount] = useState(0);
    const [averageRating, setAverageRating] = useState(null);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsAvailable, setReviewsAvailable] = useState(false);
    const [reviewAuthors, setReviewAuthors] = useState({});
    const [verifiedBuyerMap, setVerifiedBuyerMap] = useState({});
    const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHoverRating, setReviewHoverRating] = useState(null);
    const [reviewText, setReviewText] = useState('');
    const [reviewFiles, setReviewFiles] = useState([]);
    const [reviewUploadError, setReviewUploadError] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxItems, setLightboxItems] = useState([]);
    const [lightboxIdx, setLightboxIdx] = useState(0);
    const reviewFileInputRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        const fetchReviews = async () => {
            if (!productId) return;
            console.log('[Product-Box-Info] fetching reviews for product:', productId);
            setReviewsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('user_reviews')
                    .select(`
                        id,
                        user_id,
                        rating,
                        comment,
                        image_1_url,
                        image_2_url,
                        image_3_url,
                        created_at
                    `)
                    .eq('product_id', productId)
                    .order('created_at', { ascending: false });

                if (!isMounted) return;
                if (error) {
                    const missing = (String(error?.message || '').toLowerCase().includes('does not exist') || String(error?.details || '').toLowerCase().includes('does not exist'));
                    if (!missing) {
                        console.warn('[Product-Box-Info] reviews query error:', error.message || error);
                    }
                    setReviewsAvailable(false);
                    setReviews([]);
                    setReviewsCount(0);
                    setAverageRating(null);
                    setReviewAuthors({});
                    setVerifiedBuyerMap({});
                } else if (Array.isArray(data) && data.length > 0) {
                    console.log('[Product-Box-Info] fetched reviews:', data.length);
                    setReviews(data);
                    setReviewsCount(data.length);
                    const ratings = data.map((r) => Number(r.rating) || 0);
                    const sum = ratings.reduce((a, b) => a + b, 0);
                    const avg = ratings.length ? sum / ratings.length : null;
                    setAverageRating(avg);
                    setReviewsAvailable(true);

                    // Fetch user names and verified buyer status
                    const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))];
                    if (userIds.length > 0) {
                        try {
                            const { data: profiles, error: profilesError } = await supabase
                                .from('profiles')
                                .select('id, full_name')
                                .in('id', userIds);

                            if (!profilesError && profiles) {
                                const authors = {};
                                profiles.forEach(p => {
                                    authors[p.id] = p.full_name || `User-${String(p.id).slice(0, 8)}`;
                                });
                                setReviewAuthors(authors);
                            }
                        } catch (err) {
                            console.warn('[Product-Box-Info] failed to fetch user profiles:', err);
                        }

                        // Check verified buyers
                        try {
                            const { data: orders, error: ordersError } = await supabase
                                .from('order_items')
                                .select('user_id')
                                .eq('product_id', productId)
                                .in('user_id', userIds);

                            if (!ordersError && orders) {
                                const verifiedMap = {};
                                orders.forEach(o => {
                                    verifiedMap[o.user_id] = true;
                                });
                                setVerifiedBuyerMap(verifiedMap);
                            }
                        } catch (err) {
                            console.warn('[Product-Box-Info] failed to check verified buyers:', err);
                        }
                    }
                } else {
                    console.log('[Product-Box-Info] no reviews found');
                    setReviewsAvailable(true);
                    setReviews([]);
                    setReviewsCount(0);
                    setAverageRating(null);
                    setReviewAuthors({});
                    setVerifiedBuyerMap({});
                }
            } catch (err) {
                console.error('[Product-Box-Info] unexpected error fetching reviews:', err);
                setReviewsAvailable(false);
                setReviews([]);
                setReviewsCount(0);
                setAverageRating(null);
                setReviewAuthors({});
                setVerifiedBuyerMap({});
            } finally {
                if (isMounted) setReviewsLoading(false);
            }
        };
        fetchReviews();
        return () => { isMounted = false; };
    }, [productId]);

    // Helper functions for reviews
    const maskName = (name) => {
        if (!name || name.length <= 2) return name;
        const first = name.charAt(0);
        const last = name.charAt(name.length - 1);
        const middle = '*'.repeat(name.length - 2);
        return first + middle + last;
    };

    const parseReviewDate = (dateStr) => {
        if (!dateStr) return null;
        try {
            return new Date(dateStr);
        } catch {
            return null;
        }
    };

    const formatTimeAgo = (date) => {
        if (!date) return '';
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    // Review form handlers
    const openReviewForm = () => {
        if (!session?.user) {
            alert('Please log in to write a review.');
            return;
        }
        setIsReviewFormOpen(true);
    };

    const cancelReview = () => {
        setIsReviewFormOpen(false);
        setReviewRating(0);
        setReviewHoverRating(null);
        setReviewText('');
        setReviewFiles([]);
        setReviewUploadError('');
        if (reviewFileInputRef.current) {
            reviewFileInputRef.current.value = '';
        }
    };

    const onPickReviewFiles = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length + (reviewFiles?.length || 0) > 3) {
            setReviewUploadError('Maximum 3 images allowed');
            return;
        }
        const validFiles = [];
        const errors = [];
        files.forEach(f => {
            if (!f.type.startsWith('image/')) {
                errors.push(`${f.name} is not an image`);
                return;
            }
            if (f.size > 5 * 1024 * 1024) {
                errors.push(`${f.name} is too large (max 5MB)`);
                return;
            }
            validFiles.push(f);
        });
        if (errors.length > 0) {
            setReviewUploadError(errors.join('; '));
        } else {
            setReviewUploadError('');
        }
        setReviewFiles(prev => [...(prev || []), ...validFiles]);
    };

    const removeReviewFileAt = (idx) => {
        setReviewFiles(prev => prev.filter((_, i) => i !== idx));
        setReviewUploadError('');
    };

    const submitReview = async () => {
        if (!session?.user || !reviewRating) return;
        setIsSubmittingReview(true);
        try {
            const uploadUrls = [];
            if (reviewFiles && reviewFiles.length > 0) {
                for (const file of reviewFiles) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${uuidv4()}.${fileExt}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('reviews')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;
                    const { data: urlData } = supabase.storage
                        .from('reviews')
                        .getPublicUrl(fileName);
                    uploadUrls.push(urlData.publicUrl);
                }
            }

            const reviewData = {
                user_id: session.user.id,
                product_id: productId,
                rating: reviewRating,
                comment: reviewText.trim() || null,
                image_1_url: uploadUrls[0] || null,
                image_2_url: uploadUrls[1] || null,
                image_3_url: uploadUrls[2] || null,
            };

            const { error: insertError } = await supabase
                .from('user_reviews')
                .insert(reviewData);

            if (insertError) throw insertError;

            // Refresh reviews
            const { data: newReviews } = await supabase
                .from('user_reviews')
                .select(`
                    id,
                    user_id,
                    rating,
                    comment,
                    image_1_url,
                    image_2_url,
                    image_3_url,
                    created_at
                `)
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (newReviews) {
                setReviews(newReviews);
                setReviewsCount(newReviews.length);
                const ratings = newReviews.map((r) => Number(r.rating) || 0);
                const sum = ratings.reduce((a, b) => a + b, 0);
                const avg = ratings.length ? sum / ratings.length : null;
                setAverageRating(avg);
            }

            cancelReview();
            alert('Review submitted successfully!');
        } catch (err) {
            console.error('[Product-Box-Info] failed to submit review:', err);
            alert('Failed to submit review. Please try again.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // Lightbox handlers
    const openLightbox = (images, idx) => {
        setLightboxItems(images);
        setLightboxIdx(idx);
        setIsLightboxOpen(true);
    };

    const closeLightbox = () => {
        setIsLightboxOpen(false);
        setLightboxItems([]);
        setLightboxIdx(0);
    };

    const nextLightbox = () => {
        setLightboxIdx(prev => (prev + 1) % lightboxItems.length);
    };

    const prevLightbox = () => {
        setLightboxIdx(prev => (prev - 1 + lightboxItems.length) % lightboxItems.length);
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

    const [totalPrice, setTotalPrice] = useState(0);
    const unitPrice = (Number(price) || 0) + Object.values(selectedVariants).reduce((acc, val) => acc + (Number(val?.price) || 0), 0);

    useEffect(() => {
        const base = (price || 0);
        const variantPrice = Object.values(selectedVariants).reduce((acc, val) => acc + (val?.price || 0), 0);
        setTotalPrice((base + variantPrice) * (quantity || 1));
    }, [price, selectedVariants, quantity]);

    const printingGroup = variantGroups.find(g => g.name.toUpperCase() === 'PRINTING');
    const colorGroup = variantGroups.find(g => g.name.toUpperCase() === 'COLOR');
    // Also support common plural forms for group names
    const sizeGroup = variantGroups.find(g => ['SIZE', 'SIZES'].includes(String(g.name).toUpperCase()));
    // Technique group: support TECHNIQUE alias and common variants
    const techniqueGroup = variantGroups.find(g => {
        const n = String(g.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return n === 'TECHNIQUE' || n === 'TECHNIQUES' || n === 'PRINTMETHOD' || n.includes('PRINT');
    });
    const materialGroup = variantGroups.find(g => ['MATERIAL', 'MATERIALS'].includes(String(g.name).toUpperCase()));
    // Trim group: find any variant group whose name includes 'TRIM' (e.g., 'Trim Color', 'Trim')
    const trimGroup = variantGroups.find(g => String(g.name).toUpperCase().includes('TRIM'));

    // Hole group (some products have HOLE / HOLES / PUNCH variants)
    const holeGroup = variantGroups.find(g => {
        const n = String(g.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return n === 'HOLE' || n === 'HOLES' || n.includes('PUNCH') || n.includes('HOLE');
    });

    // Quantity group (QUANTITY / QTY / PACK / PACKS)
    const quantityGroup = variantGroups.find(g => {
        const n = String(g.name || '').toUpperCase();
        return n === 'PIECES' || n === 'QTY' || n.includes('PACK') || n.includes('QUANT');
    });

    

    return (
        <div className="font-dm-sans w-full bg-cover bg-white phone:pt-[210px] tablet:pt-[220px] laptop:pt-[161px] phone:pb-40 tablet:pb-32 laptop:pb-24 z-0">
            <div className="max-w-[1201px] mx-auto mt-8 flex flex-col">
                <div className="phone:p-2 tablet:p-2">
                    <p className="pt-5 font-dm-sans">
                        <Link to="/Homepage" className="text-gray-600">Home </Link>/ <Link to="/Packaging" className="text-gray-600">Packaging </Link>
                    </p>
                </div>

                <div className="flex flex-col tablet:flex-row laptop:gap-2 tablet:gap-[50px] phone:p-2 tablet:p-2 justify-center w-full items-stretch">
                    {/* Left: Gallery */}
                    <div className="bg-white w-full tablet:w-[573px] h-auto">
                        <div className="rounded-md p-6 h-full flex flex-col">
                            <div className="relative w-full h-64 tablet:h-[480px] flex-1 flex items-center justify-center bg-[#f7f7f7]">
                                <img
                                    src={imageSrc || "/logo-icon/logo.png"}
                                    alt=""
                                    className="w-full max-h-64 tablet:max-h-[420px] object-contain"
                                    onError={(e) => {
                                        console.debug('[ShakerKeychain] main image failed to load, src=', e.target.src);
                                        // try resolving fallback from supabase buckets directly
                                        try {
                                            const { data } = supabase.storage.from('apparel-images').getPublicUrl('logo.png');
                                            if (data?.publicUrl && !data.publicUrl.endsWith('/')) e.target.src = data.publicUrl;
                                            else e.target.src = '/logo-icon/logo.png';
                                        } catch (err) {
                                            e.target.src = '/logo-icon/logo.png';
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

                            <div className="mt-4 grid grid-cols-4 gap-3">
                                {thumbnails.map((src,i)=> (
                                    <button key={i} type="button" className={`h-[135px] w-[120px] border rounded p-2 bg-[#f7f7f7] flex items-center justify-center focus:outline-none ${i===activeThumb?'ring-2 ring-black':''}`} onClick={()=>{ if(src){ setActiveThumb(i); setImageSrc(src); } }} disabled={!src} aria-label={`Thumbnail ${i+1}`}>
                                        {src ? <img src={src} alt="Thumbnail" className="object-contain h-full w-full" /> : <div className="h-full w-full" aria-hidden />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Details */}
                    <div className="border border-black rounded-md p-6 w-full tablet:w-[601px] h-[732px] flex flex-col overflow-y-auto pr-2">
                        <h1 className="text-[36px] font-bold text-[#111233] mt-4  mb-2">{loading ? "" : productName}</h1>
                        {/*stars*/}
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
                            <div className="text-sm text-black">
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
                            <p className="italic text-black text-[12px]">Shipping calculated at checkout.</p>
                        </div>
                        {/* Stock status (moved just under shipping note) */}
                        <div className="mb-2">
                            {Object.values(selectedVariants).filter(v => v?.id).length > 0 ? (
                                stockInfo ? (
                                    stockInfo.quantity === 0 ? (
                                        <span className="text-red-600 font-semibold">Out of Stocks</span>
                                    ) : stockInfo.quantity <= 5 ? (
                                        <span className="text-yellow-600 font-semibold">Low on Stocks: {stockInfo.quantity}</span>
                                    ) : (
                                        <span className="text-green-700 font-semibold">Stock: {stockInfo.quantity}</span>
                                    )
                                ) : (
                                    <span className="text font-semibold">Checking stocks.</span>
                                )
                            ) : (
                                <span className="text-gray-500">Select all variants to see stock.</span>
                            )}
                        </div>
                        <hr className="mb-6" />

            

                       
                        

                        {/* SIZE selection */}
                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">SIZE</div>
                            {sizeGroup && (
                                <div className="flex flex-wrap gap-3">
                                    
                                    {(() => {
                                        // Order sizes explicitly by numeric inches: 1, 1.5, 2, 2.5, 3, 3.5, 4
                                        const parseInches = (s) => {
                                            if (!s) return Number.POSITIVE_INFINITY;
                                            const m = String(s).match(/(\d+(?:\.\d+)?)/);
                                            if (!m) return Number.POSITIVE_INFINITY;
                                            return Number(m[1]);
                                        };
                                        const ordered = (sizeGroup.values || []).slice().sort((a, b) => parseInches(a.name) - parseInches(b.name));
                                        return ordered.map(val => {
                                            const isSelected = selectedVariants[sizeGroup.id]?.id === val.id;
                                            return (
                                                <button
                                                    type="button"
                                                    key={val.id}
                                                    className={`px-3 py-2 rounded ${isSelected ? 'bg-gray-200 text-gray-500 font-bold border border-gray-500' : 'bg-white text-[#111233] border border-[#111233]'} focus:outline-none focus:ring-0`}
                                                    onClick={() => selectVariant(sizeGroup.id, val)}
                                                >
                                                    {val.name}
                                                </button>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                            
                        </div>


                        

                        {/* QUANTITY selection (under SIZE) */}
                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">QUANTITY (THE PURCHASE UNIT IS 10 PIECES)</div>
                            {quantityGroup && (
                                <div className="flex flex-wrap gap-3">
                                    {quantityGroup.values.map(val => {
                                        const isSelected = selectedVariants[quantityGroup.id]?.id === val.id;
                                        return (
                                            <button
                                                type="button"
                                                key={val.id}
                                                className={`px-3 py-2 rounded ${isSelected ? 'bg-gray-200 text-gray-500 font-bold border border-gray-500' : 'bg-white text-[#111233] border border-[#111233]'} focus:outline-none focus:ring-0`}
                                                onClick={() => selectVariant(quantityGroup.id, val)}
                                            >
                                                {val.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>


                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">UPLOAD DESIGN</div>
                            <UploadDesign
                                key={uploadResetKey}
                                productId={productId}
                                session={session}
                                hidePreviews={!showUploadUI}
                                isEditMode={fromCart && !!editingCartId}
                                cartId={fromCart ? editingCartId : null}
                                setUploadedFileMetas={setUploadedFileMetas}
                            />
                        </div>


                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">QUANTITY</div>
                            <div className="inline-flex items-center border border-black rounded">
                                <button type="button" className="px-3 bg-white text-black focus:outline-none focus:ring-0" onClick={decrementQuantity} aria-label="Decrease quantity" disabled={quantity <= 1}>-</button>
                                <div className="px-4 text-black" aria-live="polite">{quantity}</div>
                                <button
                                    type="button"
                                    className="px-3 bg-white text-black focus:outline-none focus:ring-0"
                                    onClick={incrementQuantity}
                                    aria-label="Increase quantity"
                                    disabled={quantity >= (stockInfo?.quantity || Infinity)}
                                >
                                    +
                                </button>
                            </div>
                        </div>


                        {/* footer actions pinned at bottom */}
                        <div className="flex items-center gap-4 mt-4">
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                className="bg-[#ef7d66] text-black py-3 rounded w-full tablet:w-[314px] font-semibold focus:outline-none focus:ring-0"
                                disabled={stockInfo && stockInfo.quantity <= 0}
                            >
                                {cartSuccess ? cartSuccess : (fromCart ? 'UPDATE CART' : 'ADD TO CART')}
                            </button>
                            {cartError && <div className="text-red-600 text-sm ml-2">{cartError}</div>}
                            <button
                                className="bg-white p-1.5 rounded-full shadow-md"
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
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Material: Kraft</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Size: 2.5x5x2.5 cm, 2.7x5.5x2.7 cm, 2.7x8.7x2.7cm, 3x10x3 cm, 9.5x6.5x3 cm</p></li>
                            
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
                                        onChange={(e) => setReviewText(e.target.value)}
                                        rows={4}
                                        placeholder="Share your experience with this product..."
                                        className="w-full border border-black rounded-md p-3 outline-none focus:ring-0 resize-y"
                                    />
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
                        </div>
                    )}
                </div>
            </div>
            {reviews && reviews.length > 0 && (
                <div className="max-w-[1200px] mx-auto w-full laptop:px-2 phone:p-2 tablet:p-2 mt-2">
                    <div className="border border-black mt-[-30px] rounded-md border-t-0 rounded-t-none p-4 tablet:p-6">
                        <div className="divide-y max-h-[60vh] overflow-y-auto pr-1">
                            {reviews.map((rev) => {
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
                                                    <p className="mt-5 ml-[-50px] font-dm-sans text-[14px] text-[#111233]">{rev.comment}</p>
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
                            })}
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


export default ProductBox;