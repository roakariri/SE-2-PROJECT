
import React from "react";
import "../LandingPage.css";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
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
        </div>

        <div>
            

        </div>
      </div>
      <div className="flex flex-col items-center justify-center pt-24">
        <h1 className="text-4xl text-gray-700 font-bold mb-4">Welcome!</h1>
        <p className="text-lg text-gray-700 mb-8">Sign in or create an account to continue.</p>
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
    </div>
  );
};

export default LandingPage;
