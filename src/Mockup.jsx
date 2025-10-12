import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import MockupPage from "./components/registered/Mockup-Page";





function Mockup() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            {session ? <Navigation /> : <Header />}
            <MockupPage />
            <Footer />
        </div>
    );
}

export default Mockup;
