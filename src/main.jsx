import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import { router } from "./router.jsx";
import { RouterProvider } from "react-router-dom";
import { AuthContextProvider } from "./context/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <>
      <div className="w-full border-b header">
        <div className="header border">
          <img src="./Logo & icon/logo.png" className=" header-logo" alt="Logo" />
        </div>
      </div>
      <AuthContextProvider>
        <RouterProvider router={router} />
      </AuthContextProvider>
    </>
  </StrictMode>
);
