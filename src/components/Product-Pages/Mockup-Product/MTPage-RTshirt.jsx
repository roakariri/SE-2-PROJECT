import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";

const MockupToolPage = () => {
    const navigate = useNavigate();
    const canvasElRef = useRef(null);
    const fileInputRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const [selectedObject, setSelectedObject] = useState(null);
    const [textValue, setTextValue] = useState("");
    const [canvasSize, setCanvasSize] = useState({ width: 560, height: 520 });
    const [recentUploads, setRecentUploads] = useState([]);
    const [activeSide, setActiveSide] = useState('front');
    const [zoomLevel, setZoomLevel] = useState(1);
    const sideObjectsRef = useRef({ front: [], back: [] });
    const location = useLocation();
    const [fromCart, setFromCart] = useState(!!location.state?.fromCart);

    // Product + variant state (copied/adapted from RTshirt-Info)
    const [productId, setProductId] = useState(null);
    const [variantGroups, setVariantGroups] = useState([]);
    const [selectedVariants, setSelectedVariants] = useState({});
    const [productImageUrl, setProductImageUrl] = useState(null);

    // Generic resolver from arbitrary name/value
    const resolveColorNameFrom = (rawNameIn, rawValIn) => {
        const rawName = String(rawNameIn || '').trim();
        const rawVal = String(rawValIn || '').trim();
        const contains = (s, sub) => s && s.toLowerCase().includes(sub);

        // Expand short hex like #abc -> #aabbcc
        const expandShortHex = (h) => {
            if (!h || typeof h !== 'string') return '';
            const hex = h.trim().toLowerCase();
            if (!hex.startsWith('#')) return '';
            if (hex.length === 4) return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
            if (hex.length === 7) return hex;
            return '';
        };
        const hex = expandShortHex(rawVal);

    // Name synonyms first
        if (contains(rawName, 'white')) return 'White';
        if (contains(rawName, 'black')) return 'Black';
        if (contains(rawName, 'gray') || contains(rawName, 'grey') || contains(rawName, 'ash')) return 'Gray';
    if (contains(rawName, 'blue') || contains(rawName, 'navy') || contains(rawName, 'royal') || contains(rawName, 'sky')) return 'Blue';
    if (contains(rawName, 'red') || contains(rawName, 'maroon') || contains(rawName, 'burgundy') || contains(rawName, 'crimson') || contains(rawName, 'wine') || contains(rawName, 'scarlet') || contains(rawName, 'ruby') || contains(rawName, 'garnet') || contains(rawName, 'brick') || contains(rawName, 'rose') || contains(rawName, 'berry') || contains(rawName, 'cardinal') || contains(rawName, 'cherry') || contains(rawName, 'oxblood')) return 'Red';
        if (contains(rawName, 'beige') || contains(rawName, 'cream') || contains(rawName, 'ivory') || contains(rawName, 'sand') || contains(rawName, 'khaki') || contains(rawName, 'tan')) return 'Beige';

        // Value string fallback
        if (contains(rawVal, 'white')) return 'White';
        if (contains(rawVal, 'black')) return 'Black';
        if (contains(rawVal, 'gray') || contains(rawVal, 'grey')) return 'Gray';
        if (contains(rawVal, 'blue') || contains(rawVal, 'navy') || contains(rawVal, 'royal') || contains(rawVal, 'sky')) return 'Blue';
    if (contains(rawVal, 'red') || contains(rawVal, 'maroon') || contains(rawVal, 'burgundy') || contains(rawVal, 'crimson') || contains(rawVal, 'wine') || contains(rawVal, 'scarlet') || contains(rawVal, 'ruby') || contains(rawVal, 'garnet') || contains(rawVal, 'brick') || contains(rawVal, 'rose') || contains(rawVal, 'berry') || contains(rawVal, 'cardinal') || contains(rawVal, 'cherry') || contains(rawVal, 'oxblood')) return 'Red';
        if (contains(rawVal, 'beige') || contains(rawVal, 'cream') || contains(rawVal, 'ivory') || contains(rawVal, 'sand') || contains(rawVal, 'khaki') || contains(rawVal, 'tan')) return 'Beige';

        // Hex-based classification (HSL)
        if (hex) {
            const r = parseInt(hex.slice(1,3), 16) / 255;
            const g = parseInt(hex.slice(3,5), 16) / 255;
            const b = parseInt(hex.slice(5,7), 16) / 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s = 0, l = (max + min) / 2;
            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                    default: break;
                }
                h *= 60;
            }
            // Normalize ranges
            const sat = s * 100;
            const light = l * 100;

            // Near white / black
            if (light >= 90) return 'White';
            if (light <= 12) return 'Black';

            // Neutral grays
            if (sat <= 10) return 'Gray';

            // Red hues: broaden to ~0-20 or 340-360 to catch more reds (e.g., #C40233)
            if ((h >= 340 && h <= 360) || (h >= 0 && h <= 20)) return 'Red';

            // Blue hues: ~200-260
            if (h >= 200 && h <= 260) return 'Blue';

            // Beige-like: warm light tones ~30-60 hue with relatively high lightness
            if (h >= 30 && h <= 60 && light >= 60 && sat <= 60) return 'Beige';
        }

        // Final hex direct checks for common palette values
        if (['#ffffff', '#f5f5f5', '#fafafa'].includes(hex)) return 'White';
        if (['#000000', '#111827', '#0a0a0a'].includes(hex)) return 'Black';
        if (['#808080', '#6b7280', '#9ca3af', '#737373', '#a3a3a3'].includes(hex)) return 'Gray';
    if (['#ff0000', '#ef4444', '#dc2626', '#b91c1c', '#be123c', '#c40233'].includes(hex)) return 'Red';
        if (['#0000ff', '#1d4ed8', '#3b82f6', '#2563eb', '#3357ff', '#1e3a8a'].includes(hex)) return 'Blue';
        if (['#f5f5dc', '#f1efd7', '#fef3c7', '#eee8aa', '#e5e4d7', '#f5e6c8'].includes(hex)) return 'Beige';

        // default
        return 'White';
    };

    // Map selected color to our mock image names (Beige, Black, Blue, Gray, Red, White)
    const resolveSelectedColorName = () => {
        const colorGroup = variantGroups.find(g => /color/i.test(String(g.name)));
        const selected = colorGroup ? selectedVariants[colorGroup.id] : null;
        const rawName = String(selected?.name || selected?.value || '').trim();
        const rawVal = String(selected?.value || selected?.name || '').trim();
        return resolveColorNameFrom(rawName, rawVal);
    };

    // Helper that (re)sets the background image for the current canvas side using latest state
    const setBackgroundForSide = useCallback((side) => {
        const fabric = window.fabric;
        const canvas = fabricCanvasRef.current;
        if (!fabric || !canvas) return;
        const sideName = side === 'back' ? 'Back' : 'Front';
        const buildUrl = (name) => encodeURI(`/mockup-images/apparel-images-mock/${name} - ${sideName}.png`);
        const colorName = resolveSelectedColorName();
        const tryUrl = buildUrl(colorName);

        // Preflight with HTMLImageElement for robust error handling
        const probe = new Image();
        probe.crossOrigin = 'anonymous';
        probe.onload = () => {
            try {
                const img = new fabric.Image(probe, {
                    originX: 'center',
                    originY: 'center',
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    selectable: false,
                    evented: false,
                });
                const imgWidth = probe.width || probe.naturalWidth || 1;
                const imgHeight = probe.height || probe.naturalHeight || 1;
                const scale = Math.max(canvas.width / imgWidth, canvas.height / imgHeight);
                img.set({ scaleX: scale, scaleY: scale });
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
                canvas.requestRenderAll();
            } catch (e) {
                // If fabric.Image with probe fails, fallback via fromURL
                window.fabric.Image.fromURL(tryUrl, (img) => {
                    const w = img?.width || img?.naturalWidth || 1;
                    const h = img?.height || img?.naturalHeight || 1;
                    const s = Math.max(canvas.width / w, canvas.height / h);
                    img.set({ originX: 'center', originY: 'center', left: canvas.width / 2, top: canvas.height / 2, scaleX: s, scaleY: s, selectable: false, evented: false });
                    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
                    canvas.requestRenderAll();
                }, { crossOrigin: 'anonymous' });
            }
        };
        probe.onerror = () => {
            // Fallback to White template if specific color fails to load (e.g., missing or corrupt)
            const fallbackUrl = buildUrl('White');
            window.fabric.Image.fromURL(fallbackUrl, (img) => {
                if (!img) return;
                const w = img.width || img.naturalWidth || 1;
                const h = img.height || img.naturalHeight || 1;
                const s = Math.max(canvas.width / w, canvas.height / h);
                img.set({ originX: 'center', originY: 'center', left: canvas.width / 2, top: canvas.height / 2, scaleX: s, scaleY: s, selectable: false, evented: false });
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
                canvas.requestRenderAll();
            }, { crossOrigin: 'anonymous' });
        };
        probe.src = tryUrl;
    }, [selectedVariants, variantGroups, canvasSize.width, canvasSize.height]);

    // Same as above but accept explicit color name (for immediate updates on click)
    const setBackgroundForSideWithName = useCallback((side, colorNameExplicit) => {
        const fabric = window.fabric;
        const canvas = fabricCanvasRef.current;
        if (!fabric || !canvas) return;
        const sideName = side === 'back' ? 'Back' : 'Front';
        const buildUrl = (name) => encodeURI(`/mockup-images/apparel-images-mock/${name} - ${sideName}.png`);
        const tryUrl = buildUrl(colorNameExplicit);
        const probe = new Image();
        probe.crossOrigin = 'anonymous';
        probe.onload = () => {
            const img = new fabric.Image(probe, { originX: 'center', originY: 'center', left: canvas.width / 2, top: canvas.height / 2, selectable: false, evented: false });
            const w = probe.width || probe.naturalWidth || 1;
            const h = probe.height || probe.naturalHeight || 1;
            const s = Math.max(canvas.width / w, canvas.height / h);
            img.set({ scaleX: s, scaleY: s });
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            canvas.requestRenderAll();
        };
        probe.onerror = () => {
            const fallbackUrl = buildUrl('White');
            window.fabric.Image.fromURL(fallbackUrl, (img) => {
                if (!img) return;
                const w = img.width || img.naturalWidth || 1;
                const h = img.height || img.naturalHeight || 1;
                const s = Math.max(canvas.width / w, canvas.height / h);
                img.set({ originX: 'center', originY: 'center', left: canvas.width / 2, top: canvas.height / 2, scaleX: s, scaleY: s, selectable: false, evented: false });
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
                canvas.requestRenderAll();
            }, { crossOrigin: 'anonymous' });
        };
        probe.src = tryUrl;
    }, [canvasSize.width, canvasSize.height]);

    // Resolve product slug from path and fetch product id
    useEffect(() => {
        let isMounted = true;
        const fetchProduct = async () => {
            try {
                // Derive slug base: strip trailing "-mockuptool" if present
                const segments = window.location?.pathname?.split('/').filter(Boolean) || [];
                const last = segments[segments.length - 1] || '';
                const slugBase = last.endsWith('-mockuptool') ? last.replace(/-mockuptool$/, '') : last;

                // Try by route first
                let { data, error } = await supabase
                    .from('products')
                    .select('id, name, image_url, product_types ( name, product_categories ( name ) )')
                    .eq('route', `/apparel/${slugBase}`)
                    .single();

                if (error || !data) {
                    // Fallback to slug column
                    const fb = await supabase
                        .from('products')
                        .select('id, name, image_url, product_types ( name, product_categories ( name ) )')
                        .eq('slug', slugBase)
                        .single();
                    data = fb.data; error = fb.error;
                }

                if (!data) {
                    // Fallback: route equals slugBase (in case route stored without /apparel prefix)
                    const fb2 = await supabase
                        .from('products')
                        .select('id, name, image_url, product_types ( name, product_categories ( name ) )')
                        .eq('route', slugBase)
                        .single();
                    if (fb2.data) data = fb2.data;
                }

                if (!data) {
                    // Last resort: case-insensitive name search
                    const alt = await supabase
                        .from('products')
                        .select('id, name, image_url, product_types ( name, product_categories ( name ) )')
                        .ilike('name', `%${slugBase.replace(/-/g, ' ')}%`)
                        .limit(1)
                        .maybeSingle();
                    data = alt.data; // error ignored
                }

                // Save product id
                if (isMounted && data?.id) setProductId(data.id);

                // Resolve product image URL similar to Checkout/Search logic
                if (isMounted && data) {
                    try {
                        let img = data.image_url || null;
                        if (img && typeof img === 'string') {
                            if (img.startsWith('http')) {
                                setProductImageUrl(img);
                            } else {
                                const key = img.startsWith('/') ? img.slice(1) : img;
                                const categoryName = (
                                    data?.product_types?.product_categories?.name ||
                                    data?.product_types?.name ||
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
                                const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(key);
                                const tryUrl = urlData?.publicUrl;
                                setProductImageUrl((tryUrl && !tryUrl.endsWith('/')) ? tryUrl : null);
                            }
                        } else {
                            setProductImageUrl(null);
                        }
                    } catch {
                        setProductImageUrl(null);
                    }
                }
            } catch (e) {
                // no-op
            }
        };
        fetchProduct();
        return () => { isMounted = false; };
    }, []);

    // Fetch variants with nested joins for this product
    useEffect(() => {
        let isMounted = true;
        const fetchVariants = async () => {
            if (!productId) return;
            try {
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

                if (pvvError || !pvvData) return;

                const groupsMap = new Map();
                pvvData.forEach(pvv => {
                    const vv = pvv.variant_values;
                    const grp = vv?.variant_groups;
                    if (!vv || !grp) return;
                    const groupId = grp.variant_group_id;
                    if (!groupsMap.has(groupId)) {
                        groupsMap.set(groupId, {
                            id: groupId,
                            name: grp.name || 'Unknown',
                            input_type: grp.input_type || 'radio',
                            values: []
                        });
                    }
                    const entry = groupsMap.get(groupId);
                    if (!entry.values.some(v => v.id === pvv.product_variant_value_id)) {
                        entry.values.push({
                            id: pvv.product_variant_value_id,
                            name: vv.value_name || '',
                            value: vv.value_name || '',
                            price: Number(pvv.price) || 0,
                            is_default: !!pvv.is_default,
                            variant_value_id: vv.variant_value_id
                        });
                    }
                });
                const groups = Array.from(groupsMap.values()).filter(g => g.name && g.values.length > 0);
                if (isMounted) setVariantGroups(groups);
            } catch (e) {
                // ignore
            }
        };
        fetchVariants();
        return () => { isMounted = false; };
    }, [productId]);

    // Initialize default selections
    useEffect(() => {
        if (!variantGroups || variantGroups.length === 0) return;
        setSelectedVariants(prev => {
            const updated = { ...prev };
            for (const group of variantGroups) {
                if (updated[group.id]) continue;
                const def = group.values.find(v => v.is_default) || group.values[0];
                if (def) updated[group.id] = def;
            }
            return updated;
        });
    }, [variantGroups]);

    useEffect(() => {
        if (location.state?.fromCart) {
            setFromCart(true);
        }
    }, [location.state]);

    useEffect(() => {
    const fabric = window.fabric;
        if (!fabric) {
            console.error("Fabric.js not loaded. Make sure the CDN script is included in index.html.");
            return;
        }

        // Initialize canvas
        const canvas = new fabric.Canvas(canvasElRef.current, {
            width: canvasSize.width,
            height: canvasSize.height,
            selection: true,
        });
        fabricCanvasRef.current = canvas;

    // Set initial side and background
    setActiveSide('front');
    setBackgroundForSide('front');

        // selection events
        const onSelection = () => setSelectedObject(canvas.getActiveObject());
        canvas.on("selection:created", onSelection);
        canvas.on("selection:updated", onSelection);
        canvas.on("selection:cleared", () => setSelectedObject(null));

        // keyboard delete
        const handleKey = (e) => {
            if ((e.key === "Delete" || e.key === "Backspace") && canvas.getActiveObject()) {
                const obj = canvas.getActiveObject();
                // if the object was added from recentUploads, remove the thumbnail as well
                try {
                    if (obj && obj.recentSrc) {
                        setRecentUploads(prev => prev.filter(p => p !== obj.recentSrc));
                    }
                } catch (err) {
                    // ignore errors from state update during key handling
                }
                canvas.remove(obj);
                canvas.discardActiveObject();
                canvas.requestRenderAll();
            }
        };
        window.addEventListener("keydown", handleKey);

        return () => {
            window.removeEventListener("keydown", handleKey);
            canvas.off("selection:created", onSelection);
            canvas.off("selection:updated", onSelection);
            canvas.off("selection:cleared");
            canvas.dispose();
            fabricCanvasRef.current = null;
        };
    }, [canvasSize.width, canvasSize.height]);

    // Add uploaded image to canvas
    const addImageFromFile = (file) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const reader = new FileReader();
        reader.onload = function (f) {
            const data = f.target.result;
            window.fabric.Image.fromURL(data, (img) => {
                // scale and center
                const maxW = canvas.width * 0.6;
                const maxH = canvas.height * 0.6;
                const scale = Math.min(maxW / (img.width || img.naturalWidth), maxH / (img.height || img.naturalHeight));
                img.set({ left: canvas.width / 2, top: canvas.height / 2, originX: 'center', originY: 'center' });
                if (scale && scale > 0) img.scale(scale);
                // tag the fabric image with the source data URL so we can remove its thumbnail when deleted
                try { img.recentSrc = data; } catch(e) {}
                img.setControlsVisibility({ mtr: true });
                canvas.add(img).setActiveObject(img);
                canvas.requestRenderAll();
                // snapshot current side objects
                try {
                    const objects = canvas.getObjects().map(o => o.toObject(['recentSrc']));
                    sideObjectsRef.current[activeSide] = objects;
                } catch (_) {}
            }, { crossOrigin: 'anonymous' });
            // add the data URL to recent uploads (keep latest first, max 12)
            try {
                setRecentUploads(prev => {
                    const next = [data, ...prev.filter(p => p !== data)];
                    return next.slice(0, 12);
                });
            } catch (e) {
                // ignore state set errors
            }
        };
        reader.readAsDataURL(file);
    };

    const addImageFromDataURL = (data) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !data) return;
        try {
            window.fabric.Image.fromURL(data, (img) => {
                const maxW = canvas.width * 0.6;
                const maxH = canvas.height * 0.6;
                const scale = Math.min(maxW / (img.width || img.naturalWidth), maxH / (img.height || img.naturalHeight));
                img.set({ left: canvas.width / 2, top: canvas.height / 2, originX: 'center', originY: 'center' });
                if (scale && scale > 0) img.scale(scale);
                try { img.recentSrc = data; } catch(e) {}
                img.setControlsVisibility({ mtr: true });
                canvas.add(img).setActiveObject(img);
                canvas.requestRenderAll();
                // snapshot current side objects
                try {
                    const objects = canvas.getObjects().map(o => o.toObject(['recentSrc']));
                    sideObjectsRef.current[activeSide] = objects;
                } catch (_) {}
            }, { crossOrigin: 'anonymous' });
        } catch (err) {
            console.error('Failed to add image from data URL', err);
        }
    };

    // Remove a recent upload thumbnail and any canvas objects that were created from it
    const removeRecentUpload = (src) => {
        try {
            setRecentUploads(prev => prev.filter(p => p !== src));
        } catch (e) {
            // ignore
        }
        try {
            const canvas = fabricCanvasRef.current;
            if (!canvas) return;
            // remove all objects whose recentSrc matches this src
            const objs = canvas.getObjects().slice();
            let removed = false;
            for (const o of objs) {
                try {
                    if (o && o.recentSrc === src) {
                        canvas.remove(o);
                        removed = true;
                    }
                } catch (err) {
                    // ignore individual object errors
                }
            }
            if (removed) {
                canvas.discardActiveObject();
                canvas.requestRenderAll();
            }
        } catch (err) {
            console.error('Error removing recent upload from canvas', err);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        addImageFromFile(file);
        try { e.target.value = null; } catch (err) {}
    };

    const addText = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const text = new window.fabric.Textbox(textValue || 'Text', {
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: 'center',
            originY: 'center',
            fontSize: 36,
            fill: '#111827',
            editable: true,
        });
        canvas.add(text).setActiveObject(text);
        canvas.requestRenderAll();
        setTextValue('');
    };

    const deleteSelected = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (obj) {
            canvas.remove(obj);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            // snapshot after deletion
            try {
                const objects = canvas.getObjects().map(o => o.toObject(['recentSrc']));
                sideObjectsRef.current[activeSide] = objects;
            } catch (_) {}
        }
    };

    const bringForward = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (obj) { obj.bringForward(); canvas.requestRenderAll(); }
    };
    const sendBackward = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (obj) { obj.sendBackwards(); canvas.requestRenderAll(); }
    };

    const flipHorizontal = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (obj) {
            obj.toggle('flipX');
            canvas.requestRenderAll();
        }
    };

    // Zoom canvas around the center using predefined levels
    const applyZoom = (level) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const clamped = Math.max(0.5, Math.min(3, level));
        const center = { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 };
        canvas.zoomToPoint(center, clamped);
        canvas.requestRenderAll();
    };

    const resetCanvas = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        canvas.clear();
        // reload current side background
        setBackgroundForSide(activeSide);
        // clear stored objects for this side
        sideObjectsRef.current[activeSide] = [];
    };

    // When color changes or side changes, refresh background image
    useEffect(() => {
        setBackgroundForSide(activeSide);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSide, setBackgroundForSide]);

    const downloadPNG = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'mockup.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <div className="fixed w-full h-full z-50" style={{ background: 'linear-gradient(270deg, #ECECEC 10%, #D4D4D4 50%)' }}>
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
                            onClick={() => navigate("/homepage")}
                            />
                        </div>

                        {/* Right icon (cart/profile) */}
                        <div className="flex items-center pr-4">
                            <button
                                aria-label="Open cart"
                                onClick={() => navigate('/account?tab=orders')}
                                className="p-2 rounded-md  w-[40px] h-[40px] flex items-center justify-center focus:outline-none bg-white hover:bg-gray-200"
                            >
                                <img src="/logo-icon/shopping-bag.svg" alt="Project icon" className="w-[40px] h-[40px] object-contain bg-transparent" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
            {/* top spacing / header placeholder */}
            <div className="max-w-[1200px] mx-auto">
              
                <div className="flex gap-6 mt-6">
                    {/* Left control card */}
                <div className="w-[420px] ">
                    <div className="bg-white border rounded-t px-4 py-1 shadow-sm bg-[#ECECEC] text-center">
                        <p className="text-lg font-bold font-dm-sans text-[#939393] ">MOCKUP TOOL</p>
                    </div>
                        <div className="bg-white border rounded p-6 shadow-sm">
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">Design</h3>

                            <div className="border-dashed border-2 border-gray-300 rounded p-6 mb-4 flex flex-col items-center justify-center">
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="fileInput" />
                                <label htmlFor="fileInput" className="inline-flex items-center gap-2 bg-[#27496d] text-white px-4 py-2 rounded cursor-pointer">
                                    <img src="/logo-icon/upload.svg" alt="upload" className="h-4 w-4" />
                                    UPLOAD FILE
                                </label>
                                <p className="text-xs text-gray-500 mt-3 text-center">Accepted File Types: JPEG, JPG, PNG, WEBP<br/>• Max size of 20 MB.</p>
                            </div>

                            <div>
                                <div className="font-semibold text-gray-700 mb-2">Recent Uploads</div>
                                <div className="max-h-[160px] overflow-y-auto pr-1">
                                    <div className="flex gap-3 flex-wrap">
                                        {recentUploads && recentUploads.length > 0 ? (
                                            recentUploads.map((src, idx) => (
                                                <div key={idx} className="relative w-20 h-20 bg-white border rounded flex items-center justify-center overflow-hidden">
                                                    <button aria-label="remove" onClick={() => removeRecentUpload(src)} className="absolute right-1 top-1 z-10 bg-white rounded-full p-1 text-gray-600">
                                                        ×
                                                    </button>
                                                    <img src={src} alt={`upload-${idx}`} className="w-full h-full object-contain p-1 cursor-pointer" onClick={() => addImageFromDataURL(src)} />
                                                </div>
                                            ))
                                        ) : (
                                            <>
                                                <div className="w-20 h-20 bg-white border rounded flex items-center justify-center">
                                                    <img src="/logo-icon/upload.svg" alt="recent" className="w-10 h-10 opacity-60" />
                                                </div>
                                                
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* COLOR (from variant groups) */}
                            <div className="mt-[20px]">
                                <div className="font-semibold text-gray-700 mb-2">Color</div>
                                {(() => {
                                    // derive color group
                                    const colorGroup = variantGroups.find(g => /COLOR/i.test(String(g.name)));
                                    if (!colorGroup || !Array.isArray(colorGroup.values) || colorGroup.values.length === 0) {
                                        // fallback UI when no colors are configured
                                        return (
                                            <div className="flex gap-2">
                                                <button className="w-8 h-8 rounded bg-white border" />
                                                <button className="w-8 h-8 rounded bg-black border" />
                                                <button className="w-8 h-8 rounded bg-gray-300 border" />
                                            </div>
                                        );
                                    }

                                    const selectVariant = (groupId, value) => {
                                        setSelectedVariants(prev => ({ ...prev, [groupId]: value }));
                                        // Immediately refresh background based on clicked color without waiting for state
                                        try {
                                            const colorNameNow = resolveColorNameFrom(value?.name, value?.value);
                                            setBackgroundForSideWithName(activeSide, colorNameNow);
                                        } catch (_) {}
                                    };

                                    const getLuminance = (hex) => {
                                        try {
                                            const r = parseInt(hex.slice(1,3), 16) / 255;
                                            const g = parseInt(hex.slice(3,5), 16) / 255;
                                            const b = parseInt(hex.slice(5,7), 16) / 255;
                                            const srgb = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
                                            return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
                                        } catch (e) {
                                            return 0;
                                        }
                                    };

                                    return (
                                        <div className="flex items-center gap-3">
                                            {colorGroup.values.map(val => {
                                                const isSelected = selectedVariants[colorGroup.id]?.id === val.id;
                                                const isHexColor = typeof val.value === 'string' && val.value.startsWith('#') && (val.value.length === 7 || val.value.length === 4);
                                                const bg = typeof val.value === 'string' && val.value ? val.value : '#000000';
                                                const lum = isHexColor ? getLuminance(bg) : 0;
                                                return (
                                                    <button
                                                        key={val.id}
                                                        type="button"
                                                        onClick={() => selectVariant(colorGroup.id, val)}
                                                        title={`${val.name}${val.price > 0 ? ` (+₱${Number(val.price).toFixed(2)})` : ''}`}
                                                        className={`relative w-10 h-10 rounded-none cursor-pointer flex items-center justify-center focus:outline-none ${isSelected ? 'ring-2 ring-gray-300' : 'ring-1 ring-gray-300'}`}
                                                        style={{ backgroundColor: bg }}
                                                        aria-pressed={isSelected}
                                                    >
                                                        {isSelected && (
                                                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none ">
                                                                <img
                                                                    src={lum > 0.6 ? '/logo-icon/black-check.svg' : '/logo-icon/white-check.svg'}
                                                                    alt="selected"
                                                                    className="w-5 h-5"
                                                                />
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                        </div>
                    </div>

                    {/* Center mockup canvas area */}
                    <main className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-none  p-6 shadow-sm flex items-center justify-center" style={{ height: 520 }}>
                            <div className="relative">
                                <canvas ref={canvasElRef} id="mockupCanvas" width={canvasSize.width} height={canvasSize.height} className="mx-auto bg-transparent" />
                                {/* small zoom control on the right of canvas */}
                                
                            </div>
                        </div>
                    </main>

                    {/* Right vertical thumbnails */}
                    <aside className="w-[120px] flex flex-col items-center gap-3">
                        <button
                            type="button"
                            aria-label="Front side"
                            onClick={() => {
                                const canvas = fabricCanvasRef.current;
                                if (canvas) {
                                    // save current side objects
                                    try {
                                        const objects = canvas.getObjects().map(o => o.toObject(['recentSrc']));
                                        sideObjectsRef.current[activeSide] = objects;
                                    } catch (_) {}
                                    // remove all current objects (keep background will be re-set)
                                    canvas.getObjects().forEach(o => canvas.remove(o));
                                }
                                setActiveSide('front');
                                setBackgroundForSide('front');
                                // load stored front objects
                                try {
                                    const data = sideObjectsRef.current['front'] || [];
                                    window.fabric.util.enlivenObjects(data, (objs) => {
                                        const c = fabricCanvasRef.current;
                                        if (!c) return;
                                        objs.forEach(o => c.add(o));
                                        c.requestRenderAll();
                                    });
                                } catch (_) {}
                            }}
                            className={`w-24 h-28 bg-white border rounded flex flex-col items-center justify-center overflow-hidden transition focus:outline-none ring-offset-2 ${activeSide==='front' ? 'ring-2 ring-[#27496d]' : 'hover:ring-1 hover:ring-gray-300'}`}
                        >
                            <img
                                src={encodeURI(`/mockup-images/apparel-images-mock/${resolveSelectedColorName()} - Front.png`)}
                                alt="Front"
                                className="w-full h-24 object-contain"
                            />
                            <span className="text-xs text-gray-700">Front</span>
                        </button>

                        <button
                            type="button"
                            aria-label="Back side"
                            onClick={() => {
                                const canvas = fabricCanvasRef.current;
                                if (canvas) {
                                    // save current side objects
                                    try {
                                        const objects = canvas.getObjects().map(o => o.toObject(['recentSrc']));
                                        sideObjectsRef.current[activeSide] = objects;
                                    } catch (_) {}
                                    // remove all current objects
                                    canvas.getObjects().forEach(o => canvas.remove(o));
                                }
                                setActiveSide('back');
                                setBackgroundForSide('back');
                                // load stored back objects
                                try {
                                    const data = sideObjectsRef.current['back'] || [];
                                    window.fabric.util.enlivenObjects(data, (objs) => {
                                        const c = fabricCanvasRef.current;
                                        if (!c) return;
                                        objs.forEach(o => c.add(o));
                                        c.requestRenderAll();
                                    });
                                } catch (_) {}
                            }}
                            className={`w-24 h-28 bg-white border rounded flex flex-col items-center justify-center overflow-hidden transition focus:outline-none ring-offset-2 ${activeSide==='back' ? 'ring-2 ring-[#27496d] ' : 'hover:ring-1 hover:ring-gray-300'}`}
                        >
                            <img
                                src={encodeURI(`/mockup-images/apparel-images-mock/${resolveSelectedColorName()} - Back.png`)}
                                alt="Back"
                                className="w-full h-24 object-contain"
                            />
                            <span className="text-xs text-gray-700">Back</span>
                        </button>

                        {/* Zoom controls styled like the mockup */}
                        <button
                            type="button"
                            aria-label="Zoom"
                            className="w-[82px] h-[43px] bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center overflow-hidden transition focus:outline-none hover:border-gray-400 shadow-sm mt-2"
                            onClick={() => {
                                const levels = [1, 1.25, 1.5, 2];
                                const idx = levels.indexOf(zoomLevel);
                                const next = idx < levels.length - 1 ? levels[idx + 1] : levels[idx];
                                if (next !== zoomLevel) {
                                    setZoomLevel(next);
                                    applyZoom(next);
                                }
                            }}
                        >
                            <img src="/logo-icon/zoom-in.svg" alt="Zoom in" className="w-6 h-6 object-contain opacity-80" />
                        </button>

                        <button
                            type="button"
                            aria-label="Zoom out"
                            className="w-[82px] h-[43px] bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center overflow-hidden transition focus:outline-none hover:border-gray-400 shadow-sm"
                            onClick={() => {
                                const levels = [1, 1.25, 1.5, 2];
                                const idx = levels.indexOf(zoomLevel);
                                const prev = idx <= 0 ? levels[0] : levels[idx - 1];
                                setZoomLevel(prev);
                                applyZoom(prev);
                            }}
                        >
                            <img src="/logo-icon/zoom-out.svg" alt="Zoom out" className="w-6 h-6 object-contain opacity-80" />
                        </button>
                    </aside>
                </div>

                {/* Footer */}
                <div className="fixed left-0 right-0 bottom-0 bg-white border-t shadow-inner">
                    <div className="max-w-[1200px] mx-auto flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <img
                                src={productImageUrl || '/apparel-images/rounded_t-shirt.png'}
                                alt="product"
                                className="w-14 h-14 object-cover rounded bg-transparent"
                                onError={(e)=>{ e.currentTarget.src = '/apparel-images/rounded_t-shirt.png'; }}
                            />
                            <div>
                                <div className="font-semibold text-gray-800">Custom Rounded T-shirt</div>
                                
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className="px-4 py-2 bg-[#ef7d66] text-black font-semibold rounded">{fromCart ? 'UPDATE CART' : 'ADD TO CART'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MockupToolPage;