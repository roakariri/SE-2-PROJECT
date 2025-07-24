import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../Signin.css";

const Signin = () => {
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
  const [showPassword, setShowPassword] = useState(false);
  // ...existing code...
  // ...existing code...
  const handleForgotPasswordPage = (e) => {
    e.preventDefault();
    navigate("/forgot-password");
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let subscription;
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session) {
        navigate("/Homepage");
      }
    };
    getSession();
    subscription = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        navigate("/Homepage");
      }
    }).data.subscription;
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    } else {
      setError(null);
      navigate("/Homepage");
    }
  };

  const signUpWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
    
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full header bg-white">
        <div className="header">
          <img src={"/logo-icon/logo.png"} className="header-logo" alt="Logo" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center mt-6 my-6">
        <div className="container flex flex-col  justify-center mt-9">
          <h2 className="header-notice">Login</h2>
          
          <form onSubmit={handleSignIn}>
            <div className="flex flex-col py-4">
              <p>Email address</p>
              <input
                onChange={(e) => setEmail(e.target.value)}
                className="p-3 mt-2 text-black bg-white border border-gray-500 rounded"
                type="email"
                placeholder="Email"
                value={email}
                required
              />
            </div>
            <div className="flex flex-col py-4">
              <p>Password</p>
              <div className="relative">
                <input
                  onChange={(e) => setPassword(e.target.value)}
                  className="p-3 mt-2 text-black bg-white border border-gray-500 rounded w-full pr-10 focus:border-transparent"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  required
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
              <div className="pt-2 text-right ">
                <p>
                  <a href="/forgotpassword" className="text-blue-600 underline text-sm ">Forgot your Password?</a>
                </p>
              </div>
            </div>
            
            <button className="w-full mt-4 submit-button">
              Login
            </button>
            
            {error && <p className="text-red-600 text-center pt-4">{error}</p>}
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
          <p className="text-center mt-9 ">
              Don't have an account yet? <Link to="/signup" className="underline">Sign up</Link>
          </p>
        </div>
      </div>

      
    </div>
    );
  }

 


export default Signin;
