import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import StampSealInfo from "./components/Product-Pages/3Dprint/Stamp-Seal-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function StampSeal() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <StampSealInfo />
      <Footer />
    </div>
  );
}

export default StampSeal;
