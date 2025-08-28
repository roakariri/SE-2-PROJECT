import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import PostcardsInfo from "./components/Product-Pages/cards-stickers/Postcards-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function Postcards() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <PostcardsInfo />
      <Footer />
    </div>
  );
}

export default Postcards;
