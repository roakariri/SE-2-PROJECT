import { UserAuth } from "./context/AuthContext";

import PCardsMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-PhotoCards"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <PCardsMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
