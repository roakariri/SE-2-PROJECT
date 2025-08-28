import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import ChipBagInfo from "./components/Product-Pages/packaging/Chip-Bag-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function ChipBag() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <ChipBagInfo />
      <Footer />
    </div>
  );
}

export default ChipBag;
