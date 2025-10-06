import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import StickerSheetInfo from "./components/Product-Pages/cards-stickers/Sticker-Sheet-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function StickerSheet() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <StickerSheetInfo />
      <Footer />
    </div>
  );
}

export default StickerSheet;
