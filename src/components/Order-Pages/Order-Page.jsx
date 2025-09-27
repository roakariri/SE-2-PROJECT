import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { UserAuth } from "../../context/AuthContext";

// Utility to parse query params
const useQuery = () => new URLSearchParams(useLocation().search);

// Helpers
const formatDate = (iso) => {
	try {
		const d = iso ? new Date(iso) : new Date();
		return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
	} catch {
		return String(iso || "");
	}
};
const formatDisplayPHMobile = (value) => {
	try {
		const digits = String(value || "").replace(/\D/g, "");
		if (!digits) return "";
		let local10 = digits;
		if (local10.startsWith("63")) local10 = local10.slice(2);
		if (local10.startsWith("0")) local10 = local10.slice(1);
		if (local10.length > 10) local10 = local10.slice(-10);
		return local10 ? `+63 ${local10}` : "";
	} catch { return ""; }
};
const addBusinessDays = (startISO, days = 3) => {
	try {
		let date = startISO ? new Date(startISO) : new Date();
		let added = 0;
		while (added < days) {
			date.setDate(date.getDate() + 1);
			const day = date.getDay();
			if (day !== 0 && day !== 6) added++;
		}
		return date.toISOString();
	} catch { return startISO; }
};

// Color helpers copied from Order Confirmation to translate hex/rgb to human names
const hexToRgb = (hex) => {
	if (typeof hex !== "string") return null;
	let h = hex.trim();
	if (h.startsWith("#")) h = h.slice(1);
	if (h.length === 3) {
		h = h.split("").map((c) => c + c).join("");
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
	if (s < 0.1) {
		if (l < 0.08) return "black";
		if (l < 0.2) return "very dark gray";
		if (l < 0.35) return "dark gray";
		if (l < 0.65) return "gray";
		if (l < 0.85) return "light gray";
		return "white";
	}
	let name = "";
	if (h < 15 || h >= 345) name = "red";
	else if (h < 45) name = "orange";
	else if (h < 75) name = "yellow";
	else if (h < 95) name = "lime";
	else if (h < 150) name = "green";
	else if (h < 195) name = "cyan";
	else if (h < 255) name = "blue";
	else if (h < 285) name = "purple";
	else if (h < 345) name = "magenta";
	let prefix = "";
	if (l < 0.25) prefix = "dark ";
	else if (l > 0.7) prefix = "light ";
	else if (s > 0.8 && l > 0.3 && l < 0.6) prefix = "vivid ";
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
	const nx = normalizeHex(value);
	if (groupKey && nx && HEX_NAME_MAPS[groupKey] && HEX_NAME_MAPS[groupKey][nx]) {
		return HEX_NAME_MAPS[groupKey][nx];
	}
	const capFirst = (s) => (typeof s === 'string' && s.length > 0) ? (s[0].toUpperCase() + s.slice(1)) : s;
	if (!value) return value;
	const val = String(value).trim();
	const looksHex = /^#?[0-9a-fA-F]{3}$/.test(val) || /^#?[0-9a-fA-F]{6}$/.test(val);
	const groupIsColor = typeof group === 'string' && /color/i.test(group);
	if (looksHex) {
		const rgb = hexToRgb(val.startsWith('#') ? val : `#${val}`);
		if (rgb) return capFirst(describeColor(rgbToHsl(rgb)));
	}
	const m = val.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
	if (m) {
		const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
		const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
		const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));
		return capFirst(describeColor(rgbToHsl({ r, g, b })));
	}
	if (groupIsColor) return val;
	return value;
};

// Map raw status to one of our 5 stages
const normalizeStage = (status) => {
	const s = String(status || "").toLowerCase();
	if (s.includes("cancel")) return "cancelled";
	if (s.includes("deliver")) return "delivered";
	if (s.includes("shipped")) return "shipped";
	if (s.includes("ready")) return "ready";
	// Treat these granular statuses as part of production
	if (s.includes("production") || s.includes("printing") || s.includes("quality") || s.includes("qc") || s.includes("packed")) return "in-production";
	if (s.includes("placed")) return "placed";
	return "placed";
};

