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
    navigate("/");
  };

  return (
    <div className="min-h-screen ">
      <div className="w-full header bg-white">
        <div className="header">
          <img src={"/logo-icon/logo.png"} className="header-logo" alt="Logo" />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center pt-24">
        <h1 className="text-4xl text-white font-bold mb-4">
          Welcome to Homepage{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : user?.email ? `, ${user.email}` : ""}!
        </h1>
        <p className="text-lg text-white mb-8">You have successfully signed in.</p>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600"
        >
          Log Out
        </button>

        <p className="text-lg text-white mt-8">Homepage is still under construction.</p>
      </div>
    </div>
  );
};

export default Homepage;