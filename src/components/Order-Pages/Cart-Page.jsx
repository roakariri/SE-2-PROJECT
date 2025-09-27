import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { UserAuth } from "../../context/AuthContext";

// Map of hex → color name
const colorNames = {
  "#c40233": "Red",
  "#000000": "Black",
  "#ffffff": "White",
  "#faf9f6": "Off-White",
  "#ede8d0": "Beige",
  "#808080": "Gray",
  "#228b22": "Green",
  "#0000ff": "Blue",
  "#ffd700": "Yellow",
  "#c0c0c0": "Silver",
  "#ffc0cb": "Pink",
  "#4169e1": "Blue",
  "#800080": "Purple"
};

const CartPage = () => {
  const { session } = UserAuth();
  const navigate = useNavigate();
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [allSelected, setAllSelected] = useState(false);
  const [actionLoadingIds, setActionLoadingIds] = useState({});
  const [globalActionLoading, setGlobalActionLoading] = useState(false);
  const [inputErrors, setInputErrors] = useState({});

  const normalizeHexCode = (value) => {
    if (!value) return null;
    let normalized = value.trim().toLowerCase();
    if (!normalized.startsWith("#")) {
      normalized = `#${normalized}`;
    }
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    return hexRegex.test(normalized) ? normalized : value;
  };

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const userId = session?.user?.id;
      if (!userId) {
        setCarts([]);
        setSelectedIds(new Set());
        setAllSelected(false);
        setLoading(false);
        return;
      }

      // Fetch cart data
      const { data: cartData, error: cartError } = await supabase
        .from("cart")
        .select(`
          cart_id,
          product_id,
          quantity,
          base_price,
          total_price,
          user_id,
          route,
          slug,
          products (
            id,
            name,
            image_url
          ),
          cart_variants (
            cart_variant_id,
            price,
            product_variant_values (
              product_variant_value_id,
              price,
              variant_values (
                value_name,
                variant_groups (
                  name
                )
              )
            )
          ),
          cart_dimensions (
            cart_dimension_id,
            dimension_id,
            length,
            width,
            price
          )
        `)
        .eq("user_id", userId)
        .order("cart_id", { ascending: true });

      if (cartError) {
        console.error("Error fetching cart:", cartError);
        setCarts([]);
        setLoading(false);
        return;
      }

      console.log("Raw cart data from Supabase:", JSON.stringify(cartData, null, 2));

      const formatted = await Promise.all(
        cartData.map(async (it) => {
          const prod = it.products || {};
          let img = prod.image_url || prod.image || null;
          if (img && typeof img === "string" && !img.startsWith("http")) {
            const key = img.startsWith("/") ? img.slice(1) : img;
            const buckets = [
              'apparel-images',
              'accessories-images',
              'accessoriesdecorations-images',
              'signage-posters-images',
              'cards-stickers-images',
              'packaging-images',
              '3d-prints-images',
            ];

            let foundUrl = '/apparel-images/caps.png';
            for (const bucket of buckets) {
              try {
                const { data } = supabase.storage.from(bucket).getPublicUrl(key);
                if (data && data.publicUrl && !data.publicUrl.endsWith('/')) {
                  const res = await fetch(data.publicUrl, { method: 'HEAD' });
                  if (res.ok) {
                    foundUrl = data.publicUrl;
                    break;
                  }
                }
              } catch (e) {
                // ignore errors and continue
              }
            }
            prod.image_url = foundUrl;
          }

          const variants = (it.cart_variants || []).flatMap((cv) => {
            const pvv = cv.product_variant_values;
            if (!pvv) return [];

            const values = Array.isArray(pvv) ? pvv : [pvv];
            return values.map((val) => {
              const valueName = val.variant_values?.value_name;
              const groupName = val.variant_values?.variant_groups?.name;
              let displayValue = valueName || "—";

              // Translate hex color codes to human names for color-like groups (Color, Strap, Trim, Accessories)
              if (valueName) {
                const g = (groupName || '').toLowerCase();
                const normalizedValue = normalizeHexCode(valueName);
                const looksHex = /^#[0-9a-f]{6}$/i.test(normalizedValue);
                const shouldTranslate = g.includes('color') || g.includes('strap') || g.includes('trim') || g.includes('accessories');

                if (looksHex && shouldTranslate) {
                  displayValue = colorNames[normalizedValue] || valueName;
                  console.log(`Cart ${it.cart_id} hex→name mapping:`, { groupName, valueName, normalizedValue, displayValue });
                } else if (g.includes('color')) {
                  displayValue = colorNames[normalizedValue] || colorNames[valueName] || valueName;
                  console.log(`Cart ${it.cart_id} color name mapping:`, { groupName, valueName, normalizedValue, displayValue });
                }
              }

              return {
                group: groupName || "Unknown",
                value: displayValue,
                price: cv.price ?? val.price ?? 0,
                product_variant_value_id: val.product_variant_value_id,
              };
            });
          });

          console.log(`Processed variants for cart_id ${it.cart_id}:`, JSON.stringify(variants, null, 2));

          // Fetch inventory data using the get_cart_inventory RPC
          let inventory = { quantity: 0, low_stock_limit: 0, combination_id: null };
          try {
            const { data: inventoryData, error: inventoryError } = await supabase
              .rpc('get_cart_inventory', { p_cart_id: it.cart_id });

            if (inventoryError) {
              console.warn(`Error fetching inventory for cart ${it.cart_id}:`, inventoryError);
              setInputErrors((p) => ({
                ...p,
                [it.cart_id]: "Unable to fetch stock information. Item may be unavailable.",
              }));
            } else if (inventoryData && inventoryData.length > 0) {
              inventory = {
                quantity: Number(inventoryData[0].out_quantity) || 0,
                low_stock_limit: Number(inventoryData[0].out_low_stock_limit) || 0,
                combination_id: inventoryData[0].out_combination_id,
              };
            } else {
              console.warn(`No inventory data found for cart ${it.cart_id}`);
              setInputErrors((p) => ({
                ...p,
                [it.cart_id]: "Item out of stock or unavailable.",
              }));
            }
          } catch (err) {
            console.warn(`Exception fetching inventory for cart ${it.cart_id}:`, err);
            setInputErrors((p) => ({
              ...p,
              [it.cart_id]: "Unable to fetch stock information. Item may be unavailable.",
            }));
          }

          // Fetch any uploaded design files associated with this cart row (scoped by cart_id)
          let uploadedFilesForCart = [];
          try {
            const { data: files, error: filesErr } = await supabase.from('uploaded_files').select('*').eq('cart_id', it.cart_id);
            if (!filesErr && Array.isArray(files) && files.length > 0) {
              uploadedFilesForCart = files.map(f => ({ ...f, id: f.id ?? f.file_id, file_id: f.file_id ?? f.id }));
            } else if (filesErr) {
              // Fallback when cart_id column doesn't exist or other errors: match by user_id and product_id
              console.debug('Fallback uploaded_files fetch for cart', it.cart_id, filesErr?.message || filesErr);
              const userId = session?.user?.id;
              if (userId) {
                try {
                  let fbQ = supabase.from('uploaded_files').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false }).limit(10);
                  const productIdForRow = it.product_id ?? prod.id;
                  if (productIdForRow) fbQ = fbQ.eq('product_id', productIdForRow);
                  const { data: fb, error: fbErr } = await fbQ;
                  if (!fbErr && Array.isArray(fb) && fb.length > 0) uploadedFilesForCart = fb.map(f => ({ ...f, id: f.id ?? f.file_id, file_id: f.file_id ?? f.id }));
                } catch (fbEx) {
                  console.warn('Fallback uploaded_files query failed:', fbEx);
                }
              }
            }
          } catch (fetchErr) {
            console.warn('Could not fetch uploaded_files for cart', it.cart_id, fetchErr);
          }

          const dimensions = it.cart_dimensions || [];
          const original_total_price = Number(it.total_price) || null;
          // Adjust cart quantity if it exceeds inventory quantity
          const adjustedQuantity = Math.min(Number(it.quantity) || 1, inventory.quantity);
          const unitPrice = Number(it.base_price) || (Number(it.total_price) || 0) / (Number(it.quantity) || 1);
          const adjustedTotalPrice = adjustedQuantity === 1 
            ? (Number(it.base_price) || (original_total_price != null ? original_total_price : unitPrice)) 
            : unitPrice * adjustedQuantity;

          return { 
            ...it, 
            product: prod, 
            variants, 
            dimensions, 
            original_total_price,
            inventory,
            quantity: adjustedQuantity,
            total_price: adjustedTotalPrice,
            uploaded_files: uploadedFilesForCart,
          };
        })
      );

      setCarts(formatted);
      setSelectedIds(new Set());
      setAllSelected(false);
    } catch (err) {
      console.error("Unexpected error fetching cart:", err);
      setCarts([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const toggleSelect = (id) => {
    const cartRow = carts.find((c) => c.cart_id === id);
    const inStock = (cartRow?.inventory?.quantity || 0) > 0;
    if (!inStock) return; // prevent selecting out-of-stock
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      const selectableCount = carts.filter((c) => (c.inventory?.quantity || 0) > 0).length;
      setAllSelected(selectableCount > 0 && next.size === selectableCount);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectable = carts.filter((c) => (c.inventory?.quantity || 0) > 0).map((c) => c.cart_id);
    if (allSelected) {
      setSelectedIds(new Set());
      setAllSelected(false);
    } else {
      const all = new Set(selectable);
      setSelectedIds(all);
      setAllSelected(selectable.length > 0);
    }
  };

  // Keep selections in sync with stock changes: drop any out-of-stock ids
  useEffect(() => {
    const allowed = new Set(carts.filter((c) => (c.inventory?.quantity || 0) > 0).map((c) => c.cart_id));
    setSelectedIds((prev) => {
      const filtered = new Set(Array.from(prev).filter((id) => allowed.has(id)));
      const selectableCount = allowed.size;
      setAllSelected(selectableCount > 0 && filtered.size === selectableCount);
      return filtered;
    });
  }, [carts]);

  const removeSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setGlobalActionLoading(true);
    try {
      await supabase.from("cart_variants").delete().in("cart_id", ids);
      const { error } = await supabase.from("cart").delete().in("cart_id", ids);
      if (error) throw error;
      await loadCart();
    } catch (err) {
      console.error("Failed to remove selected:", err);
    } finally {
      setGlobalActionLoading(false);
    }
  };

  const updateQuantity = async (cart, delta) => {
    const id = cart.cart_id;
    setActionLoadingIds((p) => ({ ...p, [id]: true }));

    const prev = carts.find((x) => x.cart_id === id);
    const currentQty = Number(prev?.quantity) || 1;
    const maxQty = Number(prev?.inventory?.quantity) || 0;

    if (maxQty === 0) {
      setInputErrors((p) => ({
        ...p,
        [id]: "Item is out of stock.",
      }));
      setActionLoadingIds((p) => {
        const copy = { ...p };
        delete copy[id];
        return copy;
      });
      return;
    }

    const newQty = Math.min(maxQty, Math.max(1, currentQty + delta));

    if (newQty === currentQty && delta > 0) {
      setInputErrors((p) => ({
        ...p,
        [id]: `Only ${maxQty} items available in stock.`,
      }));
      setActionLoadingIds((p) => {
        const copy = { ...p };
        delete copy[id];
        return copy;
      });
      return;
    }

    let unitPrice = Number(prev?.base_price);
    if (!unitPrice || isNaN(unitPrice)) unitPrice = (Number(prev?.total_price) || 0) / (currentQty || 1);
    const newTotal = (newQty === 1) 
      ? (Number(prev?.base_price) || (prev?.original_total_price != null ? Number(prev.original_total_price) : unitPrice * newQty)) 
      : unitPrice * newQty;

    setCarts((p) => p.map((x) => (x.cart_id === id ? { ...x, quantity: newQty, total_price: newTotal } : x)));

    try {
      const updatePayload = { quantity: newQty, total_price: newTotal };
      const { error } = await supabase
        .from("cart")
        .update(updatePayload)
        .eq("cart_id", id);
      if (error) {
        setCarts((p) => p.map((x) => (x.cart_id === id ? { ...x, quantity: prev?.quantity, total_price: prev?.total_price } : x)));
        throw error;
      }
      setInputErrors((p) => {
        const copy = { ...p };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      console.error("Failed updating quantity:", err);
    } finally {
      setActionLoadingIds((p) => {
        const copy = { ...p };
        delete copy[id];
        return copy;
      });
    }
  };

  const updateQuantityAbsolute = async (cartId, rawValue) => {
    const prev = carts.find((x) => x.cart_id === cartId);
    const prevQty = Number(prev?.quantity) || 1;
    const maxQty = Number(prev?.inventory?.quantity) || 0;
    const raw = Math.floor(Number(rawValue) || 1);
    const parsed = Math.min(maxQty, Math.max(1, raw));

    if (maxQty === 0) {
      setInputErrors((p) => ({
        ...p,
        [cartId]: "Item is out of stock.",
      }));
      setCarts((p) => p.map((x) => (x.cart_id === cartId ? { ...x, quantity: prevQty, total_price: prev?.total_price } : x)));
      return;
    }

    if (raw > maxQty) {
      setInputErrors((p) => ({
        ...p,
        [cartId]: `Only ${maxQty} items available in stock.`,
      }));
      setCarts((p) => p.map((x) => (x.cart_id === cartId ? { ...x, quantity: prevQty, total_price: prev?.total_price } : x)));
      return;
    }

    if (parsed === prevQty) {
      let unitPrice = Number(prev?.base_price);
      if (!unitPrice || isNaN(unitPrice)) unitPrice = (Number(prev?.total_price) || 0) / (prevQty || 1);
      const normalizedTotal = (parsed === 1)
        ? (Number(prev?.base_price) || (prev?.original_total_price != null ? Number(prev.original_total_price) : unitPrice * parsed))
        : unitPrice * parsed;
      setCarts((p) => p.map((x) => (x.cart_id === cartId ? { ...x, quantity: parsed, total_price: normalizedTotal } : x)));
      setInputErrors((p) => {
        const copy = { ...p };
        delete copy[cartId];
        return copy;
      });
      return;
    }

    setActionLoadingIds((p) => ({ ...p, [cartId]: true }));

    let unitPrice = Number(prev?.base_price);
    if (!unitPrice || isNaN(unitPrice)) unitPrice = (Number(prev?.total_price) || 0) / (prevQty || 1);
    const newTotal = (parsed === 1)
      ? (Number(prev?.base_price) || (prev?.original_total_price != null ? Number(prev.original_total_price) : unitPrice * parsed))
      : unitPrice * parsed;

    setCarts((p) => p.map((x) => (x.cart_id === cartId ? { ...x, quantity: parsed, total_price: newTotal } : x)));

    try {
      const updatePayload = { quantity: parsed, total_price: newTotal };
      const { error } = await supabase
        .from("cart")
        .update(updatePayload)
        .eq("cart_id", cartId);
      if (error) {
        setCarts((p) => p.map((x) => (x.cart_id === cartId ? { ...x, quantity: prev?.quantity, total_price: prev?.total_price } : x)));
        throw error;
      }
      setInputErrors((p) => {
        const copy = { ...p };
        delete copy[cartId];
        return copy;
      });
    } catch (err) {
      console.error("Failed updating typed quantity:", err);
    } finally {
      setActionLoadingIds((p) => {
        const copy = { ...p };
        delete copy[cartId];
        return copy;
      });
    }
  };

  const deleteCart = async (id) => {
    setActionLoadingIds((p) => ({ ...p, [id]: true }));
    try {
      try {
        const { data: files, error: fetchFilesErr } = await supabase.from('uploaded_files').select('*').eq('cart_id', id);
        let resolvedFiles = files;
        if (fetchFilesErr) {
          if (String(fetchFilesErr.message || '').toLowerCase().includes('does not exist') || String(fetchFilesErr.code) === '42703') {
            console.debug('uploaded_files.cart_id column missing, falling back to user_id/product_id lookup');
            const cartRow = carts.find(x => x.cart_id === id);
            const userId = session?.user?.id;
            if (userId && cartRow) {
              let fallbackQuery = supabase.from('uploaded_files').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false }).limit(10);
              const productId = cartRow.product_id ?? cartRow.product?.id;
              if (productId) fallbackQuery = fallbackQuery.eq('product_id', productId);
              const { data: fb, error: fbErr } = await fallbackQuery;
              if (fbErr) console.warn('Fallback uploaded_files query failed:', fbErr);
              resolvedFiles = fb || [];
            }
          } else {
            console.warn('Failed fetching uploaded_files for cart:', fetchFilesErr);
            resolvedFiles = [];
          }
        }

        if (Array.isArray(resolvedFiles) && resolvedFiles.length > 0) {
          const normFiles = resolvedFiles.map(f => ({ ...f, id: f.id ?? f.file_id, file_id: f.file_id ?? f.id }));
          console.debug('Found uploaded_files for cart, attempting removal:', normFiles.map(f => ({ file_id: f.file_id, file_name: f.file_name, image_url: f.image_url })));
          const ids = normFiles.map(f => f.file_id).filter(Boolean);

          for (const f of normFiles) {
            try {
              if (f.image_url && typeof f.image_url === 'string') {
                let path = null;
                try {
                  const u = new URL(f.image_url);
                  const segments = u.pathname.split('/').filter(Boolean);
                  const bucketIndex = segments.indexOf('product-files');
                  if (bucketIndex !== -1 && segments.length > bucketIndex + 1) {
                    path = segments.slice(bucketIndex + 1).join('/');
                  }
                } catch (e) {
                  const marker = '/product-files/';
                  const idx = f.image_url.indexOf(marker);
                  if (idx !== -1) path = f.image_url.slice(idx + marker.length);
                }

                if (path) {
                  const { error: removeErr } = await supabase.storage.from('product-files').remove([path]);
                  if (removeErr) console.warn('Failed to remove storage object for uploaded file', { path, removeErr });
                  else console.debug('Removed storage object for uploaded file', { path });
                }
              }
            } catch (e) {
              console.warn('Error while attempting to remove storage for uploaded file', e);
            }
          }

          if (ids.length > 0) {
            try {
              const userId = session?.user?.id;
              let delRes;
              if (userId) {
                delRes = await supabase.from('uploaded_files').delete().eq('user_id', userId).in('file_id', ids);
              } else {
                delRes = await supabase.from('uploaded_files').delete().in('file_id', ids);
              }
              if (delRes?.error) console.warn('Failed to delete uploaded_files rows for cart:', delRes.error);
              else console.debug('Deleted uploaded_files rows for cart', { ids, userId: session?.user?.id });
            } catch (e) {
              console.warn('Exception while deleting uploaded_files rows for cart:', e);
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch uploaded_files for cart deletion:', e?.message || e);
      }

      await supabase.from("cart_variants").delete().eq("cart_id", id);
      const { error } = await supabase.from("cart").delete().eq("cart_id", id);
      if (error) throw error;
      await loadCart();
    } catch (err) {
      console.error("Failed to delete cart:", err);
    } finally {
      setActionLoadingIds((p) => {
        const copy = { ...p };
        delete copy[id];
        return copy;
      });
    }
  };

  const editCart = (cart) => {
    const routeFromRow = cart.route || cart.slug;
    const prodRoute = cart.product?.route || cart.product?.slug;
    const route = routeFromRow || prodRoute;
    let path;
    if (route) {
      path = String(route).startsWith('/') ? route : `/${String(route)}`;
    } else {
      path = `/product/${cart.product_id}`;
    }
    navigate(path, { state: { fromCart: true, cartRow: cart } });
  };

  const subtotal = (selectedIds && selectedIds.size > 0)
    ? carts.reduce((acc, c) => acc + (selectedIds.has(c.cart_id) ? (Number(c.total_price) || 0) : 0), 0)
    : 0;

  return (
    <div className="min-h-screen p-[100px] w-full flex flex-col bg-white phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
      <div className="mt-10 max-w-[1200px] mx-auto w-full">
        <p className="text-black font-bold text-[36px] font-dm-sans">Cart</p>

        {loading ? (
          <div className="flex items-center justify-center mt-24">
            <p className="text-gray-600">Loading your cart...</p>
          </div>
        ) : carts.length === 0 ? (
          <div className="flex flex-col items-center font-dm-sans justify-center mt-[100px]">
            <p className="text-[20px] font-bold text-black">Your cart is empty.</p>
            <p className="text-black font-dm-sans">Browse our products and add your first item to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col laptop:flex-row gap-6 mt-8">
            <div className="flex-1 bg-white">
              <div className="w-full bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 bg-white border rounded checked:bg-black checked:border-black focus:ring-0"
                      />
                      <span className="text-[12px] font-semibold font-dm-sans text-black">Select All</span>
                    </label>
                    <button
                      className="bg-white text-[12px] font-semibold text-black border px-2 py-1 rounded "
                      onClick={removeSelected}
                      disabled={globalActionLoading || selectedIds.size === 0}
                    >
                      Remove Selected
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4 items-center font-semibold text-gray-700 border-b border-[#939393] pb-3">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-left">Total Price</div>
                </div>

                <div className="divide-y">
                  {carts.map((c) => {
                    const colorVariant = c.variants?.find((v) => v.group?.toLowerCase().includes("color"));
                    return (
                      <div key={c.cart_id} className="grid grid-cols-12 gap-4 items-center py-6 border-b border-gray-200">
                        <div className="col-span-5 flex items-center gap-4">
                          <input
                            type="checkbox"
                            className="mt-3 w-4 h-4 bg-white border rounded checked:bg-black checked:border-black focus:ring-0 disabled:opacity-40 disabled:cursor-not-allowed"
                            checked={selectedIds.has(c.cart_id)}
                            onChange={() => toggleSelect(c.cart_id)}
                            disabled={(c.inventory?.quantity || 0) === 0}
                            title={(c.inventory?.quantity || 0) === 0 ? 'Out of stock' : undefined}
                          />
                          <img
                            src={c.product?.image_url || "/apparel-images/caps.png"}
                            alt={c.product?.name || "product"}
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div>
                            <p className="font-semibold text-black font-dm-sans">{c.product?.name || `Product ${c.product_id}`}</p>
                            <p className="text-sm text-gray-600 font-dm-sans">Project Name: None</p>
                            {c.dimensions && c.dimensions.length > 0 && (
                              <p className="text-sm text-gray-600 font-dm-sans">Size: {`${c.dimensions[0].length || 0} x ${c.dimensions[0].width || 0}`} inches</p>
                            )}
                            {Array.isArray(c.uploaded_files) && c.uploaded_files.length > 0 && (
                              <div className="mt-2 flex items-center gap-2">
                                {c.uploaded_files.map((f, idx) => (
                                  <div key={f.file_id || f.id || idx} className="flex items-center gap-2 border rounded px-2 py-1 bg-white">
                                    <div className="w-10 h-10 overflow-hidden rounded bg-gray-100 flex items-center justify-center">
                                      {f.image_url ? (
                                        // image_url may be a public URL
                                        <img src={f.image_url} alt={f.file_name || 'design'} className="w-full h-full object-cover" />
                                      ) : (
                                        <img src="/logo-icon/image.svg" alt="file" className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 truncate max-w-[140px]">{f.file_name || 'uploaded design'}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {c.variants?.length > 0 && (
                              <div className="mt-1">
                                {c.variants.map((v, i) => (
                                  <p key={i} className="text-sm text-gray-600 font-dm-sans">
                                    {v.group}: {v.value}
                                  </p>
                                ))}
                              </div>
                            )}
                            {c.inventory?.quantity <= c.inventory?.low_stock_limit && c.inventory?.quantity > 0 && (
                              <p className="text-sm text-red-600 font-dm-sans mt-1">
                                Low stock: Only {c.inventory.quantity} left
                              </p>
                            )}
                            {inputErrors[c.cart_id] && (
                              <div className="mt-2">
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{inputErrors[c.cart_id]}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="col-span-2 text-center">
                          <p className="font-semibold font-dm-sans text-black">₱{(Number(c.base_price) || 0).toFixed(2)}</p>
                        </div>

                        <div className="col-span-2 text-center">
                          <div className="inline-flex items-center border rounded-md">
                            <button
                              className="px-1 py-1 bg-white text-black border disabled:opacity-50"
                              onClick={() => updateQuantity(c, -1)}
                              disabled={actionLoadingIds[c.cart_id] || (c.inventory?.quantity || 0) === 0}
                            >
                              -
                            </button>
                            <div className="relative inline-block">
                              <input
                                type="number"
                                min={1}
                                max={c.inventory?.quantity || 0}
                                value={c.quantity}
                                className="w-12 text-center px-2 py-1 outline-none"
                                onChange={(e) => {
                                  const v = e.target.value;
                                  let shouldPersistResetToOne = false;
                                  setCarts((prev) =>
                                    prev.map((x) => {
                                      if (x.cart_id !== c.cart_id) return x;
                                      const prevQty = Number(x.quantity) || 1;
                                      let unitPrice = (Number(x.total_price) || 0) / (prevQty || 1);
                                      if (!unitPrice || isNaN(unitPrice)) unitPrice = Number(x.base_price) || 0;
                                      const maxQty = Number(x.inventory?.quantity) || 0;
                                      const parsed = Number(v);
                                      if (!isNaN(parsed)) {
                                        if (parsed > maxQty || maxQty === 0) {
                                          const restoredTotal = (Number(x.base_price) || (x.original_total_price != null ? Number(x.original_total_price) : 0));
                                          setInputErrors((p) => ({
                                            ...p,
                                            [c.cart_id]: maxQty === 0 ? "Item is out of stock." : `Only ${maxQty} items available in stock.`,
                                          }));
                                          shouldPersistResetToOne = true;
                                          return { ...x, quantity: 1, total_price: restoredTotal };
                                        }
                                        const bounded = Math.max(1, Math.floor(parsed));
                                        if (bounded === 1) {
                                          const restored = Number(x.base_price) || (x.original_total_price != null ? Number(x.original_total_price) : unitPrice);
                                          setInputErrors((p) => {
                                            const copy = { ...p };
                                            delete copy[c.cart_id];
                                            return copy;
                                          });
                                          return { ...x, quantity: v, total_price: restored };
                                        }
                                        const newTotal = unitPrice * bounded;
                                        setInputErrors((p) => {
                                          const copy = { ...p };
                                          delete copy[c.cart_id];
                                          return copy;
                                        });
                                        return { ...x, quantity: v, total_price: newTotal };
                                      }
                                      return { ...x, quantity: v };
                                    })
                                  );
                                  if (shouldPersistResetToOne) {
                                    updateQuantityAbsolute(c.cart_id, '1');
                                  }
                                }}
                                onBlur={(e) => {
                                  updateQuantityAbsolute(c.cart_id, e.target.value);
                                  setInputErrors((p) => {
                                    const copy = { ...p };
                                    delete copy[c.cart_id];
                                    return copy;
                                  });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                disabled={actionLoadingIds[c.cart_id] || (c.inventory?.quantity || 0) === 0}
                              />
                            </div>
                            <button
                              className="px-1 py-1 bg-white text-black border disabled:opacity-50"
                              onClick={() => updateQuantity(c, +1)}
                              disabled={actionLoadingIds[c.cart_id] || (c.inventory?.quantity || 0) === 0}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="ml-[10px] text-left col-span-1 block">
                          ₱{(Number(c.total_price) || 0).toFixed(2)}
                        </div>

                        <div className="col-span-2 font-dm-sans text-black font-semibold">
                          <div className="w-full flex items-center justify-end gap-4 ">
                          
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                aria-label="Edit item"
                                title="Edit"
                                onClick={() => editCart(c)}
                                disabled={actionLoadingIds[c.cart_id]}
                                className="p-1 rounded bg-transparent hover:bg-gray-100 disabled:opacity-50"
                              >
                                <img src="/logo-icon/edit-icon.svg" alt="edit" className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete item"
                                title="Delete"
                                onClick={() => deleteCart(c.cart_id)}
                                disabled={actionLoadingIds[c.cart_id]}
                                className="p-1 rounded bg-transparent hover:bg-gray-100 disabled:opacity-50"
                              >
                                <img src="/logo-icon/trash-icon.svg" alt="delete" className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="w-full laptop:w-[340px]">
              <div className="border border-[#939393] rounded p-6 bg-white">
                <h3 className="font-semibold text-[20px] text-gray-800 text-center mb-4 font-dm-sans">Order Summary</h3>
                <div className="flex justify-between text-gray-400 mb-2">
                  <div className="font-semibold">Subtotal</div>
                  <div className="font-semibold text-black font-dm-sans">₱{subtotal.toFixed(2)}</div>
                </div>
                <div className="flex justify-between text-gray-400 mb-2">
                  <div className="font-semibold">Shipping</div>
                  <div className="text-black text-black font-semibold">TBD</div>
                </div>
                <div className="flex justify-between text-gray-400 mb-4">
                  <div className="font-semibold">Taxes</div>
                  <div className="font-semibold text-black">TBD</div>
                </div>
                <div className="border-t border-[#939393] pt-4 flex justify-between items-center mb-4">
                  <div className="font-semibold text-lg font-dm-sans text-black">Total</div>
                  <div className="font-bold text-xl font-dm-sans text-black">₱{subtotal.toFixed(2)}</div>
                </div>
                <button
                  className="w-full bg-[#2B4269] text-white font-dm-sans font-semibold py-3 rounded border disabled:opacity-50"
                  onClick={() => {
                    try {
                      localStorage.setItem('cartSubtotal', String(subtotal));
                      localStorage.setItem('cartSelectedIds', JSON.stringify(Array.from(selectedIds)));
                    } catch {}
                    navigate('/checkout');
                  }}
                  disabled={selectedIds.size === 0}
                >
                  Proceed to Checkout
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;