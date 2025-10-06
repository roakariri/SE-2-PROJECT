import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "../../Signin.css";


const Login = () => {

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
  
  const handleForgotPasswordPage = (e) => {
    e.preventDefault();
    navigate("/forgot-password");
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  // Removed loading state

  useEffect(() => {
    let subscription;
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session) {
        const provider = data.session.user?.app_metadata?.provider;

        if (provider === "google") {
          console.log("Logged in with Google");
          navigate("/Homepage");
        } else if (provider === "email") {
          console.log("Logged in with email/password");
          navigate("/Homepage");
        } else {
          console.warn("Unknown provider:", provider);
        }
      }
    };

    getSession();

    subscription = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const provider = session.user?.app_metadata?.provider;
        if (provider === "google") {
          console.log("Logged in with Google");
          navigate("/Homepage");
        } else if (provider === "email") {
          console.log("Logged in with email/password");
          navigate("/Homepage");
        } else {
          console.warn("Unknown provider:", provider);
        }
      }
    }).data.subscription;

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Check admin_accounts table for email and password
      const { data: adminData, error: adminError } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('email', email)
        .single();

      console.log('Admin data:', adminData);
      console.log('Admin error:', adminError);

      if (adminError || !adminData) {
        setError('Invalid email or password');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Check if password field exists and how it's stored
      console.log('Password field check:', adminData.password, adminData.password_hash);

      // Try different password field names
      let storedPassword = adminData.password_hash || adminData.password;
      if (!storedPassword) {
        setError('Password field not found in database');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Compare password as plain text
      const isPasswordValid = password === storedPassword;

      console.log('Password valid:', isPasswordValid);

      if (!isPasswordValid) {
        setError('Invalid email or password');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Successful login
      localStorage.setItem('adminLoggedIn', 'true');
      navigate("/Admin");
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
      setTimeout(() => setError(null), 3000);
    }
  };

  const signUpWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/Homepage"
      }
    });
  };





  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#2B4269] to-[#4F6B99]">



      

   
      <div className="flex-1 flex flex-col items-center justify-center mt-[20px] my-6">
         <img src="/logo-icon/logo-admin.png" className="w-[239px]"></img>
        <div className="bg-white laptop:w-[40%] phone:h-[100%] p-[30px] phone:w-[100%] flex flex-col  justify-center mt-[-50px]">
          <h2 className="text-[30px] font-bold text-black font-dm-sans">Admin Login</h2>
          
          <form onSubmit={handleSignIn}>
            <div className="flex flex-col py-4">
              <p className="font-dm-sans">Email address</p>
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
              <p className="font-dm-sans">Password</p>
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
                  <a href="" className="text-blue-600 underline text-sm font-dm-sans">Forgot your Password?</a>
                </p>
              </div>
            </div>
            
            <button type="submit" className="w-full text-white rounded rounded-xl font-dm-sans font-semibold bg-[#2B4269] mt-4 ] font-dm-sans">
              Login
            </button>
            
            {error && <p className="text-red-600 text-center pt-4 font-dm-sans">{error}</p>}
          </form>

          



      
        </div>
      </div>

      
    </div>
    );
  }

 


export default Login;
