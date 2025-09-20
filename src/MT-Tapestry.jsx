import { UserAuth } from "./context/AuthContext";

import TapestryMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-Tapestry"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <TapestryMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
