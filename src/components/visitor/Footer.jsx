


const Footer = () => {



    return (
        <footer className="w-full bg-[#2B4269] text-white font-dm-sans font-semibold text-[15px] py-8 px-4 phone:px-2 tablet:px-8 laptop:px-16 phone:justify-left phone:flex align-center">
            <div className="flex flex-col w-full h-auto phone:p-10 laptop:py-5 laptop:px-0 laptop:flex-row justify-between items-start gap-8 laptop:gap-12  phone:items-start laptop:items-start text-white p-0">
                {/* Logo & Contact */}
                <div className="flex flex-col items-center laptop:items-start text-center phone:items-start laptop:text-left gap-2 laptop:gap-0 laptop:items-center min-w-[180px]">
                    <img src="/logo-icon/logo-white.png" className="w-32 h-auto mb-2 laptop:w-[230.76px] laptop:h-[60px] bigscreen:h-[100px] bigscreen:w-[340.76px] phone:w-[210px] phone:h-[70px]" alt="Logo" />
                    <p className="text-[15px] text-white">2219 C. M. Recto Ave, Sampaloc, Manila</p>
                    <p className="text-[15px] text-white">+63 9xxx xxx xxxx</p>
                    <p className="text-[15px] text-white">goodprintsgreatprints@gmail.com</p>
                    <div className="flex flex-row justify-center laptop:justify-start gap-3 mt-3">
                        <img src="/logo-icon/fb-icon.png" className="w-7 h-7" alt="Facebook" />
                        <img src="/logo-icon/ig-icon.png" className="w-7 h-7" alt="Instagram" />
                        <img src="/logo-icon/tiktok-icon.png" className="w-7 h-7" alt="TikTok" />
                    </div>
                </div>

                {/* Our Company */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <p className="font-bold text-base mb-2 text-white">Our Company</p>
                    <p className="text-[15px] cursor-pointer hover:underline text-white">About Us</p>
                    <p className="text-[15px] cursor-pointer hover:underline text-white">Terms & Conditions</p>
                    <p className="text-[15px] cursor-pointer hover:underline text-white">Privacy Policy</p>
                </div>

                {/* Our Services */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <p className="font-bold text-base mb-2 text-white">Our Services</p>
                    <p className="text-sm cursor-pointer hover:underline text-white">FAQs</p>
                    <p className="text-[15px] cursor-pointer hover:underline text-white">All Products</p>
                    <p className="text-[15px] cursor-pointer hover:underline text-white">Shipping</p>
                    <p className="text-[15px] cursor-pointer hover:underline text-white">Order Tracking</p>
                    <p className="text-[15px] cursor-pointer hover:underline text-white">Contact Support</p>
                </div>

                {/* More Services */}
                <div className="flex flex-col gap-1 min-w-[120px] laptop:mt-[25px] phone:mt-[-30px]">
                    <p className="text-[15px] cursor-pointer hover:underline mt-2 text-white">Returns Policy</p>
                    <p className="text-[15px] cursor-pointer hover:underline text-white">3D Print Services</p>
                    <p className="text-[15px] cursor-pointer hover:underline text-white">Live Chat Support</p>
                </div>

                {/* Newsletter */}
                <div className="flex flex-col gap-2 min-w-[220px]">
                    <p className="font-bold text-[15px] mb-1 text-white">Newsletter Subscription</p>
                    <p className="text-[15px] text-white">Love what you see? Subscribe to our <span className="italic text-white">newsletter.</span></p>
                    <form className="flex gap-2 mt-2">
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="px-3 py-2 rounded-l-md bg-white text-black focus:outline-none w-full"
                        />
                        <button type="button" className="bg-orange-500 text-white px-4 py-2 rounded-r-md rounded-l-none ml-[-10px] font-semibold hover:bg-orange-600 transition">
                            Subscribe
                        </button>
                    </form>
                </div>
            </div>
        </footer>
    );
};

export default Footer;


