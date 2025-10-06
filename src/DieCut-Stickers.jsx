import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import DieCutStickersInfo from "./components/Product-Pages/cards-stickers/DieCut-Stickers-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function DieCutStickers() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <DieCutStickersInfo />
      <Footer />
    </div>
  );
}

export default DieCutStickers;
