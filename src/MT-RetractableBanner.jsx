import { UserAuth } from "./context/AuthContext";

import RetractableBannerMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-RetractableBanner"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <RetractableBannerMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
