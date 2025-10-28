import React from "react";
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useLocation } from "react-router-dom";
import { UserAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";
import PH_CITIES_BY_PROVINCE from "../../PH_CITIES_BY_PROVINCE.js";
import PH_BARANGAYS from "../../PH_BARANGAYS.js";




const DEFAULT_AVATAR = "/logo-icon/profile-icon.svg";

const AccountPage = () => {
    // Use imported PH_CITIES_BY_PROVINCE from './province.js'

    // Always default to 'homebase' on a fresh load/refresh. URL query/hash can override.
    const [activeTab, setActiveTab] = React.useState(() => 'homebase');
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut } = UserAuth();
    const [userName, setUserName] = React.useState("");
    const [session, setSession] = React.useState(null);
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [firstNameError, setFirstNameError] = React.useState("");
    const [lastNameError, setLastNameError] = React.useState("");
    const [profilePic, setProfilePic] = React.useState(DEFAULT_AVATAR);
    // Try to get cached profile photo from localStorage
    const getCachedProfilePhoto = () => {
        if (typeof window !== 'undefined') {
            try {
                return localStorage.getItem('profilePhotoUrl') || DEFAULT_AVATAR;
            } catch (e) {
                return DEFAULT_AVATAR;
            }
        }
        return DEFAULT_AVATAR;
    };
    const [profilePhotoUrl, setProfilePhotoUrl] = React.useState(getCachedProfilePhoto());
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [successMsg, setSuccessMsg] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [repeatPassword, setRepeatPassword] = React.useState("");
    const [isCurrentPasswordIncorrect, setIsCurrentPasswordIncorrect] = React.useState(false);
    const [passwordSuccessMsg, setPasswordSuccessMsg] = React.useState("");
    const [addressForm, setAddressForm] = React.useState({
        first_name: "",
        last_name: "",
        street_address: "",
        province: "",
        city: "",
        postal_code: "",
        phone_number: "",
        label: "Home",
        is_default: false,
        address_id: undefined,
    });
    // Province list
    const PROVINCES = [
        "Abra", "Agusan Del Norte", "Agusan Del Sur", "Aklan", "Albay", "Antique", "Apayao", "Aurora", "Basilan", "Bataan", "Batanes", "Batangas", "Benguet", "Biliran", "Bohol", "Bukidnon", "Bulacan", "Cagayan", "Camarines Norte", "Camarines Sur", "Camiguin", "Capiz", "Catanduanes", "Cavite", "Cebu", "Compostela Valley", "Cotabato", "Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental", "Dinagat Islands", "Eastern Samar", "Guimaras", "Ifugao", "Ilocos Norte", "Ilocos Sur", "Iloilo", "Isabela", "Kalinga", "La Union", "Laguna", "Lanao del Norte", "Lanao del Sur", "Leyte", "Maguindanao", "Marinduque", "Masbate", "Misamis Occidental", "Misamis Oriental", "Mountain Province", "NCR", "Negros Occidental", "Negros Oriental", "Northern Samar", "Nueva Ecija", "Nueva Vizcaya", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Pampanga", "Pangasinan", "Quezon", "Quirino", "Rizal", "Romblon", "Samar", "Sarangani", "Siquijor", "Sorsogon", "South Cotabato", "Southern Leyte", "Sultan Kudarat", "Sulu", "Surigao del Norte", "Surigao del Sur", "Tarlac", "Tawi-Tawi", "Zambales", "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"
    ];
    // Typable province dropdown state
    const [provinceInput, setProvinceInput] = React.useState("");
    const [showProvinceDropdown, setShowProvinceDropdown] = React.useState(false);
    const provinceInputRef = React.useRef(null);
    // Typable city dropdown state
    const [cityInput, setCityInput] = React.useState("");
    const [showCityDropdown, setShowCityDropdown] = React.useState(false);
    const cityInputRef = React.useRef(null);
    // Typable barangay dropdown state
    const [barangayInput, setBarangayInput] = React.useState("");
    const [showBarangayDropdown, setShowBarangayDropdown] = React.useState(false);
    const barangayInputRef = React.useRef(null);
    // Show all provinces unless input matches a province exactly (case-insensitive), then show only that province
    const filteredProvinces = (() => {
        if (!provinceInput) return PROVINCES;
        const exactMatch = PROVINCES.find(
            p => p.toLowerCase() === provinceInput.trim().toLowerCase()
        );
        if (exactMatch) return [exactMatch];
        return PROVINCES;
    })();
    // Get city options for selected province
    const cityOptions = addressForm.province && PH_CITIES_BY_PROVINCE[addressForm.province]
        ? PH_CITIES_BY_PROVINCE[addressForm.province]
        : [];

    // Get barangay options for selected province and city
    const barangayOptions =
        addressForm.province && addressForm.city &&
        PH_BARANGAYS[addressForm.province] && PH_BARANGAYS[addressForm.province][addressForm.city]
            ? PH_BARANGAYS[addressForm.province][addressForm.city]
            : [];






    const [addresses, setAddresses] = React.useState([]);
    const [addressSuccessMsg, setAddressSuccessMsg] = React.useState("");
    const [addressErrorMsg, setAddressErrorMsg] = React.useState("");
    const [addressFirstNameError, setAddressFirstNameError] = React.useState("");
    const [addressLastNameError, setAddressLastNameError] = React.useState("");
    const [editingAddressId, setEditingAddressId] = React.useState(null);
    const [addressStreetError, setAddressStreetError] = React.useState("");
    const [addressPhoneError, setAddressPhoneError] = React.useState("");
    const [showAddressEditor, setShowAddressEditor] = React.useState(false);

    // Orders state
    const [orders, setOrders] = React.useState([]);
    const [ordersLoading, setOrdersLoading] = React.useState(false);
    const [ordersSearch, setOrdersSearch] = React.useState("");
    // Only allow: all | in-progress | delivered | cancelled
    const [statusFilter, setStatusFilter] = React.useState('all');
    // Date range picker state for Orders
    const [showDateRangePicker, setShowDateRangePicker] = React.useState(false);
    const [dateRange, setDateRange] = React.useState({ start: null, end: null });

    // Helper: format currency PHP
    const php = (n) => `₱${Number(n || 0).toFixed(2)}`;
    const formatDate = (iso) => {
        try { const d = iso ? new Date(iso) : new Date(); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return String(iso || ''); }
    };
    const statusPill = (status) => {
        // Normalize many internal statuses into three user-facing states
        const s = String(status || '').toLowerCase();
        if (s.includes('cancel')) return { label: 'Cancelled', className: 'text-red-600' };
        if (s.includes('deliver')) return { label: 'Delivered', className: 'text-green-600' };
        // Anything else is considered in-progress for the Orders UI
        return { label: 'In Progress', className: 'text-[#F79E1B]' };
    };

    // Helper: determine if an order status matches the simple allowed filters
    const matchesStatus = (order, filter) => {
        const s = String(order?.status || '').toLowerCase();
        if (filter === 'all') return true;
        if (filter === 'delivered') return s.includes('deliver');
        if (filter === 'cancelled') return s.includes('cancel');
        if (filter === 'in-progress') return !s.includes('deliver') && !s.includes('cancel');
        return true;
    };

    // Helper: format ISO-ish to yyyy-mm-dd for date input values
    const toInputDate = (iso) => {
        try {
            if (!iso) return '';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch { return ''; }
    };

    // Helper: combined matcher for search + status + date filter used by renderers
    const orderMatches = (order) => {
        if (ordersSearch) {
            const q = ordersSearch.toLowerCase();
            const matchOrderId = `#${order.id}`.toLowerCase().includes(q) || String(order.id).toLowerCase().includes(q);
            const matchProductName = (order.productNames || []).some(n => String(n).toLowerCase().includes(q));
            const matchProductId = (order.productIds || []).some(pid => String(pid).toLowerCase().includes(q));
            const matchesSearch = matchOrderId || matchProductName || matchProductId;
            if (!matchesSearch) return false;
        }

        // Status filter
        if (!matchesStatus(order, statusFilter)) return false;

        // Date range filter (if set)
        try {
            if (dateRange && (dateRange.start || dateRange.end)) {
                const orderDate = order?.date ? new Date(order.date) : null;
                if (!orderDate || isNaN(orderDate.getTime())) return false;
                // Normalize bounds
                if (dateRange.start) {
                    const start = new Date(dateRange.start);
                    start.setHours(0,0,0,0);
                    if (orderDate < start) return false;
                }
                if (dateRange.end) {
                    const end = new Date(dateRange.end);
                    end.setHours(23,59,59,999);
                    if (orderDate > end) return false;
                }
            }
        } catch (e) {
            // If date parsing fails, do not match the order when a date filter exists
            if (dateRange && (dateRange.start || dateRange.end)) return false;
        }

        return true;
    };

    // Load user's orders with first product image and item count
    React.useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setOrdersLoading(true);
            try {
                const { data: sess } = await supabase.auth.getSession();
                const userId = sess?.session?.user?.id;
                if (!userId) { if (!cancelled) setOrders([]); return; }
                // Fetch recent orders
                const { data: ords, error } = await supabase
                    .from('orders')
                    .select('order_id, user_id, total_price, created_at, status')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (error) throw error;
                const list = Array.isArray(ords) ? ords : [];
                if (list.length === 0) { if (!cancelled) setOrders([]); return; }
                const orderIds = list.map(o => o.order_id);
                // Fetch order items and related product ids
                const { data: itemsRows } = await supabase
                    .from('order_items')
                    .select('order_item_id, order_id, product_id, quantity')
                    .in('order_id', orderIds);
                const itemsByOrder = (itemsRows || []).reduce((acc, r) => {
                    const a = acc[r.order_id] || (acc[r.order_id] = []);
                    a.push(r);
                    return acc;
                }, {});
                const productIds = [...new Set((itemsRows || []).map(r => r.product_id).filter(Boolean))];
                let productsMap = {};
                if (productIds.length > 0) {
                    const { data: prods } = await supabase
                        .from('products')
                        .select('id, name, image_url, product_types ( name, product_categories ( name ) )')
                        .in('id', productIds);
                    productsMap = (prods || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
                }
                const buildImg = (product) => {
                    const image_key = product?.image_url;
                    if (!image_key) return '/logo-icon/logo.png';
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
                    const buckets = [primaryBucket,'apparel-images','accessoriesdecorations-images','signage-posters-images','cards-stickers-images','packaging-images','3d-prints-images','product-images','images','public'].filter(Boolean);
                    for (const b of buckets) {
                        try {
                            const { data } = supabase.storage.from(b).getPublicUrl(key);
                            const url = data?.publicUrl;
                            if (url && !url.endsWith('/')) return url;
                        } catch {}
                    }
                    return '/logo-icon/logo.png';
                };
                const enriched = list.map(o => {
                    const its = itemsByOrder[o.order_id] || [];
                    // collect product ids for this order
                    const prodIds = its.map(i => i.product_id).filter(pid => pid && productsMap[pid]);
                    const unique = Array.from(new Set(prodIds));
                    const firstOnly = unique.slice(0, 1);
                    const imgs = firstOnly.map(pid => buildImg(productsMap[pid]));
                    const img = imgs[0] || '/logo-icon/logo.png';
                    const countExtra = Math.max(0, its.length - 1);
                    const productNames = unique.map(pid => productsMap[pid]?.name).filter(Boolean);
                    return {
                        id: o.order_id,
                        date: o.created_at,
                        total: Number(o.total_price || 0),
                        status: o.status || 'In Progress',
                        img,
                        extraCount: countExtra,
                        productIds: unique,
                        productNames,
                    };
                });
                if (!cancelled) setOrders(enriched);
            } catch (err) {
                console.warn('[AccountPage] load orders error:', err);
                if (!cancelled) setOrders([]);
            } finally {
                if (!cancelled) setOrdersLoading(false);
            }
        };
        load();
        const sub = supabase.auth.onAuthStateChange((_e,_s) => { if (!cancelled) load(); });
        return () => { cancelled = true; try { sub?.data?.subscription?.unsubscribe?.(); } catch {} };
    }, []);

    // Recently Viewed state for Homebase
    const [recent, setRecent] = React.useState([]);
    const [recentLoading, setRecentLoading] = React.useState(false);

    // Fetch user, profile, and addresses
    const fetchUserAndProfile = React.useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        // derive display name from provider metadata (Google, etc.) or fallback
        const meta = session?.user?.user_metadata || {};
        let displayName = meta?.display_name || meta?.full_name || meta?.name || "";
        // fallback to email local-part if no name from provider
        if (!displayName) {
            const emailLocal = (session?.user?.email || "").split("@")[0];
            displayName = emailLocal || "User";
        }

        setEmail(session?.user?.email || "");
        if (session?.user) {
            // Upsert profile and include display_name/avatar if available from provider so
            // the profiles table has the name immediately after social sign-up.
            const profileUpsert = { user_id: session.user.id };
            if (displayName) profileUpsert.display_name = displayName;
            if (meta?.avatar_url) profileUpsert.avatar_url = meta.avatar_url;

            await supabase
                .from("profiles")
                .upsert(profileUpsert, { onConflict: ['user_id'] });

            const { data: profileData } = await supabase
                .from("profiles")
                .select("avatar_url, display_name")
                .eq("user_id", session.user.id)
                .single();

            if (profileData && profileData.avatar_url) {
                try {
                    let publicUrl = profileData.avatar_url;
                    if (!publicUrl.startsWith('http')) {
                        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(profileData.avatar_url);
                        publicUrl = urlData?.publicUrl || DEFAULT_AVATAR;
                    }
                    // cache the canonical public URL for other components (Navigation uses this)
                    try {
                        if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', publicUrl);
                    } catch (e) {
                        // ignore localStorage errors
                    }
                    setProfilePic(publicUrl + "?t=" + Date.now());
                } catch (err) {
                    setProfilePic(DEFAULT_AVATAR);
                }
            } else {
                setProfilePic(DEFAULT_AVATAR);
                try {
                    if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', DEFAULT_AVATAR);
                } catch (e) {}
            }

            // Prefer stored display_name from profiles, otherwise provider-derived
            const finalDisplayName = (profileData && profileData.display_name) || displayName || "User";
            const nameParts = String(finalDisplayName || '').trim().split(/\s+/).filter(Boolean);
            // If display name has three words, treat the last two as the surname
            if (nameParts.length === 3) {
                setFirstName(nameParts[0] || "");
                setLastName(`${nameParts[1]} ${nameParts[2]}`.trim());
            } else {
                setFirstName(nameParts[0] || "");
                setLastName(nameParts[1] || "");
            }

            const { data: addressData, error: addressError } = await supabase
                .from("addresses")
                .select("*")
                .eq("user_id", session.user.id);
            if (addressError) {
                console.error("Error fetching addresses:", addressError.message);
            } else {
                setAddresses(addressData || []);
            }
        }
    }, []);

    React.useEffect(() => {
        fetchUserAndProfile();
    }, [fetchUserAndProfile]);

    // Recently Viewed loader (same logic as Homepage)
    React.useEffect(() => {
        let cancelled = false;
        const resolveProductRoute = (product) => {
            const candidate = product?.route ?? null;
            const normalize = (r) => {
                if (!r) return null;
                if (typeof r === 'string') return r.trim();
                return null;
            };
            const raw = normalize(candidate);
            const slugify = (str = '') => str.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            if (raw) {
                if (raw.startsWith('/') || raw.includes('/')) return raw.startsWith('/') ? raw : `/${raw}`;
                const categoryName = product?.product_types?.product_categories?.name || product?.product_types?.name || '';
                const categorySlug = slugify(categoryName || 'product');
                const productSlug = slugify(raw);
                return `/${categorySlug}/${productSlug}`;
            }
            const categoryName = product?.product_types?.product_categories?.name || product?.product_types?.name || '';
            const categorySlug = slugify(categoryName || 'product');
            const productSlug = slugify(product?.name || product?.id);
            return `/${categorySlug}/${productSlug}`;
        };
        const headExists = async (url) => {
            try { const res = await fetch(url, { method: 'HEAD' }); return !!res?.ok; } catch { return false; }
        };
        const resolveImage = async (product, fallbacks = []) => {
            try {
                const image_key = product?.image_url;
                if (!image_key) {
                    for (const f of fallbacks) { if (await headExists(f)) return f; }
                    return fallbacks[0] || "/logo-icon/logo.png";
                }
                if (/^https?:\/\//.test(image_key) || image_key.startsWith('/')) { return image_key; }
                const key = String(image_key).replace(/^\/+/, '');
                const categoryName = (product?.product_types?.product_categories?.name || product?.product_types?.name || '').toLowerCase();
                let primaryBucket = null;
                if (categoryName.includes('apparel')) primaryBucket = 'apparel-images';
                else if (categoryName.includes('accessories')) primaryBucket = 'accessoriesdecorations-images';
                else if (categoryName.includes('signage') || categoryName.includes('poster')) primaryBucket = 'signage-posters-images';
                else if (categoryName.includes('cards') || categoryName.includes('sticker')) primaryBucket = 'cards-stickers-images';
                else if (categoryName.includes('packaging')) primaryBucket = 'packaging-images';
                else if (categoryName.includes('3d print')) primaryBucket = '3d-prints-images';
                const allBuckets = [primaryBucket,'apparel-images','accessoriesdecorations-images','signage-posters-images','cards-stickers-images','packaging-images','3d-prints-images','product-images','images','public'].filter(Boolean);
                const seen = new Set();
                for (const b of allBuckets) {
                    if (seen.has(b)) continue; seen.add(b);
                    try {
                        const { data } = supabase.storage.from(b).getPublicUrl(key);
                        const url = data?.publicUrl;
                        if (url && !url.endsWith('/')) { if (await headExists(url)) return url; }
                    } catch { /* continue */ }
                }
                for (const f of fallbacks) { if (await headExists(f)) return f; }
                return "/logo-icon/logo.png";
            } catch {
                return "/logo-icon/logo.png";
            }
        };

        const load = async () => {
            setRecentLoading(true);
            try {
                let { data: sessionData } = await supabase.auth.getSession();
                let userId = sessionData?.session?.user?.id;
                if (!userId) {
                    const { data: userData } = await supabase.auth.getUser();
                    userId = userData?.user?.id || null;
                }
                if (!userId) { if (!cancelled) setRecent([]); return; }
                const { data: rows, error } = await supabase
                    .from('recently_viewed')
                    .select(`product_id, viewed_at, products ( id, name, image_url, route, product_types ( id, name, category_id, product_categories ( id, name ) ) )`)
                    .eq('user_id', userId)
                    .not('product_id', 'is', null)
                    .order('viewed_at', { ascending: false })
                    .limit(25);
                if (error) throw error;
                const items = [];
                for (const r of (rows || [])) {
                    const p = r?.products; if (!p) continue;
                    const img = await resolveImage(p, ['/logo-icon/logo.png']);
                    const href = resolveProductRoute(p) || '/';
                    items.push({ id: p.id, name: p.name, img, href });
                }
                const seenIds = new Set();
                const dedup = items.filter(it => (seenIds.has(it.id) ? false : (seenIds.add(it.id), true)));
                const top5 = dedup.slice(0, 5);
                if (!cancelled) setRecent(top5);
            } catch (err) {
                console.warn('[AccountPage] recently viewed load error:', err);
                if (!cancelled) setRecent([]);
            } finally {
                if (!cancelled) setRecentLoading(false);
            }
        };

        load();
        const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => { if (!cancelled) load(); });
        return () => { cancelled = true; sub?.subscription?.unsubscribe?.(); };
    }, []);

    // Note: we intentionally do not read tab from URL on initial load so refresh
    // always lands on the 'homebase' tab. Deep-links via URL were previously
    // supported but caused refreshes to persist a non-home tab; this was changed
    // to ensure a consistent home-first UX.

    // If navigation provided an initialTab via location.state (e.g. footer -> Order Tracking),
    // honor it for this navigation only (won't persist on refresh because state is not in the URL).
    React.useEffect(() => {
        try {
            const initial = location?.state?.initialTab;
            if (initial) {
                setActiveTab(initial);
            }
        } catch (err) {
            // ignore
        }
    }, [location?.state?.initialTab]);

    // Listen for auth state changes (sign in / user update) and refresh profile so
    // display name shows immediately after account creation or update.
    React.useEffect(() => {
        const onAuth = supabase.auth.onAuthStateChange((event, session) => {
            // When a session appears or the user is updated, refresh profile data
            if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED')) {
                fetchUserAndProfile();
            }
        });

        return () => {
            // Cleanup listener for both supabase v2 and v1 shapes
            try {
                if (onAuth?.data?.subscription?.unsubscribe) {
                    onAuth.data.subscription.unsubscribe();
                } else if (typeof onAuth === 'function') {
                    onAuth();
                }
            } catch (err) {
                // ignore cleanup errors
            }
        };
    }, [fetchUserAndProfile]);

    React.useEffect(() => {
        if (activeTab === "profile") {
            fetchUserAndProfile();
        }
    }, [activeTab, fetchUserAndProfile]);

    // Ensure profilePic is fetched directly from profiles table whenever the user id changes.
    React.useEffect(() => {
        let mounted = true;
        const loadAvatar = async () => {
            try {
                if (!session?.user?.id) {
                    if (mounted) setProfilePic(DEFAULT_AVATAR);
                    return;
                }
                const { data, error } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('user_id', session.user.id)
                    .single();
                if (!mounted) return;
                if (error || !data || !data.avatar_url) {
                    setProfilePic(DEFAULT_AVATAR);
                    try { if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', DEFAULT_AVATAR); } catch(e){}
                    return;
                }
                let publicUrl = data.avatar_url;
                if (!publicUrl.startsWith('http')) {
                    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(publicUrl);
                    publicUrl = urlData?.publicUrl || DEFAULT_AVATAR;
                }
                try { if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', publicUrl); } catch(e){}
                if (mounted) setProfilePic(publicUrl + '?t=' + Date.now());
            } catch (err) {
                if (mounted) setProfilePic(DEFAULT_AVATAR);
            }
        };
        loadAvatar();
        return () => { mounted = false; };
    }, [session?.user?.id]);

    // derive auth providers from session (supporting multiple supabase shapes)
    const providers = React.useMemo(() => {
        try {
            if (!session?.user) return [];
            if (Array.isArray(session.user.identities) && session.user.identities.length > 0) {
                return session.user.identities.map(i => (i.provider || '').toLowerCase()).filter(Boolean);
            }
            if (Array.isArray(session.user.app_metadata?.providers)) {
                return session.user.app_metadata.providers.map(p => (p || '').toLowerCase()).filter(Boolean);
            }
            if (Array.isArray(session.user.user_metadata?.providers)) {
                return session.user.user_metadata.providers.map(p => (p || '').toLowerCase()).filter(Boolean);
            }
            const possible = session.user.app_metadata?.provider || session.user.user_metadata?.provider;
            if (typeof possible === 'string') return [possible.toLowerCase()];
            return [];
        } catch (err) {
            return [];
        }
    }, [session]);

    const showChangePassword = providers.includes('email');

    // Helper: resolve a stored avatar value (storage path or absolute URL) to a usable public URL.
    const resolveAvatarUrl = (val) => {
        if (!val) return DEFAULT_AVATAR;
        try {
            if (typeof val === 'string') {
                // allow absolute http(s), blob (object URLs), data URIs, and app-relative public paths directly
                if (
                    val.startsWith('http') ||
                    val.startsWith('blob:') ||
                    val.startsWith('data:') ||
                    val.startsWith('/') ||
                    val.includes('/storage/v1/object/public/')
                ) return val;
                // otherwise treat as storage path and get public URL
                const { data } = supabase.storage.from('avatars').getPublicUrl(val);
                return data?.publicUrl || DEFAULT_AVATAR;
            }
            return DEFAULT_AVATAR;
        } catch (err) {
            return DEFAULT_AVATAR;
        }
    };

    // Debug helper: log and check the resolved avatar URL so we can see 403/404/CORS issues
    React.useEffect(() => {
    const resolved = resolveAvatarUrl(profilePic);
        try {
            console.debug('[Avatar] profilePic:', profilePic);
            console.debug('[Avatar] resolved URL:', resolved);
            if (resolved && resolved !== DEFAULT_AVATAR && resolved.startsWith('http')) {
                // do a lightweight check
                fetch(resolved, { method: 'HEAD' })
                    .then(res => {
                        console.debug('[Avatar] HEAD status for avatar:', res.status, resolved);
                    })
                    .catch(err => {
                        console.error('[Avatar] HEAD fetch error for avatar:', err, resolved);
                    });
            }
        } catch (e) {
            console.error('[Avatar] debug error', e);
        }
    }, [profilePic]);

    // Only fetch profile photo when session.user.id changes
    React.useEffect(() => {
        let isMounted = true;
        async function fetchProfilePhoto() {
            try {
                if (!session?.user?.id) {
                    if (isMounted) {
                        setProfilePhotoUrl(DEFAULT_AVATAR);
                        try { if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', DEFAULT_AVATAR); } catch(e){}
                    }
                    return;
                }
                const { data, error } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('user_id', session.user.id)
                    .single();
                if (!isMounted) return;
                if (error || !data || !data.avatar_url) {
                    setProfilePhotoUrl(DEFAULT_AVATAR);
                    try { if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', DEFAULT_AVATAR); } catch(e){}
                } else {
                    let publicUrl = data.avatar_url;
                    if (typeof publicUrl === 'string' && !publicUrl.startsWith('http') && !publicUrl.startsWith('data:') && !publicUrl.startsWith('blob:') && !publicUrl.startsWith('/') && !publicUrl.includes('/storage/v1/object/public/')) {
                        try {
                            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.avatar_url);
                            publicUrl = urlData?.publicUrl || DEFAULT_AVATAR;
                        } catch (err) {
                            console.error('[Avatar] getPublicUrl error', err);
                            publicUrl = DEFAULT_AVATAR;
                        }
                    }
                    setProfilePhotoUrl(publicUrl || DEFAULT_AVATAR);
                    try { if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', publicUrl || DEFAULT_AVATAR); } catch(e){}
                }
            } catch (err) {
                console.error('[Avatar] fetchProfilePhoto error', err);
                if (isMounted) setProfilePhotoUrl(DEFAULT_AVATAR);
            }
        }
        fetchProfilePhoto();
        return () => { isMounted = false; };
    }, [session?.user?.id]);

    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // create preview URL and update both local state and cached profilePhotoUrl
            const previewUrl = URL.createObjectURL(file);
            // revoke previous object URL if any
            try {
                if (selectedFile && profilePic && typeof profilePic === 'string' && profilePic.startsWith('blob:')) {
                    URL.revokeObjectURL(profilePic);
                }
            } catch (e) {
                // ignore
            }
            setSelectedFile(file);
            setProfilePic(previewUrl);
            setProfilePhotoUrl(previewUrl);
            try { if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', previewUrl); } catch(e){}
        }
    };

    const handleRemoveProfilePicture = async () => {
        const user = session?.user;
        if (!user) return;

        // Revoke any blob url used for preview
        try {
            if (profilePic && typeof profilePic === 'string' && profilePic.startsWith('blob:')) {
                URL.revokeObjectURL(profilePic);
            }
        } catch (e) {
            // ignore
        }

        // Optimistic UI update
        setSelectedFile(null);
        setProfilePic(DEFAULT_AVATAR);
        setProfilePhotoUrl(DEFAULT_AVATAR);
        try { if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', DEFAULT_AVATAR); } catch(e){}

        // Remove avatar_url from profiles table
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('user_id', user.id);
            if (error) {
                console.error('Error removing avatar_url from profiles:', error);
                alert('Could not remove profile picture: ' + (error.message || 'Unknown error'));
                return;
            }
        } catch (err) {
            console.error('Unexpected error removing profile picture:', err);
            alert('Unexpected error removing profile picture');
            return;
        }

        // Refresh profile and page so other components pick up change
        await fetchUserAndProfile();
        try { window.location.reload(); } catch(e) { /* ignore */ }
    };

    // Name validation: allow letters (including repeats), spaces, hyphen, apostrophe;
    // disallow consecutive repeated special characters (space, hyphen, apostrophe)
    const validateName = (name) => {
        if (typeof name !== 'string' || name.trim().length === 0) return false;
        const allowed = /^[A-Za-z'\- ]+$/;
        if (!allowed.test(name)) return false;
        // disallow consecutive repeated special chars: ' ', '-', '\''
        for (let i = 1; i < name.length; i++) {
            const prev = name[i - 1];
            const cur = name[i];
            if ((prev === ' ' || prev === '-' || prev === "'") && prev === cur) {
                return false;
            }
        }
        return true;
    };

    // Heuristic to detect obviously invalid/repetitive names (used by profile + address editors)
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

    const handleFirstNameChange = (e) => {
        // strip digits so user cannot enter numbers
        const raw = e.target.value;
        let val = String(raw).replace(/[0-9]/g, '');
        // enforce max length 32 (use same message as Signup)
        if (val.length > 32) {
            val = val.slice(0, 32);
            setFirstName(val);
            setFirstNameError("First name cannot exceed 32 characters.");
            return;
        }
        // First name must be a single word (no spaces)
        if (val && String(val).trim().includes(' ')) {
            setFirstName(val);
            setFirstNameError('Choose only one of your first names.');
            return;
        }
        // block obviously invalid repetitive names
        if (isLikelyInvalidName(val)) {
            setFirstNameError('Please enter a valid name.');
            return;
        }
        setFirstName(val);
        if (val === "") {
            setFirstNameError("");
            return;
        }
        if (!validateName(val)) {
            setFirstNameError("Only letters and special characters is allowed. No consecutive repeated special characters.");
        } else {
            setFirstNameError("");
        }
    };

    const handleLastNameChange = (e) => {
        // strip digits so user cannot enter numbers
        const raw = e.target.value;
        let val = String(raw).replace(/[0-9]/g, '');
        // enforce max length 32 (use same message as Signup)
        if (val.length > 32) {
            val = val.slice(0, 32);
            setLastName(val);
            setLastNameError("Last name cannot exceed 32 characters.");
            return;
        }
        // block obviously invalid repetitive names
        if (isLikelyInvalidName(val)) {
            setLastNameError('Please enter a valid last name.');
            return;
        }
        setLastName(val);
        if (val === "") {
            setLastNameError("");
            return;
        }
        // Last name must be at most two words (one or two words allowed)
        const words = String(val).trim().split(/\s+/).filter(Boolean);
        if (words.length > 2) {
            setLastNameError('Last name may contain at most two words (e.g., "De La").');
            return;
        }
        if (!validateName(val)) {
            setLastNameError("Only letters and special characters is allowed. No consecutive repeated special characters.");
        } else {
            setLastNameError("");
        }
    };

    const handleSaveChanges = async () => {
        const user = session?.user;
        if (!user) return;

        // Require last name to be present
        if (!lastName || String(lastName).trim() === '') {
            setLastNameError('Last name is required.');
            return;
        }

        // Require last name to be at most two words (one or two words allowed)
        const lnWords = String(lastName).trim().split(/\s+/).filter(Boolean);
        if (lnWords.length > 2) {
            setLastNameError('Last name may contain at most two words (e.g., "De La").');
            return;
        }

        // enforce length limits before saving
        if ((firstName || '').length > 32) {
            setFirstNameError('First name cannot exceed 32 characters.');
            return;
        }
        if ((lastName || '').length > 32) {
            setLastNameError('Last name cannot exceed 32 characters.');
            return;
        }

        let avatar_url = null;

        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = fileName;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, selectedFile, { upsert: true });

            if (uploadError) {
                alert("Error uploading profile picture: " + uploadError.message);
                console.error("Error uploading profile picture:", uploadError.message);
                return;
            }

            const { data: publicData } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

            avatar_url = publicData?.publicUrl;
        } else {
            const { data: profileData } = await supabase
                .from("profiles")
                .select("avatar_url")
                .eq("user_id", user.id)
                .single();
            avatar_url = profileData?.avatar_url || DEFAULT_AVATAR;
        }

        const updates = {
            email: email,
            data: {
                display_name: `${firstName} ${lastName}`.trim(),
            },
        };
        const { error } = await supabase.auth.updateUser(updates);
        if (error) {
            alert("Error updating profile: " + error.message);
            console.error("Error updating profile:", error.message);
            if (error.message.toLowerCase().includes("expired")) {
                alert("The confirmation link has expired or is invalid. Please try updating your email again.");
            }
            return;
        }

        if (user.id) {
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url })
                .eq("user_id", user.id);
            if (updateError) {
                alert("Error updating profile picture: " + updateError.message);
                console.error("Error updating profile picture URL to profiles table:", updateError.message);
                return;
            }
        }

    setSelectedFile(null);
    setSuccessMsg("Profile updated successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
    await fetchUserAndProfile();
    // Refresh the page to ensure all components pick up the new avatar/profile data
    try { window.location.reload(); } catch (e) { console.warn('Could not reload window', e); }
    };

    
    const handleSavePasswordChanges = async () => {
        const user = session?.user;
        if (!user) return;

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword,
        });

        if (signInError) {
            setIsCurrentPasswordIncorrect(true);
            return;
        } else {
            setIsCurrentPasswordIncorrect(false);
        }

        if (newPassword !== repeatPassword) {
            alert("Passwords do not match.");
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) {
            alert("Error updating password: " + error.message);
            console.error("Error updating password:", error.message);
            return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setRepeatPassword("");
        setPasswordSuccessMsg("Password updated successfully.");
        setTimeout(() => setPasswordSuccessMsg(""), 3000);
    };

    const handleAddressChange = (e) => {
        // Support both real events and synthetic objects passed in (see postal_code/phone handlers)
        const target = e?.target || e || {};
        const { name, value, type, checked } = target;

        let newValue = type === "checkbox" ? checked : value;

        // For address name fields, strip digits so user cannot enter numbers
        if (name === 'first_name' || name === 'last_name') {
            const raw = String(value || '');
            const hadDigits = /[0-9]/.test(raw);
            // strip digits
            let v = raw.replace(/[0-9]/g, '');
            // enforce max length 32 and reuse signup messages
            if (v.length > 32) {
                v = v.slice(0, 32);
                if (name === 'first_name') {
                    setAddressFirstNameError('First name cannot exceed 32 characters.');
                } else {
                    setAddressLastNameError('Last name cannot exceed 32 characters.');
                }
                newValue = v;
                // immediately update form with trimmed value and return early
                setAddressForm((prev) => ({ ...prev, [name]: newValue }));
                return;
            }
                // If the new value looks obviously invalid (repetitive), stop the update and show error
                if (v && isLikelyInvalidName(v)) {
                    if (name === 'first_name') setAddressFirstNameError('Please enter a valid name.');
                    else setAddressLastNameError('Please enter a valid last name.');
                    // do not update the form value so user typing is effectively blocked until they correct
                    return;
                }
                newValue = v;
                // set digit-related error
                if (name === 'first_name') {
                    setAddressFirstNameError(hadDigits ? 'Numbers are not allowed in the First Name.' : '');
                } else {
                    setAddressLastNameError(hadDigits ? 'Numbers are not allowed in the Last Name.' : '');
                }
        }

        setAddressForm((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };

    // Phone helpers: UX shows +63 and accepts 10 digits starting with 9; store as 09XXXXXXXXX
    const validatePHMobileLocal10 = (raw) => {
        try {
            const digits = String(raw || '').replace(/\D/g, '');
            if (digits.length !== 10) return 'Enter 10 digits after +63 (e.g., 9XXXXXXXXX).';
            if (!/^9\d{9}$/.test(digits)) return 'Must start with 9 and be 10 digits.';
            if (/^(\d)\1{9}$/.test(digits)) return 'Mobile number cannot be all the same digit.';
            return '';
        } catch {
            return 'Enter 10 digits after +63 (e.g., 9XXXXXXXXX).';
        }
    };
    const toLocal10 = (stored) => {
        const s = String(stored || '').replace(/\D/g, '');
        if (s.startsWith('63') && s.length >= 12) return s.slice(2);
        if (s.startsWith('09') && s.length >= 11) return s.slice(1);
        if (s.length === 10 && s.startsWith('9')) return s;
        return s.slice(-10);
    };
    const normalizePhoneForSave = (local10) => {
        const d = String(local10 || '').replace(/\D/g, '');
        if (d.length === 10 && d.startsWith('9')) return '0' + d;
        if (d.startsWith('63')) return '0' + d.slice(2);
        if (d.length === 11 && d.startsWith('09')) return d;
        return d;
    };
    const formatDisplayPhone = (stored) => {
        const digits = String(stored || '').replace(/\D/g, '');
        if (digits.startsWith('63')) return digits.slice(2);
        if (digits.startsWith('09')) return digits.slice(1);
        if (digits.startsWith('9')) return digits;
        return digits.slice(-10);
    };

    

    const handleAddressSubmit = async (e) => {
        e.preventDefault();
        if (!session?.user?.id) return;

        setAddressErrorMsg("");

        // Enforce name length limits to match signup behavior
        if ((addressForm.first_name || '').length > 32) {
            setAddressFirstNameError('First name cannot exceed 32 characters.');
            setAddressErrorMsg('Please fix the highlighted fields before saving.');
            return;
        }
        if ((addressForm.last_name || '').length > 32) {
            setAddressLastNameError('Last name cannot exceed 32 characters.');
            setAddressErrorMsg('Please fix the highlighted fields before saving.');
            return;
        }

        // Additional sanity check: reject obviously invalid names like repeated patterns (e.g., "wwwwww", "dadadads")
        if (isLikelyInvalidName(addressForm.first_name)) {
            setAddressFirstNameError('Please enter a valid name.');
            setAddressErrorMsg('Please fix the highlighted fields before saving.');
            return;
        }
        if (isLikelyInvalidName(addressForm.last_name)) {
            setAddressLastNameError('Please enter a valid last name.');
            setAddressErrorMsg('Please fix the highlighted fields before saving.');
            return;
        }

        // Validate required fields: ensure all address fields are present
        // Note: 'last_name' (surname) is optional per UX requirement
        const requiredFields = [
            'first_name', 'street_address', 'province', 'city', 'postal_code', 'phone_number', 'label'
        ];
        const missing = requiredFields.filter(f => !addressForm[f] || (typeof addressForm[f] === 'string' && addressForm[f].trim() === ''));
        if (missing.length > 0) {
            setAddressErrorMsg('Please fill in all required address fields.');
            return;
        }

        // Validate phone number format (+63 prefix UX, 10 digits)
        const phoneErr = validatePHMobileLocal10(addressForm.phone_number);
        setAddressPhoneError(phoneErr);
        if (phoneErr) {
            setAddressErrorMsg('Please enter a valid Philippine mobile number.');
            return;
        }

        // enforce street address min length
        if (String(addressForm.street_address || '').trim().length > 0 && String(addressForm.street_address || '').trim().length < 5) {
            setAddressStreetError('Please enter at least 5 characters.');
            setAddressErrorMsg('Please fix the highlighted fields before saving.');
            return;
        }

        // Ensure label is either 'Home' or 'Work'
        if (!['Home', 'Work'].includes(addressForm.label)) {
            setAddressErrorMsg("Invalid address label. Please select 'Home' or 'Work'.");
            return;
        }

        if (addressForm.is_default) {
            await supabase
                .from("addresses")
                .update({ is_default: false })
                .eq("user_id", session.user.id);
        }

        // Choose which address_id to use for upsert:
        // prefer explicit editingAddressId (set when Edit was clicked),
        // otherwise use addressForm.address_id if present, else generate new
        const addressIdToUse = editingAddressId ?? addressForm.address_id ?? uuidv4();
        const upsertData = {
            ...addressForm,
            phone_number: normalizePhoneForSave(addressForm.phone_number),
            user_id: session.user.id,
            address_id: addressIdToUse,
        };

        // If we are editing an existing address, perform an update.
        // Otherwise, perform an insert. This avoids accidentally creating a new row
        // during edit which could trigger server-side checks (like max addresses).
        if (editingAddressId || addressForm.address_id) {
            const idToUpdate = addressIdToUse;
            const { error: updateError } = await supabase
                .from('addresses')
                .update(upsertData)
                .eq('address_id', idToUpdate)
                .eq('user_id', session.user.id);

            if (updateError) {
                console.error('Error updating address:', updateError.message);
                if (updateError.message && updateError.message.includes('addresses_label_check')) {
                    setAddressErrorMsg("Invalid address label. Please select 'Home' or 'Work'.");
                } else {
                    setAddressErrorMsg(`Error saving address: ${updateError.message || 'Unknown error'}`);
                }
                return;
            }
        } else {
            const { error: insertError } = await supabase
                .from('addresses')
                .insert(upsertData);

            if (insertError) {
                console.error('Error inserting address:', insertError.message);
                if (insertError.message && insertError.message.includes('addresses_label_check')) {
                    setAddressErrorMsg("Invalid address label. Please select 'Home' or 'Work'.");
                } else {
                    setAddressErrorMsg(`Error saving address: ${insertError.message || 'Unknown error'}`);
                }
                return;
            }
        }

        setAddressSuccessMsg("Address saved successfully!");
    setAddressErrorMsg("");
    setAddressStreetError("");
    setAddressPhoneError("");
    // clear inline name errors after successful save
    setAddressFirstNameError("");
    setAddressLastNameError("");
    // Clear editing state after save so subsequent Add creates new address
    setEditingAddressId(null);
        setTimeout(() => setAddressSuccessMsg(""), 3000);
        fetchUserAndProfile();
        setShowAddressEditor(false);
        setTimeout(() => {
            setAddressForm({
                first_name: "",
                last_name: "",
                street_address: "",
                province: "",
                city: "",
                postal_code: "",
                phone_number: "",
                label: "Home",
                is_default: false,
                address_id: undefined,
            });
        }, 100);
    };

    const handleEditAddress = (address) => {
        setAddressForm({
            ...address,
            phone_number: toLocal10(address.phone_number)
        });
        // mark which address is being edited so save will update instead of creating new
        setEditingAddressId(address.address_id || null);
        setProvinceInput(address.province || "");
        setAddressErrorMsg("");
    // clear street error when opening editor
    setAddressStreetError("");
    // clear any inline name errors when opening the editor
    setAddressFirstNameError("");
    setAddressLastNameError("");
        setShowAddressEditor(true);
    };

    // Set active tab; do not persist to localStorage so refresh always shows 'homebase'
    const handleSetActiveTab = (tab) => {
        setActiveTab(tab);
    };

    const handleDeleteAddress = async (address_id) => {
        if (!session?.user?.id) return;

        const { error } = await supabase
            .from("addresses")
            .delete()
            .eq("address_id", address_id)
            .eq("user_id", session.user.id);

        if (error) {
            setAddressErrorMsg(`Error deleting address: ${error.message}`);
            console.error("Error deleting address:", error.message);
            return;
        }

        setAddressErrorMsg("");
        fetchUserAndProfile();
    };

    const handleSetDefaultAddress = async (address_id) => {
        if (!session?.user?.id) return;

        await supabase
            .from("addresses")
            .update({ is_default: false })
            .eq("user_id", session.user.id);

        const { error } = await supabase
            .from("addresses")
            .update({ is_default: true })
            .eq("address_id", address_id)
            .eq("user_id", session.user.id);

        if (error) {
            setAddressErrorMsg(`Error setting default address: ${error.message}`);
            console.error("Error setting default address:", error.message);
            return;
        }

        setAddressErrorMsg("");
        fetchUserAndProfile();
    };

    
    return (
        <div className="min-h-screen w-full bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
            <div className="flex flex-col tablet:flex-row justify-center gap-6 tablet:gap-[50px] h-full p-4 px-4 tablet:px-12 laptop:px-[100px]">
                {/* Mobile Tabs Nav */}
                <div className="tablet:hidden flex w-full overflow-x-auto gap-2 mb-2">
                    {[
                        { key: 'homebase', label: 'Homebase' },
                        { key: 'orders', label: 'Orders' },
                        { key: 'profile', label: 'Profile' },
                    ].map(t => (
                        <button
                            key={t.key}
                            className={`shrink-0 px-3 py-2 text-sm rounded border ${activeTab === t.key ? 'bg-[#2B4269] text-white border-[#2B4269]' : 'bg-white text-[#171738] border-gray-300'}`}
                            onClick={() => handleSetActiveTab(t.key)}
                        >{t.label}</button>
                    ))}
                    <div className="ml-auto" />
                </div>
                {/* Account Page Nav */}
                <div className="hidden tablet:flex flex-col rounded-lg p-4">
                    <div className="flex flex-col justify-center p-0">
                        <h1 className="text-2xl font-bold mb-4 text-black">
                            Welcome, {session?.user?.user_metadata?.display_name || session?.user?.user_metadata?.full_name || userName}.
                        </h1>
                    </div>
                    <div className="flex flex-col border border-black rounded w-[300px] justify-center">
                        <div className="border border-black rounded w-[300px] h-[244px] p-2" style={{ lineHeight: "50px" }}>
                            <button
                                className={`w-full border text-left text-[18px] font-dm-sans font-semibold rounded-none outline-none p-0 px-3 transition-colors focus:outline-none ${activeTab === 'homebase' ? 'bg-[#ECECEC] text-black' : 'bg-white text-black'}`}
                                onClick={() => handleSetActiveTab('homebase')}
                            >Homebase</button>
                            <button
                                className={`w-full border text-left text-[18px] font-dm-sans font-semibold rounded-none outline-none p-0 px-3 transition-colors focus:outline-none ${activeTab === 'orders' ? 'bg-[#ECECEC] text-black' : 'bg-white text-black'}`}
                                onClick={() => handleSetActiveTab('orders')}
                            >Orders</button>
                            <button
                                className={`w-full border text-left text-[18px] font-dm-sans font-semibold rounded-none outline-none p-0 px-3 transition-colors focus:outline-none ${activeTab === 'profile' ? 'bg-[#ECECEC] text-black' : 'bg-white text-black'}`}
                                onClick={() => handleSetActiveTab('profile')}
                            >Profile</button>
                            <hr className="my-2 border-black mb-2" />
                            <button
                                className="w-full border text-left text-[18px] font-dm-sans text-black font-semibold bg-transparent rounded-none outline-none p-0 px-3 "
                                onClick={async () => {
                                    await signOut();
                                    navigate("/");
                                }}
                            >Logout</button>
                        </div>
                    </div>
                </div>

                {/* Homebase */}
                {activeTab === "homebase" && (
                    <div className="flex flex-col rounded-lg p-4 w-full">
                        <div className="flex flex-row justify-end">
                            <p className="text-right text-black font-dm-sans font-bold text-[36px]">My Account</p>
                        </div>
                        <div>
                            <p className="text-[24px] text-black font-dm-sans">Your Last Order</p>
                            {/* Latest order card (same layout as Orders) */}
                            {ordersLoading ? (
                                <div className="text-gray-500 mt-4">Loading last order…</div>
                            ) : orders.length === 0 ? (
                                <p className="mt-7">You have not placed any orders.</p>
                            ) : (() => {
                                const o = orders[0];
                                const pill = statusPill(o.status);
                                return (
                                    <div className="w-full flex items-start gap-4 tablet:gap-[70px] mt-4">
                                        {/* Thumbnail */}
                                                    <div className="w-[60px]">
                                                        <div className="w-[107px] h-[105px] relative z-0">
                                                            <img src={o.img} alt={`Order ${o.id}`} className="w-[107px] h-[105px] object-contain rounded z-0" onError={(e)=>{e.currentTarget.src='/logo-icon/logo.png';}} />
                                                            {o.extraCount > 0 && (
                                                                <div className="absolute top-1 right-1 z-10 bg-white/9 h-[90px] justify-end flex flex-col  px-1.5 py-0.5 text-[16px] leading-none text-[#171738] font-semibold">+{o.extraCount}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                        {/* Labeled grid like Orders */}
                                        <div className="flex flex-row border border-[#939393] rounded-lg p-3 w-full overflow-x-auto">
                                            <div className="flex-1 ">
                                                <div className="grid grid-cols-4 gap-10 text-[#171738] text-sm font-dm-sans border-b border-[#939393] w-full min-w-[640px] pb-2 mb-2">
                                                    <div className="min-w-[120px] font-semibold text-[16px]">Order</div>
                                                    <div className="min-w-[160px] ml-[-70px] font-semibold text-[16px]">Date</div>
                                                    <div className="min-w-[140px] ml-[-50px] font-semibold text-[16px]">Status</div>
                                                    <div className="min-w-[120px] ml-[-70px] font-semibold text-[16px]">Total</div>
                                                </div>
                                                <div className="grid grid-cols-5 gap-6 tablet:gap-10 items-center min-w-[640px]">
                                                    <div className="min-w-[120px]"><a href={`/order?order_id=${o.id}`} onClick={(e)=>{e.preventDefault(); navigate(`/order?order_id=${o.id}`);}} className="text-black font-semibold">#{o.id}</a></div>
                                                    <div className="min-w-[160px] ml-[-30px]  font-dm-sans text-[#171738]">{formatDate(o.date)}</div>
                                                    <div className={`min-w-[140px] font-dm-sans ml-[20px] font-semibold ${pill.className}`}>{pill.label}</div>
                                                    <div className="min-w-[120px] ml-[40px] font-dm-sans text-[#171738]">{php(o.total)}</div>
                                                    <button className="text-[#2B4269] bg-transparent underline" onClick={()=>navigate(`/order?order_id=${o.id}`)}>View</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="mt-[50px]">
                            <p className="text-[24px] text-black font-dm-sans">Recently Viewed Products</p>
                            <div className="mt-4">
                                <div className="grid grid-cols-1 phone:grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 semi-bigscreen:grid-cols-4 biggest:grid-cols-5 gap-6">
                                    {(recentLoading ? Array.from({ length: 8 }) : recent).map((item, idx) => (
                                        <div key={item?.id || idx} className="p-0 text-center group relative w-[230px] mx-auto">
                                            <div className="relative w-[230px] h-48 mb-4 mx-auto overflow-hidden  rounded-[4px] bg-white">
                                                {recentLoading ? (
                                                    <div className="animate-pulse bg-gray-200 w-full h-full" />
                                                ) : (
                                                    <a
                                                        href={item.href}
                                                        onClick={e => { e.preventDefault(); navigate(item.href); }}
                                                        className="block w-full h-full"
                                                        title={item.name}
                                                    >
                                                        <img
                                                            src={item.img}
                                                            alt={item.name}
                                                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110 cursor-pointer"
                                                        />
                                                    </a>
                                                )}
                                            </div>
                                            <h3 className="font-dm-sans font-semibold mt-2 text-black text-center cursor-pointer">
                                                {recentLoading ? (
                                                    <span className="inline-block w-24 h-4 bg-gray-200 animate-pulse rounded" />
                                                ) : (
                                                    <a
                                                        href={item.href}
                                                        onClick={e => { e.preventDefault(); navigate(item.href); }}
                                                        className="text-black hover:text-black"
                                                    >
                                                        {item.name}
                                                    </a>
                                                )}
                                            </h3>
                                        </div>
                                    ))}
                                </div>
                                {!recentLoading && recent.length === 0 && (
                                    <div className="text-[#171738] font-normal py-4">You have not viewed any products.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Orders */}
                {activeTab === "orders" && (
                    <div className="flex flex-col rounded-lg p-4 w-full">
                        <div className="flex flex-row justify-end">
                            <p className="text-right text-black font-dm-sans font-bold text-[36px]">My Account</p>
                        </div>
                        <div>
                            <p className="text-[24px] text-black font-dm-sans">Orders</p>
                        </div>
                        <div className="mt-[50px]">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    placeholder="Search by Order # or Product Name"
                                    className="w-full rounded-full border border-gray-300 py-4 pl-8 pr-12 text-[24px] text-gray-400 font-dm-sans focus:outline-none bg-white"
                                    value={ordersSearch}
                                    onChange={(e)=>setOrdersSearch(e.target.value)}
                                />
                                <span className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                                    </svg>
                                </span>
                            </div>
                            <div className="flex justify-end mt-2">
                                <span className="text-gray-500 text-[18px] font-dm-sans">Showing {ordersLoading ? 0 : orders.filter(orderMatches).length} Orders</span>
                            </div>
                            {/* Status filter chips and date range stub */}
                            <div className="flex items-center gap-[80px] mt-3 mb-3">
                                <div className="flex-1 flex max-w-[600px] items-center gap-2 overflow-x-auto whitespace-nowrap p-3 pr-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                                    {[
                                        { key: 'all', label: 'All' },
                                        { key: 'in-progress', label: 'In Progress' },
                                        { key: 'delivered', label: 'Delivered' },
                                        { key: 'cancelled', label: 'Cancelled' },
                                    ].map(f => (
                                        <button
                                            key={f.key}
                                            className={`shrink-0 px-3 py-1 text-sm rounded border ${statusFilter === f.key ? 'bg-[#2B4269] text-white border-[#2B4269]' : 'bg-white text-[#171738] border-gray-300'}`}
                                            onClick={() => setStatusFilter(f.key)}
                                        >{f.label}</button>
                                    ))}
                                </div>
                                <div className="shrink-0 relative">
                                    <button
                                        type="button"
                                        className="px-3 py-1 text-sm rounded border bg-white text-[#171738] border-gray-300 flex items-center gap-2"
                                        onClick={() => setShowDateRangePicker(v => !v)}
                                    >
                                        <span>
                                            {dateRange && (dateRange.start || dateRange.end)
                                                ? `${toInputDate(dateRange.start) || ''}${(dateRange.start || dateRange.end) ? ' → ' : ''}${toInputDate(dateRange.end) || ''}`.trim()
                                                : 'Select date range'
                                            }
                                        </span>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M7 10l5 5 5-5H7z"/></svg>
                                    </button>

                                    {showDateRangePicker && (
                                        <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded p-3 shadow z-20 w-[320px]">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-sm text-black">From</label>
                                                <input
                                                    type="date"
                                                    className="w-full border border-gray-300 rounded px-2 py-1"
                                                    value={toInputDate(dateRange.start)}
                                                    onChange={(e) => setDateRange(d => ({ ...d, start: e.target.value || null }))}
                                                />
                                                <label className="text-sm text-black">To</label>
                                                <input
                                                    type="date"
                                                    className="w-full border border-gray-300 rounded px-2 py-1"
                                                    value={toInputDate(dateRange.end)}
                                                    onChange={(e) => setDateRange(d => ({ ...d, end: e.target.value || null }))}
                                                />
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        className="px-3 py-1 border rounded text-sm"
                                                        onClick={() => { setDateRange({ start: null, end: null }); setShowDateRangePicker(false); }}
                                                    >
                                                        Clear
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="px-3 py-1 bg-[#3B5B92] text-white rounded text-sm"
                                                        onClick={() => { setShowDateRangePicker(false); }}
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            

                            {/* Orders list */}
                            <div className="mt-5 space-y-4 max-h-[480px] overflow-y-auto pr-2">
                                {ordersLoading ? (
                                    <div className="text-gray-500">Loading orders…</div>
                                ) : orders.length === 0 ? (
                                    <div className="text-gray-500">You have not placed any orders.</div>
                                ) : (
                                    orders
                                        .filter(orderMatches)
                                        .map((o) => {
                                            const pill = statusPill(o.status);
                                            return (
                                                <div key={o.id} className="w-full flex items-start gap-4 tablet:gap-[70px] ">
                                                    {/* Thumbnails stack */}
                                                    <div className="w-[60px]">
                                                        <div className="w-[107px] h-[105px] relative z-0">
                                                            <img src={o.img} alt={`Order ${o.id}`} className="w-[107px] h-[105px] object-contain rounded z-0" onError={(e)=>{e.currentTarget.src='/logo-icon/logo.png';}} />
                                                            {o.extraCount > 0 && (
                                                                <div className="absolute top-1 right-1 z-10 bg-white/9 h-[90px] justify-end flex flex-col  px-1.5 py-0.5 text-[16px] leading-none text-[#171738] font-semibold">+{o.extraCount}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Labeled grid */}
                                                    <div className="flex flex-row border border-[#939393] rounded-lg p-3 overflow-x-auto">
                                                        <div className="flex-1 ">
                                                            <div className="grid grid-cols-4 gap-10 text-[#171738] text-sm font-dm-sans border-b border-[#939393] w-full min-w-[640px] pb-2 mb-2">
                                                                <div className="min-w-[120px] font-semibold text-[16px]">Order</div>
                                                                <div className="min-w-[160px] ml-[-70px] font-semibold text-[16px]">Date</div>
                                                                <div className="min-w-[140px] ml-[-50px] font-semibold text-[16px]">Status</div>
                                                                <div className="min-w-[120px] ml-[-70px] font-semibold text-[16px]">Total</div>
                                                            </div>
                                                            <div className="grid grid-cols-5 gap-6 tablet:gap-10 items-center min-w-[640px]">
                                                                <div className="min-w-[120px]"><a href={`/order?order_id=${o.id}`} onClick={(e)=>{e.preventDefault(); navigate(`/order?order_id=${o.id}`);}} className="text-black font-semibold">#{o.id}</a></div>
                                                                <div className="min-w-[160px] ml-[-30px]  font-dm-sans text-[#171738]">{formatDate(o.date)}</div>
                                                                <div className={`min-w-[140px] font-dm-sans ml-[20px] font-semibold ${pill.className}`}>{pill.label}</div>
                                                                <div className="min-w-[120px] ml-[40px] font-dm-sans text-[#171738]">{php(o.total)}</div>
                                                                <button className="text-[#2B4269] bg-transparent underline" onClick={()=>navigate(`/order?order_id=${o.id}`)}>View</button>
                                                            </div>
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

                {/* Profile */}
                {activeTab === "profile" && (
                    <div className="flex flex-col rounded-lg p-4 w-full">
                        <div className="flex flex-row justify-end">
                            <p className="text-right text-black font-dm-sans font-bold text-[36px]">My Account</p>
                        </div>
                            <div className="mt-6">
                            <p className="text-[24px] text-black font-dm-sans">Personal Information</p>
                            <p className="mt-10 font-dm-sans text-black text-[16px]">MY INFORMATION</p>
                            <div className="flex flex-col tablet:flex-row gap-6 tablet:gap-10 mt-8 items-start">

                                <div className="flex flex-col">
                                    <div className="relative flex flex-row items-center">
                                        <img
                                            src={(selectedFile && profilePic) ? profilePic : (resolveAvatarUrl(profilePhotoUrl) || resolveAvatarUrl(profilePic) || DEFAULT_AVATAR)}
                                            alt="Profile"
                                            className="w-24 h-24 tablet:w-32 tablet:h-32 rounded-full object-cover bg-gray-300"
                                            onError={(e) => {
                                                try { console.error('[Avatar] <img> failed to load src=', e?.target?.src); } catch (er) {}
                                                try { if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', DEFAULT_AVATAR); } catch (e) {}
                                                setProfilePic(DEFAULT_AVATAR);
                                                setProfilePhotoUrl(DEFAULT_AVATAR);
                                            }}
                                        />
                                        <label
                                            htmlFor="profilePicUpload"
                                            className="absolute bottom-2 left-16 tablet:left-20 cursor-pointer bg-white rounded-full p-1 shadow-md border border-gray-300"
                                            aria-label="Upload profile picture"
                                        >
                                            <img src="/logo-icon/camera-icon.svg" alt="Upload" className="w-6 h-6" />
                                            <input
                                                id="profilePicUpload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleProfilePicChange}
                                                aria-label="Upload profile picture input"
                                            />
                                        </label>

                                        

                                        
                                    </div>

                                    <div>
                                    {/* Remove button: show only when avatar is not the default */}
                                        {(profilePhotoUrl && profilePhotoUrl !== DEFAULT_AVATAR) && (
                                            <div className="mt-4 flex justify-center">
                                                <button
                                                    type="button"
                                                    aria-label="Remove profile picture"
                                                    className="px-3 py-1 text-[12px] rounded-md border border-gray-200 text-red-600 bg-white hover:bg-red-50 focus:outline-none flex items-center gap-2"
                                                    onClick={() => {
                                                        if (typeof window !== 'undefined' && window.confirm && !window.confirm('Remove profile picture?')) return;
                                                        handleRemoveProfilePicture();
                                                    }}
                                                >
                                                    <img src="/logo-icon/trash.svg" alt="Trash" className="h-5 w-5" />
                                                    <span>Remove</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                    
                                
                                <form className="flex-1 grid grid-cols-1 tablet:grid-cols-2 gap-6">
                                    <div className="flex flex-col col-span-1">
                                        <label className="text-black font-dm-sans mb-2">First Name</label>
                                        <input
                                            type="text"
                                            className="border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                            value={firstName}
                                            onChange={handleFirstNameChange}
                                            placeholder={session?.user?.user_metadata?.display_name?.split(' ')[0] || "First Name"}
                                        />
                                        {firstNameError && <p className="text-red-600 font-dm-sans text-sm mt-1">{firstNameError}</p>}
                                    </div>
                                    <div className="flex flex-col col-span-1">
                                        <label className="text-black font-dm-sans mb-2">Last Name</label>
                                        <input
                                            type="text"
                                            className="border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                            value={lastName}
                                            onChange={handleLastNameChange}
                                            placeholder={session?.user?.user_metadata?.display_name?.split(' ')[2] || "Last Name"}
                                        />
                                        {lastNameError && <p className="text-red-600 font-dm-sans text-sm mt-1">{lastNameError}</p>}
                                    </div>
                                    <div className="flex flex-col col-span-2">
                                        <label className="text-black font-dm-sans mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            className="border border-gray-400 rounded-md px-4 py-3 text-gray-400 focus:outline-none font-dm-sans bg-white"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="user@gmail.com"
                                            readOnly
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="flex w-full justify-end mt-6">
                                <button
                                    type="button"
                                    disabled={Boolean(firstNameError) || Boolean(lastNameError) || !String(lastName || '').trim() || String(firstName || '').trim().includes(' ') || (String(lastName || '').trim().split(/\s+/).filter(Boolean).length > 2)}
                                    className={`bg-[#3B5B92] text-white font-bold font-dm-sans px-6 py-2 rounded-md focus:outline-none focus:ring-0 ${ (firstNameError || lastNameError || !String(lastName || '').trim() || String(firstName || '').trim().includes(' ') || (String(lastName || '').trim().split(/\s+/).filter(Boolean).length > 2)) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2a4370]'}`}
                                    onClick={handleSaveChanges}
                                >
                                    {successMsg ? successMsg : "Save Changes"}
                                </button>
                            </div>
                        </div>
                        <hr className="my-2 border-black mb-4 mt-5" />

                        {/* Change Password */}
                        {showChangePassword ? (
                            <div>
                                <p className="mt-10 font-dm-sans text-black">CHANGE PASSWORD</p>
                                <form className="mt-7 w-full">
                                    <p className="font-dm-sans">Current Password</p>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            className="w-full tablet:w-[49%] border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                            value={currentPassword}
                                            onChange={e => setCurrentPassword(e.target.value)}
                                            placeholder="Enter your current password"
                                        />
                                        {isCurrentPasswordIncorrect && (
                                            <span className="ml-4 text-red-600">
                                                Incorrect password.
                                            </span>
                                        )}
                                    </div>
                                </form>
                                <a href="/forgot-password">Forgot Password?</a>
                                <form className="mt-2 w-full grid grid-cols-1 tablet:grid-cols-2 gap-4">
                                    <div>
                                        <p className="font-dm-sans">New Password</p>
                                        <input
                                            type="password"
                                            className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="Enter your new password"
                                        />
                                    </div>
                                    <div>
                                        <p className="font-dm-sans">Repeat Password</p>
                                        <input
                                            type="password"
                                            className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                            value={repeatPassword}
                                            onChange={e => setRepeatPassword(e.target.value)}
                                            placeholder="Repeat password"
                                        />
                                    </div>
                                </form>
                                <div className="flex justify-end mt-4">
                                    <button
                                        type="button"
                                        className="bg-[#3B5B92] text-white font-bold font-dm-sans px-6 py-2 rounded-md hover:bg-[#2a4370] focus:outline-none focus:ring-0"
                                        onClick={() => {
                                            if (!isCurrentPasswordIncorrect) {
                                                handleSavePasswordChanges();
                                            }
                                        }}
                                    >
                                        {passwordSuccessMsg ? passwordSuccessMsg : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 mb-3">
                                <p className="text-black text-[16px] font-dm-sans">CHANGE PASSWORD</p>
                                <p className="mt-6 text-gray-600 font-dm-sans">Password is managed by your external provider Google. To change it, use your provider account settings.</p>
                            </div>
                        )}
                        <hr className="my-2 border-black mb-4 mt-5" />

                        {/* Saved Addresses */}
                        <div>
                            <p className="mt-4 mb-4 text-black font-dm-sans">SAVED ADDRESSES</p>
                            {addressSuccessMsg && (
                                <div className="text-green-600 font-dm-sans mb-4">
                                    {addressSuccessMsg}
                                </div>
                            )}
                            {addressErrorMsg && (
                                <div className="text-red-600 font-dm-sans mb-4">
                                    {addressErrorMsg}
                                </div>
                            )}
                            <div className="w-full">
                                <div className="flex flex-row gap-4 overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                                    {addresses.map((address) => (
                                        <div key={address.address_id} className="flex-shrink-0 border p-5 w-[295px] border-black rounded flex flex-col justify-between min-h-[280px]">
                                            <p className="font-dm-sans font-bold">{address.first_name} {address.last_name}</p>
                                            <p className="font-dm-sans">{address.street_address}, {address.barangay},</p>
                                            <p className="font-dm-sans">{address.city}, {address.province}.</p>
                                            <p className="font-dm-sans">{address.postal_code}</p>
                                            <p className="font-dm-sans">+63 {formatDisplayPhone(address.phone_number)}</p>
                                            <p className="font-dm-sans capitalize">{address.label}.</p>

                                            <div className="flex flex-row w-full p-1 mt-auto gap-[50px] items-center justify-center">

                                                {address.is_default && (
                                                    <div className="flex justify-center items-center w-full h-full">
                                                        <div className="bg-[#F19B7D] p-1 rounded">
                                                            <p className="font-dm-sans text-black text-[12px]">DEFAULT</p>

                                                       </div>
                                                       <p> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
                                                    </div>
                                                   
                                                    
                                                )}

                                                {!address.is_default && (
                                                    <div className="bg-[#F19B7D] p-1 rounded">
                                                       <p className="font-dm-sans text-black text-[12px]">ALTERNATIVE</p>
                                                    </div>
                                                )}

                                                <div className="flex flex-row gap-2">
                                                    <div>
                                                        <button
                                                            className="h-[30px] w-[58px] text-[10px] border  border-black bg-white text-black rounded hover:bg-[#3B5B92] hover:text-white"
                                                            onClick={() => handleEditAddress(address)}
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <button
                                                            className="h-[30px] w-[58px] text-[10px] border border-black rounded bg-white text-black hover:bg-red-600 hover:text-white"
                                                            onClick={() => handleDeleteAddress(address.address_id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>


                                                </div>

                                            </div>
                                        </div>
                                    ))}
                                    {addresses.length < 3 && (
                                        <div className="ml-[40px] flex flex-col justify-center align-center">
                                            <button
                                                type="button"
                                                className="border border-black rounded-full w-16 h-16 flex items-center justify-center bg-white hover:bg-[#f0f0f0] shadow-md"
                                                aria-label="Add Address"
                            onClick={() => {
                                // starting a new address - clear editing state
                                setEditingAddressId(null);
                                setAddressForm({
                                                        first_name: "",
                                                        last_name: "",
                                                        street_address: "",
                                                        province: "",
                                                        city: "",
                                                        postal_code: "",
                                                        phone_number: "",
                                                        label: "Home",
                                                        is_default: false,
                                                        address_id: undefined,
                                                    });
                                                    setProvinceInput("");
                                                    setAddressErrorMsg("");
                                                    setAddressSuccessMsg("");
                                                    setShowAddressEditor(true);
                                                }}
                                            >
                                                <img src="/logo-icon/add-icon.svg" alt="Add" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Address Editor */}
                            {showAddressEditor && (
                                <div className="w-full p-2 bg-[#F7F7F7] mt-5 border border-dashed border-[#c5c5c5] relative">
                                    {/* Close Button */}
                                    <button
                                        type="button"
                                        className="absolute top-2 right-2 text-black bg-white rounded-full p-2 shadow hover:bg-gray-200"
                                        aria-label="Close Address Editor"
                                        onClick={() => setShowAddressEditor(false)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <p className="mt-5 text-black font-dm-sans">EDIT ADDRESSES</p>
                                    <form onSubmit={handleAddressSubmit} className="w-full">
                                        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 mt-2">
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">First Name</p>
                                                <input
                                                    type="text"
                                                    className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                                    placeholder="First Name"
                                                    name="first_name"
                                                    value={addressForm.first_name}
                                                    onChange={handleAddressChange}
                                                />
                                                {addressFirstNameError && <p className="text-red-600 font-dm-sans text-sm mt-1">{addressFirstNameError}</p>}
                                            </div>
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">Last Name</p>
                                                <input
                                                    type="text"
                                                    className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                                    placeholder="Last Name"
                                                    name="last_name"
                                                    value={addressForm.last_name}
                                                    onChange={handleAddressChange}
                                                />
                                                {addressLastNameError && <p className="text-red-600 font-dm-sans text-sm mt-1">{addressLastNameError}</p>}
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-[16px] mt-2 font-dm-sans">Street Name/Building/House No.</p>
                                            <input
                                                type="text"
                                                className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white mt-2"
                                                placeholder="Street Name/Building/House No."
                                                name="street_address"
                                                value={addressForm.street_address}
                                                onChange={(e) => {
                                                    handleAddressChange(e);
                                                    // validate min length client-side
                                                    const val = String(e.target.value || '');
                                                    setAddressStreetError(val.trim().length > 0 && val.trim().length < 5 ? 'Please enter at least 5 characters.' : '');
                                                }}
                                            />
                                            {addressStreetError && <p className="text-red-600 font-dm-sans text-sm mt-1">{addressStreetError}</p>}
                                        </div>
                                        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 mt-2">
                                            {/* Province */}
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">Province</p>
                                                <div className="relative mt-2">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="text"
                                                            className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white pr-10"
                                                            placeholder="Select Province"
                                                            name="province_typable"
                                                            autoComplete="off"
                                                            value={provinceInput}
                                                            ref={provinceInputRef}
                                                            onFocus={() => setShowProvinceDropdown(true)}
                                                            onChange={e => {
                                                                const value = e.target.value;
                                                                setProvinceInput(value);
                                                                setShowProvinceDropdown(true);
                                                                if (value === "") {
                                                                    setAddressForm(f => ({ ...f, city: "", province: "" }));
                                                                }
                                                            }}
                                                            onBlur={() => setTimeout(() => setShowProvinceDropdown(false), 150)}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute right-2 top-1/2 bg-white transform -translate-y-1/2 p-1"
                                                            tabIndex={-1}
                                                            onMouseDown={e => {
                                                                e.preventDefault();
                                                                setShowProvinceDropdown(v => !v);
                                                                provinceInputRef.current && provinceInputRef.current.focus();
                                                            }}
                                                        >
                                                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>
                                                    </div>
                                                    {/* Dropdown */}
                                                    {showProvinceDropdown && filteredProvinces.length > 0 && (
                                                        <ul className="absolute z-10 w-full bg-white border border-[#3B5B92] rounded-md max-h-48 overflow-y-auto shadow-lg mt-1">
                                                            {filteredProvinces.map(prov => (
                                                                <li
                                                                    key={prov}
                                                                    className={`px-4 py-2 cursor-pointer hover:bg-[#eaeaea] text-black ${addressForm.province === prov ? 'bg-[#eaeaea]' : ''}`}
                                                                    style={{ color: 'black', backgroundColor: 'white' }}
                                                                    onMouseDown={e => {
                                                                        e.preventDefault();
                                                                        setAddressForm(f => ({ ...f, province: prov, city: "" }));
                                                                        setProvinceInput(prov);
                                                                        setShowProvinceDropdown(false);
                                                                    }}
                                                                >
                                                                    {prov}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                            {/* City */}
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">City</p>
                                                <div className="relative mt-2">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="text"
                                                            className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white pr-10"
                                                            placeholder={provinceInput ? (addressForm.province ? "Select City/Municipality" : "Select Province First") : "Select Province First"}
                                                            name="city_typable"
                                                            autoComplete="off"
                                                            value={addressForm.city}
                                                            ref={cityInputRef}
                                                            disabled={!provinceInput}
                                                            onFocus={() => { if (provinceInput) setShowCityDropdown(true); }}
                                                            onChange={e => {
                                                                setAddressForm(f => ({ ...f, city: e.target.value }));
                                                                setShowCityDropdown(true);
                                                            }}
                                                            onBlur={() => setTimeout(() => setShowCityDropdown(false), 150)}
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute bg-white right-2 top-1/2 transform -translate-y-1/2 p-1"
                                                            tabIndex={-1}
                                                            disabled={!provinceInput}
                                                            onMouseDown={e => {
                                                                if (!provinceInput) return;
                                                                e.preventDefault();
                                                                setShowCityDropdown(v => !v);
                                                                cityInputRef.current && cityInputRef.current.focus();
                                                            }}
                                                        >
                                                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>
                                                    </div>
                                                    {/* Dropdown */}
                                                    {showCityDropdown && addressForm.province && cityOptions.filter(c => c.toLowerCase().includes((addressForm.city || "").toLowerCase())).length > 0 && (
                                                        <ul className="absolute z-10 w-full bg-white border border-[#3B5B92] rounded-md max-h-48 overflow-y-auto shadow-lg mt-1">
                                                            {cityOptions.filter(c => c.toLowerCase().includes((addressForm.city || "").toLowerCase())).map(city => (
                                                                <li
                                                                    key={city}
                                                                    className={`px-4 py-2 cursor-pointer hover:bg-[#eaeaea] text-black ${addressForm.city === city ? 'bg-[#eaeaea]' : ''}`}
                                                                    style={{ color: 'black' }}
                                                                    onMouseDown={e => {
                                                                        e.preventDefault();
                                                                        setAddressForm(f => ({ ...f, city }));
                                                                        setShowCityDropdown(false);
                                                                    }}
                                                                >
                                                                    {city}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Barangay */}
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">Barangay</p>
                                                <div className="relative mt-2">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="text"
                                                            className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white pr-10"
                                                            placeholder={addressForm.city ? "Select Barangay" : "Select City First"}
                                                            name="barangay_typable"
                                                            autoComplete="off"
                                                            value={addressForm.barangay || barangayInput}
                                                            ref={barangayInputRef}
                                                            disabled={!addressForm.city}
                                                            onFocus={() => { if (addressForm.city) setShowBarangayDropdown(true); }}
                                                            onChange={e => {
                                                                setAddressForm(f => ({ ...f, barangay: e.target.value }));
                                                                setShowBarangayDropdown(true);
                                                            }}
                                                            onBlur={() => setTimeout(() => setShowBarangayDropdown(false), 150)}
                                                                required
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute bg-white right-2 top-1/2 transform -translate-y-1/2 p-1"
                                                            tabIndex={-1}
                                                            disabled={!addressForm.city}
                                                            onMouseDown={e => {
                                                                if (!addressForm.city) return;
                                                                e.preventDefault();
                                                                setShowBarangayDropdown(v => !v);
                                                                barangayInputRef.current && barangayInputRef.current.focus();
                                                            }}
                                                        >
                                                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>
                                                    </div>
                                                    {/* Dropdown */}
                                                    {showBarangayDropdown && addressForm.city && barangayOptions.filter(b => b.toLowerCase().includes((addressForm.barangay || "").toLowerCase())).length > 0 && (
                                                        <ul className="absolute z-10 w-full bg-white border border-[#3B5B92] rounded-md max-h-48 overflow-y-auto shadow-lg mt-1">
                                                            {barangayOptions.filter(b => b.toLowerCase().includes((addressForm.barangay || "").toLowerCase())).map(barangay => (
                                                                <li
                                                                    key={barangay}
                                                                    className={`px-4 py-2 cursor-pointer hover:bg-[#eaeaea] text-black ${addressForm.barangay === barangay ? 'bg-[#eaeaea]' : ''}`}
                                                                    style={{ color: 'black' }}
                                                                    onMouseDown={e => {
                                                                        e.preventDefault();
                                                                        setAddressForm(f => ({ ...f, barangay }));
                                                                        setShowBarangayDropdown(false);
                                                                    }}
                                                                >
                                                                    {barangay}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Postal Code */}
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">Postal Code/Zip Code</p>
                                                <input
                                                    type="text"
                                                    className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white mt-2"
                                                    placeholder="Postal Code/Zip Code"
                                                    name="postal_code"
                                                    value={addressForm.postal_code}
                                                    onChange={e => {
                                                        // Only allow numbers
                                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                                        handleAddressChange({
                                                            target: {
                                                                name: 'postal_code',
                                                                value,
                                                                type: 'text',
                                                            }
                                                        });
                                                    }}
                                                    maxLength={4}
                                                    required
                                                />
                                            </div>
                                            {/* Phone Number & Label As side by side */}
                                            <div className="col-span-2 flex flex-col tablet:flex-row gap-4 items-stretch tablet:items-end">
                                                <div className="flex-1">
                                                    <p className="text-[16px] font-dm-sans mb-2">Phone Number</p>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 select-none">+63</span>
                                                        <input
                                                            type="text"
                                                            className="w-full border border-[#3B5B92] rounded-md pl-12 pr-4 py-3 text-black font-dm-sans bg-white"
                                                            placeholder="9XXXXXXXXX"
                                                            name="phone_number"
                                                            value={addressForm.phone_number}
                                                            onChange={e => {
                                                                const value = e.target.value.replace(/[^0-9]/g, '').slice(0,10);
                                                                handleAddressChange({ target: { name: 'phone_number', value, type: 'text' } });
                                                                setAddressPhoneError(validatePHMobileLocal10(value));
                                                            }}
                                                            maxLength={10}
                                                            required
                                                        />
                                                    </div>
                                                    {addressPhoneError && (
                                                        <p className="text-red-600 font-dm-sans text-sm mt-1">{addressPhoneError}</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-1 gap-4 items-end">
                                                    <div className="flex-1 flex flex-col">
                                                        <p className="text-[16px] font-dm-sans mb-2">Label As</p>
                                                        <div className="flex gap-4">
                                                            <button
                                                                type="button"
                                                                className={`w-full h-[48px] border border-[#3B5B92] rounded-md font-dm-sans text-[18px] font-bold ${addressForm.label === 'Work' ? 'bg-[#eaeaea] text-[#6B7280]' : 'bg-white text-black'}`}
                                                                style={{ pointerEvents: addressForm.label === 'Work' ? 'none' : 'auto' }}
                                                                onClick={() => setAddressForm(f => ({ ...f, label: 'Work' }))}
                                                            >Work</button>
                                                            <button
                                                                type="button"
                                                                className={`w-full h-[48px] border border-[#3B5B92] rounded-md font-dm-sans text-[18px] font-bold ${addressForm.label === 'Home' ? 'bg-[#eaeaea] text-[#6B7280]' : 'bg-white text-black'}`}
                                                                style={{ pointerEvents: addressForm.label === 'Home' ? 'none' : 'auto' }}
                                                                onClick={() => setAddressForm(f => ({ ...f, label: 'Home' }))}
                                                            >Home</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-2">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox h-5 w-5 text-[#3B5B92]"
                                                    name="is_default"
                                                    checked={addressForm.is_default}
                                                    onChange={handleAddressChange}
                                                />
                                                <span className="text-black font-dm-sans">Set as default address</span>
                                            </label>
                                        </div>
                                        <div className="flex items-center justify-end mt-6 gap-4">
                                            {addressErrorMsg ? (
                                                <div className="text-red-600 font-dm-sans text-sm mr-2" role="alert" aria-live="polite">
                                                    {addressErrorMsg}
                                                </div>
                                            ) : (
                                                // keep spacing consistent when there's no error
                                                <div style={{ minWidth: 0 }} />
                                            )}
                                            <button
                                                type="submit"
                                                className="bg-[#3B5B92] text-white font-bold font-dm-sans px-6 py-2 rounded-md hover:bg-[#2a4370] focus:outline-none focus:ring-0"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountPage;
