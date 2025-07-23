import { useContext, useState } from "react";

import { Link } from "react-router-dom";
import Signin from "./components/Signin";

import { UserAuth } from "./context/AuthContext";
import LandingPage from "./components/LandingPage";

function App() {
  const { user } = UserAuth();

  // console.log(user);

  return (
    <>
      <LandingPage />
    </>
  );
}

export default App;
