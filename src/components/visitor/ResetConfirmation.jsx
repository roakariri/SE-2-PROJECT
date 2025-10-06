import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../ResetConfirmation.css";
import { supabase } from "../../supabaseClient";

const ResetConfirmation = () => {
    const [email] = useState(() => localStorage.getItem("resetEmail") || "");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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
        // Match the redirect path defined in router.jsx to avoid 404
        redirectTo: window.location.origin + "/reset-password?type=recovery"
        });
            if (error) {
                setMessage("Error: " + error.message);
            } else {
                setMessage("Password reset email resent! Check your inbox.");
            }
        } catch {
            setMessage("Unexpected error. Please try again later.");
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
                    <p className="text-[30px] font-bold text-black font-dm-sans">Check Your Email</p>
                    <p className="text-gray-600 pt-4 font-dm-sans">
                        We&apos;ve sent a password reset link to your email.
                    </p>
                    <p className="text-gray-600 pt-4 font-dm-sans">Please check your inbox and follow the instruction to reset your password.</p>
                    <div className="pt-6">
                        <p className="text-gray-600 font-dm-sans">Didn&apos;t receive the email? {email ? (
                            <button type="button" onClick={handleResend} className="text-blue-600 underline hover:text-blue-800 px-1 font-dm-sans" 
                                disabled={loading} style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}>
                                {loading ? "Resending..." : "Resend Email"}
                            </button>
                        ) : (
                            <span className="text-sm text-gray-500 font-dm-sans">No email stored — go back to login and request a reset.</span>
                        )}</p>
                    </div>
                    {message && (
                        <p className={`text-center pt-4 ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'} font-dm-sans`}>{message}</p>
                    )}
                    <div className="pt-8 text-center">
                        <p className="font-dm-sans">Back to <Link to="/signin" className="underline font-dm-sans">Login</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetConfirmation;