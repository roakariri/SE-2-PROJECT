
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";
import AccessoriesCatalog from "./components/visitor/AccesoriesCatalog";




function Accessories() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <AccessoriesCatalog />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default Accessories;
