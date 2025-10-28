import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import MockupPage from "./components/registered/Mockup-Page";
import ChatbotPage from "./components/ChatBot/Chatbot-page";





function Mockup() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            {session ? <Navigation /> : <Header />}
            <MockupPage />
            <ChatbotPage />
            <Footer />
        </div>
    );
}

export default Mockup;
