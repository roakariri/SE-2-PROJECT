import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { resolveProductImageUrl } from "./productImageResolver";

const MTPageToteBag = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fromCart, setFromCart] = useState(!!location.state?.fromCart);
  const [productImageUrl, setProductImageUrl] = useState(null);

  useEffect(() => {
    if (location.state?.fromCart) setFromCart(true);
  }, [location.state]);

  useEffect(() => {
    try {
      const segments = window.location?.pathname?.split('/').filter(Boolean) || [];
      const last = segments[segments.length - 1] || '';
      const slugBase = last.endsWith('-mockuptool') ? last.replace(/-mockuptool$/, '') : last;
      (async () => {
        const { url } = await resolveProductImageUrl(supabase, slugBase);
        setProductImageUrl(url);
      })();
    } catch {
      setProductImageUrl(null);
    }
  }, []);

  return (
    <div className="fixed w-full h-full z-50" style={{ background: 'linear-gradient(270deg, #ECECEC 10%, #D4D4D4 50%)' }}>
      {/* Header */}
      <div className="w-full h-15 bg-white border border-b border-b-[#171738]">
        <div className="w-full p-4">
          <div className="w-full flex items-center justify-between">
            <div className="phone:w-full phone:h-10 tablet:h-15 laptop:h-20 bigscreen:h-20 flex justify-start items-center w-full px-4">
              <img
                src="/logo-icon/logo.png"
                className="object-contain w-[120px] h-[32px] phone:w-[100px] phone:h-[28px] tablet:w-[140px] tablet:h-[40px] laptop:w-[220px] laptop:h-[80px] bigscreen:w-[220px] bigscreen:h-[80px] cursor-pointer"
                alt="Logo"
                onClick={() => navigate("/homepage")}
              />
            </div>
            <div className="flex items-center pr-4">
              <button aria-label="Open cart" onClick={() => navigate('/account?tab=orders')} className="p-2 rounded-md  w-[40px] h-[40px] flex items-center justify-center focus:outline-none bg-white hover:bg-gray-200">
                <img src="/logo-icon/shopping-bag.svg" alt="Project icon" className="w-[40px] h-[40px] object-contain bg-transparent" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content placeholder */}
      <div className="max-w-[1200px] mx-auto flex items-center justify-center h-[520px] p-6">
        <div className="text-gray-600">Tote Bag Mockup Tool (coming soon)</div>
      </div>

      {/* Footer */}
      <div className="fixed left-0 right-0 bottom-0 bg-white border-t shadow-inner">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <img src={productImageUrl || '/logo-icon/logo.png'} alt="product" className="w-14 h-14 object-cover rounded bg-transparent" onError={(e)=>{ e.currentTarget.src = '/logo-icon/logo.png'; }} />
            <div>
              <div className="font-semibold text-gray-800">Custom Tote Bag</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-[#ef7d66] text-black font-semibold rounded">{fromCart ? 'UPDATE CART' : 'ADD TO CART'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MTPageToteBag;
