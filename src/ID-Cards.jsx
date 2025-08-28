import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import IDCardsInfo from "./components/Product-Pages/cards-stickers/ID-Cards-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function IDCards() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <IDCardsInfo />
      <Footer />
    </div>
  );
}

export default IDCards;
