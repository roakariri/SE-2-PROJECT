import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";


const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Helper: sign out then navigate (best-effort)
  const signOutAndNavigate = async (path = '/') => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore errors
    }
    navigate(path);
  };

 
  // SVG icons for show/hide password
  const EyeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  const EyeOffIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-5.12M6.53 6.53C4.06 8.36 2.25 12 2.25 12s3.75 7.5 9.75 7.5c2.13 0 4.07-.57 5.72-1.53M17.47 17.47C19.94 15.64 21.75 12 21.75 12s-3.75-7.5-9.75-7.5c-1.61 0-3.13.31-4.53.87" />
    </svg>
  );

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
      // Ensure there's a session. If not, try to set one from tokens present in the URL (hash or query)
      const { data } = await supabase.auth.getSession();
      let session = data ? data.session : null;
      let createdSession = false;

      if (!session) {
        // Tokens from Supabase reset links are often in the URL hash, but check query too
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        const access_token = searchParams.get('access_token') || hashParams.get('access_token') || searchParams.get('accessToken') || hashParams.get('accessToken');
        const refresh_token = searchParams.get('refresh_token') || hashParams.get('refresh_token') || searchParams.get('refreshToken') || hashParams.get('refreshToken');

        if (access_token) {
          const { error: setSessionError } = await supabase.auth.setSession({ access_token, refresh_token });
          if (setSessionError) {
            setError('Unable to set session from reset link. Please request a new password reset email.');
            setLoading(false);
            return;
          }
          createdSession = true;
          const { data: newData } = await supabase.auth.getSession();
          session = newData ? newData.session : null;
        } else {
          setError('No active session or reset token found. Please click the password reset link sent to your email.');
          setLoading(false);
          return;
        }
      }

      // At this point we should have a session and can update the user password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Password updated successfully! You can now log in.');
        // sign out to clear the temporary session (only if there was one)
        await supabase.auth.signOut();
        setTimeout(() => navigate('/reset-successful'), 2000);
      }
    } catch (err) {
      setError('Unexpected error. Please try again.');
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
                            onClick={() => signOutAndNavigate("/")}
                            />
                        </div>

                        {/* Right icon (home button) */}
                        <div className="flex items-center pr-4">
              <button
                aria-label="Open home"
                onClick={() => signOutAndNavigate('/')}
                className="p-2 rounded-md  w-[40px] h-[40px] flex items-center justify-center focus:outline-none bg-white hover:bg-gray-200"
              >
                                <img src="/logo-icon/home-icon.svg" alt="Home icon" className="w-[40px] h-[40px] object-contain bg-transparent" />
                            </button>
                        </div>
                    </div>
                </div>

      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center mt-0">
        <div className="container flex flex-col  justify-center">
            <h2 className="text-[30px] font-bold text-black mb-4 font-dm-sans">Create a New Password</h2>
            <form onSubmit={handleReset}>
            <div className="flex flex-col py-2">
              <p className="font-dm-sans">New Password <span className="text-gray-400 text-[12px] italic font-dm-sans">(At least 6 characters.)</span></p>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  className="p-3 mt-2 text-black bg-white border border-gray-500 rounded w-full pr-10"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); if (error) setError(null); if (success) setSuccess(null); }}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  className="absolute my-1 p-0 right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  style={{ background: "none", border: "none" }}
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? EyeOffIcon : EyeIcon}
                </button>
              </div>
            </div>
            <div className="flex flex-col py-2">
              <p className="font-dm-sans">Confirm New Password</p>
              <div className="relative">
                <input
                  type={showConfirmNewPassword ? "text" : "password"}
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  className="p-3 mt-2 text-black bg-white border border-gray-500 rounded w-full pr-10"
                  value={confirmNewPassword}
                  onChange={(e) => { setConfirmNewPassword(e.target.value); if (error) setError(null); if (success) setSuccess(null); }}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  className="absolute my-1 p-0 right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  style={{ background: "none", border: "none" }}
                  onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmNewPassword ? EyeOffIcon : EyeIcon}
                </button>
              </div>
              {error && <p className="text-red-600 text-sm mt-1 font-dm-sans">{error}</p>}
            </div>
      {/* disable submit until passwords match and meet length */}
      <button type="submit" className="w-full mt-4 submit-button font-dm-sans" disabled={loading}>
        {loading ? "Resetting..." : "Reset Password"}
      </button>
      {success && <p className="text-green-600 text-center pt-4 font-dm-sans">{success}</p>}
            </form>
        </div>
      </div>
      
    </div>
  );
};

export default ResetPassword;

