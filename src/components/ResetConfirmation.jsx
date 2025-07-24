import React, { useState } from "react";
import "../ResetConfirmation.css";
import { supabase } from "../supabaseClient";

const ResetConfirmation = () => {
  const [email, setEmail] = useState(() => localStorage.getItem("resetEmail") || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResend = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    if (!email) {
      setMessage("Please enter your email.");
      setLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/resetpassword"
      });
      if (error) {
        setMessage("Error: " + error.message);
      } else {
        setMessage("Password reset email resent! Check your inbox.");
      }
    } catch (err) {
      setMessage("Unexpected error. Please try again later.");
    }
    setLoading(false);
  };

  return (
    
    
    <div className="min-h-screen flex flex-col">
      <div className="w-full header bg-white">
        <div className="header">
          <img src={"/logo-icon/logo.png"} className="header-logo" alt="Logo" />
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="container flex flex-col  justify-center">
          <p className="header-notice">Check Your Email</p>
          <p className="text-gray-600 pt-4">
            We've sent a password reset link to your email.
          </p>
          <p className="text-gray-600 pt-4">Please check your inbox and follow the instruction to reset your password.</p>
          <div className="pt-6">
            <span className="text-gray-600">Didn't receive the email? </span>
            <button
              type="button"
              onClick={handleResend}
              className="text-blue-600 underline hover:text-blue-800 px-1"
              disabled={loading || !email}
              style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}
            >
              {loading ? "Resending..." : "Resend Email"}
            </button>
          </div>
          {message && (
            <p className={`text-center pt-4 ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
          )}
          <div className="pt-8 text-center">
            <a href="/signin" className="text-blue-600 underline text-sm ">&lt; Back to Login</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetConfirmation;