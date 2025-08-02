import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

const HomepageBody = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
    };
    getSession();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="w-full bg-cover bg-white phone:pt-[210px] tablet:pt-[220px] laptop:pt-[165px] landing-page-container z-0">
      {/*Hero Banner*/}
      <div className="flex flex-col items-center justify-center z-5">
        <img src={"/images/hero-banner.png"} className="w-full"></img>
      </div>


      {/*New Arrivals section*/}
      <div className="flex flex-col items-center justify-center new-arrivals-container mt-10">
        <h1>New Arrivals</h1>

        {/*textured mugs*/}
        <div className = "flex flex-col">
          <div className="border border-b mt-10">
            <img src = {"/images/textured-mugs.png"} className="border border-[#171738] w-[332.8px] h-[305px] rounded"></img>
          </div>
          <div className="border border-[#171738]
            rounded
            w-[799px] h-[305px]
            pt-[6vw] px-[5vw] pb-[5vw]
            bg-gradient-to-r from-[#E7E8E9] to-[#FFFFFF]
            mt-10 ml-5
            text-[36px]
            ">
              <h2>Textured Glaze Mugs</h2>
              <p className="text-[24px] italic">Subtle, artisan feel. Your design printed on slightly rustic
                  ceramic textures
              </p>
              <p className="text-right mt-9">
                <a href="/signin" onClick={e => {e.preventDefault(); handleLogin();}} className="underline text-black not-italic text-lg hover:text-black">View more</a>
              </p>
          </div>
          
        </div>
      </div>

      


      












    </div>
  );
};

export default HomepageBody;