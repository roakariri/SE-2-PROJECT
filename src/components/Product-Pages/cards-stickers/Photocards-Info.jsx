import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { v4 as uuidv4 } from 'uuid';
import { UserAuth } from "../../../context/AuthContext";
import UploadDesign from '../../UploadDesign';
const Photocards = () => {
    // Optional: Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, []);

    // Fetch product data (name, price) from Supabase using the last path segment as slug
    const location = useLocation();
    const navigate = useNavigate();
    const { session } = UserAuth();
    const hasLoggedViewRef = useRef(false);

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
    const [cartError, setCartError] = useState(null);
    const [cartSuccess, setCartSuccess] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [variantGroups, setVariantGroups] = useState([]);
    const [selectedVariants, setSelectedVariants] = useState({});
    const [stockInfo, setStockInfo] = useState(null);

    // upload design state (added for UploadDesign integration)
    const [uploadedFileMetas, setUploadedFileMetas] = useState([]); // DB rows
    const [uploadResetKey, setUploadResetKey] = useState(0);
    const [showUploadUI, setShowUploadUI] = useState(true);
    const [showUploadError, setShowUploadError] = useState(false);

    // Cart editing state
    const [fromCart, setFromCart] = useState(!!location.state?.fromCart);
    const [editingCartId, setEditingCartId] = useState(location.state?.cartRow?.cart_id || null);
    
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
                    console.warn('[Photocards-Info] recently_viewed update error:', updError);
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
                    console.warn('[Photocards-Info] recently_viewed insert error:', insError);
                } else {
                    hasLoggedViewRef.current = true;
                }
            } catch (err) {
                console.warn('[Photocards-Info] recently_viewed log error:', err);
            }
        };
        logRecentlyViewed();
    }, [productId, session?.user?.id]);

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

    // Set initial selected variants to defaults
    useEffect(() => {
        const initial = {};
        for (let group of variantGroups) {
            const def = group.values.find(v => v.is_default) || group.values[0];
            if (def) initial[group.id] = def;
        }
        setSelectedVariants(initial);
    }, [variantGroups]);

    // Fetch stock info based on selected variants (same logic as Plastic-Bag)
    useEffect(() => {
        const fetchStockInfo = async () => {
            if (!productId || !variantGroups.length) {
                setStockInfo(null);
                return;
            }
            const variantIds = Object.values(selectedVariants)
                .map(v => v?.id)
                .filter(Boolean);

            if (variantIds.length !== variantGroups.length) {
                setStockInfo(null);
                return;
            }

            const sortedVariantIds = [...variantIds].map(n => Number(n)).sort((a, b) => a - b);

            const { data: combinations, error: combError } = await supabase
                .from('product_variant_combinations')
                .select('combination_id, variants')
                .eq('product_id', productId);

            if (combError) {
                setStockInfo(null);
                return;
            }

            const match = (combinations || []).find(row => {
                if (!row.variants || row.variants.length !== sortedVariantIds.length) return false;
                const a = [...row.variants].map(v => Number(v)).sort((x, y) => x - y);
                return a.every((v, i) => v === sortedVariantIds[i]);
            });

            if (!match) {
                setStockInfo({ quantity: 0, low_stock_limit: 0 });
                return;
            }

            const { data: inventory, error: invError } = await supabase
                .from('inventory')
                .select('quantity, low_stock_limit, status')
                .eq('combination_id', match.combination_id)
                .single();

            if (invError || !inventory) {
                setStockInfo({ quantity: 0, low_stock_limit: 0 });
                return;
            }

            setStockInfo(inventory);
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
            // If imageKey is not provided, prefer the sinage-posters-images bucket's retractable-banner.png
            if (!imageKey) {
                try {
                    const { data } = supabase.storage.from('sinage-posters-images').getPublicUrl('retractable-banner.png');
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
                const bucketsToTry = ['cards-stickers-images', 'accessoriesdecorations-images', 'apparel-images', '3d-prints-images', 'product-images', 'images', 'public', 'cards-stickers-images'];
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

    // Build thumbnails: 1) main product image as first thumb, 2) photocards variants from cards-stickers-images storage, 3) fallbacks
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

            // first thumbnail: ensure photocards.png is always first
            results.push('/cards/photocards.png');

            // desired variant thumbnails
            const desired = ['photocards-white', 'photocards-black', 'photocards-transparent'];
            for (const name of desired) {
                if (results.length >= 4) break;
                const url = await tryGetPublic('cards-stickers-images', name);
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
                    const url = await tryGetPublic('cards-stickers-images', cand);
                    if (url) results.push(url);
                }
            }

            // last-resort local fallbacks
            const fallbacks = ['/cards/photocards.png', '/cards/photocards-1.png', '/cards/photocards-2.png', '/logo-icon/logo.png'];
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
    const reviewFileInputRef = useRef(null);
    const [starFilterRating, setStarFilterRating] = useState(0);

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
                    console.warn('[Photocards-Info] reviews query error:', error.message || error);
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
                console.error('[Photocards-Info] unexpected error fetching reviews:', err);
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
        } catch (err) {
            console.error('[Photocards-Info] submit review error:', err);
            setReviewUploadError('Failed to submit review. Please try again.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // Cart editing: Check if coming from cart for editing
    useEffect(() => {
        if (location.state?.fromCart && location.state?.cartRow) {
            setFromCart(true);
            setEditingCartId(location.state.cartRow.cart_id);
        }
    }, [location.state]);

    // Authoritative fetch by cart_id (variants + quantity) so selection matches UI option ids
    useEffect(() => {
        // Fast-path: attempt to hydrate selection from navigation state (edit-from-cart)
        const tryHydrateFromNav = () => {
            try {
                const nav = location.state?.cartRow;
                if (!nav || !nav.variants || !variantGroups || variantGroups.length === 0) return false;
                const restored = {};
                for (const v of nav.variants) {
                    const groupKey = v.group || v.variant_group_id || v.variant_group || v.variant_group || v.group_id;
                    const valId = v.product_variant_value_id || v.variant_value_id || v.id || v.cartvariant_id || v.value;
                    const group = variantGroups.find(g => String(g.id) === String(groupKey) || String(g.name) === String(groupKey));
                    if (!group) return false;
                    const value = group.values.find(x => String(x.id) === String(valId) || String(x.name) === String(v.value) || String(x.value) === String(v.value));
                    if (!value) return false;
                    restored[group.id] = value;
                }
                setSelectedVariants(restored);
                if (nav.quantity) setQuantity(nav.quantity);
                return true;
            } catch (e) {
                return false;
            }
        };

        const restoreFromCart = async () => {
            if (!fromCart || !editingCartId) return;

            // try nav hydration first (fast-path). If it succeeds, skip DB fallback.
            if (location.state?.fromCart && location.state?.cartRow) {
                const ok = tryHydrateFromNav();
                if (ok) return;
            }

            try {
                const { data: cartData, error } = await supabase
                    .from('cart')
                    .select('quantity, total_price')
                    .eq('cart_id', editingCartId)
                    .single();

                if (error) throw error;

                // Set quantity from cart
                if (cartData.quantity) {
                    setQuantity(cartData.quantity);
                }

                // Fetch and set variants
                const { data: variantData, error: varError } = await supabase
                    .from('cart_variants')
                    .select(`
                        cartvariant_id,
                        variants!inner(
                            id,
                            name,
                            value,
                            price,
                            variant_groups!inner(
                                id,
                                name
                            )
                        )
                    `)
                    .eq('cart_id', editingCartId);

                if (varError) throw varError;

                // Map to selectedVariants format
                const restoredVariants = {};
                if (variantData) {
                    for (const cv of variantData) {
                        if (cv.variants?.variant_groups) {
                            const groupId = cv.variants.variant_groups.id;
                            restoredVariants[groupId] = {
                                id: cv.variants.id,
                                name: cv.variants.name,
                                value: cv.variants.value,
                                price: cv.variants.price,
                                variant_value_id: cv.cartvariant_id
                            };
                        }
                    }
                }
                setSelectedVariants(restoredVariants);

            } catch (err) {
                console.error('Error restoring from cart:', err);
            }
        };
        restoreFromCart();
    }, [fromCart, editingCartId, variantGroups]);

    // Cart editing: Restore uploaded files when editing
    useEffect(() => {
        if (fromCart && editingCartId) {
            const restoreUploadedFiles = async () => {
                try {
                    const { data, error } = await supabase
                        .from('uploaded_files')
                        .select('*')
                        .eq('cart_id', editingCartId);

                    if (error) throw error;
                    if (data && data.length > 0) {
                        setUploadedFileMetas(data);
                        setShowUploadUI(true);
                    }
                } catch (err) {
                    console.error('Error restoring uploaded files:', err);
                }
            };
            restoreUploadedFiles();
        }
    }, [fromCart, editingCartId]);

    const toggleDetails = () => setDetailsOpen((s) => !s);

    const incrementQuantity = () => setQuantity((q) => {
        const maxStock = stockInfo?.quantity ?? 0;
        return Math.min(q + 1, maxStock);
    });
    const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));

    // Calculate unit price (base + variants) and multiply by quantity for total
    const unitPrice = (Number(price) || 0) + Object.values(selectedVariants).reduce((acc, val) => acc + (Number(val?.price) || 0), 0);
    const totalPrice = unitPrice * quantity;

    // Add to Cart logic from Tote Bag
    // Add to Cart logic with cart editing support
    const handleAddToCart = async () => {
        if (isAdding) return;
        setIsAdding(true);

        if (!productId) {
            setCartError("No product selected");
            setIsAdding(false);
            return;
        }

        // Check for uploaded files
        if (!uploadedFileMetas || uploadedFileMetas.length === 0) {
            setShowUploadError(true);
            setTimeout(() => setShowUploadError(false), 2000);
            setIsAdding(false);
            return;
        }

        const userId = session?.user?.id ?? await getCurrentUserId();
        if (!userId) {
            setCartError("Please sign in to add to cart");
            setIsAdding(false);
            navigate("/signin");
            return;
        }

        setCartError(null);
        setCartSuccess(null);
        setIsAdding(true);

        try {
            let cartId;

            if (fromCart && editingCartId) {
                // Update existing cart item
                cartId = editingCartId;
                const { error: updateError } = await supabase
                    .from("cart")
                    .update({
                        quantity: quantity,
                        base_price: Number(unitPrice) || Number(price) || 0,
                        total_price: totalPrice,
                        route: location?.pathname || `/${slug}`,
                        slug: slug || null,
                    })
                    .eq("cart_id", editingCartId)
                    .eq("user_id", userId);

                if (updateError) throw updateError;

                // Delete existing variants and re-insert
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

                console.log('Cart updated successfully');
            } else {
                // Check for existing cart items with same variants
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

            // Handle uploaded files attachment with fallback
            if (uploadedFileMetas.length > 0 && cartId) {
                try {
                    // Update existing uploaded_files with cart_id
                    const { error: attachError } = await supabase
                        .from('uploaded_files')
                        .update({ cart_id: cartId })
                        .in('id', uploadedFileMetas.map(f => f.id));

                    if (attachError) {
                        console.error('Failed to attach uploaded files to cart:', attachError);
                        // Fallback: try to insert new records
                        const fallbackInserts = uploadedFileMetas.map(file => ({
                            cart_id: cartId,
                            user_id: userId,
                            file_name: file.file_name,
                            file_path: file.file_path,
                            file_size: file.file_size,
                            file_type: file.file_type,
                            uploaded_at: file.uploaded_at || new Date().toISOString()
                        }));

                        const { error: fallbackError } = await supabase
                            .from('uploaded_files')
                            .insert(fallbackInserts);

                        if (fallbackError) {
                            console.error('Fallback attachment also failed:', fallbackError);
                        }
                    }
                } catch (attachErr) {
                    console.error('Error handling file attachments:', attachErr);
                }
            }

            // Reset form state for new additions
            if (!fromCart) {
                setQuantity(1);
                setSelectedVariants({});
                setUploadedFileMetas([]);
                setUploadResetKey(prev => prev + 1);
                setShowUploadUI(true);
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

            // Navigate back to cart if editing
            if (fromCart) {
                setTimeout(() => navigate('/cart'), 1000);
            }

        } catch (err) {
            console.error("Error adding/updating cart - Details:", { message: err.message, code: err.code, details: err.details });
            if (err.code === "23505") {
                setCartError("This item with the same variants is already in your cart");
            } else {
                setCartError("Failed to add/update cart: " + (err.message || "Unknown error"));
            }
        } finally {
            setIsAdding(false);
        }
    };

    const selectVariant = (groupId, value) => {
        setSelectedVariants(prev => ({ ...prev, [groupId]: value }));
    };

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

    

    const filteredReviews = starFilterRating === 0 ? reviews : reviews.filter(rev => Number(rev.rating) === starFilterRating);

    return (
        <div className="font-dm-sans w-full bg-cover bg-white phone:pt-[210px] tablet:pt-[220px] laptop:pt-[161px] phone:pb-40 tablet:pb-32 laptop:pb-24 z-0">
            <div className="max-w-[1201px] mx-auto mt-8 flex flex-col">
                <div className="phone:p-2 tablet:p-2">
                    <p className="pt-5 font-dm-sans">
                        <Link to="/Homepage" className="text-gray-600">Home </Link>/ <Link to="/signage-posters" className="text-gray-600">Cards & Stickers </Link>
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
                        {/* Stock status (copied from Plastic-Bag just below shipping note) */}
                        <div className="mb-2">
                            {variantGroups.length === Object.values(selectedVariants).filter(v => v?.id).length ? (
                                stockInfo ? (
                                    stockInfo.quantity === 0 ? (
                                        <span className="text-black font-semibold">Out of stock</span>
                                    ) : stockInfo.quantity === 1 ? (
                                        <span className="text-black font-semibold">Stock: {stockInfo.quantity}</span>
                                    ) : (
                                        <span className="text-black font-semibold">Stocks: {stockInfo.quantity}</span>
                                    )
                                ) : (
                                    <span className="text-black font-semibold">Out of stock</span>
                                )
                            ) : (
                                <span className="text-gray-500">Select all variants to see stock.</span>
                            )}
                        </div>
                        <hr className="mb-6" />

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
                            {/* TECHNIQUE (render under SIZE when available) */}
                            {techniqueGroup && (
                                <div className="mt-3">
                                    <div className="text-[16px] font-semibold text-gray-700 mb-2">TECHNIQUE</div>
                                    <div className="flex flex-wrap gap-3">
                                        {techniqueGroup.values.map(val => {
                                            const isSelected = selectedVariants[techniqueGroup.id]?.id === val.id;
                                            const isHexColor = String(val.value || '').startsWith('#') && String(val.value || '').length >= 4;
                                            if (techniqueGroup.input_type === 'color' || isHexColor) {
                                                return (
                                                    <div
                                                        key={val.id}
                                                        className={`w-8 h-8 rounded cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'} focus:outline-none focus:ring-0`}
                                                        style={{ backgroundColor: isHexColor ? val.value : '#000000' }}
                                                        onClick={() => selectVariant(techniqueGroup.id, val)}
                                                        title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                                    />
                                                );
                                            }
                                            return (
                                                <button
                                                    type="button"
                                                    key={val.id}
                                                    className={`px-3 py-1 rounded ${isSelected ? 'bg-gray-200 text-gray-500 font-bold border border-gray-500' : 'bg-white text-[#111233] border border-[#111233]'} focus:outline-none focus:ring-0`}
                                                    onClick={() => selectVariant(techniqueGroup.id, val)}
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
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">
                                UPLOAD DESIGN {showUploadError && <span className="text-red-600 text-sm">*Required</span>}
                            </div>
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
                                <button type="button" className="px-3 bg-white text-black focus:outline-none focus:ring-0" onClick={incrementQuantity} aria-label="Increase quantity" disabled={quantity >= (stockInfo?.quantity ?? 0)}>+</button>
                            </div>
                        </div>


                        <div className="flex items-center gap-4 mt-4">
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={isAdding || (stockInfo && stockInfo.quantity <= 0)}
                                className={`bg-[#ef7d66] text-black py-3 rounded w-full tablet:w-[314px] font-semibold focus:outline-none focus:ring-0 ${isAdding ? 'opacity-60 pointer-events-none' : ''}`}
                            >
                                {cartSuccess ? cartSuccess : (isAdding ? (fromCart ? 'UPDATING...' : 'ADDING...') : (fromCart ? 'UPDATE CART' : 'ADD TO CART'))}
                            </button>
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
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Material: Premium Thick Card</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">GSM: 300 gsm</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Size: 5.5x8.5 cm</p></li>
                            
                        </ul>
                    </div>
                </div>
            </div>

            {/* Customer Reviews */}
            <div className="max-w-[1200px] mx-auto mt-8 w-full laptop:px-2 phone:p-2 tablet:p-2">
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
                            {filteredReviews.length === 0 ? (
                                <div className="py-5 text-center text-gray-500">
                                    No helpful reviews.
                                </div>
                            ) : (
                                filteredReviews.map((rev) => {
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
                                })
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
        </div>
    );
};

export default Photocards;
