import { UserAuth } from "./context/AuthContext";
import TermsAndConditionsPage from "./components/Legal Compliances/T&C-page";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";

function TermsAndConditions() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <TermsAndConditionsPage />
      <Footer />
    </div>
 
  );
}

export default TermsAndConditions;
