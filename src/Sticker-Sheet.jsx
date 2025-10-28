import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import StickerSheetInfo from "./components/Product-Pages/cards-stickers/Sticker-Sheet-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function StickerSheet() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <StickerSheetInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default StickerSheet;
