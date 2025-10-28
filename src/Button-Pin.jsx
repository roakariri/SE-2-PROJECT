import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import ButtonPinInfo from "./components/Product-Pages/accessories-decorations/Button-Pin-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function ButtonPin() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <ButtonPinInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default ButtonPin;