const STAGES = [
	{ key: "placed", label: "Order Placed" },
	{ key: "in-production", label: "Order in Production" },
	{ key: "ready", label: "Ready for Shipment" },
	{ key: "shipped", label: "Shipped" },
	{ key: "delivered", label: "Delivered" },
];

const StageTracker = ({ current }) => {
	const currentIndex = Math.max(0, STAGES.findIndex((s) => s.key === current));
	return (
		<div className="w-full flex items-start py-4 font-dm-sans">
			{STAGES.map((s, idx) => {
				const done = idx <= currentIndex && current !== "cancelled";
				return (
					<React.Fragment key={s.key}>
						<div className="flex flex-col items-center">
							<div
								className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold border font-dm-sans ${done ? "bg-[#E6764F] text-white border-[#F19B7D]" : "bg-gray-200 text-gray-500 border-gray-300"}`}
								aria-label={s.label}
							>
								{done ? "✓" : idx + 1}
							</div>
							<div className={`mt-2 text-[15px] text-center font-dm-sans font-semibold ${done ? "text-[#939393]" : "text-[#939393]"}`}>
								{s.label}
							</div>
						</div>
						{idx < STAGES.length - 1 && (
							<div className={`flex-1 h-[2px] self-center mx-2 ${idx < currentIndex ? "bg-gray-300" : "bg-gray-200"}`} />
						)}
					</React.Fragment>
				);
			})}
		</div>
	);
};

// Small pill used for the three subtasks (Printing, Quality Check, Packed)
const Subtask = ({ label, done }) => (
	<div className="flex items-center gap-2 font-dm-sans">
		<span
			className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-semibold font-dm-sans ${done ? "bg-[#E6764F] text-white" : "bg-gray-200  text-gray-600"}`}
			aria-label={done ? `${label} done` : `${label} in-progress`}
		>
			{done ? "✓" : ""}
		</span>
		<span className={done ? "text-[#939393] font-dm-sans" : "text-gray-600 font-dm-sans"}>{label}</span>
	</div>
);

export default function OrderPage() {
	const query = useQuery();
	const navigate = useNavigate();
	const { session } = UserAuth();
	const orderId = query.get("order_id");

	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState("");
		const [order, setOrder] = React.useState(null);
		const [items, setItems] = React.useState([]);
		const [address, setAddress] = React.useState(null);
		const [shipping, setShipping] = React.useState(null);
		const [paymentLabel, setPaymentLabel] = React.useState("");

	React.useEffect(() => {
		let cancelled = false;
		const run = async () => {
			try {
				setLoading(true);
				setError("");
				if (!session) return;
				if (!orderId) {
					setError("Missing order_id");
					return;
				}
						// Fetch order (include address/shipping/payment ids)
				const { data: ord, error: ordErr } = await supabase
							.from("orders")
							.select("order_id, user_id, status, total_price, created_at, address_id, shipping_id, payment_id")
					.eq("order_id", orderId)
					.single();
				if (ordErr) throw ordErr;
				if (!ord || ord.user_id !== session.user.id) {
					setError("Order not found");
					return;
				}
						// Fetch items (no nested join to avoid fragile relations)
				const { data: rawItems, error: itErr } = await supabase
					.from("order_items")
					.select("order_item_id, order_id, product_id, quantity, base_price, total_price")
					.eq("order_id", orderId)
					.order("order_item_id", { ascending: true });
				if (itErr) throw itErr;

				// Build product map
				const oi = Array.isArray(rawItems) ? rawItems : [];
				const productIds = [...new Set(oi.map((r) => r.product_id).filter(Boolean))];
				let productsMap = {};
				if (productIds.length > 0) {
					const { data: prodRows } = await supabase
						.from("products")
						.select("id, name, image_url, weight, product_types ( name, product_categories ( name ) )")
						.in("id", productIds);
					productsMap = (prodRows || []).reduce((acc, p) => {
						acc[p.id] = p;
						return acc;
					}, {});
				}

				// Resolve image using similar logic as confirmation page
				const resolveImage = async (product) => {
					try {
						const image_key = product?.image_url;
						if (!image_key) return "/logo-icon/logo.png";
						if (typeof image_key === "string" && (image_key.startsWith("http") || image_key.startsWith("/"))) return image_key;
						const key = String(image_key).replace(/^\/+/, "");
						const categoryName = (product?.product_types?.product_categories?.name || product?.product_types?.name || "").toLowerCase();
						let primaryBucket = null;
						if (categoryName.includes("apparel")) primaryBucket = "apparel-images";
						else if (categoryName.includes("accessories")) primaryBucket = "accessoriesdecorations-images";
						else if (categoryName.includes("signage") || categoryName.includes("poster")) primaryBucket = "signage-posters-images";
						else if (categoryName.includes("cards") || categoryName.includes("sticker")) primaryBucket = "cards-stickers-images";
						else if (categoryName.includes("packaging")) primaryBucket = "packaging-images";
						else if (categoryName.includes("3d print")) primaryBucket = "3d-prints-images";
						const buckets = [
							primaryBucket,
							"apparel-images",
							"accessoriesdecorations-images",
							"signage-posters-images",
							"cards-stickers-images",
							"packaging-images",
							"3d-prints-images",
							"product-images",
							"images",
							"public",
						].filter(Boolean);
						for (const b of buckets) {
							try {
								const { data } = supabase.storage.from(b).getPublicUrl(key);
								const url = data?.publicUrl;
								if (url && !url.endsWith("/")) return url;
							} catch {}
						}
						return "/logo-icon/logo.png";
					} catch {
						return "/logo-icon/logo.png";
					}
				};

				// Fetch variants and map by order_item_id
				const orderItemIds = oi.map((r) => r.order_item_id);
				let variantsMap = {};
				if (orderItemIds.length > 0) {
					const { data: varRows } = await supabase
						.from("order_item_variants")
						.select("order_item_id, variant_group_name, variant_value_name")
						.in("order_item_id", orderItemIds);
					variantsMap = (varRows || []).reduce((acc, v) => {
						const list = acc[v.order_item_id] || (acc[v.order_item_id] = []);
						list.push({ group: v.variant_group_name, value: v.variant_value_name });
						return acc;
					}, {});
				}

				// Build items with product info, image URLs, and variants
				const its = [];
				for (const it of oi) {
					const prod = productsMap[it.product_id] || null;
					const img = prod ? await resolveImage(prod) : "/logo-icon/logo.png";
					its.push({
						order_item_id: it.order_item_id,
						product_id: it.product_id,
						quantity: it.quantity,
						unit_price: (it.total_price != null && it.quantity) ? (Number(it.total_price) / Number(it.quantity)) : (it.base_price ?? 0),
						total_price: it.total_price ?? ((it.base_price || 0) * (it.quantity || 1)),
						product: { name: prod?.name || "Product", image_url: img },
						weight: Number(prod?.weight || 0),
						variants: Array.isArray(variantsMap[it.order_item_id]) ? variantsMap[it.order_item_id] : [],
					});
				}
						// Payment method label
						if (ord?.payment_id) {
							const { data: pay } = await supabase
								.from("payment_methods")
								.select("method")
								.eq("payment_id", ord.payment_id)
								.maybeSingle();
							if (pay?.method) setPaymentLabel(String(pay.method).toLowerCase() === "cod" ? "Cash on Delivery" : pay.method);
						}
						// Address
						if (ord?.address_id) {
							const { data: addr } = await supabase
								.from("addresses")
								.select("*")
								.eq("address_id", ord.address_id)
								.maybeSingle();
							setAddress(addr || null);
						}
						// Shipping
						if (ord?.shipping_id) {
							const { data: ship } = await supabase
								.from("shipping_methods")
								.select("*")
								.eq("shipping_id", ord.shipping_id)
								.maybeSingle();
							setShipping(ship || null);
						}
						if (cancelled) return;
						setOrder(ord);
						setItems(its || []);
			} catch (e) {
				if (!cancelled) setError(e?.message || "Failed to load order");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		run();
		return () => {
			cancelled = true;
		};
	}, [orderId, session]);

// Realtime: listen for order status updates to reflect subtasks and stage immediately
React.useEffect(() => {
	if (!orderId) return;
	const channel = supabase
		.channel(`orders-updates-${orderId}`)
		.on(
			'postgres_changes',
			{ event: 'UPDATE', schema: 'public', table: 'orders', filter: `order_id=eq.${orderId}` },
			(payload) => {
				const next = payload?.new || {};
				// If shipping_id changed, we could refetch shipping, but for now update status and totals
				setOrder((prev) => ({ ...(prev || {}), ...next }));
			}
		)
		.subscribe();
	return () => {
		try { supabase.removeChannel(channel); } catch {}
	};
}, [orderId]);

	const stage = normalizeStage(order?.status);

		const delivered = stage === "delivered";
		const orderDate = order?.created_at ? formatDate(order.created_at) : "";
		const arriveOrEstimate = delivered ? `Arrived at ${formatDate(addBusinessDays(order?.created_at, 3))}` : `Estimated Delivery: ${formatDate(addBusinessDays(order?.created_at, 3))}`;
		const subtotal = items.reduce((sum, it) => {
			const line = (it.total_price != null)
				? Number(it.total_price)
				: (Number(it.unit_price || 0) * Number(it.quantity || 1));
			return sum + line;
		}, 0);
		const totalWeightGrams = items.reduce((sum, it) => sum + (Number(it.weight || 0) * Number(it.quantity || 1)), 0);
		const taxes = 0;
		// Compute shipping cost from shipping method rates when available; otherwise fall back to total - subtotal
		const shippingCost = (() => {
			const base = Number(shipping?.base_rate || 0);
			const perGram = Number(shipping?.rate_per_grams || 0);
			if (shipping && (shipping.base_rate != null || shipping.rate_per_grams != null)) {
				const cost = base + perGram * totalWeightGrams;
				return Number(isFinite(cost) ? cost.toFixed(2) : 0);
			}
			const delta = Number(order?.total_price || 0) - Number(subtotal || 0);
			return Math.max(0, Number(isFinite(delta) ? delta.toFixed(2) : 0));
		})();
		const total = Number(order?.total_price ?? (subtotal + shippingCost + taxes));

		const statusPill = () => {
			const s = normalizeStage(order?.status);
			if (s === "delivered") return <span className="ml-2 inline-flex  px-2 py-0.5 text-[16px] rounded bg-green-100 text-green-700 ">Delivered</span>;
			if (s === "cancelled") return <span className="ml-2 inline-flex  px-2 py-0.5 rounded bg-red-100 text-red-700 text-[16px]">Cancelled</span>;
			return <span className="ml-2 inline-flex  px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[16px] ">In Progress</span>;
		};

		// Subtasks done-state derived from raw status and stage
		const sRaw = String(order?.status || "").toLowerCase();
		let printingDone = false, qcDone = false, packedDone = false;
		if (["ready", "shipped", "delivered"].includes(stage)) {
			printingDone = qcDone = packedDone = true;
		} else if (stage === "in-production") {
			if (sRaw.includes("packed")) { printingDone = qcDone = packedDone = true; }
			else if (sRaw.includes("quality") || sRaw.includes("qc")) { printingDone = qcDone = true; }
			else if (sRaw.includes("printing")) { printingDone = true; }
		}

		return (
			<div className="min-h-screen w-full bg-white overflow-y-auto  font-dm-sans">
		
			

		
			<div className="min-h-screen mt-[190px]  px-[24px] md:px-[60px] lg:px-[100px] py-[30px] w-full flex flex-col items-center bg-white z-0">

               
					{/* Header line */}
                     <div className="flex flex-row gap-5">

                        <div className=" flex flex-col gap-5">
                            <div className="gap-1">
                                <div className="text-2xl font-bold text-[#171738] text-[36px] items-left  w-full">Order #{orderId || ""} {statusPill()}</div>
                                <div className="font-semibold text-sm mt-2 text-black">Order Date: {orderDate}</div>
                            </div>
                            
                            {/* Arrived/Estimate + tracker */}
                            <div className="mt-4 border border-[#939393] rounded-lg p-4 w-[805px]">
                                <div className="text-[#171738] font-medium font-dm-sans text-[24px] font-semibold mb-2">{arriveOrEstimate}</div>
                                <StageTracker  current={stage} />
                                <div className="mt-2 ml-[170px] space-y-2 font-semibold ">
                                    <Subtask label="Printing" done={printingDone} />
                                    <Subtask label="Quality Check" done={qcDone} />
                                    <Subtask label="Packed" done={packedDone} />
                                </div>
                                
                            </div>
                            {/* Order details  */}
					<div className="lg:col-span-2 border border-[#939393] rounded-lg p-4 w-[808px]">
						<div className="font-semibold text-[18px] mb-3 text-left">Order Details</div>
						{loading ? (
							<div className="text-sm text-gray-500 px-1">Loading items…</div>
						) : error ? (
							<div className="text-sm text-red-600 px-1">{error}</div>
						) : items.length === 0 ? (
							<div className="text-sm text-gray-500 px-1">No items found.</div>
						) : (
							<div className="w-full">
								{/* Header Row */}
								<div className="grid grid-cols-12 text-xs gap-x-2 text-black ">
									<div className="col-span-6 text-[16px]  "><p className="font-dm-sans text-black font-semibold">Product</p></div>
									<div className="col-span-2 text-center "><p className="font-dm-sans text-black font-semibold">Price</p></div>
									<div className="col-span-2 text-center "><p className="font-dm-sans text-black font-semibold">Quantity</p></div>
									<div className="col-span-2  text-center "><p className="font-dm-sans text-black font-semibold">Total Price</p></div>
								</div>
								<div className="border-t border-[#939393] my-2" />

								{/* Rows (scrollable list) */}
								<div className="h-[190px] overflow-y-auto pr-2">
								{items.map((it) => {
									const lineTotal = (it.total_price != null)
										? Number(it.total_price)
										: (Number(it.unit_price || 0) * Number(it.quantity || 1));
									const unitPrice = (it.quantity ? (lineTotal / Number(it.quantity)) : Number(it.unit_price || 0));
									// Build full spec lines in the exact order provided
									const buildSpecs = () => {
										const ORDER = [
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
										const rawSpecs = [];
										if (Array.isArray(it.variants)) {
											for (const v of it.variants) {
												const label = labelFor(v?.group, v?.value);
												const val = toColorNameIfHex(v?.group, v?.value);
												rawSpecs.push({ label, value: val });
											}
										}
										// Build map (last one wins if duplicated)
										const map = rawSpecs.reduce((acc, s) => { acc[s.label] = s.value; return acc; }, {});
										const lines = [];
										for (const label of ORDER) {
											if (map[label]) {
												lines.push(`${label}: ${map[label]}`);
											}
										}
										return lines;
									};

									return (
										<div key={it.order_item_id} className="grid grid-cols-12 gap-x-2 py-2">
											<div className="col-span-6 flex items-start gap-3 ">
												<img src={it.product?.image_url || '/logo-icon/logo.png'} alt={it.product?.name || 'Product'} className="w-10 h-10 rounded object-contain border bg-white" onError={(e)=>{ e.currentTarget.src = '/logo-icon/logo.png'; }} />
												<div className="flex-1">
													<div className="text-[16px] font-semibold text-[#171738]">{it.product?.name || 'Product'}</div>
													<div className="text-xs text-black leading-5 ">
														{buildSpecs().map((line, i) => (<div key={i}>{line}</div>))} 
													</div>
												</div>
											</div>
											<div className="col-span-2 text-center text-[16px] ml-[20px] text-[#171738] font-semibold ">₱{unitPrice.toFixed(2)}</div>
											<div className="col-span-2 text-center text-[16px] ml-[30px] text-[#171738] font-semibold ">{it.quantity}</div>
											<div className="col-span-2 text-center text-[16px] ml-[40px]  font-semibold text-[#171738] font-semibold">₱{lineTotal.toFixed(2)}</div>
										</div>
									);
								})}
								</div>
							</div>
						)}
						{/* Totals */}
						<div className="border-t border-[#939393] mt-2 pt-3">
							<div className="ml-auto  w-full max-w-xs">
								<div className="flex justify-between text-[#939393] text-[16px] font-semibold"><span>Subtotal</span><span className="text-black ">₱{subtotal.toFixed(2)}</span></div>
								<div className="flex justify-between text-[#939393] text-[16px] font-semibold"><span>Shipping</span><span className="text-black">₱{shippingCost.toFixed(2)}</span></div>
								<div className="flex justify-between text-[#939393] text-[16px] font-semibold"><span>Taxes</span><span className="text-black">₱{Number(0).toFixed(2)}</span></div>
								<div className="flex justify-between font-semibold text-[16px] text-[#171738] border-t border-[#939393] mt-2 pt-2"><span>Total</span><span>₱{Number(total || 0).toFixed(2)}</span></div>
							</div>
						</div>
					</div>
                        </div>











                        <div>
                            {/* Main content: left order details table, right customer details */}
					<div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">

						{/* Right: Customer details */}
						<div className="lg:col-span-1 border border-[#939393] w-[363px] rounded-lg p-4">
							<div className="text-[20px] font-semibold font-medium text-black mb-2">Customer Details</div>
							<div className="text-sm text-[#171738]">

                                <div className="text-black text-[16px] mb-2 font-dm-sans font-semibold">Contact</div>
								<div className="py-2 border-t mb-2 border-[#939393] text-black font-medium">
									
									{/*<div className="mt-1">{session?.user?.email || ""}</div>*/}
									{address?.phone_number ? (<div className="mt-0.5">{formatDisplayPHMobile(address.phone_number)}</div>) : null}
								</div>

                                <div className="text-black text-[16px] mb-2 font-dm-sans font-semibold">Shipping Address</div>
								<div className="py-2 border-t mb-2 border-[#939393]">
									
									<div className="mt-1 text-black font-medium">
										<div>{[address?.first_name, address?.last_name].filter(Boolean).join(" ")}</div>
										<div>{address?.street_address}</div>
										<div>{[address?.barangay, address?.city].filter(Boolean).join(", ")}</div>
										<div>{[address?.province, address?.postal_code].filter(Boolean).join(" ")}</div>
									</div>
								</div>
								
                                <div className="text-black text-[16px] mb-2 font-dm-sans font-semibold">Delivery</div>
								<div className="py-2 border-t mb-2 border-[#939393]">
									
									<div className="mt-1 text-black font-medium">{shipping?.name || "Standard Delivery"}{shipping?.description ? ` (${shipping.description})` : ""}</div>
								</div>
                                <div className="text-black text-[16px] mb-2 font-dm-sans font-semibold">Payment</div>
								<div className="py-2 border-t border-[#939393]">
									
									<div className="mt-1 text-black font-medium">{paymentLabel || "Paid"}</div>
								</div>
							</div>
						</div>
					</div>

                        </div>



                    </div>

					

					

				</div>
			</div>
		);
}

