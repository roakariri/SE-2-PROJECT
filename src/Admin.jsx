
import { UserAuth } from "./context/AuthContext";
import AdminNavigation from "./components/Admin/Admin-Navigation";
import AdminContents from "./components/Admin/Admin-Contents";



function Admin() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
        <AdminNavigation />
        <AdminContents />
    </div>
  );
}

export default Admin;