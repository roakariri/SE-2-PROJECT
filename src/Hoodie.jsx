
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import HoodieInfo from "./components/Product-Pages/apparel/Hoodie-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";




function Hoodie() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <HoodieInfo />
      <Footer />
    </div>
  );
}

export default Hoodie;