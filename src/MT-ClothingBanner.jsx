import { UserAuth } from "./context/AuthContext";

import ClothingBannerMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-ClothingBanner"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <ClothingBannerMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
