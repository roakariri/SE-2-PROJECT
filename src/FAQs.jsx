import { UserAuth } from "./context/AuthContext";
import FAQsPage from "./components/Legal Compliances/FAQs-page";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";
import Navigation from "./components/registered/Navigation";

function FAQs() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <FAQsPage />
  <ChatbotPage />
  <Footer />
    </div>
 
  );
}

export default FAQs;