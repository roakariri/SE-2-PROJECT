import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import RetractableBannerInfo from "./components/Product-Pages/sinage-posters/Retractable-Banner-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function RetractableBanner() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <RetractableBannerInfo />
      <Footer />
    </div>
  );
}

export default RetractableBanner;
