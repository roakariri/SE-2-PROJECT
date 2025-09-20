import { UserAuth } from "./context/AuthContext";

import PosterMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-Poster"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <PosterMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
