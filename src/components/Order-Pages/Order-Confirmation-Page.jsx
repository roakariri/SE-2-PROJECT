import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { UserAuth } from "../../context/AuthContext";

const formatDate = (iso) => {
	try {
		const d = iso ? new Date(iso) : new Date();
		return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
	} catch { return String(iso || ''); }
};

// Display-only: format PH mobile to "+63 9XXXXXXXXX" dropping any leading 0 or 63
const formatDisplayPHMobile = (value) => {
	try {
		const digits = String(value || "").replace(/\D/g, "");
		if (!digits) return "";
		// Normalize to local 10 starting with 9 when possible
		let local10 = digits;
		if (local10.startsWith("63")) local10 = local10.slice(2);
		if (local10.startsWith("0")) local10 = local10.slice(1);
		// Ensure we only show last 10 digits and it starts with 9
		if (local10.length > 10) local10 = local10.slice(-10);
		if (local10 && !local10.startsWith("9") && local10.length === 10) {
			// If it doesn't start with 9, just return raw best-effort under +63
			return `+63 ${local10}`;
		}
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
	} catch { return startISO; }
};

const resolveImage = async (product) => {
	try {
		const image_key = product?.image_url;
		if (!image_key) return "/logo-icon/logo.png";
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
		return "/logo-icon/logo.png";
	} catch { return "/logo-icon/logo.png"; }
};

