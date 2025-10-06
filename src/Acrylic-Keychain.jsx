
import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import AcrylicKeychainInfo from "./components/Product-Pages/accessories-decorations/Acrylic-Keychain-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";




function AcrylicKeychain() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <AcrylicKeychainInfo />
      <Footer />
    </div>
  );
}

export default AcrylicKeychain;