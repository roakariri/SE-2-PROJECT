import { UserAuth } from "./context/AuthContext";

import PlasticBagMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-PlasticBag"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <PlasticBagMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
