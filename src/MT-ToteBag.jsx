import { UserAuth } from "./context/AuthContext";

import MTPageToteBag from "./components/Product-Pages/Mockup-Product/MTPage-ToteBag";

function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      <MTPageToteBag />
    </div>
  );
}

export default MockupToolWrapper;
