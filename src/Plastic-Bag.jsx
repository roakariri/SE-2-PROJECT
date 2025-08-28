import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import PlasticBagInfo from "./components/Product-Pages/packaging/Plastic-Bag-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function PlasticBag() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <PlasticBagInfo />
      <Footer />
    </div>
  );
}

export default PlasticBag;
