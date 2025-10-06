import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import ThankyouCardsInfo from "./components/Product-Pages/cards-stickers/Thankyou-Cards-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function ThankyouCards() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <ThankyouCardsInfo />
      <Footer />
    </div>
  );
}

export default ThankyouCards;
