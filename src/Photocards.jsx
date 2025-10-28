import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import PhotocardsInfo from "./components/Product-Pages/cards-stickers/Photocards-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function Photocards() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <PhotocardsInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default Photocards;
