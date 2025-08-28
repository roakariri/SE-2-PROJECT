import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import UploadDesign from '../../UploadDesign';
import { UserAuth } from "../../../context/AuthContext";

const Cap = () => {
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
    const [, setLastFavResp] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [variantGroups, setVariantGroups] = useState([]);
    const [selectedVariants, setSelectedVariants] = useState({});
    const [uploading, setUploading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadedFileMetas, setUploadedFileMetas] = useState([]);
    const [uploadedFilePaths, setUploadedFilePaths] = useState([]);
    const fileInputRef = useRef(null);
    const [uploadedPreviewUrls, setUploadedPreviewUrls] = useState([]);
    const [uploadError, setUploadError] = useState(null);

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

    // Resolve imageKey to a public URL
    useEffect(() => {
        if (!imageKey) {
            setImageSrc('/logo-icon/logo.png');
            return;
        }
        try {
            const { data } = supabase.storage.from('apparel-images').getPublicUrl(imageKey);
            setImageSrc(data?.publicUrl || '/apparel-images/caps.png');
        } catch (err) {
            console.error('Error resolving image public URL:', err);
            setImageSrc('/apparel-images/caps.png');
        }
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
    const [, setReviewsLoading] = useState(false);
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

    // Upload handler for design files (wired to the Upload button)
    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploadError(null);

        const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
        const allowedTypes = ['application/pdf', 'application/postscript', 'application/zip'];

        const toUpload = [];
        for (const file of files) {
            if (file.size > MAX_BYTES) {
                setUploadError('File is too large');
                try { if (fileInputRef.current) fileInputRef.current.value = null; } catch (e) { }
                return;
            }
            const isAllowed = file.type.startsWith('image/') || allowedTypes.includes(file.type);
            if (!isAllowed) {
                setUploadError('File format not supported.');
                try { if (fileInputRef.current) fileInputRef.current.value = null; } catch (e) { }
                return;
            }
            toUpload.push(file);
        }

        setUploading(true);
        const uploadedFilesLocal = [];
        const uploadedMetasLocal = [];
        const uploadedPathsLocal = [];

        try {
            const userId = session?.user?.id ?? await getCurrentUserId();
            if (!userId) throw new Error('Not signed in');

            for (const file of toUpload) {
                const filePath = `${userId}/${Date.now()}_${file.name}`;
                const { data, error } = await supabase.storage.from('product-files').upload(filePath, file, { cacheControl: '3600', upsert: false });
                if (error) throw error;

                const { data: urlData } = supabase.storage.from('product-files').getPublicUrl(filePath);
                const publicUrl = urlData?.publicUrl;
                if (!publicUrl) throw new Error('Failed to get public URL');

                const { data: insertData, error: insertError } = await supabase
                    .from('uploaded_files')
                    .insert([{
                        user_id: userId,
                        product_id: productId ?? null,
                        file_name: file.name,
                        image_url: publicUrl,
                        file_type: file.type,
                        file_size: file.size,
                    }])
                    .select()
                    .single();
                if (insertError) {
                    await supabase.storage.from('product-files').remove([filePath]);
                    throw insertError;
                }

                uploadedFilesLocal.push(file);
                uploadedMetasLocal.push(insertData);
                uploadedPathsLocal.push(filePath);
            }

            setUploadedFiles(prev => [...prev, ...uploadedFilesLocal]);
            setUploadedFileMetas(prev => [...prev, ...uploadedMetasLocal]);
            setUploadedFilePaths(prev => [...prev, ...uploadedPathsLocal]);
            setUploadError(null);
        } catch (err) {
            console.error('Upload error:', err);
            const raw = err?.message || String(err);
            if (/mime type/i.test(raw) || /not supported/i.test(raw)) {
                setUploadError('File format not supported.');
            } else if (/size/i.test(raw) || /exceed/i.test(raw) || /too large/i.test(raw)) {
                setUploadError('File is too large');
            } else {
                setUploadError('Upload failed: ' + raw);
            }
        } finally {
            setUploading(false);
            try { if (fileInputRef.current) fileInputRef.current.value = null; } catch (e) { }
        }
    };

    const removeUploadedFileAt = async (index) => {
        const meta = uploadedFileMetas[index];
        const path = uploadedFilePaths[index];
        try {
            const userId = session?.user?.id ?? await getCurrentUserId();
            if (path) await supabase.storage.from('product-files').remove([path]);
            if (meta) {
                if (meta.id) await supabase.from('uploaded_files').delete().eq('id', meta.id);
                else await supabase.from('uploaded_files').delete().match({ user_id: userId, file_name: meta.file_name });
            }
        } catch (err) {
            console.warn('Failed to fully remove uploaded file:', err);
        } finally {
            setUploadedFiles(prev => prev.filter((_, i) => i !== index));
            setUploadedFileMetas(prev => prev.filter((_, i) => i !== index));
            setUploadedFilePaths(prev => prev.filter((_, i) => i !== index));
            setUploadedPreviewUrls(prev => prev.filter((_, i) => i !== index));
        }
    };

    // Build a preview URL for the uploaded file (prefer DB public URL for images, else createObjectURL)
    useEffect(() => {
        const urls = [];
        const objectUrls = [];
        uploadedFileMetas.forEach((m, i) => {
            if (m && m.image_url && typeof m.file_type === 'string' && m.file_type.startsWith('image/')) urls[i] = m.image_url;
            else if (uploadedFiles[i] && uploadedFiles[i].type && uploadedFiles[i].type.startsWith('image/')) {
                const o = URL.createObjectURL(uploadedFiles[i]); objectUrls.push(o); urls[i] = o;
            } else urls[i] = null;
        });
        for (let i = uploadedFileMetas.length; i < uploadedFiles.length; i++) {
            if (uploadedFiles[i] && uploadedFiles[i].type && uploadedFiles[i].type.startsWith('image/')) {
                const o = URL.createObjectURL(uploadedFiles[i]); objectUrls.push(o); urls[i] = o;
            } else urls[i] = null;
        }
        setUploadedPreviewUrls(urls);
        return () => { for (const o of objectUrls) if (o) URL.revokeObjectURL(o); };
    }, [uploadedFileMetas, uploadedFiles]);

    // Fetch latest uploaded file for the current user and show it in the preview
    useEffect(() => {
        let isMounted = true;
        const fetchUploadedFiles = async () => {
            try {
                const userId = session?.user?.id ?? await getCurrentUserId();
                if (!userId) return;
                const { data, error } = await supabase
                    .from('uploaded_files')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('product_id', productId)
                    .order('uploaded_at', { ascending: false })
                    .limit(5);
                if (error) {
                    console.warn('[Cap-Info] could not order uploaded_files by uploaded_at:', error.message || error);
                    const fallback = await supabase.from('uploaded_files').select('*').eq('user_id', userId).eq('product_id', productId).limit(5);
                    if (fallback.error) { console.warn('[Cap-Info] fallback uploaded_files query failed:', fallback.error); return; }
                    if (!isMounted) return;
                    if (Array.isArray(fallback.data) && fallback.data.length > 0) { setUploadedFileMetas(fallback.data); setUploadedFilePaths([]); }
                    return;
                }
                if (!isMounted) return;
                if (Array.isArray(data) && data.length > 0) { setUploadedFileMetas(data); setUploadedFilePaths([]); }
            } catch (err) {
                console.warn('[Cap-Info] error fetching uploaded files:', err);
            }
        };
        fetchUploadedFiles();
        return () => { isMounted = false; };
    }, [session, productId]);



    // Calculate unit price (base + variants) and multiply by quantity for total
    const unitPrice = (Number(price) || 0) + Object.values(selectedVariants).reduce((acc, val) => acc + (Number(val?.price) || 0), 0);
    const totalPrice = unitPrice * quantity;

    const techniqueGroup = variantGroups.find(g => g.name.toUpperCase() === 'TECHNIQUE');
    const colorGroup = variantGroups.find(g => g.name.toUpperCase() === 'COLOR');

    return (
        <div className="w-full bg-cover bg-white font-dm-sans phone:pt-[210px] tablet:pt-[220px] laptop:pt-[161px] phone:pb-40 tablet:pb-32 laptop:pb-24 z-0">
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
                                <img src={imageSrc || "/apparel-images/caps.png"} alt="" className="w-full max-h-64 tablet:max-h-[420px] object-contain" />
                                <button
                                    type="button"
                                    aria-label="Previous image"
                                    className="absolute left-1 top-1/2 -translate-y-1/2 p-2 bg-transparent focus:outline-none focus:ring-0"
                                >
                                    <img src="/logo-icon/arrow-left.svg" alt="Previous" className="h-6 w-6" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next image"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2 bg-transparent focus:outline-none focus:ring-0"
                                >
                                    <img src="/logo-icon/arrow-right.svg" alt="Next" className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="mt-4 grid grid-cols-4 gap-3">
                                <div className="h-20 w-full border rounded p-2 bg-[#f7f7f7]" aria-hidden />
                                <div className="h-20 w-full border rounded p-2 bg-[#f7f7f7]" aria-hidden />
                                <div className="h-20 w-full border rounded p-2 bg-[#f7f7f7]" aria-hidden />
                                <div className="h-20 w-full border rounded p-2 bg-[#f7f7f7]" aria-hidden />
                            </div>
                        </div>
                    </div>

                    

                    {/* Right: Details */}
                    <div className="border border-black rounded-md p-6 w-full tablet:w-[601px] h-full flex flex-col">
                        <h1 className="text-[36px] font-bold text-[#111233] mt-4 mb-2">{loading ? "" : productName}</h1>

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

                        <div className="mb-6">
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">TECHNIQUE</div>
                            {techniqueGroup && (
                                <div className="flex gap-3">
                                    {techniqueGroup.values.map(val => {
                                        const isSelected = selectedVariants[techniqueGroup.id]?.id === val.id;
                                        if (techniqueGroup.input_type === 'color') {
                                            return (
                                                <div
                                                    key={val.id}
                                                    className={`w-8 h-8 rounded-full cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'}`}
                                                    style={{ backgroundColor: val.value }}
                                                    onClick={() => selectVariant(techniqueGroup.id, val)}
                                                    title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                                />
                                            );
                                        } else {
                                            return (
                                                <button
                                                    type="button"
                                                    key={val.id}
                                                    className={`px-4 py-2 rounded ${isSelected ? 'bg-gray-200 text-gray-500 font-bold border border-gray-500' : 'bg-white text-[#111233] border border-[#111233]'} focus:outline-none focus:ring-0`}
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
                            <div className="text-[16px] font-semibold text-gray-700 mb-2">COLOR</div>
                            {colorGroup && (
                                <div className="flex items-center gap-3">
                                    {colorGroup.values.map(val => {
                                        const isSelected = selectedVariants[colorGroup.id]?.id === val.id;
                                        const isHexColor = val.value.startsWith('#') && val.value.length === 7;
                                        return (
                                            <div
                                                key={val.id}
                                                className={`w-8 h-8 rounded cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'}`}
                                                style={{ backgroundColor: isHexColor ? val.value : '#000000' }}
                                                onClick={() => selectVariant(colorGroup.id, val)}
                                                title={`${val.name} ${val.price > 0 ? `(+₱${val.price.toFixed(2)})` : ''}`}
                                            />
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

                        <div className="flex items-center gap-4">
                            <button type="button" className="bg-[#ef7d66] text-black py-3 rounded w-full tablet:w-[314px] font-semibold focus:outline-none focus:ring-0">ADD TO CART</button>
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
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Product Name: Custom Cap</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Printing Color: CMYK</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Material: Cotton-Polyester Blend</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Circumference: 56–60 cm (Adjustable)</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Depth: 11 cm</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Technique Length: 7.5 cm</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Color: Black, Gray, Beige</p></li>
                            <li><p className="m-0 font-normal text-black text-[16px] font-dm-sans">Fit: Unisex, one size fits most</p></li>
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

