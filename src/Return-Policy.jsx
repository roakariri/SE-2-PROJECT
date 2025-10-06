import { UserAuth } from "./context/AuthContext";
import ReturnPolicyPage from "./components/Legal Compliances/Return-Policy-page";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";

function ReturnPolicy() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <ReturnPolicyPage />
      <Footer />
    </div>
 
  );
}

export default ReturnPolicy;
