import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { UserAuth } from "../../context/AuthContext";
import { v4 as uuidv4 } from 'uuid';
import PH_CITIES_BY_PROVINCE from "../../PH_CITIES_BY_PROVINCE.js";
import PH_BARANGAYS from "../../PH_BARANGAYS.js";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { session } = UserAuth();

  // UI state
  const [payLoading, setPayLoading] = useState(false);
  const [subtotal, setSubtotal] = useState(249.0); // fallback; try to read from storage
  const [shippingMethod, setShippingMethod] = useState("jnt"); // jnt | lbc | sdd
  const [paymentMethod, setPaymentMethod] = useState("paypal"); // paypal | cod
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [billingName, setBillingName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingZip, setBillingZip] = useState("");
  // Selected cart rows and display
  const [selectedCartIds, setSelectedCartIds] = useState([]);
  const [orderedItems, setOrderedItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  // Shipping methods (DB-backed)
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedShippingId, setSelectedShippingId] = useState(null);
  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [taxTotal, setTaxTotal] = useState(0);

  // Add/Edit address (copied/adapted from Account page)
  const [showAddressEditor, setShowAddressEditor] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState("");
  const [addressErrorMsg, setAddressErrorMsg] = useState("");
  const [addressFirstNameError, setAddressFirstNameError] = useState("");
  const [addressLastNameError, setAddressLastNameError] = useState("");
  const [addressStreetError, setAddressStreetError] = useState("");
  const [addressPhoneError, setAddressPhoneError] = useState("");
  const [addressForm, setAddressForm] = useState({
    first_name: "",
    last_name: "",
    street_address: "",
    province: "",
    city: "",
    barangay: "",
    postal_code: "",
    phone_number: "",
    label: "Home",
    is_default: false,
    address_id: undefined,
  });
  const PROVINCES = useMemo(() => [
    "Abra", "Agusan Del Norte", "Agusan Del Sur", "Aklan", "Albay", "Antique", "Apayao", "Aurora", "Basilan", "Bataan", "Batanes", "Batangas", "Benguet", "Biliran", "Bohol", "Bukidnon", "Bulacan", "Cagayan", "Camarines Norte", "Camarines Sur", "Camiguin", "Capiz", "Catanduanes", "Cavite", "Cebu", "Compostela Valley", "Cotabato", "Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental", "Dinagat Islands", "Eastern Samar", "Guimaras", "Ifugao", "Ilocos Norte", "Ilocos Sur", "Iloilo", "Isabela", "Kalinga", "La Union", "Laguna", "Lanao del Norte", "Lanao del Sur", "Leyte", "Maguindanao", "Marinduque", "Masbate", "Misamis Occidental", "Misamis Oriental", "Mountain Province", "NCR", "Negros Occidental", "Negros Oriental", "Northern Samar", "Nueva Ecija", "Nueva Vizcaya", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Pampanga", "Pangasinan", "Quezon", "Quirino", "Rizal", "Romblon", "Samar", "Sarangani", "Siquijor", "Sorsogon", "South Cotabato", "Southern Leyte", "Sultan Kudarat", "Sulu", "Surigao del Norte", "Surigao del Sur", "Tarlac", "Tawi-Tawi", "Zambales", "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"
  ], []);
  const [provinceInput, setProvinceInput] = useState("");
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const provinceInputRef = useRef(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityInputRef = useRef(null);
  const [showBarangayDropdown, setShowBarangayDropdown] = useState(false);
  const barangayInputRef = useRef(null);
  const filteredProvinces = useMemo(() => {
    if (!provinceInput) return PROVINCES;
    const exact = PROVINCES.find(p => p.toLowerCase() === provinceInput.trim().toLowerCase());
    return exact ? [exact] : PROVINCES;
  }, [provinceInput, PROVINCES]);
  const cityOptions = useMemo(() => (addressForm.province && PH_CITIES_BY_PROVINCE[addressForm.province]) ? PH_CITIES_BY_PROVINCE[addressForm.province] : [], [addressForm.province]);
  const barangayOptions = useMemo(() => (addressForm.province && addressForm.city && PH_BARANGAYS[addressForm.province] && PH_BARANGAYS[addressForm.province][addressForm.city]) ? PH_BARANGAYS[addressForm.province][addressForm.city] : [], [addressForm.province, addressForm.city]);

  const paypalRef = useRef(null);

  // Try to read subtotal and selected cart ids from storage (set in Cart page)
  useEffect(() => {
    try {
      const rawSubtotal = localStorage.getItem("cartSubtotal");
      if (rawSubtotal) setSubtotal(parseFloat(rawSubtotal));
      const rawIds = localStorage.getItem("cartSelectedIds");
      if (rawIds) {
        const ids = JSON.parse(rawIds);
        // could be used later for line-items, shipping calc, etc.
        console.debug('Selected cart IDs for checkout:', ids);
        if (Array.isArray(ids)) setSelectedCartIds(ids);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // If nothing selected in storage OR current state has no items, block access
    const rawIds = (() => { try { return localStorage.getItem('cartSelectedIds'); } catch { return null; } })();
    const parsed = (() => { try { return rawIds ? JSON.parse(rawIds) : null; } catch { return null; } })();
    const noLocalSelection = !parsed || !Array.isArray(parsed) || parsed.length === 0;
    const noStateSelection = !Array.isArray(selectedCartIds) || selectedCartIds.length === 0;
    if (noLocalSelection && noStateSelection) {
      navigate('/cart');
    }
  }, [navigate, selectedCartIds]);

  // Load shipping methods from DB
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("shipping_methods")
          .select("*")
          .order("shipping_id", { ascending: true });
        if (error) {
          console.warn("Failed to fetch shipping methods", error);
          return;
        }
        const list = Array.isArray(data) ? data : [];
        setShippingMethods(list);
        if (list.length > 0) {
          setSelectedShippingId((prev) => prev ?? list[0].shipping_id);
        }
      } catch (e) {
        console.warn("Unexpected error loading shipping methods", e);
      }
    })();
  }, []);

  // Load PayPal SDK once
  useEffect(() => {
    const existing = document.getElementById("paypal-sdk");
    if (existing) return;
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";
    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=PHP&components=buttons`;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Load saved addresses for the user
  const fetchAddresses = useMemo(() => async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) {
        console.warn('Failed to fetch addresses:', error);
        return;
      }
      setAddresses(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        const def = data.find(a => a.is_default) || data[0];
        setSelectedAddressId(def.id || def.address_id || null);
      }
    } catch (e) {
      console.warn('Unexpected error loading addresses', e);
    }
  }, [session, supabase]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const selectedAddress = addresses.find(a => (a.id || a.address_id) === selectedAddressId);

  // Prefill billing fields from selected address
  useEffect(() => {
    if (!selectedAddress) return;
    const name = selectedAddress.full_name || selectedAddress.name || selectedAddress.contact_name || '';
    const line1 = selectedAddress.address_line1 || selectedAddress.line1 || selectedAddress.street || '';
    const city = selectedAddress.city || selectedAddress.municipality || '';
    const zip = selectedAddress.zip || selectedAddress.postal_code || '';
    setBillingName((prev) => prev || name);
    setBillingAddress((prev) => prev || line1);
    setBillingCity((prev) => prev || city);
    setBillingZip((prev) => prev || zip);
  }, [selectedAddress]);

  // Handlers for address add/edit (from Account page)
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
    } catch {
      return false;
    }
  };
  const handleAddressChange = (e) => {
    const target = e?.target || e || {};
    const { name, value, type, checked } = target;
    let newValue = type === "checkbox" ? checked : value;
    if (name === 'first_name' || name === 'last_name') {
      const raw = String(value || '');
      const hadDigits = /[0-9]/.test(raw);
      let cleaned = raw.replace(/[0-9]/g, '');
      if (cleaned.length > 32) {
        cleaned = cleaned.slice(0, 32);
        if (name === 'first_name') {
          setAddressFirstNameError('First name cannot exceed 32 characters.');
        } else {
          setAddressLastNameError('Last name cannot exceed 32 characters.');
        }
        setAddressForm(prev => ({ ...prev, [name]: cleaned }));
        return;
      }
      if (cleaned && isLikelyInvalidName(cleaned)) {
        if (name === 'first_name') setAddressFirstNameError('Please enter a valid name.');
        else setAddressLastNameError('Please enter a valid last name.');
        return;
      }
      newValue = cleaned;
      if (name === 'first_name') setAddressFirstNameError(hadDigits ? 'Numbers are not allowed in the First Name.' : '');
      else setAddressLastNameError(hadDigits ? 'Numbers are not allowed in the Last Name.' : '');
    }
    if (name === 'phone_number') {
      // live-validate phone (10 digits after +63)
      setAddressPhoneError(validatePHMobileLocal10(newValue));
    }
    setAddressForm(prev => ({ ...prev, [name]: newValue }));
  };


  const handleEditAddress = (address) => {
    setAddressForm({
      first_name: address.first_name || "",
      last_name: address.last_name || "",
      street_address: address.street_address || "",
      province: address.province || "",
      city: address.city || "",
      barangay: address.barangay || "",
      postal_code: address.postal_code || "",
      phone_number: toLocal10(address.phone_number),
      label: address.label || "Home",
      is_default: !!address.is_default,
      address_id: address.address_id,
    });
    setProvinceInput(address.province || "");
    setAddressErrorMsg("");
    setAddressSuccessMsg("");
    setAddressFirstNameError("");
    setAddressLastNameError("");
    setAddressStreetError("");
    setEditingAddressId(address.address_id || null);
    setShowAddressEditor(true);
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    setAddressErrorMsg("");
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
    const requiredFields = ['first_name','street_address','province','city','postal_code','phone_number','label'];
    const missing = requiredFields.filter(f => !addressForm[f] || (typeof addressForm[f] === 'string' && addressForm[f].trim() === ''));
    if (missing.length > 0) {
      setAddressErrorMsg('Please fill in all required address fields.');
      return;
    }
    // Validate phone number format (10 digits after +63)
    const phoneErr = validatePHMobileLocal10(addressForm.phone_number);
    setAddressPhoneError(phoneErr);
    if (phoneErr) {
      setAddressErrorMsg('Please enter a valid Philippine mobile number.');
      return;
    }
    if (String(addressForm.street_address || '').trim().length > 0 && String(addressForm.street_address || '').trim().length < 5) {
      setAddressStreetError('Please enter at least 5 characters.');
      setAddressErrorMsg('Please fix the highlighted fields before saving.');
      return;
    }
    if (!['Home','Work'].includes(addressForm.label)) {
      setAddressErrorMsg("Invalid address label. Please select 'Home' or 'Work'.");
      return;
    }
    if (addressForm.is_default) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', session.user.id);
    }
  const addressIdToUse = editingAddressId ?? addressForm.address_id ?? uuidv4();
  const upsertData = { ...addressForm, phone_number: normalizePhoneForSave(addressForm.phone_number), user_id: session.user.id, address_id: addressIdToUse };
    if (editingAddressId || addressForm.address_id) {
      const { error: updateError } = await supabase
        .from('addresses')
        .update(upsertData)
        .eq('address_id', addressIdToUse)
        .eq('user_id', session.user.id);
      if (updateError) {
        setAddressErrorMsg(`Error saving address: ${updateError.message || 'Unknown error'}`);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('addresses').insert(upsertData);
      if (insertError) {
        setAddressErrorMsg(`Error saving address: ${insertError.message || 'Unknown error'}`);
        return;
      }
    }
    setAddressSuccessMsg('Address saved successfully!');
    setAddressErrorMsg("");
    setAddressStreetError("");
  setAddressPhoneError("");
    setAddressFirstNameError("");
    setAddressLastNameError("");
    setEditingAddressId(null);
    setTimeout(() => setAddressSuccessMsg(""), 2000);
    await fetchAddresses();
    setSelectedAddressId(addressIdToUse);
    setShowAddressEditor(false);
    setTimeout(() => setAddressForm({
      first_name: "",
      last_name: "",
      street_address: "",
      province: "",
      city: "",
      barangay: "",
      postal_code: "",
      phone_number: "",
      label: "Home",
      is_default: false,
      address_id: undefined,
    }), 50);
  };

  // Derived values
  const selectedShipping = shippingMethods.find((m) => m.shipping_id === selectedShippingId);
  // Compute total weight (grams) from ordered items
  const totalWeightGrams = (orderedItems || []).reduce((sum, it) => {
    const qty = Number(it.quantity || 1);
    const wt = Number(it.weight || 0);
    return sum + (isFinite(qty * wt) ? qty * wt : 0);
  }, 0);
  // Shipping = base_rate + (rate_per_grams * totalWeight)
  const shippingCost = selectedShipping
    ? Number((Number(selectedShipping.base_rate || 0) + Number(selectedShipping.rate_per_grams || 0) * totalWeightGrams).toFixed(2))
    : shippingMethod === "jnt"
    ? 120
    : shippingMethod === "lbc"
    ? 160
    : 180;
  const taxes = taxTotal;
  const totalRaw = (Number(subtotal) || 0) + shippingCost + taxes;
  const totalCeil = Math.ceil(totalRaw);

  // Helper: translate hex colors to human-friendly names (e.g., "#1E90FF" -> "light blue")
  const hexToRgb = (hex) => {
    if (typeof hex !== 'string') return null;
    let h = hex.trim();
    if (h.startsWith('#')) h = h.slice(1);
    if (h.length === 3) {
      h = h.split('').map((c) => c + c).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    const num = parseInt(h, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };
  const rgbToHsl = ({ r, g, b }) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = 0; s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s, l };
  };
  const describeColor = ({ h, s, l }) => {
    // Grays
    if (s < 0.1) {
      if (l < 0.08) return 'black';
      if (l < 0.2) return 'very dark gray';
      if (l < 0.35) return 'dark gray';
      if (l < 0.65) return 'gray';
      if (l < 0.85) return 'light gray';
      return 'white';
    }
    // Hue buckets
    let name = '';
    if (h < 15 || h >= 345) name = 'red';
    else if (h < 45) name = 'orange';
    else if (h < 75) name = 'yellow';
    else if (h < 95) name = 'lime';
    else if (h < 150) name = 'green';
    else if (h < 195) name = 'cyan';
    else if (h < 255) name = 'blue';
    else if (h < 285) name = 'purple';
    else if (h < 345) name = 'magenta';
    // Lightness descriptor
    let prefix = '';
    if (l < 0.25) prefix = 'dark ';
    else if (l > 0.7) prefix = 'light ';
    else if (s > 0.8 && l > 0.3 && l < 0.6) prefix = 'vivid ';
    return (prefix + name).trim();
  };
  const toColorNameIfHex = (group, value) => {
    const normalizeHex = (val) => {
      const raw = String(val || '').trim();
      if (!raw) return null;
      let s = raw.startsWith('#') ? raw.slice(1) : raw;
      if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map(c => c + c).join('');
      if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
      return `#${s.toUpperCase()}`;
    };
    const HEX_NAME_MAPS = {
      'color': {
        '#000000': 'Black', '#FFFFFF': 'White', '#FAF9F6': 'Off-White', '#EDE8D0': 'Beige', '#808080': 'Gray', '#4169E1': 'Blue', '#C40233': 'Red'
      },
      'strap color': {
        '#000000': 'Black', '#FFFFFF': 'White', '#FAF9F6': 'Off-White', '#4169E1': 'Blue', '#C40233': 'Red', '#228B22': 'Green', '#EDE8D0': 'Beige'
      },
      'accessories color': {
        '#FFD700': 'Gold', '#C0C0C0': 'Silver', '#000000': 'Black', '#FFFFFF': 'White', '#FFC0CB': 'Pink', '#4169E1': 'Blue', '#228B22': 'Green', '#800080': 'Purple'
      },
      'trim color': {
        '#000000': 'Black', '#FFFFFF': 'White', '#4169E1': 'Blue', '#C40233': 'Red'
      }
    };
    const groupKey = (() => {
      const g = String(group || '').toLowerCase();
      if (g === 'color') return 'color';
      if (g.includes('strap')) return 'strap color';
      if (g.includes('accessories color')) return 'accessories color';
      if (g.includes('accessories') && g.includes('color')) return 'accessories color';
      if (g.includes('trim') && g.includes('color')) return 'trim color';
      if (g === 'trim color') return 'trim color';
      return null;
    })();
    // Preferred: strict mapping by group and hex
    const nx = normalizeHex(value);
    if (groupKey && nx && HEX_NAME_MAPS[groupKey] && HEX_NAME_MAPS[groupKey][nx]) {
      return HEX_NAME_MAPS[groupKey][nx];
    }
    const capFirst = (s) => (typeof s === 'string' && s.length > 0) ? (s[0].toUpperCase() + s.slice(1)) : s;
    if (!value) return value;
    const val = String(value).trim();
    // Accept #RGB/#RRGGBB; if group hints color and value looks like hex without #, handle it
    const looksHex = /^#?[0-9a-fA-F]{3}$/.test(val) || /^#?[0-9a-fA-F]{6}$/.test(val);
    const groupIsColor = typeof group === 'string' && /color/i.test(group);
    if (looksHex) {
      const rgb = hexToRgb(val.startsWith('#') ? val : `#${val}`);
      if (rgb) return capFirst(describeColor(rgbToHsl(rgb)));
    }
    // Try rgb(...)
    const m = val.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (m) {
      const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
      const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
      const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));
      return capFirst(describeColor(rgbToHsl({ r, g, b })));
    }
    // If the group is "Color" but value isn't hex/rgb, just return value
    if (groupIsColor) return val;
    return value;
  };

  // Fetch selected cart items for display
  useEffect(() => {
    (async () => {
      try {
        if (!session?.user?.id || selectedCartIds.length === 0) {
          setOrderedItems([]);
          setTaxTotal(0);
          return;
        }
        setItemsLoading(true);
        const { data, error } = await supabase
          .from('cart')
          .select(`
            cart_id,
            product_id,
            quantity,
            total_price,
            products ( id, name, image_url, weight, tax, product_types ( name, product_categories ( name ) ) ),
            cart_variants ( price, product_variant_values ( variant_values ( value_name, variant_groups ( name ) ) ) ),
            cart_dimensions ( length, width, price )
          `)
          .in('cart_id', selectedCartIds)
          .eq('user_id', session.user.id)
          .order('cart_id', { ascending: true });
        if (error) {
          console.warn('Failed to load selected cart items', error);
          setOrderedItems([]);
          setTaxTotal(0);
          return;
        }
        const items = await Promise.all((data || []).map(async (it) => {
          const prod = it.products || {};
          let img = prod.image_url || null;
          if (img && typeof img === 'string' && !img.startsWith('http')) {
            const key = img.startsWith('/') ? img.slice(1) : img;
            // Mirror Search page logic: pick bucket by product category name
            const categoryName = (
              prod?.product_types?.product_categories?.name ||
              prod?.product_types?.name ||
              ''
            ).toLowerCase();
            let bucket = 'apparel-images';
            if (categoryName.includes('apparel')) {
              bucket = 'apparel-images';
            } else if (categoryName.includes('accessories')) {
              bucket = 'accessoriesdecorations-images';
            } else if (categoryName.includes('signage') || categoryName.includes('poster')) {
              bucket = 'signage-posters-images';
            } else if (categoryName.includes('cards') || categoryName.includes('sticker')) {
              bucket = 'cards-stickers-images';
            } else if (categoryName.includes('packaging')) {
              bucket = 'packaging-images';
            } else if (categoryName.includes('3d print')) {
              bucket = '3d-prints-images';
            }
            try {
              const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(key);
              const tryUrl = urlData?.publicUrl;
              img = (tryUrl && !tryUrl.endsWith('/')) ? tryUrl : '/logo-icon/logo.png';
            } catch {
              img = '/logo-icon/logo.png';
            }
          }
          // Build variants list from cart_variants and prioritize color to appear first
          let variants = (it.cart_variants || []).flatMap(cv => {
            const pvv = cv.product_variant_values; if (!pvv) return [];
            const arr = Array.isArray(pvv) ? pvv : [pvv];
            return arr.map(v => ({ group: v?.variant_values?.variant_groups?.name, value: v?.variant_values?.value_name }));
          });
          if (Array.isArray(variants) && variants.length > 1) {
            const isColor = (g) => /color/i.test(String(g || ''));
            const isAccessory = (g) => /(accessor|hook|clasp|clamp)/i.test(String(g || ''));
            const isPrinting = (g) => /(print|printing)/i.test(String(g || ''));
            variants = [...variants].sort((a, b) => {
              const aGroup = String(a?.group || '');
              const bGroup = String(b?.group || '');
              const aColor = isColor(aGroup);
              const bColor = isColor(bGroup);
              if (aColor !== bColor) return aColor ? -1 : 1; // Color first
              const aAcc = isAccessory(aGroup);
              const bAcc = isAccessory(bGroup);
              if (aAcc !== bAcc) return aAcc ? -1 : 1; // then Accessories/Hook/Clasp/Clamp
              const aPrint = isPrinting(aGroup);
              const bPrint = isPrinting(bGroup);
              if (aPrint !== bPrint) return aPrint ? -1 : 1; // then Printing
              return 0;
            });
          }
          const dim = (it.cart_dimensions || [])[0];
          // Fetch any uploaded design files associated with this cart row (scoped by cart_id)
          let uploadedFilesForCart = [];
          try {
            const { data: files, error: filesErr } = await supabase.from('uploaded_files').select('*').eq('cart_id', it.cart_id);
            if (!filesErr && Array.isArray(files) && files.length > 0) {
              uploadedFilesForCart = files.map(f => ({ ...f, id: f.id ?? f.file_id, file_id: f.file_id ?? f.id }));
            } else if (filesErr) {
              // Fallback when cart_id column doesn't exist or other errors: match by user_id and product_id
              console.debug('Fallback uploaded_files fetch for checkout cart', it.cart_id, filesErr?.message || filesErr);
              const userId = session?.user?.id;
              if (userId) {
                try {
                  let fbQ = supabase.from('uploaded_files').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false }).limit(10);
                  const productIdForRow = it.product_id ?? prod.id;
                  if (productIdForRow) fbQ = fbQ.eq('product_id', productIdForRow);
                  const { data: fb, error: fbErr } = await fbQ;
                  if (!fbErr && Array.isArray(fb) && fb.length > 0) uploadedFilesForCart = fb.map(f => ({ ...f, id: f.id ?? f.file_id, file_id: f.file_id ?? f.id }));
                } catch (fbEx) {
                  console.warn('Fallback uploaded_files query failed in checkout:', fbEx);
                }
              }
            }
          } catch (fetchErr) {
            console.warn('Could not fetch uploaded_files for checkout cart', it.cart_id, fetchErr);
          }
          const quantity = Number(it.quantity) || 1;
          const taxPerUnit = Number(prod?.tax) || 0;
          return {
            id: it.cart_id,
            product_id: it.product_id,
            name: prod.name || 'Product',
            image_url: img,
            quantity,
            total_price: Number(it.total_price) || 0,
            weight: Number(prod?.weight) || 0,
            tax_per_unit: taxPerUnit,
            tax_amount: Number((taxPerUnit * quantity).toFixed(2)),
            variants,
            dimension: dim ? { length: dim.length, width: dim.width } : null,
            uploaded_files: uploadedFilesForCart,
          };
        }));
        setTaxTotal(Number(items.reduce((sum, item) => sum + (Number(item.tax_amount) || 0), 0).toFixed(2)));
        setOrderedItems(items);
      } catch (e) {
        console.warn('Unexpected error building ordered items', e);
        setOrderedItems([]);
        setTaxTotal(0);
      } finally {
        setItemsLoading(false);
      }
    })();
  }, [session?.user?.id, JSON.stringify(selectedCartIds)]);

  // Create Order in DB (orders, order_items, order_item_variants) and clear cart
  // If provided, link to a payment_methods row via paymentId
  const createOrderInDB = async (paymentId = null) => {
    if (!session?.user?.id) {
      alert("Please sign in to place an order.");
      return null;
    }
    const selectedAddress = addresses.find(a => (a.id || a.address_id) === selectedAddressId);
    if (!selectedAddress) {
      alert("Please select a shipping address.");
      return null;
    }

    try {
      // Ensure we have a shipping method selected; refetch if list is empty
      let shippingId = selectedShippingId;
      if (!shippingId) {
        const { data: shipData } = await supabase
          .from("shipping_methods")
          .select("*")
          .order("shipping_id", { ascending: true });
        if (Array.isArray(shipData) && shipData.length > 0) {
          shippingId = shipData[0].shipping_id;
        }
      }
      if (!shippingId) {
        alert("Shipping methods are unavailable. Please try again later.");
        return null;
      }

      // Insert order
      const insertPayload = {
        user_id: session.user.id,
        total_price: totalCeil,
        shipping_id: shippingId,
        address_id: selectedAddress.address_id || selectedAddressId,
      };
      if (paymentId) insertPayload.payment_id = paymentId;
      const { data: orderRow, error: orderErr } = await supabase
        .from("orders")
        .insert(insertPayload)
        .select("order_id")
        .single();

      if (orderErr || !orderRow?.order_id) {
        console.error("Order insert failed", orderErr);
        alert("Failed to create order.");
        return null;
      }

      const orderId = orderRow.order_id;

      // Insert order items
      const orderItemsPayload = orderedItems.map((it) => {
        const qty = Number(it.quantity || 1);
        const unit = qty > 0 ? Number(it.total_price || 0) / qty : Number(it.total_price || 0);
        return {
          order_id: orderId,
          product_id: it.product_id,
          quantity: qty,
          base_price: Number(unit.toFixed(2)),
          total_price: Number((it.total_price || 0).toFixed(2)),
        };
      });

      const { data: insertedItems, error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItemsPayload)
        .select("order_item_id");

      if (itemsErr) {
        console.error("Order items insert failed", itemsErr);
        alert("Failed to create order items.");
        return null;
      }

      // Insert item variants (if any)
      const variantRows = [];
      (insertedItems || []).forEach((oi, idx) => {
        const src = orderedItems[idx];
        if (src?.variants?.length) {
          src.variants.forEach((v) => {
            if (v?.group && v?.value) {
              variantRows.push({
                order_item_id: oi.order_item_id,
                variant_group_name: v.group,
                variant_value_name: v.value,
              });
            }
          });
        }
      });

      if (variantRows.length > 0) {
        const { error: variantsErr } = await supabase
          .from("order_item_variants")
          .insert(variantRows);
        if (variantsErr) {
          console.warn("Variant insert had issues", variantsErr);
          // Non-fatal; continue
        }
      }

      // Link uploaded_files rows to this order by setting uploaded_files.order_id
      try {
        // 1) Precise: link by uploaded_files primary id gathered from checkout items
        const idsFromItems = Array.from(new Set(
          (orderedItems || [])
            .flatMap((it) => Array.isArray(it.uploaded_files) ? it.uploaded_files : [])
            .map((f) => f?.id || f?.file_id)
            .filter(Boolean)
        ));
        if (idsFromItems.length > 0) {
          // Try updating by file_id (primary key in this table). If your schema also has an 'id' column,
          // both updates will be harmless; otherwise the non-existing-column query simply affects 0 rows.
          let totalLinkedByIds = 0;
          try {
            const { data: upByFileId, error: eByFileId } = await supabase
              .from('uploaded_files')
              .update({ order_id: orderId })
              .in('file_id', idsFromItems)
              .eq('user_id', session.user.id)
              .is('order_id', null)
              .select();
            if (eByFileId) console.warn('uploaded_files link by file_id failed', eByFileId);
            else totalLinkedByIds += Array.isArray(upByFileId) ? upByFileId.length : 0;
          } catch (e) {
            console.warn('uploaded_files link by file_id threw', e);
          }
          try {
            const { data: upById, error: eById } = await supabase
              .from('uploaded_files')
              .update({ order_id: orderId })
              .in('id', idsFromItems)
              .eq('user_id', session.user.id)
              .is('order_id', null)
              .select();
            if (eById) console.warn('uploaded_files link by id failed', eById);
            else totalLinkedByIds += Array.isArray(upById) ? upById.length : 0;
          } catch (e) {
            console.warn('uploaded_files link by id threw', e);
          }
          console.info('uploaded_files linked by ids (file_id/id)', { count: totalLinkedByIds });
        }

        // 2) Fallback: link by cart_id for selected carts
        if ((selectedCartIds || []).length > 0) {
          const { data: upByCart, error: eByCart } = await supabase
            .from('uploaded_files')
            .update({ order_id: orderId })
            .in('cart_id', selectedCartIds)
            .eq('user_id', session.user.id)
            .is('order_id', null)
            .select();
          if (eByCart) console.warn('uploaded_files link by cart_id failed', eByCart);
          else console.info('uploaded_files linked by cart_id', { count: Array.isArray(upByCart) ? upByCart.length : 0 });
        }

        // 3) Last-resort: link by user + product_ids present in this order (narrow to only null order_id)
        const prodIds = Array.from(new Set((orderedItems || []).map((it) => it.product_id).filter(Boolean)));
        if (session?.user?.id && prodIds.length > 0) {
          const { data: candidates, error: candErr } = await supabase
            .from('uploaded_files')
            // Use file_id which is guaranteed in schema; avoid selecting a possibly non-existent 'id' column
            .select('file_id, product_id, order_id')
            .eq('user_id', session.user.id)
            .in('product_id', prodIds)
            .is('order_id', null)
            .limit(1000);
          if (!candErr && Array.isArray(candidates) && candidates.length > 0) {
            // Try linking by file_id first, then attempt the generic 'id' column as a best-effort fallback
            const candidateFileIds = candidates.map((r) => r.file_id ?? r.id).filter(Boolean);
            if (candidateFileIds.length > 0) {
              let totalLinkedByProd = 0;
              try {
                const { data: upByProdFile, error: eByProdFile } = await supabase
                  .from('uploaded_files')
                  .update({ order_id: orderId })
                  .in('file_id', candidateFileIds)
                  .eq('user_id', session.user.id)
                  .is('order_id', null)
                  .select();
                if (eByProdFile) console.warn('uploaded_files link by product_id (file_id) failed', eByProdFile);
                else totalLinkedByProd += Array.isArray(upByProdFile) ? upByProdFile.length : 0;
              } catch (e) {
                console.warn('uploaded_files link by product_id (file_id) threw', e);
              }
              try {
                const { data: upByProd, error: eByProd } = await supabase
                  .from('uploaded_files')
                  .update({ order_id: orderId })
                  .in('id', candidateFileIds)
                  .eq('user_id', session.user.id)
                  .is('order_id', null)
                  .select();
                if (eByProd) console.warn('uploaded_files link by product_id (id) failed', eByProd);
                else totalLinkedByProd += Array.isArray(upByProd) ? upByProd.length : 0;
              } catch (e) {
                console.warn('uploaded_files link by product_id (id) threw', e);
              }
              console.info('uploaded_files linked by product_id', { count: totalLinkedByProd });
            }
          }
        }
      } catch (linkErr) {
        console.warn('Linking uploaded_files to order failed (non-fatal)', linkErr);
      }

      // Decrement inventory based on purchased quantities (aggregate per combination or inventory row)
      try {
        // 1) Build cart_id -> qty ordered
        const qtyByCartId = new Map((orderedItems || []).map((it) => [it.id, Number(it.quantity || 0)]));
        // Map cart_id -> product_id (used for fallbacks)
        const productByCartId = new Map((orderedItems || []).map((it) => [it.id, it.product_id]));

        // 2) Resolve each cart_id to either a combination_id or an explicit inventory_id using RPC.
        //    Aggregate quantities into buckets keyed by either "combo:<id>" or "inv:<id>".
        const qtyBuckets = new Map(); // key -> total ordered qty
        for (const cartId of (selectedCartIds || [])) {
          const orderedQty = Number(qtyByCartId.get(cartId) || 0);
          if (!orderedQty || orderedQty <= 0) continue;
          let resolvedKey = null;
          try {
            const { data: invData, error: invErr } = await supabase.rpc('get_cart_inventory', { p_cart_id: cartId });
            if (!invErr && Array.isArray(invData) && invData.length > 0) {
              const first = invData[0] || {};
              const comboId = first?.out_combination_id ?? first?.combination_id ?? null;
              const invId = first?.out_inventory_id ?? first?.inventory_id ?? null;
              if (comboId != null) resolvedKey = `combo:${comboId}`;
              else if (invId != null) resolvedKey = `inv:${invId}`;
              else {
                // RPC returned rows but no combo/inventory id; fallthrough to product-level fallback
                console.debug('get_cart_inventory returned row without combo/inventory for cart', cartId, first);
              }
            } else {
              if (invErr) console.warn('get_cart_inventory error for cart', cartId, invErr);
              else console.debug('get_cart_inventory empty for cart', cartId);
            }
          } catch (mapErr) {
            console.warn('Failed to resolve get_cart_inventory for cart', cartId, mapErr);
          }

          // 3) Product-level fallback: query inventory by product_id when RPC didn't yield usable ids
          if (!resolvedKey) {
            const productId = productByCartId.get(cartId);
            if (productId) {
              try {
                const { data: invRow, error: fbErr } = await supabase
                  .from('inventory')
                  .select('inventory_id, combination_id, quantity')
                  .eq('product_id', productId)
                  .limit(1)
                  .maybeSingle();
                if (!fbErr && invRow && invRow.inventory_id != null) {
                  if (invRow.combination_id != null) resolvedKey = `combo:${invRow.combination_id}`;
                  else resolvedKey = `inv:${invRow.inventory_id}`;
                  console.debug('Product-level inventory fallback used for cart', cartId, 'product', productId, 'resolvedKey', resolvedKey);
                } else {
                  console.warn('Product-level inventory fallback missing for product', productId, cartId, fbErr);
                }
              } catch (fbEx) {
                console.warn('Product-level inventory fallback error for product', productId, cartId, fbEx);
              }
            } else {
              console.debug('No product_id available for cart', cartId);
            }
          }

          // If still unresolved, try targeted lookup of inventory row id 2117 (known wax-stamp fallback).
          if (!resolvedKey) {
            try {
              console.debug('Attempting targeted inventory_id=2117 fallback for cart', cartId);
              const { data: invById, error: invByIdErr } = await supabase
                .from('inventory')
                .select('inventory_id, combination_id, quantity')
                .eq('inventory_id', 2117)
                .limit(1)
                .maybeSingle();
              if (!invByIdErr && invById && invById.inventory_id != null) {
                if (invById.combination_id != null) resolvedKey = `combo:${invById.combination_id}`;
                else resolvedKey = `inv:${invById.inventory_id}`;
                console.debug('Targeted inventory_id=2117 fallback resolved for cart', cartId, 'resolvedKey', resolvedKey, invById);
              } else {
                console.debug('Targeted inventory_id=2117 fallback found nothing for cart', cartId, invByIdErr);
              }
            } catch (idErr) {
              console.warn('Targeted inventory_id=2117 fallback error for cart', cartId, idErr);
            }
          }

          // Log resolution attempt for debugging
          console.debug('Inventory resolution for cart', cartId, { orderedQty, productId: productByCartId.get(cartId), resolvedKey });

          if (resolvedKey) {
            const prev = Number(qtyBuckets.get(resolvedKey) || 0);
            qtyBuckets.set(resolvedKey, prev + orderedQty);
          } else {
            console.warn('Could not resolve inventory/combo for cart', cartId);
          }
        }

        // 4) For each bucket, fetch the inventory row and update quantity accordingly.
        for (const [key, totalOrdered] of qtyBuckets.entries()) {
          try {
            if (String(key).startsWith('combo:')) {
              const comboId = String(key).split(':')[1];
              const { data: invRow, error: fetchErr } = await supabase
                .from('inventory')
                .select('inventory_id, quantity')
                .eq('combination_id', comboId)
                .limit(1)
                .maybeSingle();
              if (fetchErr || !invRow || invRow.inventory_id == null) {
                console.warn('Inventory fetch missing for combo', comboId, fetchErr);
                continue;
              }
              const currentQty = Number(invRow.quantity || 0);
              const newQty = Math.max(0, currentQty - Number(totalOrdered || 0));
              if (newQty !== currentQty) {
                const { error: updErr } = await supabase
                  .from('inventory')
                  .update({ quantity: newQty })
                  .eq('inventory_id', invRow.inventory_id);
                if (updErr) {
                  console.warn('Failed to update inventory quantity for inventory_id', invRow.inventory_id, updErr);
                }
              }
            } else if (String(key).startsWith('inv:')) {
              const invId = String(key).split(':')[1];
              const { data: invRow, error: fetchErr } = await supabase
                .from('inventory')
                .select('inventory_id, quantity')
                .eq('inventory_id', invId)
                .limit(1)
                .maybeSingle();
              if (fetchErr || !invRow || invRow.inventory_id == null) {
                console.warn('Inventory fetch missing for inventory_id', invId, fetchErr);
                continue;
              }
              const currentQty = Number(invRow.quantity || 0);
              const newQty = Math.max(0, currentQty - Number(totalOrdered || 0));
              if (newQty !== currentQty) {
                const { error: updErr } = await supabase
                  .from('inventory')
                  .update({ quantity: newQty })
                  .eq('inventory_id', invRow.inventory_id);
                if (updErr) {
                  console.warn('Failed to update inventory quantity for inventory_id', invRow.inventory_id, updErr);
                }
              }
            } else {
              console.warn('Unknown inventory bucket key', key);
            }
          } catch (updErr) {
            console.warn('Inventory update error for bucket', key, updErr);
          }
        }
      } catch (invOuterErr) {
        console.warn('Inventory decrement step failed', invOuterErr);
      }

      // Clear purchased items from cart
      if (selectedCartIds.length > 0) {
        await supabase
          .from("cart")
          .delete()
          .in("cart_id", selectedCartIds)
          .eq("user_id", session.user.id);
      }

      return orderId;
    } catch (e) {
      console.error("Unexpected error creating order", e);
      alert("Unexpected error creating order.");
      return null;
    }
  };

  // Record chosen payment method to Supabase (payment_methods table) and return the payment_id
  const recordPaymentMethod = async (methodCode) => {
    try {
      if (!session?.user?.id) return null;
      const payment_id = uuidv4();
      const payload = { payment_id, user_id: session.user.id, method: String(methodCode || '').toLowerCase() };
      const { error } = await supabase.from('payment_methods').insert(payload);
      if (error) {
        console.warn('Failed to record payment method', error);
        return null;
      }
      return payment_id;
    } catch (e) {
      console.warn('Failed to record payment method', e);
      return null;
    }
  };

  // Render PayPal Buttons when ready
  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(() => {
      if (cancelled) return;
      // Only render buttons when a shipping address is selected
      if (window.paypal && paypalRef.current && paymentMethod === "paypal") {
        const selAddr = addresses.find(a => (a.id || a.address_id) === selectedAddressId);
        if (!selAddr) {
          return; // wait until user selects address
        }
        clearInterval(timer);
        try {
          // clear any previous render
          paypalRef.current.innerHTML = "";
        } catch {}
  const amount = totalCeil.toFixed(2);
        window.paypal
          .Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal",
            },
            createOrder: async (data, actions) => {
              setPayLoading(true);
              try {
                // Build PayPal-compliant shipping address from selected address
                const first = String(selAddr.first_name || '').trim();
                const last = String(selAddr.last_name || '').trim();
                const street = String(selAddr.street_address || selAddr.address_line1 || selAddr.line1 || '').trim();
                const barangay = String(selAddr.barangay || '').trim();
                const city = String(selAddr.city || selAddr.municipality || '').trim();
                const province = String(selAddr.province || '').trim();
                const zip = String(selAddr.postal_code || selAddr.zip || '').trim();
                const shippingAddress = {
                  name: { full_name: `${first} ${last}`.trim() || 'Customer' },
                  address: {
                    address_line_1: street || 'N/A',
                    address_line_2: barangay || undefined,
                    admin_area_2: city || 'City', // city/municipality
                    admin_area_1: province || 'Province', // province/region
                    postal_code: zip || '0000',
                    country_code: 'PH'
                  }
                };
                const resp = await fetch("/api/paypal/create_order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ amount, currency: "PHP", shippingAddress }),
                });
                const json = await resp.json();
                if (!resp.ok) throw new Error(json?.error || "Failed to create order");
                return json.id;
              } catch (e) {
                // Fallback to client-side order create for local dev
                try {
                  // Rebuild from latest selected address
                  const sa = addresses.find(a => (a.id || a.address_id) === selectedAddressId);
                  const first = String(sa?.first_name || '').trim();
                  const last = String(sa?.last_name || '').trim();
                  const street = String(sa?.street_address || sa?.address_line1 || sa?.line1 || '').trim();
                  const barangay = String(sa?.barangay || '').trim();
                  const city = String(sa?.city || sa?.municipality || '').trim();
                  const province = String(sa?.province || '').trim();
                  const zip = String(sa?.postal_code || sa?.zip || '').trim();
                  return actions.order.create({
                    application_context: {
                      shipping_preference: 'SET_PROVIDED_ADDRESS',
                    },
                    purchase_units: [
                      {
                        amount: { currency_code: "PHP", value: String(amount) },
                        shipping: {
                          name: { full_name: `${first} ${last}`.trim() || 'Customer' },
                          address: {
                            address_line_1: street || 'N/A',
                            address_line_2: barangay || undefined,
                            admin_area_2: city || 'City',
                            admin_area_1: province || 'Province',
                            postal_code: zip || '0000',
                            country_code: 'PH',
                          },
                        },
                      },
                    ],
                  });
                } catch (fallbackErr) {
                  console.error("Client createOrder fallback failed", fallbackErr);
                  alert("Payment initialization failed.");
                  throw fallbackErr;
                }
              } finally {
                setPayLoading(false);
              }
            },
            onApprove: async (data, actions) => {
              setPayLoading(true);
              try {
                const resp = await fetch("/api/paypal/capture_order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderID: data.orderID }),
                });
                const result = await resp.json();
                if (!resp.ok) throw new Error(result?.error || "Failed to capture order");
                const paymentId = await recordPaymentMethod('paypal');
                const created = await createOrderInDB(paymentId);
                if (created) {
                  try { localStorage.removeItem('cartSelectedIds'); localStorage.removeItem('cartSubtotal'); } catch {}
                  try { sessionStorage.setItem('lastPaymentMethod', 'PayPal'); } catch {}
                  alert("Payment captured successfully");
                  navigate(`/order-confirmation?order_id=${encodeURIComponent(created)}`);
                }
              } catch (e) {
                // Fallback to client-side capture
                try {
                  const capture = await actions.order.capture();
                  console.info("Client capture result", capture);
                  const paymentId = await recordPaymentMethod('paypal');
                  const created = await createOrderInDB(paymentId);
                  if (created) {
                    try { localStorage.removeItem('cartSelectedIds'); localStorage.removeItem('cartSubtotal'); } catch {}
                    try { sessionStorage.setItem('lastPaymentMethod', 'PayPal'); } catch {}
                    alert("Payment captured successfully");
                    navigate(`/order-confirmation?order_id=${encodeURIComponent(created)}`);
                  }
                } catch (fallbackErr) {
                  console.error("Client capture fallback failed", fallbackErr);
                  alert("Payment failed.");
                }
              } finally {
                setPayLoading(false);
              }
            },
            onError: (err) => {
              console.error("PayPal onError", err);
              alert("Payment failed.");
            },
          })
          .render(paypalRef.current);
      }
    }, 100);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [paymentMethod, totalCeil, selectedAddressId, addresses.length]);

  const handlePlaceOrderCOD = async () => {
    const selectedAddress = addresses.find(a => (a.id || a.address_id) === selectedAddressId);
    if (!selectedAddress) {
      alert("Please select a shipping address");
      return;
    }
    if (
      !sameAsShipping &&
      (!billingName || !billingAddress || !billingCity || !billingZip)
    ) {
      alert("Please complete your billing address");
      return;
    }
    setPayLoading(true);
    try {
      const paymentId = await recordPaymentMethod('cod');
      const created = await createOrderInDB(paymentId);
      if (created) {
        try { localStorage.removeItem('cartSelectedIds'); localStorage.removeItem('cartSubtotal'); } catch {}
        try { sessionStorage.setItem('lastPaymentMethod', 'Cash on Delivery'); } catch {}
        alert("Order placed with Cash on Delivery");
        navigate(`/order-confirmation?order_id=${encodeURIComponent(created)}`);
      }
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white overflow-y-auto">
      {/* Header */}
      <div className="w-full h-15 bg-white border border-b border-b-[#171738]">
        <div className="w-full p-4">
          <div className="w-full flex items-center justify-between">
            {/* Logo */}
            <div className="phone:w-full phone:h-10 tablet:h-15 laptop:h-20 bigscreen:h-20 flex justify-start items-center w-full px-4">
              <img
                src="/logo-icon/logo.png"
                className="object-contain w-[120px] h-[32px] phone:w-[100px] phone:h-[28px] tablet:w-[140px] tablet:h-[40px] laptop:w-[220px] laptop:h-[80px] bigscreen:w-[220px] bigscreen:h-[80px] cursor-pointer"
                alt="Logo"
                onClick={() => navigate("/HomePage")}
              />
            </div>

            {/* Right icon (cart/profile) */}
            <div className="flex items-center pr-4">
              <button
                aria-label="Open cart"
                onClick={() => navigate("/account?tab=orders")}
                className="p-2 rounded-md  w-[40px] h-[40px] flex items-center justify-center focus:outline-none bg-white"
              >
                <img
                  src="/logo-icon/shopping-bag.svg"
                  alt="Project icon"
                  className="w-[40px] h-[40px] object-contain bg-transparent"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="min-h-screen px-[24px] md:px-[60px] lg:px-[100px] py-[30px] w-full items-center flex flex-col bg-white ">
        <div className="mt-2 w-auto h-fit flex flex-row gap-8 ">
          
          
          <div className="lg:col-span-2  w-[808px]">
            <p className="text-black font-bold text-3xl font-dm-sans mb-6">
              Checkout
            </p>

            {/* Email removed by request */}

            {/* 1. Shipping */}
            <div className="mb-6 ">
              <div className="px-4 py-3 border-b  border-black font-semibold flex items-center justify-between">
                <span className="text-[20px]">1. Shipping</span>
              </div>
              {/* Address selection cards */}
              <div className="p-4">
                {addresses.length === 0 && (
                  <p className="text-sm text-gray-600 mb-3">No saved addresses yet.</p>
                )}
                <div className="flex gap-4 overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {addresses.map(address => {
                    const id = address.address_id || address.id;
                    const selected = selectedAddressId === id;
                    return (
                      <div
                        key={id}
                        className={`relative flex-shrink-0 w-[320px] border rounded-lg p-4 cursor-pointer transition-colors ${selected ? 'border-[#171738]' : 'border-gray-300'}`}
                        style={{ backgroundColor: selected ? '#ECECEC' : '#FFFFFF' }}
                        onClick={() => setSelectedAddressId(id)}
                      >
                        {/* Edit */}
                        <button
                          className="absolute top-2 bg-transparent border border-[#939393] right-2 text-xs px-3 py-1 border rounded"
                          onClick={(e) => { e.stopPropagation(); handleEditAddress(address); }}
                        >
                          Edit
                        </button>
                        {/* Radio */}
                        <div className="flex items-center gap-6">
                          <input
                            className="mt-1 accent-black"
                            type="radio"
                            name="selAddress"
                            checked={selected}
                            onChange={() => setSelectedAddressId(id)}
                          />
                          <div>
                            <div className="font-semibold font-dm-sans text-[#171738]">
                              {(address.first_name || '') + (address.last_name ? ` ${address.last_name}` : '')}
                            </div>
                            <div className="text-sm text-gray-700 font-dm-sans leading-5 mt-1">
                              {address.street_address}{address.barangay ? `, ${address.barangay}` : ''}
                              {address.city ? `, ${address.city}` : ''}{address.province ? `, ${address.province}` : ''}
                              {address.postal_code ? ` ${address.postal_code}` : ''}
                            </div>
                            {address.phone_number && (
                              <div className="text-sm text-gray-600 mt-2">Phone Number : +63 {formatDisplayPhone(address.phone_number)}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Add Button */}
                  {addresses.length < 3 && (
                    <button
                      type="button"
                      aria-label="Add Address"
                      className="flex-shrink-0 w-[80px] h-[80px] self-center border border-gray-300 rounded-full flex items-center justify-center"
                      onClick={() => {
                        setEditingAddressId(null);
                        setAddressForm({
                          first_name: "",
                          last_name: "",
                          street_address: "",
                          province: "",
                          city: "",
                          barangay: "",
                          postal_code: "",
                          phone_number: "",
                          label: "Home",
                          is_default: false,
                          address_id: undefined,
                        });
                        setProvinceInput("");
                        setAddressErrorMsg("");
                        setAddressSuccessMsg("");
                        setAddressFirstNameError("");
                        setAddressLastNameError("");
                        setAddressStreetError("");
                        setShowAddressEditor(true);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Address Editor (inline) */}
                {showAddressEditor && (
                  <div className="w-full p-3 bg-[#F7F7F7] mt-4 border border-dashed border-[#c5c5c5] relative">
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-black bg-white rounded-full p-2 shadow"
                      aria-label="Close Address Editor"
                      onClick={() => setShowAddressEditor(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <p className="mt-2 text-black font-dm-sans">{editingAddressId ? 'EDIT ADDRESS' : 'ADD ADDRESS'}</p>
                    {addressSuccessMsg && <div className="text-green-600 font-dm-sans mb-2">{addressSuccessMsg}</div>}
                    {addressErrorMsg && <div className="text-red-600 font-dm-sans mb-2">{addressErrorMsg}</div>}
                    <form onSubmit={handleAddressSubmit} className="w-full">
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-[14px] mt-2 font-dm-sans">First Name</p>
                          <input type="text" className="w-full border border-[#3B5B92] rounded-md px-3 py-2 text-black bg-white" name="first_name" value={addressForm.first_name} onChange={handleAddressChange} />
                          {addressFirstNameError && <p className="text-red-600 text-sm mt-1">{addressFirstNameError}</p>}
                        </div>
                        <div>
                          <p className="text-[14px] mt-2 font-dm-sans">Last Name</p>
                          <input type="text" className="w-full border border-[#3B5B92] rounded-md px-3 py-2 text-black bg-white" name="last_name" value={addressForm.last_name} onChange={handleAddressChange} />
                          {addressLastNameError && <p className="text-red-600 text-sm mt-1">{addressLastNameError}</p>}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-[14px] mt-2 font-dm-sans">Street Name/Building/House No.</p>
                        <input type="text" className="w-full border border-[#3B5B92] rounded-md px-3 py-2 text-black bg-white mt-1" name="street_address" value={addressForm.street_address} onChange={(e)=>{ handleAddressChange(e); const v=String(e.target.value||''); setAddressStreetError(v.trim().length>0 && v.trim().length<5 ? 'Please enter at least 5 characters.' : ''); }} />
                        {addressStreetError && <p className="text-red-600 text-sm mt-1">{addressStreetError}</p>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-2">
                        {/* Province */}
                        <div>
                          <p className="text-[14px] mt-2 font-dm-sans">Province</p>
                          <div className="relative mt-1">
                            <div className="flex items-center">
                              <input type="text" className="w-full border border-[#3B5B92] rounded-md px-3 py-2 text-black bg-white pr-8" placeholder="Select Province" name="province_typable" autoComplete="off" value={provinceInput} ref={provinceInputRef} onFocus={()=>setShowProvinceDropdown(true)} onChange={e=>{const value=e.target.value; setProvinceInput(value); setShowProvinceDropdown(true); if(value===""){ setAddressForm(f=>({...f, city:"", province:"" })); }}} onBlur={()=>setTimeout(()=>setShowProvinceDropdown(false),150)} />
                              <button type="button" className="absolute right-2 top-1/2 bg-white -translate-y-1/2 p-1" tabIndex={-1} onMouseDown={e=>{ e.preventDefault(); setShowProvinceDropdown(v=>!v); provinceInputRef.current && provinceInputRef.current.focus(); }}>
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            </div>
                            {showProvinceDropdown && filteredProvinces.length>0 && (
                              <ul className="absolute z-10 w-full bg-white border border-[#3B5B92] rounded-md max-h-48 overflow-y-auto shadow mt-1">
                                {filteredProvinces.map(prov => (
                                  <li key={prov} className={`px-3 py-2 cursor-pointer text-black ${addressForm.province===prov?'bg-[#eaeaea]':''}`} onMouseDown={e=>{ e.preventDefault(); setAddressForm(f=>({...f, province:prov, city:"" })); setProvinceInput(prov); setShowProvinceDropdown(false); }}>
                                    {prov}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                        {/* City */}
                        <div>
                          <p className="text-[14px] mt-2 font-dm-sans">City</p>
                          <div className="relative mt-1">
                            <div className="flex items-center">
                              <input type="text" className="w-full border border-[#3B5B92] rounded-md px-3 py-2 text-black bg-white pr-8" placeholder={provinceInput ? (addressForm.province ? "Select City/Municipality" : "Select Province First") : "Select Province First"} name="city_typable" autoComplete="off" value={addressForm.city} ref={cityInputRef} disabled={!provinceInput} onFocus={()=>{ if(provinceInput) setShowCityDropdown(true); }} onChange={e=>{ setAddressForm(f=>({...f, city:e.target.value })); setShowCityDropdown(true); }} onBlur={()=>setTimeout(()=>setShowCityDropdown(false),150)} />
                              <button type="button" className="absolute bg-white right-2 top-1/2 -translate-y-1/2 p-1" tabIndex={-1} disabled={!provinceInput} onMouseDown={e=>{ if(!provinceInput) return; e.preventDefault(); setShowCityDropdown(v=>!v); cityInputRef.current && cityInputRef.current.focus(); }}>
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            </div>
                            {showCityDropdown && addressForm.province && cityOptions.filter(c => c.toLowerCase().includes((addressForm.city || "").toLowerCase())).length>0 && (
                              <ul className="absolute z-10 w-full bg-white border border-[#3B5B92] rounded-md max-h-48 overflow-y-auto shadow mt-1">
                                {cityOptions.filter(c => c.toLowerCase().includes((addressForm.city || "").toLowerCase())).map(city => (
                                  <li key={city} className={`px-3 py-2 cursor-pointer text-black ${addressForm.city===city?'bg-[#eaeaea]':''}`} onMouseDown={e=>{ e.preventDefault(); setAddressForm(f=>({...f, city })); setShowCityDropdown(false); }}>
                                    {city}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                        {/* Barangay */}
                        <div>
                          <p className="text-[14px] mt-2 font-dm-sans">Barangay</p>
                          <div className="relative mt-1">
                            <div className="flex items-center">
                              <input type="text" className="w-full border border-[#3B5B92] rounded-md px-3 py-2 text-black bg-white pr-8" placeholder={addressForm.city ? "Select Barangay" : "Select City First"} name="barangay_typable" autoComplete="off" value={addressForm.barangay || ''} ref={barangayInputRef} disabled={!addressForm.city} onFocus={()=>{ if(addressForm.city) setShowBarangayDropdown(true); }} onChange={e=>{ setAddressForm(f=>({...f, barangay:e.target.value })); setShowBarangayDropdown(true); }} onBlur={()=>setTimeout(()=>setShowBarangayDropdown(false),150)} />
                              <button type="button" className="absolute bg-white right-2 top-1/2 -translate-y-1/2 p-1" tabIndex={-1} disabled={!addressForm.city} onMouseDown={e=>{ if(!addressForm.city) return; e.preventDefault(); setShowBarangayDropdown(v=>!v); barangayInputRef.current && barangayInputRef.current.focus(); }}>
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            </div>
                            {showBarangayDropdown && addressForm.city && barangayOptions.filter(b => b.toLowerCase().includes((addressForm.barangay || "").toLowerCase())).length>0 && (
                              <ul className="absolute z-10 w-full bg-white border border-[#3B5B92] rounded-md max-h-48 overflow-y-auto shadow mt-1">
                                {barangayOptions.filter(b => b.toLowerCase().includes((addressForm.barangay || "").toLowerCase())).map(barangay => (
                                  <li key={barangay} className={`px-3 py-2 cursor-pointer text-black ${addressForm.barangay===barangay?'bg-[#eaeaea]':''}`} onMouseDown={e=>{ e.preventDefault(); setAddressForm(f=>({...f, barangay })); setShowBarangayDropdown(false); }}>
                                    {barangay}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                        {/* Postal Code */}
                        <div>
                          <p className="text-[14px] mt-2 font-dm-sans">Postal Code/Zip Code</p>
                          <input type="text" className="w-full border border-[#3B5B92] rounded-md px-3 py-2 text-black bg-white mt-1" name="postal_code" value={addressForm.postal_code} onChange={e=>{ const value=e.target.value.replace(/[^0-9]/g,''); handleAddressChange({ target: { name:'postal_code', value, type:'text' } }); }} maxLength={4} />
                        </div>
                        {/* Phone and Label */}
                        <div className="md:col-span-2 flex gap-4 items-end">
                          <div className="flex-1">
                            <p className="text-[14px] font-dm-sans mb-1">Phone Number</p>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 select-none">+63</span>
                              <input
                                type="text"
                                className="w-full border border-[#3B5B92] rounded-md pl-12 pr-3 py-2 text-black bg-white"
                                name="phone_number"
                                placeholder="9XXXXXXXXX"
                                value={addressForm.phone_number}
                                onChange={e=>{
                                  const value=e.target.value.replace(/[^0-9]/g,'').slice(0,10);
                                  handleAddressChange({ target: { name:'phone_number', value, type:'text' } });
                                  setAddressPhoneError(validatePHMobileLocal10(value));
                                }}
                                maxLength={10}
                              />
                            </div>
                            {addressPhoneError && <p className="text-red-600 text-sm mt-1">{addressPhoneError}</p>}
                          </div>
                          
                        </div>
                        <div className="flex-1">
                            <p className="text-[14px] font-dm-sans mb-1">Label As</p>
                            <div className="flex gap-3">
                              <button type="button" className={`w-full h-[42px] border border-[#3B5B92] rounded-md font-dm-sans text-[16px] ${addressForm.label==='Work'?'bg-[#eaeaea] text-[#6B7280]':'bg-white text-black'}`} style={{ pointerEvents: addressForm.label==='Work' ? 'none' : 'auto' }} onClick={()=>setAddressForm(f=>({...f, label:'Work'}))}>Work</button>
                              <button type="button" className={`w-full h-[42px] border border-[#3B5B92] rounded-md font-dm-sans text-[16px] ${addressForm.label==='Home'?'bg-[#eaeaea] text-[#6B7280]':'bg-white text-black'}`} style={{ pointerEvents: addressForm.label==='Home' ? 'none' : 'auto' }} onClick={()=>setAddressForm(f=>({...f, label:'Home'}))}>Home</button>
                            </div>
                          </div>
                      </div>
                      <div className="flex justify-end mt-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="form-checkbox h-5 w-5 text-[#3B5B92]" name="is_default" checked={addressForm.is_default} onChange={handleAddressChange} />
                          <span className="text-black font-dm-sans">Set as default address</span>
                        </label>
                      </div>
                      <div className="flex items-center justify-end mt-4 gap-3">
                        {addressErrorMsg ? (<div className="text-red-600 text-sm mr-2" role="alert">{addressErrorMsg}</div>) : (<div style={{minWidth:0}} />)}
                        <button type="submit" className="bg-[#3B5B92] text-white font-dm-sans px-5 py-2 rounded-md">Save Changes</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Delivery */}
            <div className="mb-6 ">
              <div className="px-4 py-3 border-b border-black text-[20px] font-semibold">
                2. Delivery
              </div>
              <div className="p-4 space-y-3">
                {shippingMethods.length > 0 ? (
                  shippingMethods.map((m) => {
                    const optionPrice = Number((Number(m.base_rate || 0) + Number(m.rate_per_grams || 0) * totalWeightGrams).toFixed(2));
                    return (
                    <label
                      key={m.shipping_id}
                      className={`flex items-center justify-between border rounded p-3 ${selectedShippingId === m.shipping_id ? 'border-black' : 'border-gray-300'}`}
                      style={{ backgroundColor: selectedShippingId === m.shipping_id ? '#ECECEC' : '#FFFFFF' }}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          value={m.shipping_id}
                          className="accent-black"
                          checked={selectedShippingId === m.shipping_id}
                          onChange={() => setSelectedShippingId(m.shipping_id)}
                        />
                        <span>
                          <div className="font-semibold">{m.name}</div>
                          <div className="text-xs text-gray-600 italic">2-5 business days (within Luzon), 3–7 business days (Visayas & Mindanao)</div>
                        </span>
                      </span>
                      <span className="font-semibold">₱{optionPrice.toFixed(2)}</span>
                    </label>
                    );
                  })
                ) : (
                  <>
                    <label
                      className={`flex items-center justify-between border rounded p-3 ${shippingMethod === 'jnt' ? 'border-black' : 'border-gray-300'}`}
                      style={{ backgroundColor: shippingMethod === 'jnt' ? '#ECECEC' : '#FFFFFF' }}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          value="jnt"
                          checked={shippingMethod === "jnt"}
                          onChange={() => setShippingMethod("jnt")}
                        />
                        <span>
                          <div className="font-semibold">J&T Express</div>
                          <div className="text-xs text-gray-600">3-5 business days (Metro Manila)</div>
                        </span>
                      </span>
                      <span className="font-semibold">₱120.00</span>
                    </label>
                    <label
                      className={`flex items-center justify-between border rounded p-3 ${shippingMethod === 'lbc' ? 'border-black' : 'border-gray-300'}`}
                      style={{ backgroundColor: shippingMethod === 'lbc' ? '#ECECEC' : '#FFFFFF' }}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          value="lbc"
                          checked={shippingMethod === "lbc"}
                          onChange={() => setShippingMethod("lbc")}
                        />
                        <span>
                          <div className="font-medium">LBC Express</div>
                          <div className="text-xs text-gray-600">2-3 business days (Metro Manila)</div>
                        </span>
                      </span>
                      <span className="font-semibold">₱160.00</span>
                    </label>
                    <label
                      className={`flex items-center justify-between border rounded p-3 ${shippingMethod === 'sdd' ? 'border-black' : 'border-gray-300'}`}
                      style={{ backgroundColor: shippingMethod === 'sdd' ? '#ECECEC' : '#FFFFFF' }}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          value="sdd"
                          checked={shippingMethod === "sdd"}
                          onChange={() => setShippingMethod("sdd")}
                        />
                        <span>
                          <div className="font-medium">Same Day Delivery</div>
                          <div className="text-xs text-gray-600">Metro Manila only</div>
                        </span>
                      </span>
                      <span className="font-semibold">₱180.00</span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* 3. Payment */}
            <div className="mb-6">
              <div className="px-4 py-3 border-b text-[20px] border-black font-semibold">
                3. Payment
              </div>
              <div className="p-4 space-y-4">
                {/* PayPal */}
                <div
                  className={`border rounded ${paymentMethod === 'paypal' ? 'border-black' : 'border-gray-300'}`}
                  style={{ backgroundColor: paymentMethod === 'paypal' ? '#ECECEC' : '#FFFFFF' }}
                >
                  <label className="w-full flex items-center justify-between px-3 py-2 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="pay"
                        value="paypal"
                        checked={paymentMethod === "paypal"}
                        onChange={() => setPaymentMethod("paypal")}
                      />
                      <span className="font-semibold">PayPal or Card</span>
                    </span>
                    <img
                      src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
                      alt="PayPal"
                      className="h-5"
                    />
                  </label>
                  {/* When PayPal is selected, buttons will appear in the action area below */}
                </div>

                {/* COD */}
                <div
                  className={`border rounded ${paymentMethod === 'cod' ? 'border-black' : 'border-gray-300'}`}
                  style={{ backgroundColor: paymentMethod === 'cod' ? '#ECECEC' : '#FFFFFF' }}
                >
                  <label className="w-full flex items-center justify-between px-3 py-2 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="pay"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                      />
                      <span className="font-semibold">Cash on Delivery</span>
                    </span>
                  </label>
                  {paymentMethod === "cod" && (
                    <div className="px-3 pb-3 text-sm text-gray-600">
                      Pay in cash upon delivery.
                    </div>
                  )}
                </div>

                

                {/* Action area: show PayPal Buttons or COD button */}
                <div className="mt-2">
                  {paymentMethod === "cod" ? (
                    <button
                      onClick={handlePlaceOrderCOD}
                      className="w-full md:w-auto px-6 py-3 bg-[#2B4269] font-dm-sans font-semibold text-white rounded"
                    >
                      Confirm
                    </button>
                  ) : (
                    <div ref={paypalRef} className="w-full max-w-[420px] mx-auto" />
                  )}
                  {payLoading && (
                    <p className="text-sm text-gray-500 mt-2">Processing…</p>
                  )}
                </div>
              </div>
            </div>

            {/* Policies footer (left column bottom) */}
            <div className="mt-8 pt-4 border-t border-gray-200">
              <nav className="w-full flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-black">
                <a href="/return-policy" className="underline text-black">Return Policy</a>
                <a href="/shipping" className="underline text-black">Shipping</a>
                <a href="/privacy-policy" className="underline text-black">Privacy Policy</a>
                <a href="/terms-and-conditions" className="underline text-black">Terms of Service</a>
                <a href="/contact-support" className="underline text-black">Contact</a>
              </nav>
            </div>
          </div>

          {/* Right: Items Ordered + Summary */}
          <div className="lg:col-span-1 w-[359px]">
            {/* Items Ordered */}
            <div className="border border-[#939393] rounded p-4 mb-6">
              <div className="font-semibold text-[20px] text-center mb-5">Item(s) Ordered</div>
              {itemsLoading ? (
                <div className="text-sm text-gray-500">Loading items…</div>
              ) : orderedItems.length === 0 ? (
                <div className="text-sm text-gray-500">No items selected.</div>
              ) : (
                <div className="space-y-4 h-[190px] overflow-y-auto  pr-1">
                  {orderedItems.map((it) => (
                    <div key={it.id} className="flex  items-center gap-3">
                      <img src={it.image_url || '/logo-icon/logo.png'} alt={it.name} className="w-14 h-14 rounded object-contain border bg-white" onError={(e)=>{ e.currentTarget.src = '/logo-icon/logo.png'; }} />
                      <div className="flex-1 items-center">
                        <div className="text-sm font-semibold text-[#171738] mb-2">{it.name}</div>
                        <div className="text-xs text-black">
                          {(() => {
                            // Priority order as provided
                            const ORDER = [
                              'Design',
                              'Technique',
                              'Printing',
                              'Color',
                              'Size',
                              'Material',
                              'Strap',
                              'Type',
                              'Accessories (Hook Clasp)',
                              'Accessories Color',
                              'Trim Color',
                              'Base',
                              'Hole',
                              'Pieces',
                              'Cut Style',
                              'Size (Customize)',
                              'Acrylic Pieces Quantity',
                            ];
                            const norm = (s) => String(s || '').trim();
                            const labelFor = (group, value) => {
                              const g = norm(group);
                              const v = norm(value);
                              if (/accessor/i.test(g) && /(hook|clasp)/i.test(v)) return 'Accessories (Hook Clasp)';
                              return g || '—';
                            };
                            const indexFor = (label) => {
                              const i = ORDER.findIndex((x) => x.toLowerCase() === String(label || '').toLowerCase());
                              return i === -1 ? 999 : i;
                            };

                            // Build specs: start from variants
                            const specs = [];
                            // Match cart page layout for uploaded designs (thumbnail box with +N badge)
                            const designFiles = Array.isArray(it.uploaded_files) ? it.uploaded_files : [];
                            const designBlock = (() => {
                              if (designFiles.length === 0) return null;
                              const first = designFiles[0];
                              const extra = Math.max(0, designFiles.length - 1);
                              return (
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex items-center gap-2 border rounded px-2 py-1 bg-white">
                                    <div className="w-10 h-10 overflow-hidden rounded bg-gray-100 flex items-center justify-center">
                                      {first?.image_url ? (
                                        <img src={first.image_url} alt={first.file_name || 'design'} className="w-full h-full object-cover" />
                                      ) : (
                                        <img src="/logo-icon/image.svg" alt="file" className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 truncate max-w-[140px]">{first?.file_name || 'uploaded design'}</div>
                                  </div>
                                  {extra > 0 && (
                                    <div className="inline-flex items-center justify-center bg-transparent text-black text-[15px] font-semibold rounded-full w-6 h-6">
                                      +{extra}
                                    </div>
                                  )}
                                </div>
                              );
                            })();
                            if (Array.isArray(it.variants)) {
                              for (const v of it.variants) {
                                const label = labelFor(v?.group, v?.value);
                                const val = toColorNameIfHex(v?.group, v?.value);
                                specs.push({ label, group: v?.group, value: val });
                              }
                            }
                            // Include dimensions as "Size (Customize)" if present and not already present
                            if (it.dimension && it.dimension.length != null && it.dimension.width != null) {
                              const hasSizeCustomize = specs.some((s) => s.label.toLowerCase() === 'size (customize)');
                              if (!hasSizeCustomize) {
                                specs.push({ label: 'Size (Customize)', group: 'Size (Customize)', value: `${it.dimension.length}×${it.dimension.width} cm` });
                              }
                            }
                            // Sort by priority order, then by label for stability
                            specs.sort((a, b) => {
                              const ai = indexFor(a.label);
                              const bi = indexFor(b.label);
                              if (ai !== bi) return ai - bi;
                              return a.label.localeCompare(b.label);
                            });

                            return (
                              <>
                                {designBlock}
                                {specs.map((s, idx) => (
                                  <div key={`${idx}-${s.label}`}>
                                    {String(s.label || '').toLowerCase() === 'design' ? (
                                      s.value
                                    ) : (
                                      <>{s.label}: {s.value}</>
                                    )}
                                  </div>
                                ))}
                                <div>Qty: {it.quantity}</div>
                              </>
                            );
                          })()}
                        </div>
                        <div className="text-[14px] font-semibold mt-1">₱{Number(it.total_price).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border border-[#939393] rounded p-4">
              <div className="font-semibold text-[20px] text-center mb-3">Order Summary</div>
              <div className="text-sm space-y-2">
                <div className="flex justify-between  text-[16px] font-semibold text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-black font-semibold">₱{Number(subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between  text-[16px] font-semibold text-gray-400">
                  <span>Shipping</span>
                  <span className="text-black font-semibold">₱{shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between  text-[16px] font-semibold text-gray-400">
                  <span>Taxes</span>
                  <span className="text-black font-semibold">₱{taxes.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2  text-[20px] font-semibold flex justify-between">
                  <span>Total</span>
                  <span className="text-black font-semibold">₱{totalCeil.toFixed(2)}</span>
                </div>
              </div>
              {paymentMethod === "paypal" && (
                <p className="text-xs text-gray-500 mt-3">
                  Complete your payment using the PayPal button.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;