import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import PaperBagInfo from "./components/Product-Pages/packaging/Paper-Bag-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function PaperBag() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <PaperBagInfo />
      <Footer />
    </div>
  );
}

export default PaperBag;
