
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import ThreeDPrintsCatalog from "./components/visitor/3dprints-Catalog";




function ThreeDPrints() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <ThreeDPrintsCatalog />
      <Footer />
    </div>
  );
}

export default ThreeDPrints;
