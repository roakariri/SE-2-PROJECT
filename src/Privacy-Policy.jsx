import { UserAuth } from "./context/AuthContext";
import PrivacyPolicyPage from "./components/Legal Compliances/Privacy-Policy-page";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";
import Navigation from "./components/registered/Navigation";

function PrivacyPolicy() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <PrivacyPolicyPage />
  <ChatbotPage />
  <Footer />
    </div>
 
  );
}

export default PrivacyPolicy;
