import { UserAuth } from "./context/AuthContext";
import LandingPage from "./components/visitor/LandingPage";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function Landing() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <LandingPage />
      <ChatbotPage />
      <Footer />
    </div>
 
  );
}

export default Landing;
