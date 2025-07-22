
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";


const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Password updated successfully! You can now log in.");
        setTimeout(() => navigate("/signin"), 2000);
      }
    } catch (err) {
      setError("Unexpected error. Please try again.");
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
      
      <div className="flex-1 flex flex-col items-center justify-center mt-0">
        <div className="container flex flex-col  justify-center">
            <h2 className="header-notice mb-4">Create a New Password</h2>
            <form onSubmit={handleReset}>
            <div className="flex flex-col py-2">
                <p>New Password</p>
                <input
                type="password"
                id="newPassword"
                name="newPassword"
                className="p-3 mt-2 text-black bg-white border border-gray-500 rounded"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                />
            </div>
            <div className="flex flex-col py-2">
                <p>Confirm New Password</p>
                <input
                type="password"
                id="confirmNewPassword"
                name="confirmNewPassword"
                className="p-3 mt-2 text-black bg-white border border-gray-500 rounded"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                />
            </div>
            <button type="submit" disabled={loading} className="w-full mt-4 submit-button">
                {loading ? "Resetting..." : "Reset Password"}
            </button>
            {error && <p className="text-red-600 text-center pt-4">{error}</p>}
            {success && <p className="text-green-600 text-center pt-4">{success}</p>}
            </form>
        </div>
      </div>
      
    </div>
  );
};

export default ResetPassword;
