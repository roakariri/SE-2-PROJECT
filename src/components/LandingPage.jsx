
import React from "react";
import "../LandingPage.css";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
  const [isProjectsHovered, setIsProjectsHovered] = React.useState(false);
  const [isFavoritesHovered, setIsFavoritesHovered] = React.useState(false);
  const [isCartHovered, setIsCartHovered] = React.useState(false);
  return (
    <div className="min-h-screen">
      <div className="w-full header bg-white">
        <div className="header-home">
          <div>
            <img src={"/Logo & icon/logo.png"} className="header-logo" alt="Logo" />
          </div>
          <div className="border border-black flex items-center justify-center h-15 search-bar-container">
            <form className="w-full flex items-center justify-center">
              <input type="text" placeholder="What would you like to customize today?" className="search-bar" />
              <button type="submit" className="search-btn">
                <img src={"/Logo & icon/search-icon.svg"} alt="Search" className="search-icon" />
              </button>
            </form>
          </div>

          {/*projects button*/}
          <div className="flex  items-center justify-center h-15 shopping-bag-container">
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
                 className="project-bag-icon transition duration-200"
               />
               My Projects
             </button>
          </div>

          {/*favorites button*/}
          <div className="flex  items-center justify-center h-15 shopping-bag-container">
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
                 className="project-bag-icon transition duration-200"
               />
               Favorites
             </button>
          </div>

          {/*cart button*/}
          <div className="flex  items-center justify-center h-15 shopping-bag-container">
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
                 className="project-bag-icon transition duration-200"
               />
               Cart
             </button>
          </div>
          <div className="flex gap-4">
          <button
            onClick={() => navigate("/signin")}
            className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700"
          >
            Sign Up
          </button>
        </div>



        </div>

        <div>
            

        </div>
      </div>
      <div className="flex flex-col items-center justify-center pt-24">
        <h1 className="text-4xl text-gray-700 font-bold mb-4">Welcome!</h1>
        <p className="text-lg text-gray-700 mb-8">Sign in or create an account to continue.</p>
        
      </div>
    </div>
  );
};

export default LandingPage;
