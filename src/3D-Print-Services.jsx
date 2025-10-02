import { UserAuth } from "./context/AuthContext";
import ThreeDPrintServicesPage from "./components/Legal Compliances/3D-print-services-page";
import Header from "./components/visitor/Header";
import Footer from "./components/visitor/Footer";
import Navigation from "./components/registered/Navigation";

function ThreeDPrintServices() {
  const { session } = UserAuth();
  return (

    <div className="font-dm-sans">
      {session ? <Navigation /> : <Header />}
      <ThreeDPrintServicesPage />
      <Footer />
    </div>
 
  );
}

export default ThreeDPrintServices;
