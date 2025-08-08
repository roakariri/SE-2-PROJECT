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

// Importing the ApparelCatalog component
import Apparel from "./Apparel";


// Importing the AccessoriesCatalog component
import Accessories from "./Accessories";

// Importing the SignagesCatalog component
import Signages from "./Signages-Posters";

// Importing the CardsStickersCatalog component
import CardsStickers from "./Cards-Stickers";

// Importing the PackagingCatalog component
import Packaging from "./Packaging";  

// Importing the ThreeDPrintsCatalog component
import ThreeDPrints from "./3D-Prints";

// Importing the Search component
import Search from "./Search";

// Importing the Account component
import UserAccount from "./User-Account";
import PrivateRoute from "./components/PrivateRoute";


import Product from "./Product"; // Importing the Product component

export const router = createBrowserRouter([
  // Landing page routes
  { path: "/", element: <Landing /> },
  { path: "/signup", element: <Signup /> },
  { path: "/signin", element: <Signin /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-confirmation", element: <ResetConfirmation /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/landingpage", element: <LandingPage /> },
  { path: "/reset-successful", element: <ResetSuccessful /> },

  // Homepage routes
  { path: "/homepage", element: <HomePage /> },


  // Apparel routes
  { path: "/apparel", element: <Apparel /> },



  // Accessories routes
  { path: "/accessories-decorations", element: <Accessories /> },

  // Signages routes
  { path: "/signage-posters", element: <Signages /> },


  //Cards and Signages routes
  { path: "/cards-stickers", element: <CardsStickers /> },

  //packaging routes
  { path: "/packaging", element: <Packaging /> },

  // 3D Prints routes
  { path: "/3d-prints-services", element: <ThreeDPrints /> },

  //search routes
  { path: "/search", element: <Search /> },

  // Account routes
  { path: "/account", element: <PrivateRoute><UserAccount /></PrivateRoute> },

  // Product routes
  { path: "/product", element: <PrivateRoute><Product /></PrivateRoute> }
]);
