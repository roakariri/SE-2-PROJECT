import React, { useState } from "react";
import "../Header.css";
import { useNavigate, useLocation } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();


  // Removed loading state
  const [isProjectsHovered, setIsProjectsHovered] = useState(false);
  const [isFavoritesHovered, setIsFavoritesHovered] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);

  const handleLogin = () => {
    navigate("/signin");
  };

  const handleSignup = () => {
    navigate("/signup");
  };




  return (
    <div className="fixed w-full bg-cover bg-white header-container">


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

            <button onClick={handleLogin} className="login-btn px-6 py-2">
              LOGIN
            </button>
            <button onClick={handleSignup} className="signup-btn px-4 py-2">
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
