import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import "../Header.css";
import { useNavigate, useLocation } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const loaderRef = useRef();

  const [loading, setLoading] = useState(true);
  const [isProjectsHovered, setIsProjectsHovered] = useState(false);
  const [isFavoritesHovered, setIsFavoritesHovered] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);

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

  useEffect(() => {
    if (loading) {
      gsap.to(loaderRef.current, { opacity: 1, duration: 0.6 });
      setTimeout(() => setLoading(false), 1800); // Simulate loading
    } else {
      gsap.to(loaderRef.current, { opacity: 0, duration: 0.6 });
    }
  }, [loading]);


  return (
    <div className="fixed w-full bg-cover bg-white header-container">
      {/* GSAP Loading Screen */}
      <div
        ref={loaderRef}
        className="gsap-loader fixed inset-0 z-50 flex items-center justify-center bg-white"
        style={{
          pointerEvents: loading ? "auto" : "none",
          display: loading ? "flex" : "none"
        }}
      >
        <div className="flex flex-col items-center">
          <img src="/logo-icon/logo.png" alt="Logo" className="mb-6" />
          <svg
            className="animate-spin h-16 w-16 text-blue-600 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-lg font-semibold text-gray-700">Loading...</span>
        </div>
      </div>

      {/* Header */}
      <div className="w-full header-landingpage bg-white">
        <div className="header-home flex flex-row items-center justify-between">
          <img src="/logo-icon/logo.png" className="header-logo" alt="Logo" />

          <form className="search-bar-container flex items-center">
            <input
              type="text"
              placeholder="What would you like to customize today?"
              className="search-bar"
            />
            <button type="button" className="search-btn flex p-1">
              <img src="/logo-icon/search-icon.svg" alt="Search" className="search-icon mt-1" />
            </button>
          </form>

          <div className="header-btn-container flex items-center gap-4">
            <button
              className="project-btn flex items-center"
              onClick={() => navigate("/shopping")}
              onMouseEnter={() => setIsProjectsHovered(true)}
              onMouseLeave={() => setIsProjectsHovered(false)}
            >
              <img
                src={
                  isProjectsHovered
                    ? "/logo-icon/hovered-project-icon.svg"
                    : "/logo-icon/project-icon.svg"
                }
                alt="Projects"
                className="btn-icon transition duration-200"
              />
              My Projects
            </button>

            <button
              className="project-btn flex items-center"
              onClick={() => navigate("/shopping")}
              onMouseEnter={() => setIsFavoritesHovered(true)}
              onMouseLeave={() => setIsFavoritesHovered(false)}
            >
              <img
                src={
                  isFavoritesHovered
                    ? "/logo-icon/favorites-icon-hovered.svg"
                    : "/logo-icon/favorites-icon.svg"
                }
                alt="Favorites"
                className="btn-icon transition duration-200"
              />
              Favorites
            </button>

            <button
              className="project-btn flex items-center"
              onClick={() => navigate("/shopping")}
              onMouseEnter={() => setIsCartHovered(true)}
              onMouseLeave={() => setIsCartHovered(false)}
            >
              <img
                src={
                  isCartHovered
                    ? "/logo-icon/cart-icon-hovered.svg"
                    : "/logo-icon/cart-icon.svg"
                }
                alt="Cart"
                className="btn-icon transition duration-200"
              />
              Cart
            </button>

            <button onClick={handleLogin} className="login-btn px-6 py-2" disabled={loading}>
              LOGIN
            </button>
            <button onClick={handleSignup} className="signup-btn px-4 py-2" disabled={loading}>
              SIGN UP
            </button>
          </div>
        </div>
      </div>

      {/* Sub Nav */}
      <div className="sub-header w-full bg-white border-b">
        <div className="subheader-home flex justify-around py-3">
          {[
            "Deals",
            "Apparel",
            "Accessories & Documentation",
            "Signage & Posters",
            "Cards & Stickers",
            "Packaging",
            "3D Print Services"
          ].map((label) => (
            <p key={label} className="cursor-pointer hover:text-blue-600 transition">{label}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Header;
