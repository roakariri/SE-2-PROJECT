import { UserAuth } from "./context/AuthContext";
import OrderTrackingPage from "./components/Legal Compliances/Order-Tracking-page";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";

function OrderTracking() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <OrderTrackingPage />
      <Footer />
    </div>
 
  );
}

export default OrderTracking;
