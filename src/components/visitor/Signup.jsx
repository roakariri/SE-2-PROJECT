import React, { useState } from "react";

import { Link, useNavigate } from "react-router-dom";
import { UserAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";


const Signup = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
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
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
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

  // Live validation: first/last name should not contain digits
  const handleFirstNameChange = (e) => {
    const v = e.target.value;
    // enforce max length 32
    if (v.length > 32) {
      setFirstName(v.slice(0, 32));
      setFirstNameError("First name cannot exceed 32 characters.");
      return;
    }
    // First name must be a single word (no spaces)
    if (String(v).trim().includes(' ')) {
      setFirstName(v);
      setFirstNameError('Choose only one of your first names.');
      return;
    }
    setFirstName(v);
    // validate name rules (no digits, allowed punctuation limits)
    const err = validateName(v, 'First');
    if (err) setFirstNameError(err);
    else if (firstNameError) setFirstNameError('');
  };

  const handleLastNameChange = (e) => {
    const v = e.target.value;
    // enforce max length 32
    if (v.length > 32) {
      setLastName(v.slice(0, 32));
      setLastNameError("Last name cannot exceed 32 characters.");
      return;
    }
    // Last name may contain at most two words
    const words = String(v).trim().split(/\s+/).filter(Boolean);
    if (words.length > 2) {
      setLastName(v);
      setLastNameError('Last name may contain at most two words (e.g., "De La").');
      return;
    }
    setLastName(v);
    const err = validateName(v, 'Last');
    if (err) setLastNameError(err);
    else if (lastNameError) setLastNameError('');
  };

  // validate name helper
  // rules: allow letters, spaces, hyphen, apostrophe; at least 2 letters; max 2 special chars (- and '); no consecutive special characters (including spaces)
  const validateName = (raw, label = 'Name') => {
    const s = String(raw || '').trim();
    if (s.length === 0) return '';
    // disallow digits
    if (/\d/.test(s)) return `${label} name cannot contain numbers.`;
    // allowed characters only
    if (!/^[A-Za-z '\-]+$/.test(s)) return `${label} contains invalid characters.`;
    // minimum length of letters (at least 2 letters somewhere)
    const lettersOnly = (s.match(/[A-Za-z]/g) || []).length;
    if (lettersOnly < 2) return `It must contain at least 2 letters.`;
    // count special chars (hyphen and apostrophe)
    const specialCount = (s.match(/[\-']/g) || []).length;
    if (specialCount > 2) return `${label} can contain at most 2 special characters (hyphen/apostrophe).`;
    // no consecutive special characters or consecutive spaces or mix
    if (/[ '\-]{2,}/.test(s)) return `${label} cannot contain consecutive special characters or spaces.`;
    return '';
  };

  // Live validation for email local-part length (6-30 chars before @)
  const handleEmailChange = (e) => {
    const v = e.target.value;
    setEmail(v);
    // determine local part (text before @). If no @ yet, whole value is local part
    const atIndex = v.indexOf('@');
    const local = atIndex === -1 ? v : v.slice(0, atIndex);
    if (local.length > 0 && local.length < 6) {
      setEmailError('Email must have 6 to 30 characters before the @ symbol.');
    } else if (local.length > 30) {
      setEmailError('Email must have 6 to 30 characters before the @ symbol.');
    } else {
      if (emailError) setEmailError('');
    }
  };

  // Live validation for password fields: min length and match
  const handlePasswordChange = (e) => {
    const v = e.target.value;
    setPassword(v);
    // minimum length 6
    if (v.length > 0 && v.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    // if confirm already filled, check match
    if (confirmPassword && v !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (passwordError) setPasswordError('');
  };

  const handleConfirmPasswordChange = (e) => {
    const v = e.target.value;
    setConfirmPassword(v);
    if (password && v !== password) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (v.length > 0 && v.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (passwordError) setPasswordError('');
  };

  const handleSignUp = async (e) => {
  e.preventDefault();
  setError("");
  setConfirmationMessage("");

  // Validate first and last name: alphabets only, minimum 2 chars each
  setFirstNameError("");
  setLastNameError("");
  // enforce length limits
  if ((firstName || '').length > 32) {
    setFirstNameError('First name cannot exceed 32 characters.');
    return;
  }
  if ((lastName || '').length > 32) {
    setLastNameError('Last name cannot exceed 32 characters.');
    return;
  }
  // validate names with helper
  const firstErr = validateName(firstName, 'First');
  if (firstErr) { setFirstNameError(firstErr); return; }
  // First name must be a single word
  if (String(firstName || '').trim().includes(' ')) {
    setFirstNameError('First name must be a single word (no spaces).');
    return;
  }
  const lastTrim = String(lastName || '').trim();
  if (lastTrim) {
    const lastErr = validateName(lastTrim, 'Last');
    if (lastErr) { setLastNameError(lastErr); return; }
    // Last name max 2 words
    const lnWords = lastTrim.split(/\s+/).filter(Boolean);
    if (lnWords.length > 2) { setLastNameError('Last name may contain at most two words (e.g., "De La").'); return; }
  }

  // Validate email local-part length: min 6, max 30 characters before '@'
  setEmailError("");
  const trimmedEmail = String(email || "").trim();
  const atIndex = trimmedEmail.indexOf("@");
  if (atIndex <= 0) {
    setEmailError("Invalid email format.");
    return;
  }
  const localPart = trimmedEmail.slice(0, atIndex);
  if (localPart.length < 6 || localPart.length > 30) {
    setEmailError("Email must have 6 to 30 characters before the @ symbol.");
    return;
  }

  // Password validation: show below confirm password field
  setPasswordError("");
  if (password !== confirmPassword) {
    setPasswordError("Passwords do not match.");
    return;
  }
  if (password.length < 6) {
    setPasswordError("Password must be at least 6 characters long.");
    return;
  }
  setLoading(true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: {
        redirectTo: window.location.origin + "/signin",
        data: {
          display_name: `${firstName} ${lastName}`
        }
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

    // Check for duplicate email in the supabase auth namin
    if (data?.user?.identities?.length === 0) {
      setError("This email is already registered. Please log in or use Google sign-in.");
      setConfirmationMessage("");
      setLoading(false);
      return;
    }

    // if not duplicate then proceed dito
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

  // whether name/email/password fields currently have validation errors
  const formHasError = Boolean(firstNameError) || Boolean(lastNameError) || Boolean(emailError) || Boolean(passwordError);

  // whether any required field is empty: firstName, email, password, confirmPassword
  const requiredMissing = !String(firstName || '').trim() || !String(email || '').trim() || !password || !confirmPassword;

  const formDisabled = loading || formHasError || requiredMissing;

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

      <div className="flex-1 flex flex-col items-center justify-center mt-[20px] my-6">
        <div className="container flex flex-col justify-center mt-9">
          <form onSubmit={handleSignUp}>
            <p className="text-[30px] font-bold text-black font-dm-sans mb-5">Sign Up</p>
            
            {/* First Name and Last Name */}
            <div className="flex flex-row gap-4 py-2">
              <div className="flex flex-col w-1/2">
                <p className="font-dm-sans">First Name</p>
                <input
                  onChange={handleFirstNameChange}
                  className="p-3 mt-2 text-black bg-white border border-gray-500 rounded"
                  type="text"
                  name="firstName"
                  id="firstName"
                  placeholder="First Name"
                  value={firstName}
                  required
                />
                {firstNameError && <p className="text-red-600 text-sm mt-1 font-dm-sans">{firstNameError}</p>}
              </div>
              <div className="flex flex-col w-1/2">
                <p className="font-dm-sans">Last Name (Type N/A if none)</p>
                <input
                  onChange={handleLastNameChange}
                  className="p-3 mt-2 text-black bg-white border border-gray-500 rounded font-dm-sans"
                  type="text"
                  name="lastName"
                  id="lastName"
                  placeholder="Last Name"
                  value={lastName}
                />
                {lastNameError && <p className="text-red-600 text-sm mt-1 font-dm-sans">{lastNameError}</p>}
              </div>
            </div>

            {/* Email input */}
            <div className="flex flex-col py-4">
              <p className="font-dm-sans">Email address</p>
              <input
                onChange={handleEmailChange}
                className="p-3 mt-2 text-black bg-white border border-gray-500 rounded"
                type="email"
                name="email"
                id="email"
                placeholder="Email"
              />
              {emailError && <p className="text-red-600 text-sm mt-1 font-dm-sans">{emailError}</p>}
            </div>

            {/* Create Password */}
            <div className="flex flex-col">
              <p className="font-dm-sans">Create Password <span className="text-gray-400 text-[12px] italic font-dm-sans">(At least 6 characters.)</span></p>
              <div className="relative">
                <input
                  onChange={handlePasswordChange}
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

            
            
            {/* CONFIRM Create Pasword */}
            <div className="flex flex-col py-5">
              <p className="font-dm-sans">Confirm Password</p>
              <div className="relative">
                <input
                  onChange={handleConfirmPasswordChange}
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
              {passwordError && <p className="text-red-600 text-sm mt-1 font-dm-sans">{passwordError}</p>}
            </div>
            <button
              type="submit"
              disabled={formDisabled}
              className={`w-full mt-4 submit-button font-dm-sans ${formDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={formDisabled ? 'Please fill required fields and fix errors' : 'Sign Up'}
            >
              Sign Up
            </button>
            {error && (
              <p className="text-red-600 text-center pt-4 font-dm-sans">{error}</p>
            )}
            {!error && confirmationMessage && (
              <div className="text-green-600 text-center pt-4 text-lg font-semibold font-dm-sans">{confirmationMessage}</div>
            )}
          </form>
          <div className="flex items-center mt-4">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="mx-4 text-gray-500 font-semibold font-dm-sans">OR</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>
          <div className=" text-center">
            <button
              onClick={signUpWithGoogle}
              className="w-full mt-4 google-btn flex items-center justify-center gap-2 py-2 font-dm-sans"
            >
              <img src={"/logo-icon/google-logo.webp"} alt="Google" className="h-6 w-6 object-contain" />
              <span className="font-dm-sans">Continue with Google</span>
            </button>
          </div>
          <p className="text-center mt-9 font-dm-sans">
            Already have an account? <Link to="/signin" className="underline font-dm-sans">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;