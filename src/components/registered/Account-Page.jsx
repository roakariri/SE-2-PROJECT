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

    const [activeTab, setActiveTab] = React.useState(() => {
        try {
            return localStorage.getItem('accountActiveTab') || 'homebase';
        } catch (err) {
            return 'homebase';
        }
    });
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
    const [showAddressEditor, setShowAddressEditor] = React.useState(false);

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
            const nameParts = finalDisplayName.split(" ");
            setFirstName(nameParts[0] || "");
            setLastName(nameParts[1] || "");

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

    // If the URL includes a query like ?tab=orders or a hash #orders, prefer that
    // over the stored activeTab. This allows other pages to deep-link into account sections.
    React.useEffect(() => {
        try {
            const params = new URLSearchParams(location.search);
            const tabFromQuery = params.get('tab');
            const hash = (location.hash || '').replace('#', '');
            if (tabFromQuery && ['homebase', 'orders', 'profile'].includes(tabFromQuery)) {
                setActiveTab(tabFromQuery);
                try { localStorage.setItem('accountActiveTab', tabFromQuery); } catch(e) {}
                return;
            }
            if (hash && ['homebase', 'orders', 'profile'].includes(hash)) {
                setActiveTab(hash);
                try { localStorage.setItem('accountActiveTab', hash); } catch(e) {}
                return;
            }
        } catch (err) {
            // ignore malformed URLs
        }
    }, [location.search, location.hash]);

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

    const handleFirstNameChange = (e) => {
        const val = e.target.value;
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
        const val = e.target.value;
        setLastName(val);
        if (val === "") {
            setLastNameError("");
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
        const { name, value, type, checked } = e.target;
        setAddressForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleAddressSubmit = async (e) => {
        e.preventDefault();
        if (!session?.user?.id) return;

        setAddressErrorMsg("");

        // Validate required fields: ensure all address fields are present
        const requiredFields = [
            'first_name', 'last_name', 'street_address', 'province', 'city', 'postal_code', 'phone_number', 'label'
        ];
        const missing = requiredFields.filter(f => !addressForm[f] || (typeof addressForm[f] === 'string' && addressForm[f].trim() === ''));
        if (missing.length > 0) {
            setAddressErrorMsg('Please fill in all required address fields.');
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

        // If editing, keep the same address_id, else generate new
        const isEditing = !!addressForm.address_id;
        const upsertData = {
            ...addressForm,
            user_id: session.user.id,
            address_id: isEditing ? addressForm.address_id : uuidv4(),
        };

        const { error } = await supabase
            .from("addresses")
            .upsert(upsertData, { onConflict: ['address_id'] });

        if (error) {
            console.error("Error saving address:", error.message);
            if (error.message.includes("addresses_label_check")) {
                setAddressErrorMsg("Invalid address label. Please select 'Home' or 'Work'.");
            } else {
                setAddressErrorMsg(`Error saving address: ${error.message}`);
            }
            return;
        }

        setAddressSuccessMsg("Address saved successfully!");
        setAddressErrorMsg("");
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
        setAddressForm(address);
        setProvinceInput(address.province || "");
        setAddressErrorMsg("");
        setShowAddressEditor(true);
    };

    // Keep active tab persisted so the selected nav stays grayed-out across reloads
    const handleSetActiveTab = (tab) => {
        setActiveTab(tab);
        try {
            localStorage.setItem('accountActiveTab', tab);
        } catch (err) {
            // ignore storage errors
        }
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
            <div className="flex flex-row justify-center gap-[100px] h-full p-4 px-[100px]">
                {/* Account Page Nav */}
                <div className="flex flex-col rounded-lg p-4">
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
                    <div className="flex flex-col rounded-lg p-4 w-[80vw]">
                        <div className="flex flex-row justify-end">
                            <p className="text-right text-black font-dm-sans font-bold text-[36px]">My Account</p>
                        </div>
                        <div>
                            <p className="text-[24px] text-black font-dm-sans">Your Last Order</p>
                            <p className="mt-7">You have not placed any orders.</p>
                        </div>
                        <div className="mt-[50px]">
                            <p className="text-[24px] text-black font-dm-sans">Recently Viewed Products</p>
                            <p className="mt-7">You have not viewed any products.</p>
                        </div>
                    </div>
                )}

                {/* Orders */}
                {activeTab === "orders" && (
                    <div className="flex flex-col rounded-lg p-4 w-[80vw]">
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
                                />
                                <span className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                                    </svg>
                                </span>
                            </div>
                            <div className="flex justify-end mt-2">
                                <span className="text-gray-500 text-[18px] font-dm-sans">Showing 0 Orders</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Profile */}
                {activeTab === "profile" && (
                    <div className="flex flex-col rounded-lg p-4 w-[80vw]">
                        <div className="flex flex-row justify-end">
                            <p className="text-right text-black font-dm-sans font-bold text-[36px]">My Account</p>
                        </div>
                        <div className="mt-6">
                            <p className="text-[24px] text-black font-dm-sans">Personal Information</p>
                            <p className="mt-10 font-dm-sans text-black text-[16px]">MY INFORMATION</p>
                            <div className="flex flex-row gap-10 mt-8 items-start">

                                <div className="flex flex-col">
                                    <div className="relative flex flex-row items-center">
                                        <img
                                            src={(selectedFile && profilePic) ? profilePic : (resolveAvatarUrl(profilePhotoUrl) || resolveAvatarUrl(profilePic) || DEFAULT_AVATAR)}
                                            alt="Profile"
                                            className="w-32 h-32 rounded-full object-cover bg-gray-300"
                                            onError={(e) => {
                                                try { console.error('[Avatar] <img> failed to load src=', e?.target?.src); } catch (er) {}
                                                try { if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', DEFAULT_AVATAR); } catch (e) {}
                                                setProfilePic(DEFAULT_AVATAR);
                                                setProfilePhotoUrl(DEFAULT_AVATAR);
                                            }}
                                        />
                                        <label
                                            htmlFor="profilePicUpload"
                                            className="absolute bottom-2 left-20 cursor-pointer bg-white rounded-full p-1 shadow-md border border-gray-300"
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
                                    
                                
                                <form className="flex-1 grid grid-cols-2 gap-6">
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
                                    disabled={Boolean(firstNameError) || Boolean(lastNameError)}
                                    className={`bg-[#3B5B92] text-white font-bold font-dm-sans px-6 py-2 rounded-md focus:outline-none focus:ring-0 ${ (firstNameError || lastNameError) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2a4370]'}`}
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
                                            className="w-[49%] border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                            value={currentPassword}
                                            onChange={e => setCurrentPassword(e.target.value)}
                                            placeholder="Enter your current password"
                                        />
                                        {isCurrentPasswordIncorrect && (
                                            <span className="ml-4 text-red-600">
                                                Incorrect password!!
                                            </span>
                                        )}
                                    </div>
                                </form>
                                <a href="/forgot-password">Forgot Password?</a>
                                <form className="mt-2 w-full grid grid-cols-2 gap-4">
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
                            <div className="w-full overflow-x-auto">
                                <div className="grid semi-biggest:grid-cols-2 biggest:grid-cols-3 semi-biggest:w-[500px] semi-biggest:gap-10 auto-cols-max justify-center gap-4 min-w-max">
                                    {addresses.map((address) => (
                                        <div key={address.address_id} className="border p-5 w-[295px] border-black rounded flex flex-col justify-between min-h-[280px]">
                                            <p className="font-dm-sans font-bold">{address.first_name} {address.last_name}</p>
                                            <p className="font-dm-sans">{address.street_address}, {address.barangay},</p>
                                            <p className="font-dm-sans">{address.city}, {address.province}.</p>
                                            <p className="font-dm-sans">{address.postal_code}</p>
                                            <p className="font-dm-sans">{address.phone_number}</p>
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
                                    <div className="ml-[40px] flex flex-col justify-center align-center">
                                        <button
                                            type="button"
                                            className="border border-black rounded-full w-16 h-16 flex items-center justify-center bg-white hover:bg-[#f0f0f0] shadow-md"
                                            aria-label="Add Address"
                                            onClick={() => {
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
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">Name</p>
                                                <input
                                                    type="text"
                                                    className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                                    placeholder="Name"
                                                    name="first_name"
                                                    value={addressForm.first_name}
                                                    onChange={handleAddressChange}
                                                />
                                            </div>
                                            <div>
                                                <p className="text-[16px] mt-2 font-dm-sans">Surname</p>
                                                <input
                                                    type="text"
                                                    className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                                    placeholder="Last Name"
                                                    name="last_name"
                                                    value={addressForm.last_name}
                                                    onChange={handleAddressChange}
                                                />
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
                                                onChange={handleAddressChange}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-2">
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
                                            <div className="col-span-2 flex gap-4 items-end">
                                                <div className="flex-1">
                                                    <p className="text-[16px] font-dm-sans mb-2">Phone Number</p>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-[#3B5B92] rounded-md px-4 py-3 text-black font-dm-sans bg-white"
                                                        placeholder="Phone Number"
                                                        name="phone_number"
                                                        value={addressForm.phone_number}
                                                        onChange={e => {
                                                            // Only allow numbers
                                                            const value = e.target.value.replace(/[^0-9]/g, '');
                                                            handleAddressChange({
                                                                target: {
                                                                    name: 'phone_number',
                                                                    value,
                                                                    type: 'text',
                                                                }
                                                            });
                                                        }}
                                                        maxLength={11}
                                                        required
                                                    />
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
                                        <div className="flex justify-end mt-6">
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
