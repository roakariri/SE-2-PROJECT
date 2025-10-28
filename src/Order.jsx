import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import OrderContent from "./components/Order-Pages/Order-Page";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function Order() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            {session ? <Navigation /> : <Header />}
            <OrderContent />
            <ChatbotPage />
            <Footer />
        </div>
    );
}

export default Order;