// Ensure uploaded design image URLs are public and resolvable from the 'product-files' bucket
const resolveProductFilePublicUrl = (input) => {
	try {
		if (!input || typeof input !== 'string') return null;
		// Already a public URL
		if (/^https?:\/\//i.test(input)) return input;
		// If it's an absolute URL but not http(s), ignore transformation
		try {
			const u = new URL(input);
			if (u.protocol && /^https?:$/i.test(u.protocol)) return input;
		} catch {}
		// Try to extract the storage path after /product-files/
		let path = null;
		const marker = '/product-files/';
		const idx = input.indexOf(marker);
		if (idx !== -1) {
			path = input.slice(idx + marker.length);
		} else {
			// assume it's already a storage path like "userId/filename"
			path = input.replace(/^\/+/, '');
		}
		const { data } = supabase.storage.from('product-files').getPublicUrl(path);
		return (data && data.publicUrl) ? data.publicUrl : input;
	} catch {
		return input;
	}
};

// Color helpers copied from Checkout to translate hex/rgb to human names
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
	if (s < 0.1) {
		if (l < 0.08) return 'black';
		if (l < 0.2) return 'very dark gray';
		if (l < 0.35) return 'dark gray';
		if (l < 0.65) return 'gray';
		if (l < 0.85) return 'light gray';
		return 'white';
	}
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

const OrderConfirmationPage = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { session } = UserAuth();
	const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
	const orderIdParam = params.get('order_id');

	const [loading, setLoading] = useState(true);
	const [order, setOrder] = useState(null);
	const [address, setAddress] = useState(null);
	const [shipping, setShipping] = useState(null);
	const [items, setItems] = useState([]);
	const [subtotal, setSubtotal] = useState(0);
	const [paymentLabel, setPaymentLabel] = useState('');
	const [paymentId, setPaymentId] = useState(null);

	useEffect(() => {
		// Try to load last payment method stored by Checkout
		try {
			const pm = sessionStorage.getItem('lastPaymentMethod');
			if (pm) setPaymentLabel(pm);
		} catch {}
	}, []);

	// Removed one-time view redirect to allow revisiting Order Confirmation

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			try {
				// Read any selected cart ids saved by Checkout for stronger linkage to uploaded files
				let selectedCartIds = [];
				try {
					const rawIds = localStorage.getItem('cartSelectedIds');
					if (rawIds) {
						const parsed = JSON.parse(rawIds);
						if (Array.isArray(parsed)) selectedCartIds = parsed;
					}
				} catch {}
				let ord;
				if (orderIdParam) {
					const { data } = await supabase
						.from('orders')
						.select('order_id, user_id, total_price, shipping_id, address_id, payment_id, created_at')
						.eq('order_id', orderIdParam)
						.maybeSingle();
					ord = data;
				} else if (session?.user?.id) {
					const { data } = await supabase
						.from('orders')
						.select('order_id, user_id, total_price, shipping_id, address_id, payment_id, created_at')
						.eq('user_id', session.user.id)
						.order('created_at', { ascending: false })
						.limit(1)
						.maybeSingle();
					ord = data;
				}
				if (!ord) {
					if (!cancelled) setOrder(null);
					return;
				}
				if (!cancelled) {
					setOrder(ord);
					setPaymentId(ord?.payment_id || null);
				}

				// Removed one-time view localStorage flag/redirect to allow revisits

				// Payment label via payment_id if available
				if (ord?.payment_id) {
					const { data: pay } = await supabase
						.from('payment_methods')
						.select('method')
						.eq('payment_id', ord.payment_id)
						.maybeSingle();
					if (!cancelled && pay?.method) setPaymentLabel(String(pay.method).toLowerCase() === 'cod' ? 'Cash on Delivery' : 'PayPal');
				}

				// Address
				if (ord.address_id) {
					const { data: addr } = await supabase
						.from('addresses')
						.select('*')
						.eq('address_id', ord.address_id)
						.maybeSingle();
					if (!cancelled) setAddress(addr);
				}
				// Shipping
				if (ord.shipping_id) {
					const { data: ship } = await supabase
						.from('shipping_methods')
						.select('*')
						.eq('shipping_id', ord.shipping_id)
						.maybeSingle();
					if (!cancelled) setShipping(ship);
				}
				// Items (use batched fetches to avoid fragile nested joins)
				const { data: orderItems, error: itemsErr } = await supabase
					.from('order_items')
					.select('order_item_id, order_id, product_id, quantity, base_price, total_price')
					.eq('order_id', ord.order_id)
					.order('order_item_id', { ascending: true });
				if (itemsErr) {
					console.warn('Failed to fetch order items', itemsErr);
				}
				const oi = Array.isArray(orderItems) ? orderItems : [];
				const productIds = [...new Set(oi.map(r => r.product_id).filter(Boolean))];
				let productsMap = {};
				if (productIds.length > 0) {
					const { data: prodRows, error: prodErr } = await supabase
						.from('products')
						.select('id, name, image_url, weight, product_types ( name, product_categories ( name ) )')
						.in('id', productIds);
					if (prodErr) {
						console.warn('Failed to fetch products for order items', prodErr);
					}
					(productsMap = (prodRows || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {}));
				}
				// Fetch variants separately
				const orderItemIds = oi.map(r => r.order_item_id);
				let variantsMap = {};
				if (orderItemIds.length > 0) {
					const { data: varRows, error: varErr } = await supabase
						.from('order_item_variants')
						.select('order_item_id, variant_group_name, variant_value_name')
						.in('order_item_id', orderItemIds);
					if (varErr) {
						console.warn('Failed to fetch item variants', varErr);
					}
					variantsMap = (varRows || []).reduce((acc, v) => {
						const list = acc[v.order_item_id] || (acc[v.order_item_id] = []);
						list.push({ variant_group_name: v.variant_group_name, variant_value_name: v.variant_value_name });
						return acc;
					}, {});
				}

				const built = [];
				let sub = 0;
				for (const it of oi) {
					const prod = productsMap[it.product_id] || null;
					const img = prod ? await resolveImage(prod) : '/logo-icon/logo.png';
					sub += Number(it.total_price || 0);
					// Try to fetch uploaded design files for this item using cart_id linkage when available,
					// then fallback to product_id+user_id, then user-only.
					let uploadedFilesForItem = [];
					try {
						const userId = session?.user?.id;
						const createdAt = ord?.created_at ? new Date(ord.created_at).toISOString() : null;
						const normalizeFiles = (arr) => (arr || []).map(f => ({ ...f, id: f.id ?? f.file_id, file_id: f.file_id ?? f.id }));
						// Attempt 1: by cart_id (from Checkout selection) for the same product
						if (Array.isArray(selectedCartIds) && selectedCartIds.length > 0 && it.product_id) {
							try {
								const { data: filesByCart, error: filesByCartErr } = await supabase
									.from('uploaded_files')
									.select('*')
									.in('cart_id', selectedCartIds)
									.eq('product_id', it.product_id)
									.order('uploaded_at', { ascending: false })
									.limit(10);
								if (!filesByCartErr && Array.isArray(filesByCart) && filesByCart.length > 0) {
									let pool0 = filesByCart;
									if (createdAt) {
										pool0 = filesByCart.filter(f => { try { return new Date(f.uploaded_at).getTime() <= new Date(createdAt).getTime(); } catch { return true; } });
									}
									uploadedFilesForItem = normalizeFiles(pool0);
								}
							} catch {}
						}
						// Attempt 2: by user_id + product_id
						if ((!uploadedFilesForItem || uploadedFilesForItem.length === 0) && userId && it.product_id) {
							let q = supabase
								.from('uploaded_files')
								.select('*')
								.eq('user_id', userId)
								.eq('product_id', it.product_id)
								.order('uploaded_at', { ascending: false })
								.limit(10);
							const { data: files, error: filesErr } = await q;
							if (!filesErr && Array.isArray(files)) {
								let pool = files;
								if (createdAt) {
									pool = files.filter(f => {
										try { return new Date(f.uploaded_at).getTime() <= new Date(createdAt).getTime(); } catch { return true; }
									});
								}
								uploadedFilesForItem = normalizeFiles(pool);
							}
						}
						// Fallback: any recent user uploads prior to order time
						if ((!uploadedFilesForItem || uploadedFilesForItem.length === 0) && session?.user?.id) {
							let q2 = supabase
								.from('uploaded_files')
								.select('*')
								.eq('user_id', session.user.id)
								.order('uploaded_at', { ascending: false })
								.limit(10);
							const { data: fb, error: fbErr } = await q2;
							if (!fbErr && Array.isArray(fb)) {
								let pool2 = fb;
								if (createdAt) {
									pool2 = fb.filter(f => {
										try { return new Date(f.uploaded_at).getTime() <= new Date(createdAt).getTime(); } catch { return true; }
									});
								}
								uploadedFilesForItem = normalizeFiles(pool2);
							}
						}
					} catch (e) { /* non-fatal */ }
					// Normalize image_url to a resolvable public URL for display
					if (Array.isArray(uploadedFilesForItem) && uploadedFilesForItem.length > 0) {
						uploadedFilesForItem = uploadedFilesForItem.map(f => ({
							...f,
							image_url: resolveProductFilePublicUrl(f.image_url || ''),
						}));
					}
					built.push({
						id: it.order_item_id,
						name: (prod && prod.name) ? prod.name : 'Product',
						img,
						quantity: it.quantity || 1,
						total: Number(it.total_price || 0),
						variants: Array.isArray(variantsMap[it.order_item_id])
							? variantsMap[it.order_item_id].map(v => ({ group: v.variant_group_name, value: v.variant_value_name }))
							: [],
						weight: Number(prod?.weight || 0),
						uploaded_files: uploadedFilesForItem,
					});
				}
				if (!cancelled) {
					setItems(built);
					setSubtotal(Number(sub.toFixed(2)));
				}
			} catch (e) {
				if (!cancelled) {
					setOrder(null);
					setItems([]);
					setSubtotal(0);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => { cancelled = true; };
	}, [orderIdParam, session?.user?.id, navigate]);

	const orderDateLabel = formatDate(order?.created_at);
	const estimatedDateLabel = formatDate(addBusinessDays(order?.created_at, 3));
	const totalWeightGrams = useMemo(() => (items || []).reduce((sum, it) => {
		const qty = Number(it.quantity || 1);
		const wt = Number(it.weight || 0);
		return sum + (isFinite(qty * wt) ? qty * wt : 0);
	}, 0), [items]);
	const shippingCost = useMemo(() => {
		// Match Checkout: base_rate + (rate_per_grams * totalWeight)
		if (shipping && (shipping.base_rate != null || shipping.rate_per_grams != null)) {
			const base = Number(shipping.base_rate || 0);
			const per = Number(shipping.rate_per_grams || 0);
			return Number((base + per * totalWeightGrams).toFixed(2));
		}
		// Fallback: delta
		const delta = Number(order?.total_price || 0) - Number(subtotal || 0);
		return Math.max(0, Number(delta.toFixed(2)));
	}, [shipping?.base_rate, shipping?.rate_per_grams, totalWeightGrams, order?.total_price, subtotal]);
	const taxes = 0;
	const total = Number(order?.total_price || 0);

	return (
		<div className="min-h-screen w-full bg-white overflow-y-auto  font-dm-sans">
		
			

		
			<div className="min-h-screen mt-[190px]  px-[24px] md:px-[60px] lg:px-[100px] py-[30px] w-full flex flex-col items-center bg-white z-0">
				<div className="mt-2 w-auto h-fit flex flex-row gap-8 ">
					{/* Left: Details */}
					<div className="lg:col-span-2 w-[808px]">
						<h1 className="text-[#171738] font-bold  text-3xl mb-4">Order Confirmation</h1>
						
                        <div className="bg-white p-4 mb-4">
							<div className="flex items-start gap-3">
								<div className="mt-1">
									<img src="/logo-icon/confirmation-icon.svg" onError={(e)=>{e.currentTarget.src='/logo-icon/white-check.svg';}} alt="ok" className="w-[55px] h-[55px]" />
								</div>
								<div>
									<p className="text-[#171738] font-dm-sans text-[20px] ">Order #{order?.order_id || '—'}</p>
									<p className="text-gray-700 text-[20px]font-dm-sans font-semibold">Thank you for your order!</p>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div className="bg-white border border-[#939393] rounded p-5">
								<p className="text-gray-700 font-dm-sans"><span className="font-semibold text-black font-dm-sans">Order Date:</span> {orderDateLabel}</p>
								<p className="text-gray-700 font-dm-sans"><span className="font-semibold text-black font-dm-sans">Estimated Delivery:</span> {estimatedDateLabel}</p>
							</div>
							<div className="bg-white border border-[#939393] rounded p-5">
								<p className="text-black text-[20px] font-semibold font-dm-sans mb-1">Order Updates & Tracking</p>
								<p className="text-gray-700 font-dm-sans text-[16px]">You can also view your order status <button className="underline bg-transparent" onClick={()=>navigate(`/order?order_id=${order?.order_id || ''}`)}>here</button>.</p>
							</div>
						</div>

						<div className="bg-white border border-[#939393] rounded ">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2">

								<div className="flex flex-row gap-[100px] border-b border-black p-4">
									<div>
										<p className="text-[#939393] text-[16px] font-dm-sans mb-1">Contact</p>
									</div>
									
									<div>
										{/*<p className="text-black text-[16px] font-dm-sans">{session?.user?.email || '—'}</p>*/}
										{address?.phone_number ? <p className="text-black text-[16px] font-dm-sans">{formatDisplayPHMobile(address.phone_number)}</p> : null}
									</div>
								</div>

								<div className="flex flex-row gap-[100px] border-b border-black p-4">
									<div>
										<p className="text-[#939393] text-[16px] font-dm-sans mb-1">Address</p>
									</div>
									
									<div>
										<p className="text-black text-[16px] font-dm-sans">{[address?.first_name, address?.last_name].filter(Boolean).join(' ')}</p>
										<p className="text-black text-[16px] font-dm-sans">
											{address?.street_address}
											{address?.barangay ? `, ${address.barangay}` : ''}
											{address?.city ? `, ${address.city}` : ''}
											{address?.province ? `, ${address.province}` : ''}
											{address?.postal_code ? ` ${address.postal_code}` : ''}
										</p>
									</div>
								</div>


								<div className="flex flex-row gap-[100px] border-b border-black p-4">
									<div>
										<p className="text-[#939393] text-[16px] font-dm-sans mb-1">Delivery</p>
									</div>
									
									<div >
										<p className="text-black text-[16px] font-dm-sans">{shipping?.name || 'Standard Delivery'}{shipping?.description ? ` — ${shipping.description}` : ''}</p>
									</div>
								</div>
								
								<div className="flex flex-row gap-[95px] border-b border-black p-4">
									<div>
										<p className="text-[#939393] text-[16px] font-dm-sans mb-1">Payment</p>
									</div>
									
									<div>
										<p className="text-black text-[16px] font-dm-sans">{paymentLabel || 'Paid'}</p>
									</div>
								</div>
							</div>
						</div>

						<div className="mt-6 flex flex-col items-end">
							<button onClick={() => navigate('/HomePage')} className="px-4 py-2 bg-[#2B4269] text-white rounded">Back to Home</button>
						</div>
					</div>

					{/* Right: Items + Summary */}
					<div className="lg:col-span-1 w-[359px]">
						{/* Items Ordered (match Checkout styles) */}
						<div className="border border-[#939393] rounded p-4 mb-6">
							<div className="font-semibold text-[20px] text-center mb-5">Item(s) Ordered</div>
							{loading ? (
								<div className="text-sm text-gray-500">Loading items…</div>
							) : items.length === 0 ? (
								<div className="text-sm text-gray-500">No items found.</div>
							) : (
								<div className="space-y-4 h-[190px] overflow-y-auto pr-1">
									{items.map((it) => (
										<div key={it.id} className="flex items-center gap-3">
											<img src={it.img || '/logo-icon/logo.png'} alt={it.name} className="w-14 h-14 rounded object-contain border bg-white" onError={(e)=>{ e.currentTarget.src = '/logo-icon/logo.png'; }} />
											<div className="flex-1">
												<div className="text-sm font-semibold text-[#171738]">{it.name}</div>
												<div className="text-xs text-black">
													{(() => {
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
														const specs = [];
														// Prepend uploaded design as a pill like Cart/Checkout
														if (Array.isArray(it.uploaded_files) && it.uploaded_files.length > 0) {
															const first = it.uploaded_files[0];
															const imgUrl = first.image_url || '';
															specs.push({
																label: 'Design',
																value: (
																	<span className="inline-flex items-center gap-2 border rounded px-2 py-1 bg-white">
																		<span className="w-6 h-6 overflow-hidden rounded bg-gray-100 flex items-center justify-center">
																			{imgUrl ? (
																				<img src={imgUrl} alt={first.file_name || 'design'} className="w-full h-full object-cover" />
																			) : (
																				<img src="/logo-icon/image.svg" alt="file" className="w-3 h-3" />
																			)}
																		</span>
																		<span className="text-xs text-gray-600 truncate max-w-[140px]">{first.file_name || 'uploaded design'}</span>
																	</span>
																),
															});
														}
														if (Array.isArray(it.variants)) {
															for (const v of it.variants) {
																const label = labelFor(v?.group, v?.value);
																const val = toColorNameIfHex(v?.group, v?.value);
																specs.push({ label, value: val });
															}
														}
														specs.sort((a,b)=>{
															const ai = indexFor(a.label); const bi = indexFor(b.label);
															if (ai !== bi) return ai - bi; return a.label.localeCompare(b.label);
														});
														return (
															<>
																{specs.map((s, idx) => (
																	<div key={`${idx}-${s.label}`}>
																		{String(s.label || '').toLowerCase() === 'design' ? s.value : (<>{s.label}: {s.value}</>)}
																	</div>
																))}
																<div>Qty: {it.quantity}</div>
															</>
														);
													})()}
												</div>
												<div className="text-[14px] font-semibold mt-1">₱{Number(it.total).toFixed(2)}</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Order Summary (match Checkout styles) */}
						<div className="border border-[#939393] rounded p-4">
							<div className="font-semibold text-[20px] text-center mb-3">Order Summary</div>
							<div className="text-sm space-y-2">
								<div className="flex justify-between  text-[16px] font-semibold text-gray-400">
									<span>Subtotal</span>
									<span className="text-black font-semibold">₱{subtotal.toFixed(2)}</span>
								</div>
								<div className="flex text-[14px] justify-between font-semibold text-gray-400 italic">
									<span>Total weight</span>
									<span className="text-black font-semibold">{totalWeightGrams.toLocaleString()} g</span>
								</div>
								<div className="flex justify-between  text-[16px] font-semibold text-gray-400">
									<span>Shipping</span>
									<span className="text-black font-semibold">₱{shippingCost.toFixed(2)}</span>
								</div>
								<div className="flex justify-between  text-[16px] font-semibold text-gray-400">
									<span>Taxes</span>
									<span className="text-black font-semibold">₱{taxes.toFixed(2)}</span>
								</div>
								<div className="border-t pt-2  text-[20px] font-semibold flex  justify-between">
									<span>Total</span>
									<span className="text-black font-semibold">₱{total.toFixed(2)}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default OrderConfirmationPage;

