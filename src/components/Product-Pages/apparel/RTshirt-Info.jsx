import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "../../../supabaseClient";
import UploadDesign from '../../UploadDesign';
import { UserAuth } from "../../../context/AuthContext";

const RTshirt = () => {
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
    const [thumbnails, setThumbnails] = useState([]);
    const [activeThumb, setActiveThumb] = useState(0);
    const favVerifyTimer = useRef(null);
    const [lastFavResp, setLastFavResp] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [variantGroups, setVariantGroups] = useState([]);
    const [selectedVariants, setSelectedVariants] = useState({});
    const [stockInfo, setStockInfo] = useState(null);
    const [cartError, setCartError] = useState(null);
    const [cartSuccess, setCartSuccess] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [uploadedFileMetas, setUploadedFileMetas] = useState([]);
    const [showUploadUI, setShowUploadUI] = useState(true);
    const [uploadResetKey, setUploadResetKey] = useState(0);
    const [showUploadError, setShowUploadError] = useState(false);

    // ...existing code...

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

                // 1) Try update existing row's timestamp
                const { data: updData, error: updError } = await supabase
                    .from('recently_viewed')
                    .update({ viewed_at: nowIso })
                    .eq('user_id', userId)
                    .eq('product_id', productId)
                    .select('id');

                if (updError) {
                    console.warn('[RTshirt-Info] recently_viewed update error:', updError);
                }

                if (Array.isArray(updData) && updData.length > 0) {
                    if (process.env.NODE_ENV !== 'production') {
                        console.debug('[RTshirt-Info] recently_viewed updated', { productId, userId, row: updData?.[0]?.id });
                    }
                    hasLoggedViewRef.current = true;
                    return;
                }

                // 2) If no existing row, insert with generated UUID
                const newId = (typeof crypto !== 'undefined' && crypto?.randomUUID) ? crypto.randomUUID() : uuidv4();
                const { data: insData, error: insError } = await supabase
                    .from('recently_viewed')
                    .insert([{ id: newId, user_id: userId, product_id: productId, viewed_at: nowIso }])
                    .select('id')
                    .limit(1);

                if (insError) {
                    console.warn('[RTshirt-Info] recently_viewed insert error:', insError);
                } else {
                    if (process.env.NODE_ENV !== 'production') {
                        console.debug('[RTshirt-Info] recently_viewed inserted', { productId, userId, row: insData?.[0]?.id });
                    }
                    hasLoggedViewRef.current = true;
                }
            } catch (err) {
                console.warn('[RTshirt-Info] recently_viewed log error:', err);
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

    // Cart editing state
    const [fromCart, setFromCart] = useState(false);
    const [editingCartId, setEditingCartId] = useState(null);

    useEffect(() => {
        if (location.state?.fromCart && location.state?.cartRow) {
            const cartRow = location.state.cartRow;
            setFromCart(true);
            setEditingCartId(cartRow.cart_id);
            if (cartRow.quantity) setQuantity(Number(cartRow.quantity) || 1);
            setShowUploadUI(true);
        }
    }, [location.state]);

    // Restore variant selections by cart_id
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
                if (Array.isArray(data.cart_variants) && data.cart_variants.length > 0) {
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
                    if (Object.keys(vMap).length) setSelectedVariants(prev => ({ ...vMap, ...prev }));
                }
            } catch (e) { console.debug('[EditCart] rTshirt restore failed', e); }
        };
        restore();
    }, [fromCart, editingCartId]);

    // Old prefill removed (superseded by cart_id restoration)

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
                    return;
                }

                const cleanKey = String(imageKey).replace(/^\/+/, ''); // remove leading slash(es)

                // Try buckets in the same order used elsewhere for apparel -> accessories fallback
                const bucketsToTry = ['apparel-images', 'accessoriesdecorations-images', 'accessories-images', 'images', 'product-images', 'public'];
                for (const bucket of bucketsToTry) {
                    try {
                        const { data, error } = supabase.storage.from(bucket).getPublicUrl(cleanKey);
                        if (error) continue;
                        const url = data?.publicUrl || data?.publicURL || null;
                        if (url && !url.endsWith('/')) {
                            if (isMounted) setImageSrc(url);
                            return;
                        }
                    } catch (err) {
                        // continue trying other buckets
                    }
                }

                // Last-resort fallback to local public asset
                if (isMounted) setImageSrc('/apparel-images/rounded_t-shirt.png');
            } catch (err) {
                console.error('Error resolving image public URL:', err);
                if (isMounted) setImageSrc('/apparel-images/rounded_t-shirt-white.png');
            }
        };
        resolveImage();
        return () => { isMounted = false; };
    }, [imageKey]);

        // Build thumbnails: 1) rounded t-shirt main image as first thumb, 2) rounded_t-shirt variations, 3) fallbacks (tries storage buckets)
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

            // first thumbnail: use rounded_t-shirt as primary
            results.push('/apparel-images/rounded_t-shirt.png');

            // desired variant thumbnails (colors)
            const desired = ['rounded_t-shirt-white', 'rounded_t-shirt-blue', 'rounded_t-shirt-red'];
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
            const fallbacks = ['/apparel-images/rounded_t-shirt.png', '/apparel-images/rounded_t-shirt-blue.png', '/apparel-images/rounded_t-shirt-red.png', '/apparel-images/rounded_t-shirt-white.png', '/logo-icon/logo.png'];
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
        };

        buildThumbnails();
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

    // Fetch stock info based on selected variants (subset-match + aggregate like Chip-Bag)
    useEffect(() => {
        const fetchStockInfo = async () => {
            if (!productId || !variantGroups.length) {
                setStockInfo(null);
                return;
            }

            // Allow partial selection; require at least one variant selected
            const variantIds = Object.values(selectedVariants)
                .map(v => v?.id)
                .filter(Boolean);

            if (variantIds.length === 0) {
                setStockInfo(null);
                return;
            }

            const sortedVariantIds = [...variantIds].map(Number).sort((a, b) => a - b);

            const { data: combinations, error: combError } = await supabase
                .from('product_variant_combinations')
                .select('combination_id, variants')
                .eq('product_id', productId);

            if (combError) { setStockInfo(null); return; }

            const selectedSet = new Set(sortedVariantIds);
            const candidates = (combinations || []).filter(row => Array.isArray(row.variants) && row.variants.length > 0 && row.variants.every(v => selectedSet.has(Number(v))));
            const match = candidates.sort((a, b) => (b.variants?.length || 0) - (a.variants?.length || 0))[0];

            if (!match) {
                setStockInfo({ quantity: 0, low_stock_limit: 0 });
                return;
            }

            const combinationIds = candidates.length > 0 ? candidates.map(c => c.combination_id) : [match.combination_id];
            const { data: inventoryRows, error: invError } = await supabase
                .from('inventory')
                .select('quantity, low_stock_limit, combination_id')
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

    // Reviews
    const [reviewsCount, setReviewsCount] = useState(0);
    const [averageRating, setAverageRating] = useState(null);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsAvailable, setReviewsAvailable] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewAuthors, setReviewAuthors] = useState({});
    const [verifiedBuyerMap, setVerifiedBuyerMap] = useState({});
    const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHoverRating, setReviewHoverRating] = useState(null);
    const [reviewText, setReviewText] = useState("");
    const [reviewFiles, setReviewFiles] = useState([]);
    const [reviewUploadError, setReviewUploadError] = useState(null);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [starFilterRating, setStarFilterRating] = useState(0);
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
                    console.warn('[RTshirt-Info] reviews query error:', error.message || error);
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
                console.error('[RTshirt-Info] unexpected error fetching reviews:', err);
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

    const toggleDetails = () => setDetailsOpen((s) => !s);
    const incrementQuantity = () => setQuantity((q) => {
        const maxStock = stockInfo?.quantity || Infinity;
        return Math.min(q + 1, maxStock);
    });
    const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));

    const selectVariant = (groupId, value) => {
        setSelectedVariants(prev => ({ ...prev, [groupId]: value }));
    };
    // Calculate unit price (base + variants) and multiply by quantity for total
    const unitPrice = (Number(price) || 0) + Object.values(selectedVariants).reduce((acc, val) => acc + (Number(val?.price) || 0), 0);
    const totalPrice = unitPrice * quantity;

    // Handle Add to Cart (copied from Cap-Info)
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

            // Get existing cart items for this user and product
            const { data: existingCarts, error: checkError } = await supabase
                .from("cart")
                .select("cart_id, quantity, total_price")
                .eq("user_id", userId)
                .eq("product_id", productId);

            if (checkError) throw checkError;

            let cartId;
            let cartMatched = false;

            // If editing a specific cart item, update it directly
            if (fromCart && editingCartId) {
                cartMatched = true;
                const newQuantity = Number(quantity || 0);
                const newTotal = (Number(unitPrice) || 0) * newQuantity;
                const { error: updateError } = await supabase
                    .from("cart")
                    .update({
                        quantity: newQuantity,
                        total_price: newTotal,
                        base_price: Number(unitPrice) || Number(price) || 0,
                        route: location?.pathname || `/${slug}`,
                        slug: slug || null,
                    })
                    .eq("cart_id", editingCartId)
                    .eq("user_id", userId);
                if (updateError) throw updateError;
                cartId = editingCartId;

                // Update cart variants for the editing cart
                // First, remove existing variants
                await supabase.from("cart_variants").delete().eq("cart_id", editingCartId).eq("user_id", userId);

                // Insert new variants
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

                // Dispatch cart-created event to associate uploaded files with the cart
                window.dispatchEvent(new CustomEvent('cart-created', { detail: { cartId: editingCartId } }));
            } else {
                // Check if there's an existing cart with the same variants (for new additions)
                for (const cart of existingCarts || []) {
                const { data: cartVariants, error: varError } = await supabase
                    .from("cart_variants")
                    .select("cartvariant_id, cart_id")
                    .eq("cart_id", cart.cart_id)
                    .eq("user_id", userId);

                if (varError) throw varError;

                // Build a set of variant_value_ids stored in cart_variants
                const existingVarSet = new Set((cartVariants || []).map((v) => `${v.cartvariant_id}`));

                // Build a set of selected variant_value_ids from the UI
                const selectedVarSet = new Set(Object.values(selectedVariants || {}).map((val) => `${val?.variant_value_id ?? val?.id ?? val}`));

                // Compare sets (treat both empty as equal)
                if (existingVarSet.size === selectedVarSet.size && [...existingVarSet].every((v) => selectedVarSet.has(v))) {
                    // Match found: update quantity and total_price
                    cartMatched = true;
                    const newQuantity = Number(quantity || 0);
                    const newTotal = (Number(unitPrice) || 0) * newQuantity;
                    const { error: updateError } = await supabase
                        .from("cart")
                        .update({
                            quantity: newQuantity,
                            total_price: newTotal,
                            base_price: Number(unitPrice) || Number(price) || 0,
                            // persist current route and slug for cart -> edit navigation
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
            } // Close the else block

            if (!cartMatched) {
                // Insert new cart entry first
                const { data: cartData, error: cartError } = await supabase
                    .from("cart")
                    .insert([
                        {
                            user_id: userId,
                            product_id: productId,
                            quantity: quantity,
                            base_price: Number(unitPrice) || Number(price) || 0,
                            total_price: totalPrice,
                            // include product route and slug so Cart can link back to friendly URL
                            route: location?.pathname || `/${slug}`,
                            slug: slug || null,
                        },
                    ])
                    .select("cart_id")
                    .single();

                if (cartError) throw cartError;

                if (!cartData || !cartData.cart_id) {
                    throw new Error("Failed to retrieve cart_id after insertion");
                }

                cartId = cartData.cart_id;

                // Insert into cart_variants for each selected variant
                const variantInserts = Object.entries(selectedVariants).map(([groupId, value]) => ({
                    cart_id: cartId,
                    user_id: userId,
                    // Some product pages use product_variant_value_id as value.id; fall back to it when variant_value_id is missing
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
                // Dispatch a window-level event so UploadDesign (if mounted) can attach any pending uploads
                try {
                    window.dispatchEvent(new CustomEvent('cart-created', { detail: { cartId } }));
                } catch (e) { /* ignore */ }

                // Fallback: if uploadedFileMetas exists in this parent, try to attach by ids (try file_id and id columns)
                try {
                    if (uploadedFileMetas && uploadedFileMetas.length > 0) {
                        const ids = uploadedFileMetas.map(m => m.id ?? m.file_id).filter(Boolean);
                        if (ids.length > 0) {
                            try {
                                const tryFileId = await supabase.from('uploaded_files').update({ cart_id: cartId }).in('file_id', ids);
                                if (tryFileId.error) console.warn('RTshirt: attach by file_id failed, will try id column:', tryFileId.error);
                                else if ((tryFileId.data?.length ?? 0) === 0) console.warn('RTshirt: attach by file_id affected no rows, will try id column');
                            } catch (e) { console.warn('RTshirt: unexpected error attaching by file_id', e); }

                            try {
                                const tryId = await supabase.from('uploaded_files').update({ cart_id: cartId }).in('id', ids);
                                if (tryId.error) console.warn('RTshirt: attach by id failed:', tryId.error);
                            } catch (e) { console.warn('RTshirt: unexpected error attaching by id', e); }
                        }
                    }

                    // Also attempt fallback attach by user_id+product_id where cart_id IS NULL
                    try {
                        const userId2 = userId;
                        let q = supabase.from('uploaded_files').update({ cart_id: cartId }).eq('user_id', userId2).is('cart_id', null);
                        if (productId !== null && productId !== undefined) q = q.eq('product_id', productId);
                        const { error: fallbackErr } = await q;
                        if (fallbackErr) console.warn('RTshirt: fallback attach failed', fallbackErr);
                    } catch (fb) { console.warn('RTshirt: fallback attach exception', fb); }
                } catch (e) {
                    console.warn('Failed to attach uploaded_files to cart row (RTshirt):', e);
                }
            }

            if (fromCart && editingCartId) {
                // If editing, navigate back to cart
                setCartSuccess("Cart item updated!");
                setTimeout(() => {
                    setCartSuccess(null);
                    navigate('/cart');
                }, 1500);
            } else {
                // If adding new item, stay on page
                setCartSuccess("Item added to cart!");
                setQuantity(1);
                // Reset UploadDesign to clear thumbnails while keeping the upload UI visible
                setUploadResetKey(k => (k || 0) + 1);
                setShowUploadUI(true);
                setTimeout(() => setCartSuccess(null), 3000);
            }
        } catch (err) {
            console.error("Error adding to cart - Details:", { message: err.message, code: err.code, details: err.details, stack: err.stack });
            if (err.code === "23505") {
                setCartError("This item with the same variants is already in your cart");
            } else {
                setCartError("Failed to add to cart: " + (err.message || "Unknown error"));
            }
        } finally {
            setIsAdding(false);
        }
    };



    const printingGroup = variantGroups.find(g => g.name.toUpperCase() === 'PRINTING');
    const colorGroup = variantGroups.find(g => g.name.toUpperCase() === 'COLOR');
    // Also support common plural forms for group names
    const sizeGroup = variantGroups.find(g => ['SIZE', 'SIZES'].includes(String(g.name).toUpperCase()));
    const materialGroup = variantGroups.find(g => ['MATERIAL', 'MATERIALS'].includes(String(g.name).toUpperCase()));

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
                                <img src={imageSrc || "/apparel-images/rounded_t-shirt-white.png"} alt="" className="w-full max-h-64 tablet:max-h-[420px] object-contain" />
                                <button
                                    type="button"
                                    aria-label="Previous image"
                                    onClick={() => {
                                        const valid = thumbnails.map((t, i) => t ? i : -1).filter(i => i >= 0);
                                        if (!valid.length) return;
                                        const current = valid.includes(activeThumb) ? activeThumb : valid[0];
                                        const idx = valid.indexOf(current);
                                        const prevIdx = valid[(idx - 1 + valid.length) % valid.length];
                                        setActiveThumb(prevIdx);
                                        if (thumbnails[prevIdx]) setImageSrc(thumbnails[prevIdx]);
                                    }}
                                    aria-disabled={thumbnails.filter(Boolean).length < 2}
                                    className={`absolute left-1 top-1/2 -translate-y-1/2 p-2 bg-transparent focus:outline-none focus:ring-0 ${thumbnails.filter(Boolean).length < 2 ? 'opacity-40 pointer-events-none' : ''}`}
                                >
                                    <img src="/logo-icon/arrow-left.svg" alt="Previous" className="h-6 w-6" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next image"
                                    onClick={() => {
                                        const valid = thumbnails.map((t, i) => t ? i : -1).filter(i => i >= 0);
                                        if (!valid.length) return;
                                        const current = valid.includes(activeThumb) ? activeThumb : valid[0];
                                        const idx = valid.indexOf(current);
                                        const nextIdx = valid[(idx + 1) % valid.length];
                                        setActiveThumb(nextIdx);
                                        if (thumbnails[nextIdx]) setImageSrc(thumbnails[nextIdx]);
                                    }}
                                    aria-disabled={thumbnails.filter(Boolean).length < 2}
                                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-2 bg-transparent focus:outline-none focus:ring-0 ${thumbnails.filter(Boolean).length < 2 ? 'opacity-40 pointer-events-none' : ''}`}
                                >
                                    <img src="/logo-icon/arrow-right.svg" alt="Next" className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="mt-4 grid grid-cols-4 gap-4">
                                {(() => {
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
                        <h1 className="text-[36px] font-bold text-[#111233] mt-4  font-dm-sans mb-2">{loading ? "" : productName}</h1>
                        {/*stars*/}
                        <div className="flex flex-row gap-2">
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

                        <div className="flex items-center gap-3 mb-4" aria-hidden />

                        <div className="text-3xl text-[#EF7D66] font-bold mb-4">
                            {loading ? "" : `₱${totalPrice.toFixed(2)}`}
                            <p className="italic text-black text-[12px]">Shipping calculated at checkout.</p>
                        </div>
                        {/* Stock status (standardized like packaging) */}
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
                                    <span className="text font-semibold">Checking stocks.</span>
                                )
                            ) : (
                                <span className="text-gray-500">Select all variants to see stock.</span>
                            )}
                        </div>
                        <hr className="mb-6" />
                        
                     

                        {/* scrollable content area */}
                        <div className="flex-1 pr-2">
                        <div className="mb-6">
                            <p className="text-[16px] font-semibold text-gray-700 mb-2 font-dm-sans">PRINTING</p>
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

                       
                        

                        {/* SIZE selection */}
                        <div className="mb-6">
                            <p className="text-[16px] font-semibold text-gray-700 mb-2 font-dm-sans">SIZE</p>
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

                        {/* MATERIAL selection */}
                        <div className="mb-6">
                            <p className="text-[16px] font-semibold text-gray-700 mb-2 font-dm-sans">MATERIAL</p>
                            {materialGroup && (
                                <div className="flex gap-3">
                                    {materialGroup.values.map(val => {
                                        const isSelected = selectedVariants[materialGroup.id]?.id === val.id;
                                        return (
                                            <button
                                                type="button"
                                                key={val.id}
                                                className={`px-3 py-2 rounded ${isSelected ? 'bg-gray-200 text-gray-500 font-bold border border-gray-500' : 'bg-white text-[#111233] border border-[#111233]'} focus:outline-none focus:ring-0`}
                                                onClick={() => selectVariant(materialGroup.id, val)}
                                            >
                                                {val.name} 
                                            </button>
                                        );
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
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">UPLOAD DESIGN{showUploadError && <span className="text-red-600 text-sm"> *Required</span>}</div>
                            {/* Pass parent setter so UploadDesign can populate parent uploadedFileMetas when in edit mode */}
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
                                <button type="button" className="px-3 bg-white text-black focus:outline-none focus:ring-0" onClick={decrementQuantity} aria-label="Decrease quantity" disabled={quantity <= 1 || (stockInfo && stockInfo.quantity <= 0)}>-</button>
                                <div className="px-4 text-black" aria-live="polite">{quantity}</div>
                                <button type="button" className="px-3 bg-white text-black focus:outline-none focus:ring-0" onClick={incrementQuantity} aria-label="Increase quantity" disabled={stockInfo && stockInfo.quantity <= 0}>+</button>
                            </div>
                        </div>

                        </div>

                        {/* footer actions pinned at bottom */}
                        <div className="flex items-center gap-4 mt-4">
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={isAdding || (stockInfo && stockInfo.quantity <= 0)}
                                aria-busy={isAdding}
                                className={`bg-[#ef7d66] text-black py-3 rounded w-full tablet:w-[314px] font-semibold focus:outline-none focus:ring-0 ${isAdding || (stockInfo && stockInfo.quantity <= 0) ? 'opacity-60 pointer-events-none' : ''}`}
                            >
                                {cartSuccess ? cartSuccess : (isAdding ? (fromCart ? 'UPDATING...' : 'ADDING...') : (fromCart ? 'UPDATE CART' : 'ADD TO CART'))}
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
                        <div className="font-dm-sans text-[16px]">
                            <p className="mb-2 text-[16px] font-normal text-black font-dm-sans">Product Name:  {productName || 'Custom Rounded T-shirt'}</p>
                            <p className="mb-2 text-[16px] font-normal text-black font-dm-sans">Printing Color: CMYK</p>
                            <p className="mb-4 text-[16px] font-normal text-black font-dm-sans">Materials: Cotton-Polyester Blend, 100% Cotton</p>

                            <div className="mb-3">
                                <div className=" text-[16px] text-black mb-2 font-dm-sans"><p className="text-[16px] text-black mb-2 font-dm-sans font-normal">Size:</p></div>
                                { !loading && (
                                <div className="overflow-x-auto">
                                    <table className="table-auto border-collapse border border-black w-full max-w-[560px]">
                                        <thead>
                                            <tr className="bg-[#27496d] text-white">
                                                <th className="border border-black px-4 py-3 text-center">Size</th>
                                                <th className="border border-black px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span>Length</span>
                                                        <span className="text-sm">(cm)</span>
                                                    </div>
                                                </th>
                                                <th className="border border-black px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span>Width</span>
                                                        <span className="text-sm">(cm)</span>
                                                    </div>
                                                </th>
                                                <th className="border border-black px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span>Sleeves</span>
                                                        <span className="text-sm">(cm)</span>
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="bg-white">
                                                <td className="border text-black border-black px-4 py-2 text-center">S</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">68</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">51</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">22</td>
                                            </tr>
                                            <tr className="bg-white">
                                                <td className="border text-black border-black px-4 py-2 text-center">M</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">71</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">53</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">22</td>
                                            </tr>
                                            <tr className="bg-white">
                                                <td className="border text-black border-black px-4 py-2 text-center">L</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">73</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">56</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">22</td>
                                            </tr>
                                            <tr className="bg-white">
                                                <td className="border text-black border-black px-4 py-2 text-center">XL</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">76</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">59</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">24</td>
                                            </tr>
                                            <tr className="bg-white">
                                                <td className="border text-black border-black px-4 py-2 text-center">2XL</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">81</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">61</td>
                                                <td className="border text-black border-black px-4 py-2 text-center">26</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                )}
                            </div>

                            <p className="text-[16px] text-black mb-2 font-dm-sans font-normal">Fit: Unisex</p>
                        </div>
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
                                        maxLength={300}
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
                            {(() => {
                                const filteredReviews = starFilterRating === 0
                                    ? reviews
                                    : reviews.filter(rev => Number(rev.rating) === starFilterRating);

                                if (filteredReviews.length === 0) {
                                    return (
                                        <div className="py-5 text-center  text-gray-500">
                                           No helpful reviews.
                                        </div>
                                    );
                                }

                                return filteredReviews.map((rev) => {
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
                                });
                            })()}
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

export default RTshirt;

