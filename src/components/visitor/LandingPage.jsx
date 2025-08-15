import React from "react";
import gsap from "gsap";
import "../../LandingPage.css";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    <div className="min-h-screen w-full bg-white phone:pt-[212px] tablet:pt-[205px] laptop:pt-[166px] relative z-0">
      {/* Hero Banner */}
      <div className="flex flex-col items-center justify-center z-5">
        <img src="/images/hero-banner.jpeg" className="w-full object-cover cursor-pointer" onClick={() => navigate('/3d-prints-services')}/>

      </div>

      {/* New Arrivals */}
      <div className="flex flex-col items-center justify-center mt-10 text-[#171738] font-bold font-dm-sans phone:text-[10px] tablet:text-[14px] laptop:text-[16px] laptop:items-center laptop:mx-auto laptop:max-w-[1200px]">
        <h1 className="phone:text-[24px] tablet:text-[28px] laptop:text-[32px] mb-6">New Arrivals</h1>
        {/* Textured mugs */}
        <div className="flex flex-col laptop:flex-row w-full items-center laptop:items-start laptop:justify-center">
          <div className=" mt-10 rounded-[4px]">
            <img src="/images/textured-mugs.png" className="phone:w-[220px] tablet:w-[300px] laptop:w-[clamp(250px,26vw,400px)] phone:h-[180px] tablet:h-[220px] laptop:h-[clamp(200px,24vw,305px)] rounded-[4px]" />
          </div>
          <div className="border mt-10 laptop:ml-5 rounded-[4px] phone:w-full tablet:w-[90vw] laptop:w-[799px] phone:h-auto laptop:h-[305px] p-[5vw] pt-[6vw] bg-gradient-to-r from-[#E7E8E9] to-white flex flex-col justify-center">
            <h2 className="phone:text-[22px] tablet:text-[28px] laptop:text-[36px] font-bold">Textured Glaze Mugs</h2>
            <p className="phone:text-[16px] tablet:text-[20px] laptop:text-[24px] italic text-[#171738]">Subtle, artisan feel. Your design printed on slightly rustic ceramic textures</p>
            <p className="text-right mt-9">
                <a
                    href={supabase.auth.getSession() ? "/products" : "/signin"}
                    onClick={async e => {
                        e.preventDefault();
                        const { data: { session } } = await supabase.auth.getSession();
                        navigate(session ? "/products" : "/signin");
                    }}
                    className="underline text-black not-italic phone:text-base tablet:text-lg laptop:text-lg hover:text-black"
                >
                    View more
                </a>
            </p>
          </div>
        </div>
        {/* Embroidered caps */}
        <div className="flex flex-col laptop:flex-row w-full items-center laptop:items-start laptop:justify-center">
          <div className="border mt-5 laptop:w-[833px] phone:w-full tablet:w-[90vw] laptop:h-[305px] p-[5vw] pt-[6vw] bg-gradient-to-r from-[#E7E8E9] to-white rounded-[4px] flex flex-col justify-center">
            <h2 className="phone:text-[22px] tablet:text-[28px] laptop:text-[36px] font-bold">Embroidered Slogan Caps</h2>
            <p className="phone:text-[16px] tablet:text-[20px] laptop:text-[24px] italic text-[#171738]">Subtle, artisan feel. Your design printed on slightly rustic ceramic textures</p>
            <p className="text-left mt-9">
                <a
                    href="/signin"
                    onClick={e => {
                        e.preventDefault();
                        navigate("/signin");
                    }}
                    className="underline text-black not-italic phone:text-base tablet:text-lg laptop:text-lg hover:text-black"
                >
                    View more
                </a>
            </p>
          </div>
          <div className="border mt-5 laptop:ml-5 rounded-[4px]">
            <img src="/images/caps.png" className="phone:w-[220px] tablet:w-[300px] laptop:w-[clamp(250px,24vw,400px)] phone:h-[180px] tablet:h-[220px] laptop:h-[clamp(200px,24vw,305px)] rounded-[4px]" />
          </div>
        </div>
      </div>

      {/* Popular Picks */}
      <div className="flex flex-col items-center justify-center mt-10 text-[#171738] font-bold font-dm-sans phone:text-[10px] tablet:text-[14px] laptop:text-[16px]">
        <h1 className="phone:text-[24px] tablet:text-[28px] laptop:text-[32px] mb-6">Popular Picks</h1>
        {/* Carousel for phone */}
        <div className="tablet:block phone:block laptop:hidden w-full">
          <div className="relative w-full overflow-x-auto items-center flex justify-center">
            <div className="flex flex-row gap-5 w-max px-4">
              {/* Business Cards */}
              <div className="flex flex-col border rounded-[4px] w-[220px] h-[300px] flex-shrink-0">
                <img src="/images/business-cards.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
                <div className="text-center text-[#171738] font-dm-sans text-[18px] p-5">Business Cards</div>
              </div>
              {/* Posters */}
              <div className="flex flex-col border rounded-[4px] w-[220px] h-[300px] flex-shrink-0">
                <img src="/images/posters.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
                <div className="text-center text-[#171738] font-dm-sans text-[18px] p-5">Posters</div>
              </div>
              {/* Stickers */}
              <div className="flex flex-col border rounded-[4px] w-[220px] h-[300px] flex-shrink-0">
                <img src="/images/stickers.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
                <div className="text-center text-[#171738] font-dm-sans text-[18px] p-5">Stickers</div>
              </div>
            </div>
          </div>
        </div>
        {/* Grid for tablet/laptop */}
        <div className="hidden tablet:hidden laptop:flex flex-col tablet:flex-row laptop:flex-row mt-10 gap-[5vw] w-full items-center justify-center">
          {/* Business Cards */}
          <a
            className="flex flex-col border rounded-[4px] tablet:w-[300px] laptop:w-[350px] tablet:h-[350px] laptop:h-[425px]"
            href="/cards-stickers"
            onClick={e => {
              e.preventDefault();
              navigate("/cards-stickers");
            }}
          >
            <img src="/images/business-cards.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
            <div className="text-center text-[#171738] font-dm-sans tablet:text-[24px] laptop:text-[30px] p-5 laptop:h-[30px] ">Business Cards</div>
          </a>
          {/* Posters */}
          <a className="flex flex-col border rounded-[4px] tablet:w-[300px] laptop:w-[350px] tablet:h-[350px] laptop:h-[425px]"
             href="/signage-posters"
             onClick={e => {
                 e.preventDefault();
                 navigate("/signage-posters");
             }}
          >
            <img src="/images/posters.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
            <div className="text-center text-[#171738] font-dm-sans tablet:text-[24px] laptop:text-[30px] p-5">Posters</div>
          </a>
          {/* Stickers */}
          <a className="flex flex-col border rounded-[4px] tablet:w-[300px] laptop:w-[350px] tablet:h-[350px] laptop:h-[425px]"
           href="/cards-stickers"
           onClick={e => {
               e.preventDefault();
               navigate("/cards-stickers");
           }}
          >
            <img src="/images/stickers.png" className="w-full h-[80%] border-b border-[#171738] rounded-t-[4px] object-cover" />
            <div className="text-center text-[#171738] font-dm-sans tablet:text-[24px] laptop:text-[30px] p-5">Stickers</div>
          </a>
        </div>
      </div>

      {/* Suggested for you */}
      <div className="flex flex-col items-center justify-center mt-10 text-[#171738] font-bold font-dm-sans phone:text-[10px] tablet:text-[14px] laptop:text-[16px]">
        <h1 className="phone:text-[24px] tablet:text-[28px] laptop:text-[32px] mb-6">Suggested for you</h1>
        {/* Carousel for phone and tablet */}
        <div className="w-full phone:block tablet:block bigscreen:hidden laptop:block">
          <div className="relative w-full overflow-x-auto">
            <div className="flex flex-row gap-5 w-max px-4">
              {/* ID Cards */}
              <div className="flex flex-col relative border rounded-[4px] bg-cover bg-center text-center items-center justify-center text-white border-white w-[220px] h-[220px] tablet:w-[260px] tablet:h-[300px] flex-shrink-0" style={{ backgroundImage: 'url("/images/id-cards.png")' }}>
                <div className="absolute mt-[12vw] w-[80vw] tablet:w-[15vw] tablet:mt-[2vw] left-1/2 transform -translate-x-1/2 z-10 p-0">
                  <p className="text-[28px] tablet:text-[36px] font-bold text-white font-dm-sans drop-shadow-lg mb-8 tablet:mb-10 phone:mb-8 tablet:text-center tablet:w-full">ID CARDS</p>
                </div>
                <div className="flex justify-center items-center mt-[28vw] tablet:mt-[18vw] w-full tablet:w-[210px] z-10">
                  <button type="button" className="flex p-1 h-[50px] tablet:h-[50px] w-[120px] tablet:w-[140px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold text-[15px] tablet:text-[17px] font-dm-sans tablet:mx-auto" onClick={() => navigate('/customize')}>
                    Customize Yours!
                  </button>
                </div>
              </div>
              {/* Banners */}
              <div className="flex flex-col relative border rounded-[4px] bg-cover bg-center text-center items-center justify-center text-white border-white w-[220px] h-[220px] tablet:w-[260px] tablet:h-[300px] flex-shrink-0" style={{ backgroundImage: 'url("/images/banners1.png")' }}>
                <div className="absolute mt-[12vw] w-[80vw] tablet:mt-[2vw] tablet:w-[20vw] left-1/2 transform -translate-x-1/2 z-10 p-0">
                  <p className="text-[28px] tablet:text-[36px] font-bold text-white font-dm-sans drop-shadow-lg mb-8 tablet:mb-10 phone:mb-8 tablet:text-center tablet:w-full">BANNERS</p>
                </div>
                <div className="flex justify-center items-center mt-[28vw] tablet:mt-[18vw] w-full tablet:w-[210px] z-10">
                  <button type="button" className="flex p-1 h-[50px] tablet:h-[50px] w-[120px] tablet:w-[140px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold text-[15px] tablet:text-[17px] font-dm-sans tablet:mx-auto">
                    Customize Yours!
                  </button>
                </div>
              </div>
              {/* Pins */}
              <div className="flex flex-col relative border rounded-[4px] bg-cover bg-center text-center items-center justify-center text-white border-white w-[220px] h-[220px] tablet:w-[260px] tablet:h-[300px] flex-shrink-0" style={{ backgroundImage: 'url("/images/pins.png")' }}>
                <div className="absolute mt-[12vw] w-[80vw] tablet:w-[15vw] tablet:mt-[2vw] left-1/2 transform -translate-x-1/2 z-10 p-0">
                  <p className="text-[28px] tablet:text-[36px] font-bold text-white font-dm-sans drop-shadow-lg mb-8 tablet:mb-10 phone:mb-8 tablet:text-center tablet:w-full">PINS</p>
                </div>
                <div className="flex justify-center items-center mt-[28vw] tablet:mt-[18vw] w-full tablet:w-[210px] z-10">
                  <button type="button" className="flex p-1 h-[50px] tablet:h-[50px] w-[120px] tablet:w-[140px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold text-[15px] tablet:text-[17px] font-dm-sans tablet:mx-auto">
                    Customize Yours!
                  </button>
                </div>
              </div>
              {/* Acrylic Standees */}
              <div className="flex flex-col relative border rounded-[4px] bg-cover bg-center text-center items-center justify-center text-white border-white mb-[3vw] w-[220px] h-[220px] tablet:w-[260px] tablet:h-[300px] flex-shrink-0" style={{ backgroundImage: 'url("/images/acrylic-standees.png")' }}>
                <div className="absolute mt-[2vw] tablet:mt-[5vw] tablet:mt-[1vw] w-[80vw] tablet:w-[25vw] left-1/2 transform -translate-x-1/2 z-10 p-0 leading-none">
                  <p className="text-[28px] tablet:text-[36px] font-bold text-white font-dm-sans drop-shadow-lg mb-4 tablet:mb-6 phone:mb-4 tablet:text-center tablet:w-full">ACRYLIC</p>
                  <p className="text-[28px] phone:mt-[-20px] tablet:text-[36px] font-bold text-white font-dm-sans drop-shadow-lg mb-4 tablet:mb-6 phone:mb-4 tablet:text-center tablet:w-full">STANDEES</p>
                </div>
                <div className="flex justify-center items-center mt-[28vw] tablet:mt-[18vw] w-full tablet:w-[210px] z-10">
                  <button type="button" className="flex p-1 h-[50px] tablet:h-[50px] w-[120px] tablet:w-[140px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold text-[15px] tablet:text-[17px] font-dm-sans tablet:mx-auto">
                    Customize Yours!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Grid for bigscreen */}
        <div className="hidden bigscreen:flex flex-row mt-10 gap-[3vw] w-full items-center justify-center mb-10">
          {/* ID Cards */}
          <div className="flex flex-col justify-between items-center border rounded-[4px] bg-cover bg-center text-center text-white border-white laptop:w-[290px] laptop:h-[360px] bigscreen:w-[290px] bigscreen:h-[360px] relative" style={{ backgroundImage: 'url("/images/id-cards.png")' }}>
            <div className="flex flex-1 items-center justify-center w-full h-full">
              <p className="laptop:text-[46px] font-bold text-white font-dm-sans drop-shadow-lg bigscreen:text-[46px] bigscreen:text-center">ID CARDS</p>
            </div>
            <div className="flex justify-center items-end w-full pb-6">
              <button type="button" className="flex p-1 laptop:h-[36px] laptop:w-[190px] bigscreen:h-[36px] bigscreen:w-[190px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold laptop:text-[17px] bigscreen:text-[17px] font-dm-sans" onClick={() => navigate('/customize')}>
                Customize Yours!
              </button>
            </div>
          </div>
          {/* Banners */}
          <div className="flex flex-col justify-between items-center border rounded-[4px] bg-cover bg-center text-center text-white border-white laptop:w-[290px] laptop:h-[360px] bigscreen:w-[290px] bigscreen:h-[360px] relative" style={{ backgroundImage: 'url("/images/banners1.png")' }}>
            <div className="flex flex-1 items-center justify-center w-full h-full">
              <p className="laptop:text-[46px] font-bold text-white font-dm-sans drop-shadow-lg bigscreen:text-[46px] bigscreen:text-center">BANNERS</p>
            </div>
            <div className="flex justify-center items-end w-full pb-6">
              <button type="button" className="flex p-1 laptop:h-[36px] laptop:w-[190px] bigscreen:h-[36px] bigscreen:w-[190px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold laptop:text-[17px] bigscreen:text-[17px] font-dm-sans">
                Customize Yours!
              </button>
            </div>
          </div>
          {/* Pins */}
          <div className="flex flex-col justify-between items-center border rounded-[4px] bg-cover bg-center text-center text-white border-white laptop:w-[290px] laptop:h-[360px] bigscreen:w-[290px] bigscreen:h-[360px] relative" style={{ backgroundImage: 'url("/images/pins.png")' }}>
            <div className="flex flex-1 items-center justify-center w-full h-full">
              <p className="laptop:text-[46px] font-bold text-white font-dm-sans drop-shadow-lg bigscreen:text-[46px] bigscreen:text-center">PINS</p>
            </div>
            <div className="flex justify-center items-end w-full pb-6">
              <button type="button" className="flex p-1 laptop:h-[36px] laptop:w-[190px] bigscreen:h-[36px] bigscreen:w-[190px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold laptop:text-[17px] bigscreen:text-[17px] font-dm-sans">
                Customize Yours!
              </button>
            </div>
          </div>
          {/* Acrylic Standees */}
          <div className="flex flex-col justify-between items-center border rounded-[4px] bg-cover bg-center text-center text-white border-white laptop:w-[290px] laptop:h-[360px] bigscreen:w-[290px] bigscreen:h-[360px] relative" style={{ backgroundImage: 'url("/images/acrylic-standees.png")' }}>
            <div className="flex flex-1 flex-col items-center justify-center w-full h-full">
              <p className="laptop:text-[46px] font-bold text-white font-dm-sans drop-shadow-lg bigscreen:text-[46px] bigscreen:text-center">ACRYLIC</p>
              <p className="laptop:text-[46px] font-bold text-white font-dm-sans drop-shadow-lg bigscreen:text-[46px] bigscreen:text-center">STANDEES</p>
            </div>
            <div className="flex justify-center items-end w-full pb-6">
              <button type="button" className="flex p-1 laptop:h-[36px] laptop:w-[190px] bigscreen:h-[36px] bigscreen:w-[190px] rounded-[20px] text-white justify-center items-center bg-white/20 border border-white font-bold laptop:text-[17px] bigscreen:text-[17px] font-dm-sans">
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
