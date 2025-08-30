import React, { useEffect, useRef, useState } from "react";

const MockupToolPage = () => {
    const canvasElRef = useRef(null);
    const fileInputRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const [selectedObject, setSelectedObject] = useState(null);
    const [textValue, setTextValue] = useState("");
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 700 });

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
        fabric.Image.fromURL("/apparel-images/rounded_t-shirt.png", (img) => {
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
                canvas.remove(canvas.getActiveObject());
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
                img.setControlsVisibility({ mtr: true });
                canvas.add(img).setActiveObject(img);
                canvas.requestRenderAll();
            }, { crossOrigin: 'anonymous' });
        };
        reader.readAsDataURL(file);
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
        window.fabric.Image.fromURL('/apparel-images/rounded_t-shirt.png', (img) => {
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
        <div className="w-full min-h-screen bg-gray-100 phone:pt-[120px] tablet:pt-[120px] laptop:pt-[120px] landing-page-container z-0">
            {/* top spacing / header placeholder */}
            <div className="max-w-[1200px] mx-auto">
                <div className="mt-6 mb-6">
                    {/* Mockup Tool Title */}
                    <div className="bg-white border rounded-t px-4 py-3 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800">MOCKUP TOOL</h2>
                    </div>
                </div>

                <div className="flex gap-6">
                    {/* Left control card */}
                    <aside className="w-[420px]">
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
                                <div className="flex gap-3">
                                    {/* placeholder recent thumbnails - real thumbnails would be rendered from uploads */}
                                    <div className="w-20 h-20 bg-gray-50 border rounded flex items-center justify-center">
                                        <img src="/logo-icon/upload.svg" alt="recent" className="w-10 h-10 opacity-60" />
                                    </div>
                                    <div className="w-20 h-20 bg-gray-50 border rounded flex items-center justify-center">
                                        <img src="/logo-icon/upload.svg" alt="recent" className="w-10 h-10 opacity-60" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="font-semibold text-gray-700 mb-2">Color</div>
                                <div className="flex gap-2">
                                    <button className="w-8 h-8 rounded bg-white border" />
                                    <button className="w-8 h-8 rounded bg-black border" />
                                    <button className="w-8 h-8 rounded bg-gray-300 border" />
                                </div>
                            </div>

                        </div>
                    </aside>

                    {/* Center mockup canvas area */}
                    <main className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-white border rounded p-6 shadow-sm flex items-center justify-center" style={{ height: 520 }}>
                            <div className="relative">
                                <canvas ref={canvasElRef} id="mockupCanvas" width={canvasSize.width} height={canvasSize.height} className="mx-auto bg-transparent" />
                                {/* small zoom control on the right of canvas */}
                                <button onClick={() => { /* optional zoom handler */ }} className="absolute right-4 bottom-4 bg-white border rounded p-2 shadow">🔍</button>
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
                            <img src="/apparel-images/rounded_t-shirt.png" alt="product" className="w-14 h-14 object-cover rounded" />
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