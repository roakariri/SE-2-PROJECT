import { useContext, useState } from "react";

import { Link } from "react-router-dom";
import Signin from "./components/Signin";

import { UserAuth } from "./context/AuthContext";
import LandingPage from "./components/LandingPage";
import Header from "./components/Header"
import Footer from "./components/Footer";




function App() {
  const { user } = UserAuth();

  // console.log(user);

  return (
    <>
      <Header />
      <LandingPage />
      <Footer />

    </>
  );
}

export default App;
