import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import OrderConfirmationPage from "./components/Order-Pages/Order-Confirmation-Page";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function OrderConfirmation() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            {session ? <Navigation /> : <Header />}
            <OrderConfirmationPage />
            <ChatbotPage />
            <Footer />
        </div>
    );
}

export default OrderConfirmation;
