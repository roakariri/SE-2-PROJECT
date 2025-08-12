import { useEffect } from "react";

const ProductSample = () => {

    /*
    useEffect(() => {
        const fabric = window.fabric;
        if (!fabric) {
            console.error("Fabric.js not loaded. Make sure the CDN script is included in index.html.");
            return;
        }
        const canvas = new fabric.Canvas("mockupCanvas", {
            width: 500,
            height: 600
        });

        fabric.Image.fromURL("/apparel-images/rounded_t-shirt.png", (img) => {
            if (!img) {
                console.error("Failed to load t-shirt template image.");
                return;
            }
            img.selectable = false;
            canvas.add(img);
        });

        const input = document.getElementById("fileInput");
        const handleChange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (f) {
                fabric.Image.fromURL(f.target.result, (img) => {
                    if (!img) {
                        console.error("Failed to load uploaded image.");
                        return;
                    }
                    img.scaleToWidth(200);
                    img.center();
                    canvas.add(img);
                });
            };
            reader.readAsDataURL(file);
        };
        input.addEventListener("change", handleChange);

        return () => {
            input.removeEventListener("change", handleChange);
            canvas.dispose();
        };
    }, []);
       */
    return (
        // Uncomment below to show the mockup tool
        // <div className="w-full bg-cover bg-white phone:pt-[210px] tablet:pt-[220px] laptop:pt-[165px] landing-page-container z-0">
        //     <input type="file" id="fileInput" />
        //     <canvas id="mockupCanvas" width={500} height={600} style={{ border: "1px solid #ccc" }}></canvas>
        // </div>

        // Construction notice (currently shown)
        <div className="min-h-screen w-full bg-[#3B5B92] flex flex-col justify-center items-center bg-[url('/images/construction.png')] bg-cover bg-center phone:pt-[212px] tablet:pt-[215px] laptop:pt-[166px] relative z-0">
            <p className="text-[50px] text-white font-dm-sans p-10 text-center font-bold">We’re currently working on something<span className="italic"> GOOD</span> and <span className="text-shadow-glow text-yellow-400 font-dm-sans">GREAT</span>✨.</p>
            <p className="text-white font-dm-sans font-bold text-[18px]">Product Page</p>
        </div>
    );
};

export default ProductSample;