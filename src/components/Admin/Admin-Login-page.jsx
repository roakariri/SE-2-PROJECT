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
  
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  
  // helper to update last_activity for an admin by email
  const updateLastActivity = async (adminEmail) => {
    if (!adminEmail) return;
    try {
      await supabase
        .from('admin_accounts')
        .update({ last_activity: new Date().toISOString() })
        .eq('email', adminEmail);
    } catch (err) {
      console.error('Failed to update last_activity for', adminEmail, err);
    }
  };
  // Removed loading state

  useEffect(() => {
    let subscription;
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session) {
        const provider = data.session.user?.app_metadata?.provider;
        const userEmail = data.session.user?.email;
        // update last_activity for admin if this session belongs to an admin
        updateLastActivity(userEmail);

        // If there's already a session, assume user shouldn't see the login
        // page — redirect into the admin area. Use replace so the login page
        // doesn't remain in history (prevents Back returning to login).
        try {
          navigate('/Admin', { replace: true });
        } catch (err) {
          console.warn('Navigation to /Admin failed', err);
        }
      }
    };

    // If a previous admin login flag exists in localStorage, redirect
    // immediately to the admin area (replace history to block Back).
    try {
      const already = localStorage.getItem('adminLoggedIn');
      if (already === 'true') {
        navigate('/Admin', { replace: true });
        return;
      }
    } catch (err) { /* ignore */ }

    getSession();

    subscription = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const provider = session.user?.app_metadata?.provider;
        const userEmail = session.user?.email;
        // update last_activity for admin if this session belongs to an admin
        updateLastActivity(userEmail);
        try {
          navigate('/Admin', { replace: true });
        } catch (err) {
          console.warn('Navigation to /Admin failed', err);
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
      // mark admin as logged in and persist email information so the
      // navigation/footer can display it
      localStorage.setItem('adminLoggedIn', 'true');
      try {
        localStorage.setItem('adminEmail', String(email));
        localStorage.setItem('admin_logged_in_email', String(email));
        // also store a JSON object under adminUser for compatibility
        localStorage.setItem('adminUser', JSON.stringify({ email: String(email) }));
      } catch (err) {
        // ignore storage errors (e.g. quota), nav will simply not show email
        console.warn('Could not persist admin email to localStorage', err);
      }
        // notify any mounted admin UI in the same tab that an admin just logged in
        try {
          window.dispatchEvent(new CustomEvent('admin-login', { detail: { email: String(email) } }));
        } catch (err) { /* noop */ }
  // update last_activity timestamp for this admin
  await updateLastActivity(email);
  // navigate to admin and replace history so Back won't return to login
  navigate("/Admin", { replace: true });
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
