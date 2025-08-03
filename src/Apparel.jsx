
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import ApparelCatalog from "./components/visitor/ApparelCatalog";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";




function Apparel() {
  const { session } = UserAuth();
  return (
    <>
      {session ? <Navigation /> : <Header />}
      <ApparelCatalog />
      <Footer />
    </>
  );
}

export default Apparel;
