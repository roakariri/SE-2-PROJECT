import { UserAuth } from "./context/AuthContext";

import BlanketMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-Blanket"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <BlanketMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
