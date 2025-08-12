
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import FavoritesPage from "./components/registered/Favorites-Page.jsx";





function Favorites() {
    const { session } = UserAuth();
    return (
        <div className="font-dm-sans">
            {session ? <Navigation /> : <Header />}
            <FavoritesPage />
            <Footer />
        </div>
    );
}

export default Favorites;
