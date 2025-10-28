import { UserAuth } from "./context/AuthContext";
import OrderTrackingPage from "./components/Legal Compliances/Order-Tracking-page";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function OrderTracking() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <OrderTrackingPage />
  <ChatbotPage />
  <Footer />
    </div>
 
  );
}

export default OrderTracking;
