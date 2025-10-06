
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import DealsPage from "./components/visitor/Deals-Catalog";





function Deals() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            {session ? <Navigation /> : <Header />}
            <DealsPage />
            <Footer />
        </div>
    );
}

export default Deals;
