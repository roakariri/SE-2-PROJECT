import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import PhoneHolderInfo from "./components/Product-Pages/accessories-decorations/Phone-Holder-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function PhoneHolder() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <PhoneHolderInfo />
      <Footer />
    </div>
  );
}

export default PhoneHolder;
