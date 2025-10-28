
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import BasicTBagInfo from "./components/Product-Pages/apparel/BasicTBag-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";




function BasicTBag() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <BasicTBagInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default BasicTBag;