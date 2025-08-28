import { UserAuth } from "./context/AuthContext";
import Header from "./components/visitor/Header";
import ProductBoxInfo from "./components/Product-Pages/packaging/Product-Box-Info";
import Navigation from "./components/registered/Navigation";
import Footer from "./components/visitor/Footer";

function ProductBox() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <ProductBoxInfo />
      <Footer />
    </div>
  );
}

export default ProductBox;
