
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Sweatshirt from "./components/Product-Pages/apparel/Sweatshirt-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";




function BasicTBag() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <Sweatshirt />
      <Footer />
    </div>
  );
}

export default BasicTBag;