
import { UserAuth } from "./context/AuthContext";
import Navigation from "./components/registered/Navigation";
import HomepageBody from "./components/registered/HomepageBody";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import ChatbotPage from "./components/ChatBot/Chatbot-page";



function Homepage() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <HomepageBody />
      <ChatbotPage />
      <Footer />
    </div>
  );
}

export default Homepage;
