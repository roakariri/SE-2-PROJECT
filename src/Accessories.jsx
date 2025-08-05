
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import AccessoriesCatalog from "./components/visitor/AccesoriesCatalog";




function Accessories() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <AccessoriesCatalog />
      <Footer />
    </div>
  );
}

export default Accessories;
