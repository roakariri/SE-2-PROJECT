import React, { useState } from "react";
import gsap from "gsap";
import { Link, useNavigate } from "react-router-dom";
import { UserAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";


const Signup = () => {
  const loaderRef = React.useRef();
  const signUpWithGoogle = async () => {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/Homepage"
        }
      });
    };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
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

  const { signUpNewUser } = UserAuth();
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
  e.preventDefault();
  setError("");
  setConfirmationMessage("");

  if (password !== confirmPassword) {
    setError("Passwords do not match.");
    return;
  }
  if (password.length < 6) {
    setError("Password must be at least 6 characters long.");
    return;
  }
  setLoading(true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: {
        redirectTo: window.location.origin + "/Homepage" // <-- Use your production URL here
      }
    });
    console.log("Signup result:", { data, error });

    if (error) {
      if (error.message && error.message.includes("30 seconds")) {
        setError("For security purposes, you can only request this after 30 seconds. Please wait and try again.");
      } else if (error.message && error.message.toLowerCase().includes("already registered")) {
        setError("This email is already registered. Please use the correct sign-in method or Google sign-in.");
      } else {
        setError(error.message || "An unexpected error occurred. Please try again later.");
      }
      setConfirmationMessage("");
      setLoading(false);
      return;
    }

    // ✨ NEW: Check for duplicate email via identities array
    if (data?.user?.identities?.length === 0) {
      setError("This email is already registered. Please log in or use Google sign-in.");
      setConfirmationMessage("");
      setLoading(false);
      return;
    }

    // Proceed with success messaging for actual new signup
    else if (
      !error &&
      data &&
      data.user &&
      data.user.email === email.toLowerCase()
    ) {
      if (!data.user.confirmed_at && !data.user.last_sign_in_at) {
        setError("");
        setConfirmationMessage("Registration successful! Please check your email to verify your account.");
        setLoading(false);
        return;
      } else {
        setError("This email is already registered. Please use the correct sign-in method or Google sign-in.");
        setConfirmationMessage("");
        setLoading(false);
        return;
      }
    }

    // Fallback
    else {
      setError("Signup failed. Please try again or use another email.");
      setConfirmationMessage("");
      setLoading(false);
    }
  } catch (err) {
    setLoading(false);
    setError("An unexpected error occurred.");
    setConfirmationMessage("");
  }
};

  return (
    <div className="min-h-screen flex flex-col">
      



      <div className="w-full header bg-white">
        <div className="header">
          <img src={"/logo-icon/logo.png"} className="header-logo" alt="Logo" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center mt-6 my-6">
        <div className="container flex flex-col justify-center mt-9">
          <form onSubmit={handleSignUp}>
            <h2 className="header-notice">Sign Up</h2>
            <div className="flex flex-col py-4">
              <p>Email address</p>
              <input
                onChange={(e) => setEmail(e.target.value)}
                className="p-3 mt-2 text-black bg-white border border-gray-500 rounded"
                type="email"
                name="email"
                id="email"
                placeholder="Email"
              />
            </div>
            <div className="flex flex-col">
              <p>Create Password</p>
              <div className="relative">
                <input
                  onChange={(e) => setPassword(e.target.value)}
                  className="p-3 mt-2 text-black bg-white border border-gray-500 rounded w-full pr-10 focus:border-transparent"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  placeholder="Password"
                  value={password}
                />
                <button
                  type="button"
                  className="absolute my-1 p-0 right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  style={{ background: "none", border: "none" }}
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? EyeOffIcon : EyeIcon}
                </button>
              </div>
            </div>
            <div className="flex flex-col py-5">
              <p>Confirm Password</p>
              <div className="relative">
                <input
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="p-3 mt-2 text-black bg-white border border-gray-500 rounded w-full pr-10 focus:border-transparent"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  id="confirmPassword"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                />
                <button
                  type="button"
                  className="absolute my-1 p-0 right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  style={{ background: "none", border: "none" }}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? EyeOffIcon : EyeIcon}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full mt-4 submit-button">
              Sign Up
            </button>
            {error && (
              <p className="text-red-600 text-center pt-4">{error}</p>
            )}
            {!error && confirmationMessage && (
              <div className="text-green-600 text-center pt-4 text-lg font-semibold">{confirmationMessage}</div>
            )}
          </form>
          <div className="flex items-center mt-4">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="mx-4 text-gray-500 font-semibold">OR</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>
          <div className=" text-center">
            <button
              onClick={signUpWithGoogle}
              className="w-full mt-4 google-btn flex items-center justify-center gap-2 py-2"
            >
              <img src={"/logo-icon/google-logo.webp"} alt="Google" className="h-6 w-6 object-contain" />
              <span>Continue with Google</span>
            </button>
          </div>
          <p className="text-center mt-9">
            Already have an account? <Link to="/signin" className="underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
