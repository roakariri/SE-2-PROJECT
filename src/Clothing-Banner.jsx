import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import ClothingBannerInfo from "./components/Product-Pages/sinage-posters/Clothing-Banner-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function ClothingBanner() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <ClothingBannerInfo />
      <Footer />
    </div>
  );
}

export default ClothingBanner;
