import { createBrowserRouter } from "react-router-dom";
import Landing from "./Landing";
import ForgotPassword from "./components/visitor/ForgotPassword";
import ResetConfirmation from "./components/visitor/ResetConfirmation";
import Signup from "./components/visitor/Signup";
import Signin from "./components/visitor/Signin";


import ResetPassword from "./components/visitor/ResetPassword";
import LandingPage from "./components/visitor/LandingPage";
import ResetSuccessful from "./components/visitor/ResetSuccessful";


// Importing the Homepage component and its body
import HomePage from "./Homepage"
import HomepageBody from "./components/registered/HomepageBody";

// Importing the ApparelCatalog component
import ApparelCatalog from "./components/visitor/ApparelCatalog";
import Apparel from "./Apparel";



export const router = createBrowserRouter([
  // Landing page routes
  { path: "/", element: <Landing /> },
  { path: "/signup", element: <Signup /> },
  { path: "/signin", element: <Signin /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-confirmation", element: <ResetConfirmation /> },
  { path: "/forgotpassword", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/landingpage", element: <LandingPage /> },
  { path: "/reset-successful", element: <ResetSuccessful /> },

  // Homepage routes
  { path: "/homepage", element: <HomePage /> },
  { path: "/homepagebody", element: <HomepageBody /> },

  // Apparel routes
  { path: "/apparel", element: <Apparel /> },
  { path: "/apparel-catalog", element: <ApparelCatalog /> },

  
]);
