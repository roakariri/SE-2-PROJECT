
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";
import SignagesPostersCatalog from "./components/visitor/Signages-Posters-Catalog";




function SignagesPosters() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <SignagesPostersCatalog />
      <Footer />
    </div>
  );
}

export default SignagesPosters;
