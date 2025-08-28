
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import TapestryInfo from "./components/Product-Pages/accessories-decorations/Tapestry-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";




function Tapestry() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <TapestryInfo />
      <Footer />
    </div>
  );
}

export default Tapestry;