import { UserAuth } from "./context/AuthContext";

import CheckoutPage from "./components/Order-Pages/Checkout-Page";
import ChatbotPage from "./components/ChatBot/Chatbot-page";


function Checkout() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            <CheckoutPage />
            <ChatbotPage />
        </div>
    );
}

export default Checkout;
