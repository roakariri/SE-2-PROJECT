
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import HoodieInfo from "./components/Product-Pages/apparel/Hoodie-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";




function Hoodie() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <HoodieInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default Hoodie;