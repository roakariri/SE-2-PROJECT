import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const Signin = () => {
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
    };
    getSession();
    subscription = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    }).data.subscription;
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

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

  if (!session) {
    return (
      <div className="max-w-md m-auto pt-24">
        <h2 className="font-bold pb-2">Sign In</h2>
        <p>
          Don't have an account yet? <Link to="/signup">Sign up</Link>
        </p>
        <form onSubmit={handleSignIn}>
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
          <div className="flex flex-col py-4">
            <input
              onChange={(e) => setPassword(e.target.value)}
              className="p-3 mt-2"
              type="password"
              placeholder="Password"
              value={password}
              required
            />
          </div>
          <button className="w-full mt-4 bg-blue-500 text-white p-2 rounded">
            Sign In
          </button>
          <div className="pt-2 text-right">
            <button
              type="button"
              className="text-blue-600 underline text-sm"
              onClick={handleForgotPasswordPage}
            >
              Forgot password?
            </button>
          </div>
          {error && <p className="text-red-600 text-center pt-4">{error}</p>}
        </form>
        <div className="pt-6 text-center">
          <button
            onClick={signUpWithGoogle}
            className="bg-gray-800 text-white px-4 py-2 rounded"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center pt-24">
      <h2>Welcome, {session?.user?.email}</h2>
      <button
        onClick={signOut}
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
      >
        Sign out
      </button>
    </div>
  );
};

export default Signin;
