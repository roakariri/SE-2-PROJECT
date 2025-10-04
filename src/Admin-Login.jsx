
import { UserAuth } from "./context/AuthContext";
import AdminLoginpage from "./components/Admin/Admin-Login-page";






function Login() {
  const { session } = UserAuth();
  return (
    <div className="font-dm-sans">
      <AdminLoginpage />
    </div>
  );
}

export default Login;