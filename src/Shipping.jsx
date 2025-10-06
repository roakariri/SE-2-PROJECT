import { UserAuth } from "./context/AuthContext";
import ShippingPage from "./components/Legal Compliances/Shipping-page";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";

function Shipping() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <ShippingPage />
      <Footer />
    </div>
 
  );
}

export default Shipping;
