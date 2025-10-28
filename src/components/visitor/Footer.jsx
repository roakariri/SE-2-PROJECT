

import { useNavigate } from 'react-router-dom';

const Footer = () => {
    const navigate = useNavigate();
    const goToOrders = (e) => {
        e.preventDefault();
        navigate('/account', { state: { initialTab: 'orders' } });
    };



    return (
        <div className="w-full bg-[#2B4269] text-white font-dm-sans  font-semibold text-[15px] py-8 px-4 phone:px-2 tablet:px-8 laptop:px-16 phone:justify-left phone:flex align-center">
            <div className="flex flex-col w-full  h-auto phone:p-10 laptop:py-5 laptop:px-0 laptop:flex-row justify-between items-start gap-8 laptop:gap-12  phone:items-start laptop:items-start text-white p-0">
                {/* Logo & Contact */}
                <div className="flex flex-col items-center laptop:items-start text-center phone:items-start laptop:text-left gap-2 laptop:gap-0 laptop:items-center min-w-[180px]">
                    <img src="/logo-icon/logo-white.png" className="w-32 h-auto mb-2 laptop:w-[230.76px] laptop:h-[60px] bigscreen:h-[100px] bigscreen:w-[340.76px] phone:w-[130px] phone:h-[40px]" alt="Logo" />
                    <p className="text-[15px] text-white font-dm-sans">2219 C. M. Recto Ave, Sampaloc, Manila</p>
                    <p className="text-[15px] text-white font-dm-sans">+63 9xxx xxx xxxx</p>
                    <p className="text-[15px] text-white font-dm-sans">goodprintsgreatprints@gmail.com</p>
                    <div className="flex flex-row justify-center laptop:justify-start gap-3 mt-3">
                        <a href="https://www.facebook.com/people/Good-Prints-Great-Prints/61576837260520/" target="_blank" rel="noopener noreferrer">
                            <img src="/logo-icon/fb-icon.png" className="w-7 h-7" alt="Facebook" />
                        </a>
                        <a href="https://www.instagram.com/goodprintsgreatprints" target="_blank" rel="noopener noreferrer">
                            <img src="/logo-icon/ig-icon.png" className="w-7 h-7" alt="Instagram" />
                        </a>
                        <a href="https://www.tiktok.com/@goodprintsgreatprints" target="_blank" rel="noopener noreferrer">
                            <img src="/logo-icon/tiktok-icon.png" className="w-7 h-7" alt="TikTok" />
                        </a>
                    </div>
                </div>

                {/* Our Company */}
                <div className="flex flex-col gap-1 min-w-[120px] ">
                    <p className="font-bold text-base mb-2 text-white font-dm-sans">Our Company</p>
                    <a href="/about-us"><p className="text-[15px] cursor-pointer hover:underline text-white font-dm-sans">About Us</p></a>
                    <a href="/terms-and-conditions"><p className="text-[15px] cursor-pointer hover:underline text-white font-dm-sans">Terms & Conditions</p></a>
                    <a href="/privacy-policy"><p className="text-[15px] cursor-pointer hover:underline text-white font-dm-sans">Privacy Policy</p></a>
                </div>

                {/* Our Services */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <p className="font-bold text-base mb-2 text-white font-dm-sans">Our Services</p>
                    <a href="/faqs"><p className="text-sm cursor-pointer hover:underline text-white font-dm-sans">FAQs</p></a>

                    <a href="/shipping"><p className="text-[15px] cursor-pointer hover:underline text-white font-dm-sans">Shipping</p></a>
                    {/* Navigate to the Account page and open Orders tab via navigation state */}
                    <button type="button" onClick={goToOrders} className="text-[15px] focus:outline-none cursor-pointer hover:underline text-white font-dm-sans bg-transparent border-0 p-0 text-left">Order Tracking</button>
                    <a href="/contact-support"><p className="text-[15px] cursor-pointer hover:underline text-white font-dm-sans">Contact Support</p></a>
                </div>

                {/* More Services */}
                <div className="flex flex-col gap-1 min-w-[120px] laptop:mt-[25px] phone:mt-[-30px]">
                    <a href="/return-policy"><p className="text-[15px] cursor-pointer hover:underline mt-2 text-white font-dm-sans">Returns Policy</p></a>
                    

                </div>

                {/* Newsletter */}
                <div className="flex flex-col gap-2 min-w-[220px]">
                    <p className="font-bold text-[15px] mb-1 text-white font-dm-sans">Newsletter Subscription</p>
                    <p className="text-[15px] text-white font-dm-sans">Love what you see? Subscribe to our <span className="italic text-white">newsletter.</span></p>
                    <form className="flex gap-2 mt-2">
                        <input
                            type="email"
                                  
                            className="px-3 py-2 rounded-l-md bg-white text-black focus:outline-none w-full"
                        />
                        <button type="button" className="bg-[#FFA07A] text-black px-4 py-2 rounded-r-md rounded-l-none ml-[-10px] font-semibold hover:bg-orange-600 transition">
                            Subscribe
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Footer;


