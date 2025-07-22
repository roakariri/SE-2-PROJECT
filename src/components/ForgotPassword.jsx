import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

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
    <div className="max-w-md m-auto pt-24">
      <h2 className="font-bold pb-2">Reset Password</h2>
      <form onSubmit={handleReset}>
        <div className="flex flex-col py-4">
          <input
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 mt-2"
            type="email"
            placeholder="Email"
            value={email}
            required
          />
        </div>
        <button className="w-full mt-4 bg-blue-500 text-white p-2 rounded" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </button>
        {message && (
          <p className={`text-center pt-4 ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
        )}
      </form>
    </div>
  );
};

export default ForgotPassword;
