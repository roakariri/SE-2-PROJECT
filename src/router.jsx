import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import ForgotPassword from "./components/ForgotPassword";
import ResetConfirmation from "./components/ResetConfirmation";
import Signup from "./components/Signup";
import Signin from "./components/Signin";
import Dashboard from "./routes/Dashboard";
import PrivateRoute from "./components/PrivateRoute";

import Homepage from "./components/Homepage";
import ResetPassword from "./components/ResetPassword";
import LandingPage from "./components/LandingPage";


export const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/signup", element: <Signup /> },
  { path: "/signin", element: <Signin /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-confirmation", element: <ResetConfirmation /> },
  { path: "/Homepage", element: <Homepage /> },
  { path: "/forgotpassword", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/landingpage", element: <LandingPage /> },
  
  {
    path: "/dashboard",
    element: (
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    ),
  },
]);
