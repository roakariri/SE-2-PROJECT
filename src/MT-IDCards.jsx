import { UserAuth } from "./context/AuthContext";

import IDCardsMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-IDCards"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <IDCardsMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
