
import React from "react";
import gsap from "gsap";
import "../LandingPage.css";
import { useNavigate, useLocation } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Show loader on mount and on browser navigation (back/forward/forward)
  React.useLayoutEffect(() => {
    setLoading(true);
    gsap.set(".gsap-loader", { opacity: 1, display: "flex" });
    const timeout = setTimeout(() => {
      gsap.to(".gsap-loader", { opacity: 0, duration: 0.5, display: "none" });
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timeout);
  }, [location.key]);
  const [isProjectsHovered, setIsProjectsHovered] = React.useState(false);
  const [isFavoritesHovered, setIsFavoritesHovered] = React.useState(false);
  const [isCartHovered, setIsCartHovered] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleLogin = () => {
    setLoading(true);
    gsap.to(".gsap-loader", { opacity: 1, duration: 0.5, display: "flex" });
    setTimeout(() => {
      gsap.to(".gsap-loader", { opacity: 0, duration: 0.5, display: "none" });
      setLoading(false);
      navigate("/signin");
    }, 1200); // Simulate loading, adjust as needed
  };

  const handleSignup = () => {
    setLoading(true);
    gsap.to(".gsap-loader", { opacity: 1, duration: 0.5, display: "flex" });
    setTimeout(() => {
      gsap.to(".gsap-loader", { opacity: 0, duration: 0.5, display: "none" });
      setLoading(false);
      navigate("/signup");
    }, 1200); // Simulate loading, adjust as needed
  };

  return (
    <div className="min-h-screen w-full bg-cover bg-white">
      {/* GSAP Loading Screen */}
      <div
        className="gsap-loader fixed inset-0 z-50 flex items-center justify-center bg-white z-11"
        style={{ opacity: 0, pointerEvents: loading ? "auto" : "none", display: loading ? "flex" : "none" }}
      >
        <div className="flex flex-col items-center">
          <img src={"/Logo & icon/logo.png"} alt="Logo" className="mb-6 " />
          <svg className="animate-spin h-16 w-16 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span className="text-lg font-semibold text-gray-700">Loading...</span>
        </div>
      </div>
      
      {/*Header*/}
      <div className="w-full header-landingpage bg-white border border-b">
        <div className="header-home ">
          <div>
            <img
              src={"/Logo & icon/logo.png"}
              className="header-logo"
              alt="Logo"
            />
          </div>
          <div className="flex items-center justify-center h-15 search-bar-container">
            <form className="w-full flex items-center justify-center">
              <input
                type="text"
                placeholder="What would you like to customize today?"
                className="search-bar"
              />
              <button type="button" className="search-btn flex p-1">
                <img
                  src={"/Logo & icon/search-icon.svg"}
                  alt="Search"
                  className="search-icon mt-1"
                />
              </button>
            </form>
          </div>

          {/*projects button*/}
          <div className="flex  items-center justify-center h-15 header-btn-container ">
             <button
               type="button"
               className="flex items-center p-0 rounded project-btn focus:outline-none focus:ring-0"
               onClick={() => navigate("/shopping")}
               onMouseEnter={() => setIsProjectsHovered(true)}
               onMouseLeave={() => setIsProjectsHovered(false)}
             >
               <img
                 src={isProjectsHovered ? "/Logo & icon/hovered-project-icon.svg" : "/Logo & icon/project-icon.svg"}
                 alt="User Icon"
                 className="btn-icon transition duration-200"
               />
               My Projects
             </button>
          </div>

          {/*favorites button*/}
          <div className="flex  items-center justify-center h-15 header-btn-container">
             <button
               type="button"
               className="flex items-center p-0 rounded project-btn focus:outline-none focus:ring-0"
               onClick={() => navigate("/shopping")}
               onMouseEnter={() => setIsFavoritesHovered(true)}
               onMouseLeave={() => setIsFavoritesHovered(false)}
             >
               <img
                 src={isFavoritesHovered ? "/Logo & icon/favorites-icon-hovered.svg" : "/Logo & icon/favorites-icon.svg"}
                 alt="User Icon"
                 className="btn-icon transition duration-200"
               />
               Favorites
             </button>
          </div>

          {/*cart button*/}
          <div className="flex  items-center justify-center h-15 header-btn-container">
             <button
               type="button"
               className="flex items-center p-0 rounded project-btn focus:outline-none focus:ring-0"
               onClick={() => navigate("/shopping")}
               onMouseEnter={() => setIsCartHovered(true)}
               onMouseLeave={() => setIsCartHovered(false)}
             >
               <img
                 src={isCartHovered ? "/Logo & icon/cart-icon-hovered.svg" : "/Logo & icon/cart-icon.svg"}
                 alt="User Icon"
                 className="btn-icon transition duration-200"
               />
               Cart
             </button>
          </div>

          {/*log in and sign up btn */}
          <div className="flex  items-center justify-center h-15 header-btn-container">
            <button
              onClick={handleLogin}
              className=" px-6 py-2 mr-2 login-btn"
              disabled={loading}
            >
              LOGIN
            </button>
            <button
              onClick={handleSignup}
              className="signup-btn px-2 py-2 "
            >
              SIGN UP
            </button>
          </div>
        </div>
      </div>
      <div className="w-full sub-header justify-center bg-white border border-b flex items-center">
        <div className="subheader-home   w-full flex items-center justify-center">
          <div>
              <p>Deals</p>
          </div>
          <div>
              <p>Apparel</p>
          </div>
          <div>
              <p>Accessories & Documentation</p>
          </div>
          <div>
              <p>Signage & Posters</p>
          </div>
          <div>
              <p>Cards & Stickers</p>
          </div>
          <div>
              <p>Packaging</p>
          </div>
          <div>
              <p>3D Print Services</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center ">
        <img src={"../Images/Hero-Banner.png"}></img>
      </div>

      <div className="flex flex-col items-center justify-center new-arrivals-container mt-10">
        <h1>New Arrivals</h1>
        <div className = "flex flex-row">
          <div className="border border-b mt-10">
            <img src = {"../Images/textured-mugs.png"} className="textured-mugs"></img>
          </div>
          <div className="border border-b  new-arrival-description mt-10 ml-5">
              <h2>Textured Glaze Mugs</h2>
              <p>Subtle, artisan feel. Your design printed on slightly rustic
                  ceramic textures
              </p>
              <p className="text-right mt-9">
                <a href="/signin" className="underline">View more</a>
              </p>
          </div>
          
        </div>
        <div className = "flex flex-row">
          <div className="border border-b  new-arrival-description2 mt-5 ">
              <h2>Textured Glaze Mugs</h2>
              <p>Subtle, artisan feel. Your design printed on slightly rustic
                  ceramic textures
              </p>
              <p className="text-left mt-9">
                <a href="/signin" className="underline">View more</a>
              </p>
          </div>
          <div className="border border-b mt-5 ml-5">
            <img src = {"../Images/caps.png"} className="caps-size"></img>
          </div>


        </div>


      </div>
    </div>
  );
};

export default LandingPage;
