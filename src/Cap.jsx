
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import CapInfo from "./components/Product-Pages/apparel/Cap-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";




function Cap() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <CapInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default Cap;