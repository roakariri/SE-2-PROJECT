
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import CardsStickerCatalog from "./components/visitor/Cards-Stickers-Catalog";
import ChatbotPage from "./components/ChatBot/Chatbot-page";





function CardsStickers() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <CardsStickerCatalog />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default CardsStickers;
