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
  const [email, setEmail] = useState("");
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

  // Add/Edit address (copied/adapted from Account page)
  const [showAddressEditor, setShowAddressEditor] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState("");
  const [addressErrorMsg, setAddressErrorMsg] = useState("");
  const [addressFirstNameError, setAddressFirstNameError] = useState("");
  const [addressLastNameError, setAddressLastNameError] = useState("");
  const [addressStreetError, setAddressStreetError] = useState("");
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
  const handleAddressChange = (e) => {
    const target = e?.target || e || {};
    const { name, value, type, checked } = target;
    let newValue = type === "checkbox" ? checked : value;
    if (name === 'first_name' || name === 'last_name') {
      const raw = String(value || '');
      const hadDigits = /[0-9]/.test(raw);
      newValue = raw.replace(/[0-9]/g, '');
      if (name === 'first_name') setAddressFirstNameError(hadDigits ? 'Numbers are not allowed in the First Name.' : '');
      else setAddressLastNameError(hadDigits ? 'Numbers are not allowed in the Last Name.' : '');
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
      phone_number: address.phone_number || "",
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
    const requiredFields = ['first_name','street_address','province','city','postal_code','phone_number','label'];
    const missing = requiredFields.filter(f => !addressForm[f] || (typeof addressForm[f] === 'string' && addressForm[f].trim() === ''));
    if (missing.length > 0) {
      setAddressErrorMsg('Please fill in all required address fields.');
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
    const upsertData = { ...addressForm, user_id: session.user.id, address_id: addressIdToUse };
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
  const shippingCost = selectedShipping
    ? Number(selectedShipping.base_rate || 0)
    : shippingMethod === "jnt"
    ? 120
    : shippingMethod === "lbc"
    ? 160
    : 180;
  const taxes = 0;
  const total = (Number(subtotal) || 0) + shippingCost + taxes;

  // Fetch selected cart items for display
  useEffect(() => {
    (async () => {
      try {
        if (!session?.user?.id || selectedCartIds.length === 0) {
          setOrderedItems([]);
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
            products ( id, name, image_url, product_types ( name, product_categories ( name ) ) ),
            cart_variants ( price, product_variant_values ( variant_values ( value_name, variant_groups ( name ) ) ) ),
            cart_dimensions ( length, width, price )
          `)
          .in('cart_id', selectedCartIds)
          .eq('user_id', session.user.id)
          .order('cart_id', { ascending: true });
        if (error) {
          console.warn('Failed to load selected cart items', error);
          setOrderedItems([]);
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
          const variants = (it.cart_variants || []).flatMap(cv => {
            const pvv = cv.product_variant_values; if (!pvv) return [];
            const arr = Array.isArray(pvv) ? pvv : [pvv];
            return arr.map(v => ({ group: v?.variant_values?.variant_groups?.name, value: v?.variant_values?.value_name }));
          });
          const dim = (it.cart_dimensions || [])[0];
          return { id: it.cart_id, product_id: it.product_id, name: prod.name || 'Product', image_url: img, quantity: it.quantity || 1, total_price: Number(it.total_price)||0, variants, dimension: dim ? { length: dim.length, width: dim.width } : null };
        }));
        setOrderedItems(items);
      } catch (e) {
        console.warn('Unexpected error building ordered items', e);
        setOrderedItems([]);
      } finally {
        setItemsLoading(false);
      }
    })();
  }, [session?.user?.id, JSON.stringify(selectedCartIds)]);

  // Create Order in DB (orders, order_items, order_item_variants) and clear cart
  const createOrderInDB = async () => {
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
      const { data: orderRow, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: session.user.id,
          total_price: total,
          shipping_id: shippingId,
          address_id: selectedAddress.address_id || selectedAddressId,
        })
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
        const amount = total.toFixed(2);
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
                const created = await createOrderInDB();
                if (created) {
                  alert("Payment captured successfully");
                  navigate("/Thankyou-Cards");
                }
              } catch (e) {
                // Fallback to client-side capture
                try {
                  const capture = await actions.order.capture();
                  console.info("Client capture result", capture);
                  const created = await createOrderInDB();
                  if (created) {
                    alert("Payment captured successfully");
                    navigate("/Thankyou-Cards");
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
  }, [paymentMethod, total, selectedAddressId, addresses.length]);

  const handlePlaceOrderCOD = async () => {
    if (!email) {
      alert("Please enter your email");
      return;
    }
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
      const created = await createOrderInDB();
      if (created) {
        alert("Order placed with Cash on Delivery");
        navigate("/Thankyou-Cards");
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
      <div className="min-h-screen px-[24px] md:px-[60px] lg:px-[100px] py-[30px] w-full flex flex-col bg-white ">
        <div className="mt-2 grid grid-cols-2 lg:grid-cols-3 gap-8 px-[100px]">
          
          
          <div className="lg:col-span-2">
            <p className="text-black font-bold text-3xl font-dm-sans mb-6">
              Checkout
            </p>

            {/* Email */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full border rounded p-3"
              />
            </div>

            {/* 1. Shipping */}
            <div className="mb-6 border rounded">
              <div className="px-4 py-3 border-b bg-gray-50 font-semibold flex items-center justify-between">
                <span>1. Shipping</span>
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
                        className={`relative flex-shrink-0 w-[320px] border rounded-lg p-4 cursor-pointer transition-colors ${selected ? 'border-[#171738] bg-white' : 'border-gray-300 bg-white'}`}
                        onClick={() => setSelectedAddressId(id)}
                      >
                        {/* Edit */}
                        <button
                          className="absolute top-2 right-2 text-xs px-3 py-1 border rounded"
                          onClick={(e) => { e.stopPropagation(); handleEditAddress(address); }}
                        >
                          Edit
                        </button>
                        {/* Radio */}
                        <div className="flex items-start gap-3">
                          <input
                            className="mt-1"
                            type="radio"
                            name="selAddress"
                            checked={selected}
                            onChange={() => setSelectedAddressId(id)}
                          />
                          <div>
                            <div className="font-semibold text-[#171738]">
                              {(address.first_name || '') + (address.last_name ? ` ${address.last_name}` : '')}
                            </div>
                            <div className="text-sm text-gray-700 leading-5 mt-1">
                              {address.street_address}{address.barangay ? `, ${address.barangay}` : ''}
                              {address.city ? `, ${address.city}` : ''}{address.province ? `, ${address.province}` : ''}
                              {address.postal_code ? ` ${address.postal_code}` : ''}
                            </div>
                            {address.phone_number && (
                              <div className="text-sm text-gray-600 mt-2">Phone Number : +63 {String(address.phone_number).replace(/^\+?63/, '')}</div>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
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
                            <input type="text" className="w-full border border-[#3B5B92] rounded-md px-3 py-2 text-black bg-white" name="phone_number" value={addressForm.phone_number} onChange={e=>{ const value=e.target.value.replace(/[^0-9]/g,''); handleAddressChange({ target: { name:'phone_number', value, type:'text' } }); }} maxLength={11} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[14px] font-dm-sans mb-1">Label As</p>
                            <div className="flex gap-3">
                              <button type="button" className={`w-full h-[42px] border border-[#3B5B92] rounded-md font-dm-sans text-[16px] ${addressForm.label==='Work'?'bg-[#eaeaea] text-[#6B7280]':'bg-white text-black'}`} style={{ pointerEvents: addressForm.label==='Work' ? 'none' : 'auto' }} onClick={()=>setAddressForm(f=>({...f, label:'Work'}))}>Work</button>
                              <button type="button" className={`w-full h-[42px] border border-[#3B5B92] rounded-md font-dm-sans text-[16px] ${addressForm.label==='Home'?'bg-[#eaeaea] text-[#6B7280]':'bg-white text-black'}`} style={{ pointerEvents: addressForm.label==='Home' ? 'none' : 'auto' }} onClick={()=>setAddressForm(f=>({...f, label:'Home'}))}>Home</button>
                            </div>
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
            <div className="mb-6 border rounded">
              <div className="px-4 py-3 border-b bg-gray-50 font-semibold">
                2. Delivery
              </div>
              <div className="p-4 space-y-3">
                {shippingMethods.length > 0 ? (
                  shippingMethods.map((m) => (
                    <label key={m.shipping_id} className="flex items-center justify-between border rounded p-3">
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          value={m.shipping_id}
                          checked={selectedShippingId === m.shipping_id}
                          onChange={() => setSelectedShippingId(m.shipping_id)}
                        />
                        <span>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-gray-600">Base rate applies; final may vary by weight</div>
                        </span>
                      </span>
                      <span className="font-semibold">₱{Number(m.base_rate || 0).toFixed(2)}</span>
                    </label>
                  ))
                ) : (
                  <>
                    <label className="flex items-center justify-between border rounded p-3">
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          value="jnt"
                          checked={shippingMethod === "jnt"}
                          onChange={() => setShippingMethod("jnt")}
                        />
                        <span>
                          <div className="font-medium">J&T Express</div>
                          <div className="text-xs text-gray-600">3-5 business days (Metro Manila)</div>
                        </span>
                      </span>
                      <span className="font-semibold">₱120.00</span>
                    </label>
                    <label className="flex items-center justify-between border rounded p-3">
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
                    <label className="flex items-center justify-between border rounded p-3">
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
            <div className="mb-6 border rounded">
              <div className="px-4 py-3 border-b bg-gray-50 font-semibold">
                3. Payment
              </div>
              <div className="p-4 space-y-4">
                {/* PayPal */}
                <div className="border rounded">
                  <label className="w-full flex items-center justify-between px-3 py-2 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="pay"
                        value="paypal"
                        checked={paymentMethod === "paypal"}
                        onChange={() => setPaymentMethod("paypal")}
                      />
                      <span className="font-medium">PayPal or Card</span>
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
                <div className="border rounded">
                  <label className="w-full flex items-center justify-between px-3 py-2 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="pay"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                      />
                      <span className="font-medium">Cash on Delivery</span>
                    </span>
                  </label>
                  {paymentMethod === "cod" && (
                    <div className="px-3 pb-3 text-sm text-gray-600">
                      Pay in cash upon delivery.
                    </div>
                  )}
                </div>

                {/* Billing Address */}
                <div className="border rounded p-3">
                  <p className="text-sm font-medium text-gray-800 mb-2">Billing Address</p>
                  <div className="space-y-3">
                    <label
                      className={`flex items-center gap-3 border rounded px-3 py-3 cursor-pointer ${
                        sameAsShipping ? 'bg-gray-100 ' : 'bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="billingChoice"
                        checked={sameAsShipping}
                        onChange={() => setSameAsShipping(true)}
                      />
                      <span>Same as shipping address</span>
                    </label>
                    <label
                      className={`flex items-center gap-3 border rounded px-3 py-3 cursor-pointer ${
                        !sameAsShipping ? 'bg-gray-100 ' : 'bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="billingChoice"
                        checked={!sameAsShipping}
                        onChange={() => setSameAsShipping(false)}
                      />
                      <span>Use a different billing address</span>
                    </label>
                  </div>
                  {!sameAsShipping && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <input
                        className="border rounded p-2"
                        placeholder="Full name"
                        value={billingName}
                        onChange={(e) => setBillingName(e.target.value)}
                      />
                      <input
                        className="border rounded p-2"
                        placeholder="Address"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                      />
                      <input
                        className="border rounded p-2"
                        placeholder="City"
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                      />
                      <input
                        className="border rounded p-2"
                        placeholder="ZIP"
                        value={billingZip}
                        onChange={(e) => setBillingZip(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Action area: show PayPal Buttons or COD button */}
                <div className="mt-2">
                  {paymentMethod === "cod" ? (
                    <button
                      onClick={handlePlaceOrderCOD}
                      className="w-full md:w-auto px-6 py-3 bg-[#0F172A] text-white rounded"
                    >
                      Pay Now
                    </button>
                  ) : (
                    <div ref={paypalRef} className="w-full" />
                  )}
                  {payLoading && (
                    <p className="text-sm text-gray-500 mt-2">Processing…</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Items Ordered + Summary */}
          <aside className="lg:col-span-1">
            {/* Items Ordered */}
            <div className="border rounded p-4 mb-6">
              <div className="font-semibold mb-3">Item(s) Ordered</div>
              {itemsLoading ? (
                <div className="text-sm text-gray-500">Loading items…</div>
              ) : orderedItems.length === 0 ? (
                <div className="text-sm text-gray-500">No items selected.</div>
              ) : (
                <div className="space-y-4">
                  {orderedItems.map((it) => (
                    <div key={it.id} className="flex items-start gap-3">
                      <img src={it.image_url || '/logo-icon/logo.png'} alt={it.name} className="w-14 h-14 rounded object-contain border bg-white" onError={(e)=>{ e.currentTarget.src = '/logo-icon/logo.png'; }} />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#171738]">{it.name}</div>
                        <div className="text-xs text-gray-600">
                          {it.dimension && (<>Size: {it.dimension.length}×{it.dimension.width} cm<br /></>)}
                          {it.variants && it.variants.length > 0 && (
                            <>
                              {it.variants.slice(0,3).map((v, idx) => (
                                <span key={idx}>{v.group ? `${v.group}: ` : ''}{v.value}{idx < Math.min(2, it.variants.length-1) ? ' · ' : ''}</span>
                              ))}
                              <br />
                            </>
                          )}
                          Qty: {it.quantity}
                        </div>
                        <div className="text-sm font-semibold mt-1">₱{Number(it.total_price).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border rounded p-4">
              <div className="font-semibold mb-3">Order Summary</div>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₱{Number(subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>₱{shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Taxes</span>
                  <span>₱{taxes.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 font-semibold flex justify-between">
                  <span>Total</span>
                  <span>₱{total.toFixed(2)}</span>
                </div>
              </div>
              {paymentMethod === "paypal" && (
                <p className="text-xs text-gray-500 mt-3">
                  Complete your payment using the PayPal button above.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;