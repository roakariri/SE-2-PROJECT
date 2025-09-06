import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { UserAuth } from "../../../context/AuthContext";
import UploadDesign from '../../UploadDesign';

const ClothingBanner = () => {
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
    const [isFavorited, setIsFavorited] = useState(false);
    const [loading, setLoading] = useState(true);
    const [favLoading, setFavLoading] = useState(false);
    const favVerifyTimer = useRef(null);
    const [lastFavResp, setLastFavResp] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [cartError, setCartError] = useState(null);
    const [cartSuccess, setCartSuccess] = useState(null);
    const [variantGroups, setVariantGroups] = useState([]);
    const [selectedVariants, setSelectedVariants] = useState({});
    const [thumbnails, setThumbnails] = useState([]);
    const [activeThumb, setActiveThumb] = useState(0);

    // upload design state (added for UploadDesign integration)
    const [uploadedFileMetas, setUploadedFileMetas] = useState([]); // DB rows
    const [uploadResetKey, setUploadResetKey] = useState(0);
    const [showUploadUI, setShowUploadUI] = useState(true);

    // Cart editing state
    const [fromCart, setFromCart] = useState(!!location.state?.fromCart);
    const [editingCartId, setEditingCartId] = useState(location.state?.cartRow?.cart_id || null);

    const slug = location.pathname.split('/').filter(Boolean).pop();

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
            if (imageKey) {
                // Use the same image resolution logic as the main product image
                const cleanKey = String(imageKey).replace(/^\/+/, '');
                const bucketsToTry = ['sinage-posters-images', 'accessoriesdecorations-images', 'apparel-images', '3d-prints-images', 'product-images', 'images', 'public'];
                for (const bucket of bucketsToTry) {
                    try {
                        const { data, error } = supabase.storage.from(bucket).getPublicUrl(cleanKey);
                        if (error) continue;
                        const url = data?.publicUrl || data?.publicURL || null;
                        if (url && !url.endsWith('/')) {
                            results.push(url);
                            break;
                        }
                    } catch (err) {
                        // continue trying other buckets
                    }
                }
            }

            // If we couldn't get the main product image, use fallback
            if (results.length === 0) {
                try {
                    const { data } = supabase.storage.from('sinage-posters-images').getPublicUrl('clothing-banner.png');
                    const url = data?.publicUrl;
                    if (url && !url.endsWith('/')) {
                        results.push(url);
                    } else {
                        results.push('/logo-icon/logo.png');
                    }
                } catch (err) {
                    results.push('/logo-icon/logo.png');
                }
            }

            // Add additional thumbnails based on the main image (variations)
            if (imageKey && results.length > 0) {
                const cleanKey = String(imageKey).replace(/^\/+/, '');
                const m = cleanKey.match(/(.+?)\.(png|jpg|jpeg|webp|gif)$/i);
                const base = m ? m[1] : cleanKey;
                
                // Try to get variations of the main image
                const variations = [`${base}-1`, `${base}-2`, `${base}-3`];
                const bucketsToTry = ['sinage-posters-images', 'accessoriesdecorations-images', 'apparel-images', '3d-prints-images', 'product-images', 'images', 'public'];
                
                for (const variation of variations) {
                    if (results.length >= 4) break;
                    for (const bucket of bucketsToTry) {
                        try {
                            const { data, error } = supabase.storage.from(bucket).getPublicUrl(variation + (m ? '.' + m[2] : '.png'));
                            if (error) continue;
                            const url = data?.publicUrl || data?.publicURL || null;
                            if (url && !url.endsWith('/')) {
                                results.push(url);
                                break;
                            }
                        } catch (err) {
                            // continue
                        }
                    }
                }
            }

            // Fill remaining slots with the main image or fallbacks
            while (results.length < 4) {
                if (results.length === 0) {
                    results.push('/logo-icon/logo.png');
                } else {
                    results.push(results[0]); // Duplicate the main image
                }
            }

            // Deduplicate while preserving order
            const seen = new Set();
            const ordered = [];
            for (const u of results) {
                if (!u) continue;
                if (!seen.has(u)) { 
                    seen.add(u); 
                    ordered.push(u); 
                }
            }

            let padded = ordered.slice(0, 4);
            while (padded.length < 4) {
                padded.push(padded[0] || '/logo-icon/logo.png');
            }

            setThumbnails(padded);

            if (!isMounted) return;

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

    // Cart editing state
    useEffect(() => {
        if (location.state?.fromCart && location.state?.cartRow) {
            setFromCart(true);
            setEditingCartId(location.state.cartRow.cart_id);
        }
    }, [location.state]);

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
                    console.log('Fetched product data:', data);
                    setProductId(data.id ?? null);
                    setProductName(data.name || "");
                    setPrice(data.starting_price ?? null);
                    setImageKey(data.image_url || "");
                    console.log('Set imageKey to:', data.image_url || "");
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

    // Resolve imageKey to a public URL (robust: accepts full urls, leading slashes, and tries common buckets)
    useEffect(() => {
        let isMounted = true;
        const resolveImage = async () => {
            console.log('Resolving image for imageKey:', imageKey);
            // If imageKey is not provided, prefer the sinage-posters-images bucket's clothing-banner.png
            if (!imageKey) {
                try {
                    const { data } = supabase.storage.from('sinage-posters-images').getPublicUrl('clothing-banner.png');
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
                    console.debug('[ClothingBanner] using provided imageKey as src', { imageKey });
                    return;
                }

                const cleanKey = String(imageKey).replace(/^\/+/, ''); // remove leading slash(es)

                // Try buckets in order; include sinage-posters-images first for retractable banners
                const bucketsToTry = ['sinage-posters-images', 'accessoriesdecorations-images', 'apparel-images', '3d-prints-images', 'product-images', 'images', 'public'];
                for (const bucket of bucketsToTry) {
                    try {
                        const { data, error } = supabase.storage.from(bucket).getPublicUrl(cleanKey);
                        console.debug('[ClothingBanner] getPublicUrl attempt', { bucket, cleanKey, data, error });
                        if (error) continue; // try next bucket
                        const url = data?.publicUrl || data?.publicURL || null;
                        // Supabase returns a publicUrl that ends with '/' when the object isn't found.
                        if (url && !url.endsWith('/')) {
                            console.log('Successfully resolved image URL:', url);
                            if (isMounted) setImageSrc(url);
                            return;
                        }
                    } catch (err) {
                        console.warn('[ClothingBanner] bucket attempt failed', { bucket, err });
                        // continue trying other buckets
                    }
                }

                // Last-resort fallback to local public asset
                if (isMounted) setImageSrc('/logo-icon/logo.png');
                console.warn('[ClothingBanner] could not resolve imageKey to a public URL, using fallback', { imageKey });
            } catch (err) {
                console.error('Error resolving image public URL:', err);
                if (isMounted) setImageSrc('/logo-icon/logo.png');
            }
        };
        resolveImage();
        return () => { isMounted = false; };
    }, [imageKey]);

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

    const toggleDetails = () => setDetailsOpen((s) => !s);
    const incrementQuantity = () => setQuantity((q) => q + 1);
    const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));

    const selectVariant = (groupId, value) => {
        setSelectedVariants(prev => ({ ...prev, [groupId]: value }));
    };

    const [totalPrice, setTotalPrice] = useState(0);
    useEffect(() => {
        const base = (price || 0);
        const variantPrice = Object.values(selectedVariants).reduce((acc, val) => acc + (val?.price || 0), 0);
        setTotalPrice((base + variantPrice) * (quantity || 1));
    }, [price, selectedVariants, quantity]);

    // Add to Cart logic (from ToteBag)
    const handleAddToCart = async () => {
        if (!productId) {
            setCartError("No product selected");
            return;
        }

        const userId = session?.user?.id ?? await getCurrentUserId();
        if (!userId) {
            setCartError("Please sign in to add to cart");
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

                setCartSuccess("Cart updated successfully!");
                setTimeout(() => {
                    setCartSuccess(null);
                    if (fromCart) {
                        navigate('/cart');
                    }
                }, 1000);
                return;
            }

            // Original add to cart logic for new items
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
                    const newTotal = (Number(totalPrice) || 0);
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
        }
    };

    const printingGroup = variantGroups.find(g => g.name.toUpperCase() === 'PRINTING');
    const colorGroup = variantGroups.find(g => g.name.toUpperCase() === 'COLOR');
    // Also support common plural forms for group names
    const sizeGroup = variantGroups.find(g => ['SIZE', 'SIZES'].includes(String(g.name).toUpperCase()));
    const materialGroup = variantGroups.find(g => ['MATERIAL', 'MATERIALS'].includes(String(g.name).toUpperCase()));
    // Trim group: find any variant group whose name includes 'TRIM' (e.g., 'Trim Color', 'Trim')
    const trimGroup = variantGroups.find(g => String(g.name).toUpperCase().includes('TRIM'));

    // Hole group (some products have HOLE / HOLES / PUNCH variants)
    const holeGroup = variantGroups.find(g => {
        const n = String(g.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return n === 'HOLE' || n === 'HOLES' || n.includes('PUNCH') || n.includes('HOLE');
    });

    

    console.log('ClothingBanner component rendering, imageSrc:', imageSrc);
    console.log('ClothingBanner component rendering, imageKey:', imageKey);

    return (
        <div className="font-dm-sans w-full bg-cover bg-white phone:pt-[210px] tablet:pt-[220px] laptop:pt-[161px] phone:pb-40 tablet:pb-32 laptop:pb-24 z-0">
            <div className="max-w-[1201px] mx-auto mt-8 flex flex-col">
                <div className="phone:p-2 tablet:p-2">
                    <p className="pt-5 font-dm-sans">
                        <Link to="/Homepage" className="text-gray-600">Home </Link>/ <Link to="/signage-posters" className="text-gray-600">Signage & Posters </Link>
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
                                    onLoad={() => console.log('Image loaded successfully:', imageSrc)}
                                    onError={(e) => {
                                        console.debug('[ClothingBanner] main image failed to load, src=', e.target.src);
                                        console.debug('[ClothingBanner] current imageSrc state:', imageSrc);
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
                                    className="absolute left-1 top-1/2 -translate-y-1/2 p-2 bg-transparent focus:outline-none focus:ring-0"
                                    onClick={prevImage}
                                >
                                    <img src="/logo-icon/arrow-left.svg" alt="Previous" className="h-6 w-6" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next image"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2 bg-transparent focus:outline-none focus:ring-0"
                                    onClick={nextImage}
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
                        <h1 className="text-[36px] font-bold text-[#111233] mt-4  mb-2">{loading ? "" : productName}</h1>
                        {/*stars*/}
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
                        <hr className="mb-6" />

                        {/* scrollable content area */}
                        <div className="flex-1 ">
                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">PRINTING</div>
                            {printingGroup && (
                                <div className="flex gap-3">
                                    {printingGroup.values.map(val => {
                                        const isSelected = selectedVariants[printingGroup.id]?.id === val.id;
                                        if (printingGroup.input_type === 'color') {
                                            return (
                                                <div
                                                    key={val.id}
                                                    className={`w-8 h-8 rounded-full cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'}`}
                                                    style={{ backgroundColor: val.value }}
                                                    onClick={() => selectVariant(printingGroup.id, val)}
                                                    title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                                />
                                            );
                                        } else {
                                            return (
                                                <button
                                                    type="button"
                                                    key={val.id}
                                                    className={`px-4 py-2 rounded ${isSelected ? 'bg-gray-200 text-gray-500 font-bold border border-gray-500' : 'bg-white text-[#111233] border border-[#111233]'} focus:outline-none focus:ring-0`}
                                                    onClick={() => selectVariant(printingGroup.id, val)}
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
                            {/* TRIM COLOR (render under PRINTING when available) */}
                            {trimGroup && (
                                <div className="mt-3">
                                    <div className="text-[16px] font-semibold text-gray-700 mb-2">TRIM COLOR</div>
                                    <div className="flex gap-3">
                                        {trimGroup.values.map(val => {
                                            const isSelected = selectedVariants[trimGroup.id]?.id === val.id;
                                            const isHexColor = String(val.value || '').startsWith('#') && String(val.value || '').length >= 4;
                                            if (trimGroup.input_type === 'color' || isHexColor) {
                                                return (
                                                    <div
                                                        key={val.id}
                                                        className={`w-8 h-8 rounded cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'}focus:outline-none focus:ring-0`}
                                                        style={{ backgroundColor: isHexColor ? val.value : '#000000' }}
                                                        onClick={() => selectVariant(trimGroup.id, val)}
                                                        title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                                    />
                                                );
                                            }
                                            return (
                                                <button
                                                    type="button"
                                                    key={val.id}
                                                    className={`px-3 py-1 rounded ${isSelected ? 'bg-gray-200 text-gray-500 font-bold border border-gray-500' : 'bg-white text-[#111233] border border-[#111233]'} focus:outline-none focus:ring-0`}
                                                    onClick={() => selectVariant(trimGroup.id, val)}
                                                >
                                                    {val.name}{val.price > 0 ? ` (+₱${val.price.toFixed(2)})` : ''}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* HOLE / PUNCH options (render under PRINTING when available) */}
                            {holeGroup && (
                                <div className="mt-3">
                                    <div className="text-[16px] font-semibold text-gray-700 mb-2">HOLE</div>
                                    <div className="flex gap-3">
                                        {holeGroup.values.map(val => {
                                            const isSelected = selectedVariants[holeGroup.id]?.id === val.id;
                                            const isHexColor = String(val.value || '').startsWith('#') && String(val.value || '').length >= 4;
                                            if (holeGroup.input_type === 'color' || isHexColor) {
                                                return (
                                                    <div
                                                        key={val.id}
                                                        className={`w-8 h-8 rounded cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'} focus:outline-none focus:ring-0`}
                                                        style={{ backgroundColor: isHexColor ? val.value : '#000000' }}
                                                        onClick={() => selectVariant(holeGroup.id, val)}
                                                        title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                                    />
                                                );
                                            }
                                            return (
                                                <button
                                                    type="button"
                                                    key={val.id}
                                                    className={`px-3 py-1 rounded ${isSelected ? 'bg-gray-200 text-gray-500 font-bold border border-gray-500' : 'bg-white text-[#111233] border border-[#111233]'} focus:outline-none focus:ring-0`}
                                                    onClick={() => selectVariant(holeGroup.id, val)}
                                                >
                                                    {val.name}{val.price > 0 ? ` (+₱${val.price.toFixed(2)})` : ''}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}


                       </div>
                        

                        {/* SIZE selection */}
                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">SIZE</div>
                            {sizeGroup && (
                                <div className="flex gap-3">
                                    
                                    {sizeGroup.values.map(val => {
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
                                    })}
                                </div>
                            )}
                        </div>


                        

                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">UPLOAD DESIGN</div>
                            <UploadDesign productId={productId} session={session} />
                        </div>

                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">QUANTITY</div>
                            <div className="inline-flex items-center border border-blaack rounded">
                                <button type="button" className="px-3 bg-white text-black focus:outline-none focus:ring-0" onClick={decrementQuantity} aria-label="Decrease quantity" disabled={quantity <= 1}>-</button>
                                <div className="px-4 text-black" aria-live="polite">{quantity}</div>
                                <button type="button" className="px-3 bg-white text-black focus:outline-none focus:ring-0" onClick={incrementQuantity} aria-label="Increase quantity">+</button>
                            </div>
                        </div>

                        </div>

                        {/* footer actions pinned at bottom */}
                        <div className="flex items-center gap-4 mt-4">
                            <UploadDesign 
                                productId={productId} 
                                session={session} 
                                uploadedFileMetas={uploadedFileMetas}
                                setUploadedFileMetas={setUploadedFileMetas}
                                uploadResetKey={uploadResetKey}
                                setUploadResetKey={setUploadResetKey}
                                showUploadUI={showUploadUI}
                                setShowUploadUI={setShowUploadUI}
                                isEditMode={fromCart && !!editingCartId}
                                cartId={fromCart ? editingCartId : null}
                            />
                            <button type="button" onClick={handleAddToCart} className="bg-[#ef7d66] text-black py-3 rounded w-full tablet:w-[314px] font-semibold focus:outline-none focus:ring-0">{cartSuccess ? cartSuccess : (fromCart ? 'UPDATE CART' : 'ADD TO CART')}</button>
                            {cartError && <div className="text-red-600 text-sm ml-2">{cartError}</div>}
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
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Material: Cotton </p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Size: 75x100 cm, 120x150 cm</p></li>
                            
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


export default ClothingBanner;
