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
        <div className="w-full max-w-md mx-auto border-b header">
          <img src="./Logo & icon/logo.png" className="max-w-full h-auto header-logo" alt="Logo" />
        </div>
      </div>
      <AuthContextProvider>
        <RouterProvider router={router} />
      </AuthContextProvider>
    </>
  </StrictMode>
);
