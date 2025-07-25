
import "../Footer.css"

const Footer = () => {



    return (
        <div className="flex footer-container">
            <div className=" flex flex-row footer-container-inside" >
                <div className="flex flex-col  text-center">
                    <img src={"/logo-icon/logo-white.png"} className="logo"></img>
                    <p className="address-number-email">2219 C. M. Recto Ave, Sampaloc, Manila</p>
                    <p className="address-number-email">+63 9xxx xxx xxxx</p>
                    <p className="address-number-email">goodprintsgreatprints@gmail.com</p>
                    <div className="flex flex-row align-center justify-center mt-5">
                        <img src = {"/logo-icon/fb-icon.png"} className="socials-icon"></img>
                        <img src = {"/logo-icon/ig-icon.png"} className="socials-icon"></img>
                        <img src = {"/logo-icon/tiktok-icon.png"} className="socials-icon"></img>
                    </div>
                </div>

                <div className="flex flex-col text-left our-company-container">
                    <p className="our-company-name">Our Company</p>
                    <p className="atp mt-2">About Us</p>
                    <p className="atp">Terms & Conditions</p>
                    <p className="atp">Privacy Policy</p>

                </div>


                <div className="flex flex-col text-left our-services-container">
                    <p className="our-services-name">Our Services</p>
                    <p className="fasoc mt-2">FAQs</p>
                    <p className="fasoc">All Products</p>
                    <p className="fasoc">Shipping</p>
                    <p className="fasoc">Order Tracking</p>
                    <p className="fasoc">Contact Support</p>

                </div>
                <div className="flex flex-col text-left our-services-container2">
               
                    <p className="fasoc margin-toppiana">Returns Policy</p>
                    <p className="fasoc">3D Print Services</p>
                    <p className="fasoc">Live Chat Support</p>
                </div>

                <div className="flex flex-col news-letter-container">
                    <p className="news-letter-name">News Letter Subsscription</p>
                    <p className="news-letter-description">Love what you see? Subscribe to our
                        
                    </p>
                    <p className="italic">newsletter.</p>
                    <div className="justify-center align-center">
                        <form className="items-center flex mt-3">
                            <input
                            type="email"
                            placeholder="Email Address"
                            className="email-bar"
                            />

                            <button type="button" className="email-btn">
                                    <p>Subscribe</p>
                            </button>
                            
                        </form>
                    </div>
                </div>
                
            </div>
        </div>
    );
};

export default Footer;


