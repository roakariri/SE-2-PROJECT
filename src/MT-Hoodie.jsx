import { UserAuth } from "./context/AuthContext";

import MTPageHoodie from "./components/Product-Pages/Mockup-Product/MTPage-Hoodie";

function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      <MTPageHoodie />
    </div>
  );
}

export default MockupToolWrapper;
