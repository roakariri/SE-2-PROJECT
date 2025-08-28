import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import MockupToolPage from "./components/Product-Pages/Mockup-tool-page";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <MockupToolPage />
      <Footer />
    </div>
  );
}

export default MockupToolWrapper;
