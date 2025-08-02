
import { UserAuth } from "./context/AuthContext";
import LandingPage from "./components/visitor/LandingPage";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";




function Landing() {
  const { user } = UserAuth();
  return (
    <>
      <Header />
      <LandingPage />
      <Footer />
    </>
  );
}

export default Landing;
