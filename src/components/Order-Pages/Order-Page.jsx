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
	} catch {
		return "";
	}
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
	} catch {
		return startISO;
	}
};

// Color helpers
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

// Resolve public URLs for uploaded files
const resolveProductFilePublicUrl = (input) => {
	try {
		if (!input || typeof input !== 'string') return null;
		if (/^https?:\/\//i.test(input)) return input;
		try {
			const u = new URL(input);
			if (u.protocol && /^https?:$/i.test(u.protocol)) return input;
		} catch {}
		const marker = '/product-files/';
		let path = input;
		const idx = input.indexOf(marker);
		if (idx !== -1) path = input.slice(idx + marker.length);
		path = String(path || '').replace(/^\/+/, '');
		const { data } = supabase.storage.from('product-files').getPublicUrl(path);
		return data?.publicUrl || input;
	} catch {
		return input;
	}
};

// Normalize status to stage
const normalizeStage = (status) => {
	const s = String(status || "").toLowerCase();
	if (s.includes("cancel")) return "cancelled";
	if (s.includes("deliver")) return "delivered";
	if (s.includes("shipped")) return "shipped";
	if (s.includes("ready")) return "ready";
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

const Subtask = ({ label, done }) => (
	<div className="flex items-center gap-2 font-dm-sans">
		<span
			className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-semibold font-dm-sans ${done ? "bg-[#E6764F] text-white" : "bg-gray-200 text-gray-600"}`}
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
	const [taxTotal, setTaxTotal] = React.useState(0);
	const [isGeneratingInvoice, setIsGeneratingInvoice] = React.useState(false);
	const [isCancelling, setIsCancelling] = React.useState(false);
	const [showCancelModal, setShowCancelModal] = React.useState(false);

	React.useEffect(() => {
		let cancelled = false;
		const run = async () => {
			try {
				setLoading(true);
				setError("");
				if (!session) {
					setTaxTotal(0);
					return;
				}
				if (!orderId) {
					setError("Missing order_id");
					setTaxTotal(0);
					return;
				}

				// Fetch order
				const { data: ord, error: ordErr } = await supabase
					.from("orders")
					.select("order_id, user_id, status, total_price, created_at, address_id, shipping_id, payment_id")
					.eq("order_id", orderId)
					.single();
				if (ordErr) throw ordErr;
				if (!ord || ord.user_id !== session.user.id) {
					setError("Order not found");
					setTaxTotal(0);
					return;
				}

				// Fetch items
				const { data: rawItems, error: itErr } = await supabase
					.from("order_items")
					.select("order_item_id, order_id, product_id, quantity, base_price, total_price")
					.eq("order_id", orderId)
					.order("order_item_id", { ascending: true });
				if (itErr) throw itErr;

				const oi = Array.isArray(rawItems) ? rawItems : [];
				const productIds = [...new Set(oi.map((r) => r.product_id).filter(Boolean))];
				let productsMap = {};
				if (productIds.length > 0) {
					const { data: prodRows } = await supabase
						.from("products")
						.select("id, name, image_url, weight, tax, product_types ( name, product_categories ( name ) )")
						.in("id", productIds);
					productsMap = (prodRows || []).reduce((acc, p) => {
						acc[p.id] = p;
						return acc;
					}, {});
				}

				const normalizeFiles = (arr) => (arr || []).map((f) => ({
					...f,
					id: f.id ?? f.file_id,
					file_id: f.file_id ?? f.id,
					image_url: resolveProductFilePublicUrl(f.image_url || '')
				}));

				const uploadedFilesByProduct = {};
				try {
					if (ord?.order_id) {
						const { data: filesByOrder } = await supabase
							.from('uploaded_files')
							.select('*')
							.eq('order_id', ord.order_id)
							.order('uploaded_at', { ascending: false });
						(filesByOrder || []).forEach((f) => {
							if (!f.product_id) return;
							const list = uploadedFilesByProduct[f.product_id] || (uploadedFilesByProduct[f.product_id] = []);
							list.push(f);
						});
					}
				} catch {}

				if (session?.user?.id) {
					try {
						const missingProductIds = productIds.filter((pid) => !uploadedFilesByProduct[pid]);
						if (missingProductIds.length > 0) {
							const { data: fallbackFiles } = await supabase
								.from('uploaded_files')
								.select('*')
								.eq('user_id', session.user.id)
								.in('product_id', missingProductIds)
								.order('uploaded_at', { ascending: false })
								.limit(50);
							(fallbackFiles || []).forEach((f) => {
								if (!f.product_id) return;
								const list = uploadedFilesByProduct[f.product_id] || (uploadedFilesByProduct[f.product_id] = []);
								list.push(f);
							});
						}
					} catch {}
				}

				Object.keys(uploadedFilesByProduct).forEach((pid) => {
					uploadedFilesByProduct[pid] = normalizeFiles(uploadedFilesByProduct[pid]);
				});

				// Resolve product image
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

				// Fetch variants
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

				// Build items
				const its = [];
				let taxSumAcc = 0;
				for (const it of oi) {
					const prod = productsMap[it.product_id] || null;
					const img = prod ? await resolveImage(prod) : "/logo-icon/logo.png";
					const qty = Number(it.quantity || 1);
					const taxPerUnit = Number(prod?.tax || 0);
					const taxAmount = Number((taxPerUnit * qty).toFixed(2));
					taxSumAcc += taxAmount;
					const uploadedFiles = Array.isArray(uploadedFilesByProduct[it.product_id]) ? uploadedFilesByProduct[it.product_id] : [];
					its.push({
						order_item_id: it.order_item_id,
						product_id: it.product_id,
						quantity: it.quantity,
						unit_price: (it.total_price != null && it.quantity) ? (Number(it.total_price) / Number(it.quantity)) : (it.base_price ?? 0),
						total_price: it.total_price ?? ((it.base_price || 0) * (it.quantity || 1)),
						product: { name: prod?.name || "Product", image_url: img },
						weight: Number(prod?.weight || 0),
						variants: Array.isArray(variantsMap[it.order_item_id]) ? variantsMap[it.order_item_id] : [],
						tax_per_unit: taxPerUnit,
						tax_amount: taxAmount,
						uploaded_files: uploadedFiles,
					});
				}

				// Payment, Address, Shipping
				if (ord?.payment_id) {
					const { data: pay } = await supabase
						.from("payment_methods")
						.select("method")
						.eq("payment_id", ord.payment_id)
						.maybeSingle();
					if (pay?.method) setPaymentLabel(String(pay.method).toLowerCase() === "cod" ? "Cash on Delivery" : pay.method);
				}

				if (ord?.address_id) {
					const { data: addr } = await supabase
						.from("addresses")
						.select("*")
						.eq("address_id", ord.address_id)
						.maybeSingle();
					setAddress(addr || null);
				}

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
				setTaxTotal(Number(taxSumAcc.toFixed(2)));
			} catch (e) {
				if (!cancelled) {
					setError(e?.message || "Failed to load order");
					setTaxTotal(0);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		run();
		return () => {
			cancelled = true;
		};
	}, [orderId, session]);

	// Realtime updates
	React.useEffect(() => {
		if (!orderId) return;
		const channel = supabase
			.channel(`orders-updates-${orderId}`)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'orders', filter: `order_id=eq.${orderId}` },
				(payload) => {
					const next = payload?.new || {};
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
		const line = (it.total_price != null) ? Number(it.total_price) : (Number(it.unit_price || 0) * Number(it.quantity || 1));
		return sum + line;
	}, 0);
	const totalWeightGrams = items.reduce((sum, it) => sum + (Number(it.weight || 0) * Number(it.quantity || 1)), 0);
	const taxes = Number(taxTotal || 0);
	const shippingCost = (() => {
		const base = Number(shipping?.base_rate || 0);
		const perGram = Number(shipping?.rate_per_grams || 0);
		if (shipping && (shipping.base_rate != null || shipping.rate_per_grams != null)) {
			const cost = base + perGram * totalWeightGrams;
			return Number(isFinite(cost) ? cost.toFixed(2) : 0);
		}
		const delta = Number(order?.total_price || 0) - Number(subtotal || 0) - taxes;
		return Math.max(0, Number(isFinite(delta) ? delta.toFixed(2) : 0));
	})();
	const total = Number(order?.total_price ?? (subtotal + shippingCost + taxes));

	const customerEmail = session?.user?.email || '';
	const orderIdValue = order?.order_id;
	const orderDateLabel = orderDate;
	const estimatedDateLabel = formatDate(addBusinessDays(order?.created_at, 3));
	const shippingDisplay = shipping?.name ? `${shipping.name}${shipping.description ? ` — ${shipping.description}` : ''}` : 'Standard Delivery';

	const handleGenerateInvoice = React.useCallback(async () => {
		if (!orderIdValue) return;
		try {
			setIsGeneratingInvoice(true);
			const { jsPDF } = await import('jspdf');
			const doc = new jsPDF({ unit: 'pt', format: 'a4' });
			const marginX = 48;
			const topY = 60;
			const bottomMargin = 60;
			let cursorY = topY;
			const pageHeight = doc.internal.pageSize.getHeight();

			const ensureSpace = (amount = 16) => {
				if (cursorY + amount > pageHeight - bottomMargin) {
					doc.addPage();
					cursorY = topY;
				}
			};
			const advance = (amount = 16) => {
				ensureSpace(amount);
				cursorY += amount;
			};
			const write = (text, x = marginX) => {
				doc.text(String(text ?? ''), x, cursorY);
			};
			const wrap = (value, width = 340) => doc.splitTextToSize(String(value ?? ''), width);
			const formatCurrency = (value) => `PHP ${Number(value || 0).toFixed(2)}`;

			doc.setFont('helvetica', 'bold');
			doc.setFontSize(18);
			write('E-Invoice');
			doc.setFontSize(12);
			doc.setFont('helvetica', 'normal');

			advance(24);
			write(`Order #: ${orderIdValue}`);
			advance(16);
			write(`Order Date: ${orderDateLabel || '—'}`);
			advance(16);
			write(`Estimated Delivery: ${estimatedDateLabel || '—'}`);

			advance(32);
			doc.setFont('helvetica', 'bold');
			write('Customer Details');
			doc.setFont('helvetica', 'normal');

			advance(16);
			const customerName = [address?.first_name, address?.last_name].filter(Boolean).join(' ') || '—';
			write(`Name: ${customerName}`);
			advance(16);
			write(`Email: ${customerEmail || '—'}`);
			advance(16);
			const phoneDisplay = address?.phone_number ? formatDisplayPHMobile(address.phone_number) : '—';
			write(`Phone: ${phoneDisplay}`);

			advance(32);
			doc.setFont('helvetica', 'bold');
			write('Shipping Address');
			doc.setFont('helvetica', 'normal');
			const addressLines = [
				address?.street_address,
				[address?.barangay, address?.city].filter(Boolean).join(', '),
				[address?.province, address?.postal_code].filter(Boolean).join(' '),
			].filter((line) => line && line.trim());
			if (addressLines.length === 0) {
				advance(14);
				write('—');
			} else {
				addressLines.flatMap((line) => wrap(line, 360)).forEach((line, idx) => {
					advance(idx === 0 ? 14 : 12);
					write(line);
				});
			}

			advance(24);
			doc.setFont('helvetica', 'bold');
			write('Delivery');
			doc.setFont('helvetica', 'normal');
			advance(14);
			write(shippingDisplay || 'Standard Delivery');

			advance(18);
			doc.setFont('helvetica', 'bold');
			write('Payment');
			doc.setFont('helvetica', 'normal');
			advance(14);
			write(paymentLabel || 'Paid');

			advance(24);
			doc.setFont('helvetica', 'bold');
			write('Items');
			doc.setFont('helvetica', 'normal');

			advance(18);
			doc.setFont('helvetica', 'bold');
			write('Product');
			doc.text('Qty', marginX + 360, cursorY);
			doc.setFont('helvetica', 'normal');

			items.forEach((item) => {
				const qty = Number(item.quantity || 1);
				const specificationLines = (() => {
					if (!Array.isArray(item.variants) || item.variants.length === 0) return [];
					const ORDER = [
						'Design','Technique','Printing','Color','Size','Material','Strap','Type','Accessories (Hook Clasp)','Accessories Color','Trim Color','Base','Hole','Pieces','Cut Style','Size (Customize)','Acrylic Pieces Quantity'
					];
					const norm = (s) => String(s || '').trim();
					const labelFor = (group, value) => {
						const g = norm(group).toLowerCase();
						const v = norm(value);
						if (/accessor/i.test(g) && /(hook|clasp)/i.test(v)) return 'Accessories (Hook Clasp)';
						return group || '—';
					};
					const indexFor = (label) => {
						const i = ORDER.findIndex((x) => x.toLowerCase() === String(label || '').toLowerCase());
						return i === -1 ? 999 : i;
					};
					const specs = item.variants.map((variant) => {
						const label = labelFor(variant?.group, variant?.value);
						const value = toColorNameIfHex(variant?.group, variant?.value) || variant?.value || '';
						return { label, value, order: indexFor(label) };
					}).sort((a,b) => (a.order - b.order) || a.label.localeCompare(b.label));
					return specs.flatMap(s => wrap(`${s.label}: ${s.value}`, 260));
				})();
				const designLines = (() => {
					const files = Array.isArray(item.uploaded_files) ? item.uploaded_files : [];
					if (files.length === 0) return [];
					const first = files[0];
					const label = first?.file_name ? `Design: ${first.file_name}` : 'Design: Uploaded file';
					const extra = files.length > 1 ? `(and ${files.length - 1} more)` : null;
					const base = wrap(label, 260);
					return extra ? [...base, ...wrap(extra, 260)] : base;
				})();
				const nameLines = wrap(item.product?.name || item.name || 'Product', 260);
				const allLines = [...nameLines, ...specificationLines, ...designLines];
				if (allLines.length === 0) allLines.push('—');
				allLines.forEach((line, index) => {
					advance(index === 0 ? 18 : 12);
					write(line);
					if (index === 0) {
						doc.text(String(qty), marginX + 360, cursorY);
					}
				});
			});

			advance(24);
			doc.setFont('helvetica', 'bold');
			write('Summary');
			doc.setFont('helvetica', 'normal');

			const summaryRows = [
				['Subtotal', formatCurrency(subtotal)],
				['Shipping', formatCurrency(shippingCost)],
				['Taxes', formatCurrency(taxes)],
				['Total', formatCurrency(total)],
			];

			summaryRows.forEach(([label, amount], idx) => {
				advance(idx === 0 ? 18 : 12);
				if (idx === summaryRows.length - 1) doc.setFont('helvetica', 'bold');
				write(label);
				doc.text(amount, marginX + 260, cursorY);
				if (idx === summaryRows.length - 1) doc.setFont('helvetica', 'normal');
			});

			doc.save(`invoice-${orderIdValue}.pdf`);
		} catch (e) {
			console.error('Failed to generate invoice PDF', e);
		} finally {
			setIsGeneratingInvoice(false);
		}
	}, [address, items, order?.created_at, orderDate, order, paymentLabel, shipping, shippingCost, subtotal, taxes, total, customerEmail, estimatedDateLabel, orderDateLabel, orderIdValue, shippingDisplay]);

	const statusPill = () => {
		const s = normalizeStage(order?.status);
		if (s === "delivered") return <span className="ml-2 inline-flex px-2 py-0.5 text-[16px] rounded bg-green-100 text-green-700">Delivered</span>;
		if (s === "cancelled") return <span className="ml-2 inline-flex px-2 py-0.5 rounded bg-red-100 text-red-700 text-[16px]">Cancelled</span>;
		return <span className="ml-2 inline-flex px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[16px]">In Progress</span>;
	};

	// Subtasks
	const sRaw = String(order?.status || "").toLowerCase();
	let printingDone = false, qcDone = false, packedDone = false;
	if (["ready", "shipped", "delivered"].includes(stage)) {
		printingDone = qcDone = packedDone = true;
	} else if (stage === "in-production") {
		if (sRaw.includes("packed")) { printingDone = qcDone = packedDone = true; }
		else if (sRaw.includes("quality") || sRaw.includes("qc")) { printingDone = qcDone = true; }
		else if (sRaw.includes("printing")) { printingDone = true; }
	}

	const confirmCancelOrder = async () => {
		try {
			if (!order?.order_id) return;
			const s = (order?.status || '').toLowerCase();
			if (s.includes('cancelled') || s.includes('in production') || s.includes('printing')) {
				alert('This order cannot be cancelled at its current stage.');
				setShowCancelModal(false);
				return;
			}
			if (s.includes('shipped') || s.includes('deliver') || s.includes('delivered')) {
				alert('This order cannot be cancelled because it has already been shipped or delivered.');
				setShowCancelModal(false);
				return;
			}
			setShowCancelModal(false);
			setIsCancelling(true);

			const { error: cancelErr } = await supabase
				.from('orders')
				.update({ status: 'cancelled' })
				.eq('order_id', order.order_id);
			if (cancelErr) throw cancelErr;

			try {
				const { data: orderItems } = await supabase
					.from('order_items')
					.select('product_id, quantity')
					.eq('order_id', order.order_id);
				if (Array.isArray(orderItems)) {
					const qtyByProduct = orderItems.reduce((acc, it) => {
						const pid = it.product_id;
						if (pid) acc[pid] = (acc[pid] || 0) + Number(it.quantity || 0);
						return acc;
					}, {});
					for (const [pid, qty] of Object.entries(qtyByProduct)) {
						try {
							const { data: invRow } = await supabase
								.from('inventory')
								.select('inventory_id, quantity')
								.eq('product_id', pid)
								.limit(1)
								.maybeSingle();
							if (invRow?.inventory_id != null) {
								const newQty = Number(invRow.quantity || 0) + Number(qty);
								await supabase
									.from('inventory')
									.update({ quantity: newQty })
									.eq('inventory_id', invRow.inventory_id);
							}
						} catch (e2) {
							console.warn('Failed restoring inventory for product', pid, e2);
						}
					}
				}
			} catch (restErr) {
				console.warn('Inventory restore failed', restErr);
			}

			setOrder((prev) => ({ ...(prev || {}), status: 'cancelled' }));
		} catch (e) {
			console.error('Failed to cancel order', e);
			setError(e?.message || 'Failed to cancel order');
		} finally {
			setIsCancelling(false);
		}
	};

	return (
		<div className="min-h-screen w-full bg-white overflow-y-auto font-dm-sans">
			<div className="min-h-screen mt-[190px] px-[24px] md:px-[60px] lg:px-[100px] py-[30px] w-full flex flex-col items-center bg-white z-0">
				
				
				<div className="flex items-start  w-[1190px] ml-10 justify-between">
									<div>
										<div className="text-2xl font-bold text-[#171738] text-[36px]">Order #{orderId || ""} {statusPill()}</div>
										<div className="font-semibold text-sm mt-2 text-black">Order Date: {orderDate}</div>
									</div>
									<div className=" mt-4">
										<button
											type="button"
											onClick={() => setShowCancelModal(true)}
											disabled={
												!order ||
												isCancelling ||
												((order?.status || '') && ['cancelled', 'in production', 'printing', 'shipped', 'delivered', 'deliver'].some(kw => (order.status || '').toLowerCase().includes(kw)))
											}
											className={
												(!order || isCancelling || ((order?.status || '') && ['cancelled', 'in production', 'printing', 'shipped', 'delivered', 'deliver'].some(kw => (order.status || '').toLowerCase().includes(kw))))
													? 'rounded-md border border-red-400 bg-white px-3 py-1 text-sm font-semibold text-red-600 transition disabled:cursor-not-allowed disabled:opacity-60 pointer-events-none'
													: 'rounded-md border border-red-400 bg-white px-3 py-1 text-sm bg-[#964545] font-semibold text-white transition h hover:text-white'
											} 
										>
											{isCancelling ? 'Cancelling…' : 'Cancel Order'}
										</button>
									</div>
								</div>
				{/* Header */}
				<div className="flex flex-row gap-5 w-full max-w-6xl">
					
					{/* Main column */}
					<div className="flex flex-col gap-5">
						

						{/* Cancel Modal */}
						{showCancelModal && (
							<div className="fixed inset-0 z-50 flex items-center justify-center">
								<div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowCancelModal(false)} />
								<div className="bg-white rounded-lg shadow-lg  w-[519px] p-6 z-10">
									<h2 className="text-2xl font-bold text-[#12263F] mb-3">Cancel Order #{orderId || ''}?</h2>
									<p className="text-sm text-gray-700 mb-6">
										The status of your order is: <strong>Order Placed</strong>. 
										If you proceed with cancellation, this action cannot be undone.
									</p>
									<div className="flex items-center justify-between gap-4">
										<button onClick={confirmCancelOrder} disabled={isCancelling} className="bg-[#9E3E3E] hover:bg-[#873434] text-white px-4 py-2 rounded-md font-semibold">
											{isCancelling ? 'Cancelling…' : 'Confirm Cancellation'}
										</button>
										<button onClick={() => setShowCancelModal(false)} className="px-4 py-2 border rounded-md text-sm">Go Back</button>
									</div>
								</div>
							</div>
						)}

						{/* Tracker */}
						<div className="mt-4 border border-[#939393] rounded-lg p-4 w-[807px]">
							<div className="text-[#171738] font-medium font-dm-sans text-[24px] font-semibold mb-2">{arriveOrEstimate}</div>
							<StageTracker current={stage} />
							<div className="mt-2 ml-[170px] space-y-2 font-semibold">
								<Subtask label="Printing" done={printingDone} />
								<Subtask label="Quality Check" done={qcDone} />
								<Subtask label="Packed" done={packedDone} />
							</div>
						</div>

						{/* Order Details */}
						<div className="lg:col-span-2 border border-[#939393] rounded-lg p-4 w-[807px]">
							<div className="font-semibold text-[18px] mb-3 text-left">Order Details</div>
							{loading ? (
								<div className="text-sm text-gray-500 px-1">Loading items…</div>
							) : error ? (
								<div className="text-sm text-red-600 px-1">{error}</div>
							) : items.length === 0 ? (
								<div className="text-sm text-gray-500 px-1">No items found.</div>
							) : (
								<div className="w-full">
									<div className="grid grid-cols-12 text-xs gap-x-2 text-black">
										<div className="col-span-6 text-[16px]"><p className="font-dm-sans text-black font-semibold">Product</p></div>
										<div className="col-span-2 text-center"><p className="font-dm-sans text-black font-semibold">Price</p></div>
										<div className="col-span-2 text-center"><p className="font-dm-sans text-black font-semibold">Quantity</p></div>
										<div className="col-span-2 text-center"><p className="font-dm-sans text-black font-semibold">Total Price</p></div>
									</div>
									<div className="border-t border-[#939393] my-2" />

									<div className="h-[190px] overflow-y-auto pr-2">
										{items.map((it) => {
											const lineTotal = (it.total_price != null) ? Number(it.total_price) : (Number(it.unit_price || 0) * Number(it.quantity || 1));
											const unitPrice = (it.quantity ? (lineTotal / Number(it.quantity)) : Number(it.unit_price || 0));
											const buildSpecs = () => {
												const ORDER = ['Technique','Printing','Color','Size','Material','Strap','Type','Accessories (Hook Clasp)','Accessories Color','Trim Color','Base','Hole','Pieces','Cut Style','Size (Customize)','Acrylic Pieces Quantity'];
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
												const map = rawSpecs.reduce((acc, s) => { acc[s.label] = s.value; return acc; }, {});
												const lines = [];
												for (const label of ORDER) {
													if (map[label]) lines.push(`${label}: ${map[label]}`);
												}
												return lines;
											};
											const designFiles = Array.isArray(it.uploaded_files) ? it.uploaded_files : [];
											const designBlock = designFiles.length > 0 && (
												<div className="mt-2 flex items-center gap-2">
													<div className="flex items-center gap-2 border rounded px-2 py-1 bg-white">
														<div className="w-10 h-10 overflow-hidden rounded bg-gray-100 flex items-center justify-center">
															{designFiles[0]?.image_url ? (
																<img src={designFiles[0].image_url} alt={designFiles[0].file_name || 'design'} className="w-full h-full object-cover" />
															) : (
																<img src="/logo-icon/image.svg" alt="file" className="w-4 h-4" />
															)}
														</div>
														<div className="text-xs text-gray-600 truncate max-w-[140px]">{designFiles[0]?.file_name || 'uploaded design'}</div>
													</div>
													{designFiles.length > 1 && (
														<div className="inline-flex items-center justify-center bg-transparent text-black text-[15px] font-semibold rounded-full w-6 h-6">+{designFiles.length - 1}</div>
													)}
												</div>
											);

											return (
												<div key={it.order_item_id} className="grid grid-cols-12 gap-x-2 py-2">
													<div className="col-span-6 flex items-start gap-3">
														<img src={it.product?.image_url || '/logo-icon/logo.png'} alt={it.product?.name || 'Product'} className="w-10 h-10 rounded object-contain border bg-white" onError={(e) => { e.currentTarget.src = '/logo-icon/logo.png'; }} />
														<div className="flex-1">
															<div className="text-[16px] font-semibold text-[#171738]">{it.product?.name || 'Product'}</div>
															<div className="text-xs text-black leading-5">
																{designBlock}
																{buildSpecs().map((line, i) => <div key={i}>{line}</div>)}
															</div>
														</div>
													</div>
													<div className="col-span-2 text-center text-[16px] ml-[20px] text-[#171738] font-semibold">₱{unitPrice.toFixed(2)}</div>
													<div className="col-span-2 text-center text-[16px] ml-[30px] text-[#171738] font-semibold">{it.quantity}</div>
													<div className="col-span-2 text-center text-[16px] ml-[40px] font-semibold text-[#171738]">₱{lineTotal.toFixed(2)}</div>
												</div>
											);
										})}
									</div>
								</div>
							)}

							{/* Totals */}
							<div className="border-t border-[#939393] mt-2 pt-3">
								<div className="flex items-start justify-between w-full">
									<div className="flex-shrink-0">
										<button
											type="button"
											onClick={handleGenerateInvoice}
											disabled={!orderId || isGeneratingInvoice}
											className="rounded-md border border-[#171738] bg-white px-3 py-1 text-sm font-semibold text-[#171738] transition hover:bg-[#171738] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isGeneratingInvoice ? 'Generating…' : 'View e-Invoice'}
										</button>
									</div>
									<div className="ml-auto w-full max-w-xs">
										<div className="flex justify-between text-[#939393] text-[16px] font-semibold"><span>Subtotal</span><span className="text-black">₱{subtotal.toFixed(2)}</span></div>
										<div className="flex justify-between text-[#939393] text-[16px] font-semibold"><span>Shipping</span><span className="text-black">₱{shippingCost.toFixed(2)}</span></div>
										<div className="flex justify-between text-[#939393] text-[16px] font-semibold"><span>Taxes</span><span className="text-black">₱{taxes.toFixed(2)}</span></div>
										<div className="flex justify-between font-semibold text-[16px] text-[#171738] border-t border-[#939393] mt-2 pt-2"><span>Total</span><span>₱{Number(total || 0).toFixed(2)}</span></div>
									</div>
								</div>
							</div>
						</div>

						
					</div>
					<div>
                            {/* Main content: left order details table, right customer details */}
					<div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">

						{/* Right: Customer details */}
						<div className="lg:col-span-1 border border-[#939393] w-[363px] rounded-lg p-4 ">
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