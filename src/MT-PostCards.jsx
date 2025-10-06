import { UserAuth } from "./context/AuthContext";

import PostCardsMockupTool from "./components/Product-Pages/Mockup-Product/MTPage-Postcards"


function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">

      <PostCardsMockupTool />

    </div>
  );
}

export default MockupToolWrapper;
