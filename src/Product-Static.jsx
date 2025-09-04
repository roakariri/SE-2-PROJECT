import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import ;
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function Poster() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <PosterInfo />
      <Footer />
    </div>
  );
}

export default Poster;
