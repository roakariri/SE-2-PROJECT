import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import MugInfo from "./components/Product-Pages/accessories-decorations/Mug-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function Mugs() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <MugInfo />
      <Footer />
    </div>
  );
}

export default Mugs;
