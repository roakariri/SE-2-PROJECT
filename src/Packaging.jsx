
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import PackagingCatalog from "./components/visitor/Packaging-Catalog";
import ChatbotPage from "./components/ChatBot/Chatbot-page";





function CardsStickers() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <PackagingCatalog />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default CardsStickers;
