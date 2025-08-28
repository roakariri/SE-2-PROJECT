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
        <div className="w-full bg-cover bg-white phone:pt-[210px] tablet:pt-[220px] laptop:pt-[165px] landing-page-container z-0">
            <div className="max-w-[900px] mx-auto py-8">
                <div className="flex gap-3 items-center justify-center mb-4">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="fileInput" />
                    <label htmlFor="fileInput" className="bg-[#27496d] text-white px-3 py-2 rounded cursor-pointer flex items-center gap-2">
                        <img src="/logo-icon/upload.svg" alt="upload" className="h-4 w-4" />
                        Upload Image
                    </label>
                    <input value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="Add text" className="border px-2 py-1 rounded" />
                    <button onClick={addText} className="border px-3 py-1 rounded bg-white">Add Text</button>
                    <button onClick={deleteSelected} className="border px-3 py-1 rounded bg-white">Delete</button>
                    <button onClick={bringForward} className="border px-3 py-1 rounded bg-white">Bring Forward</button>
                    <button onClick={sendBackward} className="border px-3 py-1 rounded bg-white">Send Back</button>
                    <button onClick={flipHorizontal} className="border px-3 py-1 rounded bg-white">Flip</button>
                    <button onClick={resetCanvas} className="border px-3 py-1 rounded bg-white">Reset</button>
                    <button onClick={downloadPNG} className="border px-3 py-1 rounded bg-white">Download PNG</button>
                </div>

                <div className="bg-white border border-gray-200 p-4 flex justify-center">
                    <canvas ref={canvasElRef} id="mockupCanvas" width={canvasSize.width} height={canvasSize.height} className="mx-auto" />
                </div>
            </div>
        </div>
    );
};

export default MockupToolPage;