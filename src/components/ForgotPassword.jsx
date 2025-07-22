import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../ForgotPassword.css"; 

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    if (!email) {
      setMessage("Please enter your email.");
      setLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password"
      });
      if (error) {
        setMessage("Error: " + error.message);
        console.error("Supabase reset error:", error);
      } else {
        localStorage.setItem("resetEmail", email);
        navigate("/reset-confirmation");
      }
    } catch (err) {
      setMessage("Unexpected error. Please try again later.");
      console.error("Unexpected error:", err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full header bg-white">
        <div className="header">
          <img src={"/Logo & icon/logo.png"} className="header-logo" alt="Logo" />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="container flex flex-col  justify-center">
            <h2 className="header-notice">Forgot Password</h2>
            
            <form onSubmit={handleReset}>
                <div className="flex flex-col py-4">
                <p className="text-gray-600">Enter your email address or username</p>
                <input
                    onChange={(e) => setEmail(e.target.value)}
                    className="p-3 mt-2 bg-white border border-gray-300 rounded text-black"
                    type="email"
                    placeholder="Email"
                    value={email}
                    required
                />
                </div>
                <button className="w-full mt-2 submit-button" disabled={loading}>
                {loading ? "Sending..." : "Reset my Password"}
                </button>
                {message && (
                <p className={`text-center pt-4 ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
                )}
                <div className="pt-8 text-center">
                    <a href="/signin" className="text-blue-600 underline text-sm ">&lt; Back to Login</a>
                </div>
            </form>
        </div>
      </div>
      
      
      
    </div>
  );
};

export default ForgotPassword;
