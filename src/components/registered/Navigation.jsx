import React, { useState } from "react";

import { useNavigate, useLocation } from "react-router-dom";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();


  // Removed loading state
  const [isProjectsHovered, setIsProjectsHovered] = useState(false);
  const [isFavoritesHovered, setIsFavoritesHovered] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const [isProfileHovered, setIsProfileHovered] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const subNavLinks = [
    "Deals",
    "Apparel",
    "Accessories & Documentation",
    "Signage & Posters",
    "Cards & Stickers",
    "Packaging",
    "3D Print Services"
  ];

  return (
    <div className="fixed w-full bg-cover bg-white z-50">
      {/* Header */}
      <div className="w-full h-15  bg-white border ">
        <div className="p-1 phone:grid phone:grid-cols-1 phone:items-center phone:justify-center phone:align-center tablet:grid tablet:justify-center tablet:items-center laptop:flex bigscreen:flex border justify-center items-center  laptop:gap-6">
          {/* Logo */}
          <div className="phone:w-50 phone:h-10 border tablet:h-15 laptop:h-20 bigscreen:h-20 bigscreen:mr-[1px]  ">
            <img 
              src="/logo-icon/logo.png" 
              className="object-contain w-[120px] h-[32px] phone:w-[100px] phone:h-[28px] tablet:w-[140px] tablet:h-[40px] laptop:w-[220px] laptop:h-[80px] bigscreen:w-[220px] bigscreen:h-[80px] mx-auto" 
              alt="Logo" 
            />
          </div>

          {/* Search Bar */}
          <div className="phone:mt-4  flex justify-center items-center border bigscreen:ml-[100px] laptop:mt-0">
            <form className="flex items-center mx-auto w-full phone:max-w-md md:max-w-lg lg:max-w-xl laptop:max-w-2xl border ">
              <input
                type="text"
                placeholder="What would you like to customize today?"
                className="bg-white text-black caret-black border border-black rounded-l-[5px] rounded-r-none w-[400px] min-w-0 phone:h-[34.56px] tablet:h-[41.48px] laptop:h-[2.7vw] big-laptop:h-[41.48px] px-[19px] py-[19px] focus:outline-none text-xs sm:text-sm md:text-base"
              />
              <button type="button" className="bg-[#3B5B92] h-[400px] flex items-center justify-center ml-0 rounded-r-md rounded-l-none phone:h-[40px] tablet:h-[41.48px] big-laptop:h-[41.48px]  p-0 min-w-0" style={{ width: '3.5vw', minWidth: '34.56px', maxWidth: '41.48px' }}>
                <img 
                  src="/logo-icon/search-icon.svg" 
                  alt="Search" 
                  className=" h-5 w-5 phone:h-6 phone:w-6 tablet:h-7 tablet:w-7 laptop:h-8 laptop:w-8 mt-1 phone:mt-0" 
                />
              </button>
            </form>
          </div>

            {/* Header Buttons */}
            <div className="flex items-center gap-2 phone:gap-[45px] laptop:gap-4 justify-center phone:mt-1 laptop:mt-0     border ">
                <button
                className="project-btn flex items-center text-xs laptop:text-xs"
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
                        className=" transition duration-200 w-5 h-5 laptop:w-6 laptop:h-6"
                    />
                <span className="hidden semi-bigscreen:inline ml-2">My Projects</span>
                </button>

                <button
                className="project-btn flex items-center text-xs laptop:text-xs"
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
                    className="transition duration-200 w-6 h-6 laptop:w-5 laptop:h-5"
                />
                <span className="hidden semi-bigscreen:inline ml-2">Favorites</span>
                </button>

                <button
                className="project-btn flex items-center text-xs laptop:text-xs"
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
                    className=" transition duration-200 w-6 h-6 laptop:w-5 laptop:h-5"
                />
                <span className="hidden  semi-bigscreen:inline ml-2">Cart</span>
                </button>

                <button
                  className="project-btn flex items-center text-xs laptop:text-xs"
                  onClick={() => navigate("/profile")}
                  onMouseEnter={() => setIsProfileHovered(true)}
                  onMouseLeave={() => setIsProfileHovered(false)}
                >
                  <img
                    src={
                    isProfileHovered
                        ? "/logo-icon/profile-icon-hovered.svg"
                        : "/logo-icon/profile-icon.svg"
                    }
                    alt="Profile"
                    className=" transition duration-200 w-6 h-6 laptop:w-5 laptop:h-5"
                  />
                <span className="hidden semi-bigscreen:inline ml-2">Profile</span>
                </button>


            </div>
        </div>
      </div>

      {/* Sub Nav Hamburger for phone/tablet */}
      <div className="w-full bg-white border-b big-laptop:hidden">
        <div className="flex items-center justify-between px-5 py-2">
          <span className="font-bold text-base text-[#3B5B92] ">Menu</span>
          <button
            className="focus:outline-none"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Toggle subnav menu"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        {isMenuOpen && (
          <div className="flex flex-col items-center bg-white border-t py-2 animate-fade-in">
            {subNavLinks.map((label) => (
              <p key={label} className="text-[#3B5B92] font-semibold cursor-pointer hover:text-blue-600 transition px-4 py-2 w-full text-center font-dm-sans border-b last:border-b-0">
                {label}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Sub Nav for laptop and up */}
      <div className="w-full bg-white border-b phone:hidden laptop:hidden big-laptop:block">
        <div className="subheader-home flex flex-nowrap mt-2 justify-center items-center laptop:justify-around p-8 gap-4 ">
          {subNavLinks.map((label) => (
            <p key={label} className="text-[#3B5B92] font-semibold cursor-pointer hover:text-blue-600 transition px-2 flex-shrink-0 min-w-max leading-tight flex items-center font-dm-sans">{label}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Navigation;
