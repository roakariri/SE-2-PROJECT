import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

const Homepage = () => {
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
    navigate("/signin");
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full border-b header">
        <div className="header border">
          <img src={"/Logo & icon/logo.png"} className="header-logo" alt="Logo" />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center pt-24">
        <h1 className="text-4xl text-gray-700 font-bold mb-4">
          Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : user?.email ? `, ${user.email}` : ""}!
        </h1>
        <p className="text-lg text-gray-700 mb-8">You have successfully signed in.</p>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Homepage;