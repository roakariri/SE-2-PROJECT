
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import ShakerKeychainInfo from "./components/Product-Pages/accessories-decorations/Shaker-Keychain-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";




function ShakerKeychain() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <ShakerKeychainInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default ShakerKeychain;