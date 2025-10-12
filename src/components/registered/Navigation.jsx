import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";

const SUPABASE_PROJECT_REF = "abcd1234";

const Navigation = () => {

  const dropdownHideTimer = React.useRef(null);
 
  const showProfileDropdown = () => {
    if (dropdownHideTimer.current) {
      clearTimeout(dropdownHideTimer.current);
      dropdownHideTimer.current = null;
    }
    setIsProfileHovered(true);
  };

  const hideProfileDropdown = () => {
    if (dropdownHideTimer.current) {
      clearTimeout(dropdownHideTimer.current);
    }
    dropdownHideTimer.current = setTimeout(() => {
      setIsProfileHovered(false);
    }, 120); 
  };
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signOut } = UserAuth();

 
  const [isProjectsHovered, setIsProjectsHovered] = useState(false);
  const [isFavoritesHovered, setIsFavoritesHovered] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const [isProfileHovered, setIsProfileHovered] = useState(false);

  // Logic ng search bar 
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

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
  
    const subNavRoutes = {
      "Deals": "/deals",
      "Apparel": "/apparel",
      "Accessories & Decorations": "/accessories-decorations",
      "Signage & Posters": "/signage-posters",
      "Cards & Stickers": "/cards-stickers",
      "Packaging": "/packaging",
      "3D Print Services": "/3d-prints-services"
    };

  // Profile photo logic
  const DEFAULT_AVATAR = "/logo-icon/profile-icon.svg";
  // Try to get cached profile photo from localStorage
  const getCachedProfilePhoto = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('profilePhotoUrl') || DEFAULT_AVATAR;
    }
    return DEFAULT_AVATAR;
  };
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(getCachedProfilePhoto());
  // Only fetch profile photo when session.user.id changes
  React.useEffect(() => {
    let isMounted = true;
    async function fetchProfilePhoto() {
      if (!session?.user?.id) {
        if (isMounted) {
          setProfilePhotoUrl(DEFAULT_AVATAR);
          if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', DEFAULT_AVATAR);
        }
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', session.user.id)
        .single();
      if (!isMounted) return;
      if (error || !data || !data.avatar_url) {
        setProfilePhotoUrl(DEFAULT_AVATAR);
        if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', DEFAULT_AVATAR);
      } else {
        let publicUrl = data.avatar_url;
        if (!publicUrl.startsWith('http')) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.avatar_url);
          publicUrl = urlData?.publicUrl || DEFAULT_AVATAR;
        }
        setProfilePhotoUrl(publicUrl);
        if (typeof window !== 'undefined') localStorage.setItem('profilePhotoUrl', publicUrl);
      }
    }
    fetchProfilePhoto();
    return () => { isMounted = false; };
  }, [session?.user?.id]);

  return (
    <div className="fixed w-full bg-cover bg-white z-50 ">
      {/* Header */}
      <div className="w-full h-15 bg-white border border-b border-b-[#171738]">
        <div className="p-1 phone:grid phone:grid-cols-1 phone:items-center phone:justify-center phone:align-center tablet:grid tablet:justify-center tablet:items-center laptop:flex bigscreen:flex justify-center items-center  laptop:gap-6">
          {/* Logo */}
          <div className="phone:w-full phone:h-10 tablet:h-15 laptop:h-20 bigscreen:h-20 bigscreen:mr-[0px] flex phone:flex-row phone:items-center phone:justify-between align-start laptop:w-[210px]">
            <img
              src="/logo-icon/logo.png"
              className="object-contain w-[120px] h-[32px] phone:w-[100px] phone:h-[28px] tablet:w-[140px] tablet:h-[40px] laptop:w-[220px] laptop:h-[80px] bigscreen:w-[220px] bigscreen:h-[80px] phone:ml-0 cursor-pointer laptop:ml-[0px] biggest:ml-[-300px]"
              alt="Logo"
              onClick={() => navigate("/HomePage")}
            />

          </div>
        

          {/* Search Bar */}
          <div className="phone:mt-4  flex justify-center items-center bigscreen:ml-[100px] laptop:mt-0">
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
            <div className="flex items-center gap-2 phone:gap-[45px] laptop:gap-1 justify-center phone:mt-1 laptop:mt-0 biggest:mr-[-300px]">
                <button
                className="flex items-center focus:outline-none focus:ring-0 font-bold font-dm-sans bg-white text-black text-[16px] hover:text-[#c4c4c4]"
                onClick={() => navigate("/mockup-tool")}
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
                <span className="hidden semi-bigscreen:inline ml-2 font-dm-sans">Mockup Tool</span>
                </button>

                <button
                className="flex items-center focus:outline-none focus:ring-0 font-bold font-dm-sans bg-white text-black text-[16px] hover:text-[#c4c4c4]"
                onClick={() => navigate("/favorites")}
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
                className="flex items-center focus:outline-none focus:ring-0 font-bold font-dm-sans bg-white text-black text-[16px] hover:text-[#c4c4c4]"
                onClick={() => navigate("/cart")}
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

                <button
                  type="button"
                  className="flex items-center semi-bigscreen:ml-2 focus:outline-none focus:ring-0 font-bold font-dm-sans bg-white text-black text-[16px] hover:text-[#c4c4c4]"
                  onClick={() => navigate('/account?tab=orders')}
                >
                  <img
                    src={profilePhotoUrl || DEFAULT_AVATAR}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover bg-gray-300"
                    onError={e => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                  />
                  <span className="hidden semi-bigscreen:inline ml-2 text-black font-dm-sans text-[16px] hover:text-[#c4c4c4]">
                    {(session?.user?.user_metadata?.display_name || session?.user?.user_metadata?.full_name || session?.user?.email || "User").split(" ")[0]}
                  </span>
                </button>


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
      <div className="w-full bg-white border-b border-b-[#171738] phone:hidden laptop:hidden big-laptop:block">
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

export default Navigation;
