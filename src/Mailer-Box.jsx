import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import MailerBoxInfo from "./components/Product-Pages/packaging/Mailer-Box-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function MailerBox() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  {session ? <Navigation /> : <Header />}
  <MailerBoxInfo />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default MailerBox;
