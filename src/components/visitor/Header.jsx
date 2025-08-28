import React, { useState } from "react";
import "../../Header.css";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";

// Set your actual Supabase project ref here (e.g. abcd1234)
const SUPABASE_PROJECT_REF = "abcd1234";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();


  // Removed loading state
  const [isProjectsHovered, setIsProjectsHovered] = useState(false);
  const [isFavoritesHovered, setIsFavoritesHovered] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleLogin = () => {
    navigate("/signin");
  };

  const handleSignup = () => {
    navigate("/signup");
  };

  // Fetch suggestions as user types
  React.useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }
    let active = true;
    setSearchLoading(true);
    setSearchError("");
    supabase
      .from("products")
      .select("*")
      .ilike("name", `%${searchTerm}%`)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setSearchError(error.message);
          setSearchResults([]);
        } else {
          setSearchResults(data);
          setShowSuggestions(true);
        }
        setSearchLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSearchError("Unexpected error. Please try again.");
        setSearchResults([]);
        setSearchLoading(false);
      });
    return () => { active = false; };
  }, [searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchTerm.trim() !== "") {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
    const subNavLinks = [
    "Deals",
    "Apparel",
    "Accessories & Decorations",
    "Signage & Posters",
    "Cards & Stickers",
    "Packaging",
    "3D Print Services"
  ];

  // Map subNavLinks to their corresponding route paths
  const subNavRoutes = {
    "Deals": "/deals",
    "Apparel": "/apparel",
    "Accessories & Decorations": "/accessories-decorations",
    "Signage & Posters": "/signage-posters",
    "Cards & Stickers": "/cards-stickers",
    "Packaging": "/packaging",
    "3D Print Services": "/3d-prints-services"
  };



  return (
    <div className="fixed w-full bg-cover bg-white z-50">
      {/* Header */}
      <div className="w-full h-15 bg-white border border-b border-b-[#171738]">
        <div className="p-1 phone:grid phone:grid-cols-1 phone:items-center phone:justify-center phone:align-center tablet:grid tablet:justify-center tablet:items-center laptop:flex bigscreen:flex justify-center items-center  laptop:gap-5">
          {/* Logo */}
          <div className="phone:w-full phone:h-10 tablet:h-15 laptop:h-20 bigscreen:h-20 bigscreen:mr-[0px] flex phone:flex-row phone:items-center phone:justify-between align-start laptop:w-[210px]">
            <img
              src="/logo-icon/logo.png"
              className="object-contain w-[120px] h-[32px] phone:w-[100px] phone:h-[28px] tablet:w-[140px] tablet:h-[40px] laptop:w-[220px] laptop:h-[80px] bigscreen:w-[220px] bigscreen:h-[80px] phone:ml-0 cursor-pointer laptop:ml-[0px] biggest:ml-[-300px]"
              alt="Logo"
              onClick={() => navigate("/")}
            />

            {/* Auth Buttons for phone only */}
            <div className="laptop:hidden phone:flex items-center gap-2 ml-2">
              <button
                onClick={handleLogin}
                className="px-3 py-1 text-white border-[#171738] rounded-sm font-semibold bg-[#2B4269] hover:bg-[#ffbfa6] transition text-xs"
              >
                LOGIN
              </button>
              <button
                onClick={handleSignup}
                className="px-2 py-1 text-[#171738] border-[#171738] bg-white rounded-sm font-semibold hover:bg-[#c4c4c4] transition text-xs"
              >
                SIGN UP
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="phone:mt-4  flex flex-col justify-center items-center bigscreen:ml-[20px] laptop:mt-0">
            <form className="flex items-center mx-auto w-full phone:max-w-md md:max-w-lg lg:max-w-xl laptop:max-w-2xl" onSubmit={handleSearch}>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="What would you like to customize today?"
                className="bg-white text-black caret-black border border-black rounded-l-[5px] rounded-r-none w-[400px] min-w-0 phone:h-[34.56px] tablet:h-[41.48px] laptop:h-[2.7vw] big-laptop:h-[41.48px] px-[19px] py-[19px] focus:outline-none text-xs sm:text-sm md:text-base"
              />
              <button type="submit" className="bg-[#3B5B92] h-[400px] flex items-center justify-center ml-0 rounded-r-md rounded-l-none phone:h-[40px] tablet:h-[41.48px] big-laptop:h-[41.48px]  p-0 min-w-0" style={{ width: '3.5vw', minWidth: '34.56px', maxWidth: '41.48px' }}>
                <img 
                  src="/logo-icon/search-icon.svg" 
                  alt="Search" 
                  className=" h-5 w-5 phone:h-6 phone:w-6 tablet:h-7 tablet:w-7 laptop:h-8 laptop:w-8 mt-1 phone:mt-0" 
                />
              </button>
            </form>
            {/* Search Results */}
            {searchLoading && <div className="mt-2 text-xs text-gray-500"></div>}
            {searchError && <div className="mt-2 text-xs text-red-500">{searchError}</div>}
          </div>

            {/* Header Buttons */}
            <div className="flex items-center  phone:gap-[45px] laptop:gap-1 justify-center phone:mt-1 laptop:mt-0 biggest:mr-[-300px]">
                <button
                className="flex items-center font-bold font-dm-sans bg-white text-black text-[16px] hover:text-[#c4c4c4]"
                onClick={() => navigate("/signin")}
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
                        className=" transition duration-200 w-5 h-5 laptop:w-5 laptop:h-5"
                    />
                <span className="hidden semi-bigscreen:inline ml-2 font-dm-sans">My Projects</span>
                </button>

                <button
                className="flex items-center font-bold font-dm-sans bg-white text-black text-[17px] hover:text-[#c4c4c4]"
                onClick={() => navigate("/signin")}
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
                <span className="hidden semi-bigscreen:inline ml-2 font-dm-sans">Favorites</span>
                </button>

                <button
                className="flex items-center font-bold font-dm-sans bg-white text-black text-[18px] hover:text-[#c4c4c4]"
                onClick={() => navigate("/signin")}
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
                <span className="hidden  semi-bigscreen:inline ml-2 font-dm-sans">Cart</span>
              
                </button>
              {/* Auth Buttons */}
              <div className="flex items-center gap-2 phone:hidden laptop:flex">
                <button
                  onClick={handleLogin}
                  className="px-6 py-2 text-white border-[#171738] rounded-sm font-semibold bg-[#2B4269] hover:bg-blue-950 transition mr-1"
                >
                  LOGIN
                </button>
                <button
                  onClick={handleSignup}
                  className="px-4 py-2 text-[#171738] border-[#171738] bg-white rounded-sm font-semibold hover:bg-[#c4c4c4] transition"
                >
                  SIGN UP
                </button>
              </div>
            </div>
        </div>
      </div>

      {/* Sub Nav Hamburger for phone/tablet */}
      <div className="w-full bg-white text-bold border-b border-b-[#171738] big-laptop:hidden">
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
            {subNavLinks.map((label) => {
              const isActive = location.pathname === subNavRoutes[label];
              return (
                <p
                  key={label}
                  className={`font-semibold cursor-pointer transition px-4 py-2 w-full text-center font-dm-sans border-b last:border-b-0 ${isActive ? 'bg-[#3B5B92] text-white' : 'text-[#3B5B92] hover:text-blue-600'}`}
                  onClick={() => navigate(subNavRoutes[label])}
                >
                  {label}
                </p>
              );
            })}
          </div>
        )}
      </div>

      {/* Sub Nav for laptop and up */}
      <div className="w-full bg-white border-b border-b-[#171738] phone:hidden laptop:hidden big-laptop:block border">
        <div className="subheader-home flex flex-nowrap mt-2 justify-center items-center laptop:justify-around p-8 gap-4 ">
          {subNavLinks.map((label) => {
            const isActive = location.pathname === subNavRoutes[label];
            return (
              <p
                key={label}
                className={`font-bold cursor-pointer transition px-2 flex-shrink-0 min-w-max leading-tight flex items-center font-dm-sans ${isActive ? 'text-gray' : 'text-[#3B5B92] hover:text-blue-600'}`}
                onClick={() => navigate(subNavRoutes[label])}
              >
                {label}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Header;
