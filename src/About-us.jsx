import { UserAuth } from "./context/AuthContext";
import AboutUsPage from "./components/Legal Compliances/About-Us-page";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";

function AboutUs() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <AboutUsPage />
      <Footer />
    </div>
 
  );
}

export default AboutUs;
