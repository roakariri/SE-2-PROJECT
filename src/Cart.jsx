import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import CartPage from "./components/Order-Pages/Cart-Page.jsx";
import ChatbotPage from "./components/ChatBot/Chatbot-page";





function Cart() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            {session ? <Navigation /> : <Header />}
            <CartPage />
            <ChatbotPage />
            <Footer />
        </div>
    );
}

export default Cart;
