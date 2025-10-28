import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import DieCutStickersInfo from "./components/Product-Pages/cards-stickers/DieCut-Stickers-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function DieCutStickers() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <DieCutStickersInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default DieCutStickers;
