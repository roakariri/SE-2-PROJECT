import { UserAuth } from "./context/AuthContext";
import ContactSupportPage from "./components/Legal Compliances/Contact-Support-page";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";
import Navigation from "./components/registered/Navigation";

function ContactSupport() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <ContactSupportPage />
  <ChatbotPage />
  <Footer />
    </div>
 
  );
}

export default ContactSupport;
