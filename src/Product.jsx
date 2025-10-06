import { UserAuth } from "./context/AuthContext";
import ProductSample from "./components/Product-Pages/Mockup-Product/MTPage-RTshirt";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";

function Product() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      <Navigation />
      <ProductSample />
      <Footer />
    </div>
  );
}

export default Product;
