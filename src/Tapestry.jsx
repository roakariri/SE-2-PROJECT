
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import TapestryInfo from "./components/Product-Pages/accessories-decorations/Tapestry-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";




function Tapestry() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <TapestryInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default Tapestry;