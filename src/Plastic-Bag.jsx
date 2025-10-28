import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import PlasticBagInfo from "./components/Product-Pages/packaging/Plastic-Bag-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function PlasticBag() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <PlasticBagInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default PlasticBag;
