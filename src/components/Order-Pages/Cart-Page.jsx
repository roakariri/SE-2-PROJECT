import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { UserAuth } from "../../context/AuthContext";

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

    const loadCart = useCallback(async () => {
        setLoading(true);
        try {
            const userId = session?.user?.id;
            if (!userId) {
                setCarts([]);
                setSelectedIds(new Set());
                setAllSelected(false);
                return;
            }

            const { data, error } = await supabase
                .from("cart")
                .select(`cart_id, product_id, quantity, base_price, total_price, products(id, name, image_url)`)
                .eq("user_id", userId)
                .order("cart_id", { ascending: true });

            if (error) {
                console.warn("Cart fetch error:", error);
                setCarts([]);
            } else {
                const items = data || [];

                // Try resolving image keys across likely storage buckets
                const buckets = [
                    "apparel-images",
                    "accessories-images",
                    "accessoriesdecorations-images",
                    "signage-posters-images",
                    "cards-stickers-images",
                    "packaging-images",
                    "3d-prints-images",
                ];

                const resolved = await Promise.all(
                    items.map(async (it) => {
                        try {
                            const prod = it.products || {};
                            let img = prod.image_url || prod.image || null;
                            if (img && typeof img === "string" && !img.startsWith("http")) {
                                // Normalize key (remove leading slash)
                                const key = img.startsWith("/") ? img.slice(1) : img;
                                for (const bucket of buckets) {
                                    try {
                                        const { data: urlData } = await supabase.storage.from(bucket).getPublicUrl(key);
                                        const publicUrl = urlData?.publicUrl;
                                        if (publicUrl) {
                                            prod.image_url = publicUrl;
                                            break;
                                        }
                                    } catch (e) {
                                        // ignore and try next bucket
                                    }
                                }
                            }
                            // If still no valid URL, leave as-is so UI fallback applies
                            return { ...it, products: prod };
                        } catch (e) {
                            return it;
                        }
                    })
                );

                setCarts(resolved);
                setSelectedIds(new Set());
                setAllSelected(false);
            }
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

    // Show subtotal only for selected items. If none selected, subtotal is 0 per UX requirement.
    const subtotal = (selectedIds && selectedIds.size > 0)
        ? carts.reduce((acc, c) => acc + (selectedIds.has(c.cart_id) ? (Number(c.total_price) || 0) : 0), 0)
        : 0;

    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            setAllSelected(next.size === carts.length && carts.length > 0);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
            setAllSelected(false);
        } else {
            const all = new Set(carts.map((c) => c.cart_id));
            setSelectedIds(all);
            setAllSelected(true);
        }
    };

    const removeSelected = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        setGlobalActionLoading(true);
        try {
            // delete related cart_variants first
            await supabase.from("cart_variants").delete().in("cart_id", ids);
            // delete cart rows
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

        // Snapshot prior state to allow revert on failure
        const prev = carts.find((x) => x.cart_id === id);
    const currentQty = Number(prev?.quantity) || 1;
    // clamp between 1 and 100
    const newQty = Math.min(100, Math.max(1, currentQty + delta));
    // Prefer base_price as the unit price when available. Otherwise derive from total_price/quantity.
    const unitPrice = Number(prev?.base_price) || ((Number(prev?.total_price) || 0) / (Number(prev?.quantity) || 1));
        const newTotal = unitPrice * newQty;

        // Optimistically update local UI
        setCarts((p) => p.map((x) => (x.cart_id === id ? { ...x, quantity: newQty, total_price: newTotal } : x)));

        try {
            const { error } = await supabase
                .from("cart")
                .update({ quantity: newQty, total_price: newTotal })
                .eq("cart_id", id);
            if (error) {
                // revert on error
                setCarts((p) => p.map((x) => (x.cart_id === id ? { ...x, quantity: prev?.quantity, total_price: prev?.total_price } : x)));
                throw error;
            }
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

    // Handle typed quantity input (absolute value)
    const updateQuantityAbsolute = async (cartId, rawValue) => {
        const prev = carts.find((x) => x.cart_id === cartId);
        const prevQty = Number(prev?.quantity) || 1;
    // parse and clamp to [1,100]
    const parsed = Math.min(100, Math.max(1, Math.floor(Number(rawValue) || 1)));
        if (parsed === prevQty) {
                // Normalize stored value and total_price display. Prefer base_price as unit price.
                const unitPrice = Number(prev?.base_price) || ((Number(prev?.total_price) || 0) / (prevQty || 1));
                const normalizedTotal = unitPrice * parsed;
            setCarts((p) => p.map((x) => (x.cart_id === cartId ? { ...x, quantity: parsed, total_price: normalizedTotal } : x)));
            return;
        }

        setActionLoadingIds((p) => ({ ...p, [cartId]: true }));

        // compute unit price from previous state (prefer base_price)
        const unitPrice = Number(prev?.base_price) || ((Number(prev?.total_price) || 0) / (prevQty || 1));
        const newTotal = unitPrice * parsed;

        // optimistic update
        setCarts((p) => p.map((x) => (x.cart_id === cartId ? { ...x, quantity: parsed, total_price: newTotal } : x)));

        try {
            const { error } = await supabase
                .from("cart")
                .update({ quantity: parsed, total_price: newTotal })
                .eq("cart_id", cartId);
            if (error) {
                // revert
                setCarts((p) => p.map((x) => (x.cart_id === cartId ? { ...x, quantity: prev?.quantity, total_price: prev?.total_price } : x)));
                throw error;
            }
            // clear any input error for this cart on success
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
        // Navigate to the product page for the selected cart item; adjust route as needed
        navigate(`/product/${cart.product_id}`);
    };

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
                        {/* Left: items list */}
                        <div className="flex-1 bg-white">
                            <div className="w-full bg-white p-4 ">
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
                                            <span className="text-sm">Select All</span>
                                        </label>
                                        <button
                                            className="bg-white text-sm text-black border px-2 py-1 rounded disabled:opacity-50"
                                            onClick={removeSelected}
                                            disabled={globalActionLoading || selectedIds.size === 0}
                                        >
                                            Remove Selected
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-4 items-center font-semibold text-gray-700 border-b pb-3">
                                    <div className="col-span-6">Product</div>
                                    <div className="col-span-2 text-center">Price</div>
                                    <div className="col-span-2 text-center">Quantity</div>
                                    <div className="col-span-2 text-right">Total Price</div>
                                </div>

                                <div className="divide-y">
                                    {carts.map((c) => (
                                        <div key={c.cart_id} className="grid grid-cols-12 gap-4 items-center py-6">
                                            <div className="col-span-6 flex items-start gap-4">
                                                <input
                                                    type="checkbox"
                                                    className="mt-3 w-4 h-4 bg-white border rounded checked:bg-black checked:border-black focus:ring-0"
                                                    checked={selectedIds.has(c.cart_id)}
                                                    onChange={() => toggleSelect(c.cart_id)}
                                                />
                                                <img
                                                    src={c.products?.image_url || "/apparel-images/caps.png"}
                                                    alt={c.products?.name || "product"}
                                                    className="w-20 h-20 object-cover rounded"
                                                />
                                                <div>
                                                    <p className="font-semibold text-black">{c.products?.name || `Product ${c.product_id}`}</p>
                                                    <p className="text-sm text-gray-600">Project Name: None</p>
                                                    <p className="text-sm text-gray-600">Technique: —</p>
                                                    <p className="text-sm text-gray-600">Color: —</p>
                                                    {inputErrors[c.cart_id] && (
                                                        <div className="mt-2">
                                                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{inputErrors[c.cart_id]}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="col-span-2 text-center">
                                                <p className="font-semibold">₱{(Number(c.base_price) || 0).toFixed(2)}</p>
                                            </div>

                                            <div className="col-span-2 text-center">
                                                <div className="inline-flex items-center border rounded">
                                                    <button className="px-3 py-1 bg-white text-black border disabled:opacity-50" onClick={() => updateQuantity(c, -1)} disabled={actionLoadingIds[c.cart_id]}>-</button>
                                                    <div className="relative inline-block">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={100}
                                                        value={c.quantity}
                                                        className="w-16 text-center px-2 py-1 outline-none"
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setCarts((prev) =>
                                                                prev.map((x) => {
                                                                    if (x.cart_id !== c.cart_id) return x;
                                                                    const prevQty = Number(x.quantity) || 1;
                                                                    const unitPrice = (Number(x.total_price) || Number(x.base_price) || 0) / (prevQty || 1);
                                                                    const parsed = Number(v);
                                                                    if (!isNaN(parsed)) {
                                                                        if (parsed > 100) {
                                                                            // mark error and blank the total_price display
                                                                            setInputErrors((p) => ({ ...p, [c.cart_id]: 'Maximum quantity is 100' }));
                                                                            return { ...x, quantity: v, total_price: null };
                                                                        }
                                                                        // valid and within range: compute bounded total
                                                                        const bounded = Math.max(1, Math.floor(parsed));
                                                                        const newTotal = unitPrice * bounded;
                                                                        setInputErrors((p) => {
                                                                            const copy = { ...p };
                                                                            delete copy[c.cart_id];
                                                                            return copy;
                                                                        });
                                                                        return { ...x, quantity: v, total_price: newTotal };
                                                                    }
                                                                    // not a number: keep previous total
                                                                    return { ...x, quantity: v };
                                                                })
                                                            );
                                                        }}
                                                        onBlur={(e) => {
                                                            // on blur persist bounded value
                                                            updateQuantityAbsolute(c.cart_id, e.target.value);
                                                            // clear input error after attempting persist
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
                                                        disabled={actionLoadingIds[c.cart_id]}
                                                    />
                                                    </div>
                                                    <button className="px-3 py-1 bg-white text-black border disabled:opacity-50" onClick={() => updateQuantity(c, +1)} disabled={actionLoadingIds[c.cart_id]}>+</button>
                                                </div>
                                            </div>

                                            <div className="col-span-2 text-right font-semibold">
                                                {inputErrors[c.cart_id] ? "" : `₱${(Number(c.total_price) || 0).toFixed(2)}`}
                                            </div>

                                            <div className="col-span-12 flex justify-end gap-3 mt-2">
                                                <button className="bg-white text-sm text-black border px-2 py-1 rounded disabled:opacity-50" onClick={() => editCart(c)} disabled={actionLoadingIds[c.cart_id]}>Edit</button>
                                                <button className="bg-white text-sm text-black border px-2 py-1 rounded disabled:opacity-50" onClick={() => deleteCart(c.cart_id)} disabled={actionLoadingIds[c.cart_id]}>Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: order summary */}
                        <aside className="w-full laptop:w-[340px]">
                            <div className="border rounded p-6 bg-white">
                                <h3 className="font-semibold text-lg text-gray-800 mb-4">Order Summary</h3>
                                <div className="flex justify-between text-gray-600 mb-2">
                                    <div>Subtotal</div>
                                    <div className="font-semibold">₱{subtotal.toFixed(2)}</div>
                                </div>
                                <div className="flex justify-between text-gray-600 mb-2">
                                    <div>Shipping</div>
                                    <div>TBD</div>
                                </div>
                                <div className="flex justify-between text-gray-600 mb-4">
                                    <div>Taxes</div>
                                    <div>TBD</div>
                                </div>
                                <div className="border-t pt-4 flex justify-between items-center mb-4">
                                    <div className="font-semibold text-lg">Total</div>
                                    <div className="font-bold text-xl">₱{subtotal.toFixed(2)}</div>
                                </div>
                                <button className="w-full bg-[#2B4269] text-white font-dm-sans font-semibold py-3 rounded border disabled:opacity-50">Proceed to Checkout</button>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;