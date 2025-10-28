import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import ShikishiInfo from "./components/Product-Pages/cards-stickers/Shikishi-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function Shikishi() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <ShikishiInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default Shikishi;
