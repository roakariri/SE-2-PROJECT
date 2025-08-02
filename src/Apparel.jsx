
import { UserAuth } from "./context/AuthContext";
import Navigation from "./components/registered/Navigation";
import ApparelCatalog from "./components/visitor/ApparelCatalog";




function Apparel() {
  const { user } = UserAuth();
  return (
    <>
      <Navigation />
      <ApparelCatalog />

    </>
  );
}

export default Apparel;
