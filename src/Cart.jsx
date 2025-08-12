import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import CartPage from "./components/registered/Cart-Page.jsx";





function Cart() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            {session ? <Navigation /> : <Header />}
            <CartPage />
            <Footer />
        </div>
    );
}

export default Cart;
