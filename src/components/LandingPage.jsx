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
  

 

  return (

    
    <div className="min-h-screen w-full bg-cover bg-white pt-[170px] landing-page-container">
      {/*Hero Banner*/}
      <div className="flex flex-col items-center justify-center z-5">
        <img src={"/images/hero-banner.png"} className="w-full"></img>
      </div>
      
      {/*New Arrivals section*/}
      <div className="flex flex-col items-center justify-center new-arrivals-container mt-10">
        <h1>New Arrivals</h1>

        {/*textured mugs*/}
        <div className = "flex flex-row">
          <div className="border border-b mt-10">
            <img src = {"/images/textured-mugs.png"} className="textured-mugs "></img>
          </div>
          <div className="border border-b  new-arrival-description mt-10 ml-5">
              <h2>Textured Glaze Mugs</h2>
              <p>Subtle, artisan feel. Your design printed on slightly rustic
                  ceramic textures
              </p>
              <p className="text-right mt-9">
                <a href="/signin" onClick={e => {e.preventDefault(); handleLogin();}} className="underline text-black not-italic text-lg hover:text-black">View more</a>
              </p>
          </div>
          
        </div>

        {/*embroidered caps*/}
        <div className = "flex flex-row">
          <div className="border border-b  new-arrival-description2 mt-5 ">
              <h2>Embroidered Slogan Caps</h2>
              <p>Subtle, artisan feel. Your design printed on slightly rustic
                  ceramic textures
              </p>
              <p className="text-left mt-9">
                <a href="/signin" onClick={e => {e.preventDefault(); handleLogin();}} className="underline text-black not-italic text-lg hover:text-black">View more</a>
              </p>
          </div>
          <div className="border border-b mt-5 ml-5">
            <img src = {"/images/caps.png"} className="caps-size"></img>
          </div>
        </div>
      </div>

      {/*Popular picks section*/}
      <div className="flex flex-col items-center justify-center popular-picks-container mt-10">
        <h1>Popular Picks</h1>
        <div className="flex flex-row mt-10 popular-picks-inside-container">

          {/*busniness cards*/}
          <div className="flex flex-col business-cards-container">
            <div>
                <img src = {"/images/business-cards.png"} className="business-cards"></img>
            </div>
            <div className="text-center business-cards-name">
                Business Cards
            </div>
          </div>

          {/*posters*/}
          <div className="flex flex-col posters-container">
            <div>
                <img src = {"/images/posters.png"} className="posters"></img>
            </div>
            <div className="text-center posters-name">
                Posters
            </div>
          </div>


          {/*stickers*/}
          <div className="flex flex-col stickers-container">
            <div>
                <img src = {"/images/stickers.png"} className="stickers"></img>
            </div>
            <div className="text-center stickers-name">
                Stickers
            </div>
          </div>
        </div>
      </div>


      {/*Suggested for you section*/}
      <div className="flex flex-col items-center justify-center suggestedforyou-container mt-10">
        <h1>Suggested for you</h1>
        <div className="flex flex-row mt-10  suggestedforyou-inside-container">
            
            {/*ID CARDS*/}
            <div className="id-cards-container flex-col">
                <div className="label">
                    <p>ID CARDS</p>

                </div>
                <div className="customize-btn-container">
                  <button type="button" className=" flex p-1 customize-btn" onClick={() => navigate("/customize")}>
                    Customize Yours!
                  </button>
                </div>
            </div>

            {/*BANNERS*/}
            <div className="banners-container flex-col">
                <div className="label">
                    <p>BANNERS</p>
                </div>
                <div className="customize-btn-container">
                  <button type="button" className=" flex p-1 customize-btn">
                    Customize Yours!
                  </button>
                </div>
            </div>

            {/*PINS*/}
            <div className="pins-container flex-col">
                <div className="label">
                    <p>PINS</p>
                </div>
                <div className="customize-btn-container">
                  <button type="button" className=" flex p-1 customize-btn">
                    Customize Yours!
                  </button>
                </div>
            </div>

            {/*ACRYLIC STANDEES*/}
            <div className="acrylic-standees-container flex-col">
                <div className="label-twowords">
                    <p>ACRYLIC</p>
                    <p>STANDEES</p>

                </div>
                <div className="customize-btn-container">
                  <button type="button" className=" flex p-1 customize-btn">
                    Customize Yours!
                  </button>
                </div>
            </div>
        </div>
      </div>



    </div>
  );
};

export default LandingPage;
