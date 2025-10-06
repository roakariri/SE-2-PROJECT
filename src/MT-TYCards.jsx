import { UserAuth } from "./context/AuthContext";

import TYCardsMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-TYCards"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <TYCardsMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
