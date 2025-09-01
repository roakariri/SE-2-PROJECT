import React, { useEffect, useRef, useState } from "react";

const MockupToolPage = () => {
    const canvasElRef = useRef(null);
    const fileInputRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const [selectedObject, setSelectedObject] = useState(null);
    const [textValue, setTextValue] = useState("");
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 700 });
    const [recentUploads, setRecentUploads] = useState([]);

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

        // Load template as centered background cover
        fabric.Image.fromURL("/apparel-images/front-t-shirt.png", (img) => {
            if (!img) {
                console.error("Failed to load t-shirt template image.");
                return;
            }
            const imgWidth = img.width || img.naturalWidth || 1;
            const imgHeight = img.height || img.naturalHeight || 1;
            const scale = Math.max(canvas.width / imgWidth, canvas.height / imgHeight);
            img.set({
                originX: "center",
                originY: "center",
                left: canvas.width / 2,
                top: canvas.height / 2,
                scaleX: scale,
                scaleY: scale,
                selectable: false,
                evented: false,
            });
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            canvas.renderAll();
        });

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

    const resetCanvas = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        canvas.clear();
        // reload background
        window.fabric.Image.fromURL('/apparel-images/front-t-shirt.png', (img) => {
            const imgWidth = img.width || img.naturalWidth || 1;
            const imgHeight = img.height || img.naturalHeight || 1;
            const scale = Math.max(canvas.width / imgWidth, canvas.height / imgHeight);
            img.set({ originX: 'center', originY: 'center', left: canvas.width / 2, top: canvas.height / 2, scaleX: scale, scaleY: scale, selectable: false, evented: false });
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            canvas.requestRenderAll();
        });
    };

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
                            onClick={() => navigate("/HomePage")}
                            />
                        </div>

                        {/* Right icon (cart/profile) */}
                        <div className="flex items-center pr-4">
                            <button
                                aria-label="Open cart"
                                onClick={() => navigate('/account')}
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

                            <div className="mt-[20px]">
                                <div className="font-semibold text-gray-700 mb-2">Color</div>
                                <div className="flex gap-2">
                                    <button className="w-8 h-8 rounded bg-white border" />
                                    <button className="w-8 h-8 rounded bg-black border" />
                                    <button className="w-8 h-8 rounded bg-gray-300 border" />
                                </div>
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
                    <aside className="w-[80px] flex flex-col items-center gap-3">
                        <div className="w-20 h-20 bg-white border rounded flex items-center justify-center">Front</div>
                        <div className="w-20 h-20 bg-white border rounded flex items-center justify-center">Back</div>
                        <div className="w-20 h-20 bg-white border rounded flex items-center justify-center">🔍</div>
                    </aside>
                </div>

                {/* Footer sticky product bar */}
                <div className="fixed left-0 right-0 bottom-0 bg-white border-t shadow-inner">
                    <div className="max-w-[1200px] mx-auto flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <img src="/apparel-images/front-t-shirt.png" alt="product" className="w-14 h-14 object-cover rounded bg-transparent" />
                            <div>
                                <div className="font-semibold text-gray-800">Custom Rounded T-shirt</div>
                                <div className="text-sm text-gray-600">Printing: Front-sided | Size: M | Material: 100% Cotton <span className="text-blue-600 underline">Change Customization</span></div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className="px-4 py-2 bg-[#ef7d66] text-black font-semibold rounded">ADD TO CART</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MockupToolPage;