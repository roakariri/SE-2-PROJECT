import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "../../ForgotPassword.css"; 

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
      // Ensure we don't send any active session with this request.
      // If the user is currently signed-in in this browser, sign them out
      // before requesting a password reset so the reset link is issued
      // in an unauthenticated context.
      try { await supabase.auth.signOut(); } catch {}

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Ensure the reset link redirects to the ResetPassword route defined in router.jsx
      redirectTo: window.location.origin + "/reset-password?type=recovery"
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
       <div className="w-full h-15 bg-white border border-b border-b-[#171738]">
                <div className="w-full p-4">
                    <div className="w-full flex items-center justify-between">
                        {/* Logo */}
                        <div className="phone:w-full phone:h-10 tablet:h-15 laptop:h-20 bigscreen:h-20 flex justify-start items-center w-full px-4">
                            <img
                            src="/logo-icon/logo.png"
                            className="object-contain w-[120px] h-[32px] phone:w-[100px] phone:h-[28px] tablet:w-[140px] tablet:h-[40px] laptop:w-[220px] laptop:h-[80px] bigscreen:w-[220px] bigscreen:h-[80px] cursor-pointer"
                            alt="Logo"
                            onClick={() => navigate("/HomePage")}
                            />
                        </div>

                        {/* Right icon (home button) */}
                        <div className="flex items-center pr-4">
                            <button
                                aria-label="Open home"
                                onClick={() => navigate('/HomePage')}
                                className="p-2 rounded-md  w-[40px] h-[40px] flex items-center justify-center focus:outline-none bg-white hover:bg-gray-200"
                            >
                                <img src="/logo-icon/home-icon.svg" alt="Home icon" className="w-[40px] h-[40px] object-contain bg-transparent" />
                            </button>
                        </div>
                    </div>
                </div>

      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="container flex flex-col  justify-center">
            <h2 className="text-[30px] font-bold text-black font-dm-sans">Forgot Password</h2>
            
            <form onSubmit={handleReset}>
                <div className="flex flex-col py-4">
                <p className="text-gray-600 font-dm-sans">Enter your email address</p>
                <input
                    onChange={(e) => setEmail(e.target.value)}
                    className="p-3 mt-2 bg-white border border-gray-300 rounded text-black"
                    type="email"
                    placeholder="Email"
                    value={email}
                    required
                />
                </div>
                <button className="w-full mt-2 submit-button font-dm-sans" disabled={loading}>
                {loading ? "Sending..." : "Reset my Password"}
                </button>
                {message && (
                <p className={`text-center pt-4 ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'} font-dm-sans`}>{message}</p>
                )}
                <div className="pt-8 text-center">
                   <p className="font-dm-sans">Back to <Link to="/signin" className="underline font-dm-sans">Login</Link></p>
                </div>
            </form>
        </div>
      </div>
      
      
      
    </div>
  );
};

export default ForgotPassword;
