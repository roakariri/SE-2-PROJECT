
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import AcrylicStandInfo from "./components/Product-Pages/accessories-decorations/Acrylic-Stand-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";




function AcrylicStand() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <AcrylicStandInfo />
      <Footer />
    </div>
  );
}

export default AcrylicStand;