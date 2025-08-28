
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import BlanketInfo from "./components/Product-Pages/accessories-decorations/Blanket-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";




function Blanket() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <BlanketInfo />
      <Footer />
    </div>
  );
}

export default Blanket;