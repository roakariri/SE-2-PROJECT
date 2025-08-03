import { UserAuth } from "./context/AuthContext";
import LandingPage from "./components/visitor/LandingPage";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";

function Landing() {
  const { session } = UserAuth();
  return (
    <>
      {session ? <Navigation /> : <Header />}
      <LandingPage />
      <Footer />
    </>
  );
}

export default Landing;
