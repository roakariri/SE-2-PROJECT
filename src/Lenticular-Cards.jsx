import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import LenticularCardsInfo from "./components/Product-Pages/cards-stickers/Lenticular-Cards-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function LenticularCards() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <LenticularCardsInfo />
      <Footer />
    </div>
  );
}

export default LenticularCards;
