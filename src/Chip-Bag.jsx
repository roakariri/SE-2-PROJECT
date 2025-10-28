import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import ChipBagInfo from "./components/Product-Pages/packaging/Chip-Bag-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function ChipBag() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <ChipBagInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default ChipBag;
