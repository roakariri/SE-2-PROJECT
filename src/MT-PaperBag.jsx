import { UserAuth } from "./context/AuthContext";

import PaperBagMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-PaperBag"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <PaperBagMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
