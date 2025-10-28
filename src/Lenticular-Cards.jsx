import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import LenticularCardsInfo from "./components/Product-Pages/cards-stickers/Lenticular-Cards-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function LenticularCards() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <LenticularCardsInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default LenticularCards;
