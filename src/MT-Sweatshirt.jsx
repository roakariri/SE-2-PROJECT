import { UserAuth } from "./context/AuthContext";

import MTPageSweatshirt from "./components/Product-Pages/Mockup-Product/MTPage-Sweatshirt";

function MockupToolWrapper() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      <MTPageSweatshirt />
    </div>
  );
}

export default MockupToolWrapper;
