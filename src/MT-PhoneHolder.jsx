import { UserAuth } from "./context/AuthContext";

import PHMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-PhoneHolder"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <PHMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
