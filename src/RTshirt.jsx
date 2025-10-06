
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import RTshirtInfo from "./components/Product-Pages/apparel/RTshirt-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";




function Cap() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <RTshirtInfo />
      <Footer />
    </div>
  );
}

export default Cap;