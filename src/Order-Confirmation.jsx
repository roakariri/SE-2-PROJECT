import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import OrderConfirmationPage from "./components/Order-Pages/Order-Confirmation-Page";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function OrderConfirmation() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            {session ? <Navigation /> : <Header />}
            <OrderConfirmationPage />
            <Footer />
        </div>
    );
}

export default OrderConfirmation;
