import { UserAuth } from "./context/AuthContext";
import ProductSample from "./components/Product-Pages/Mockup-Product/MTPage-RTshirt";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";
import ChatbotPage from "./components/ChatBot/Chatbot-page";

function Product() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
  <Navigation />
  <ProductSample />
  <ChatbotPage />
  <Footer />
    </div>
  );
}

export default Product;
