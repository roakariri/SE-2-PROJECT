import { UserAuth } from "./context/AuthContext";

import RTMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-RTshirt"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <RTMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
