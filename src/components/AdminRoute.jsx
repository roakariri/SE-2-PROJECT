import React from "react";
import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
  // Check if admin is logged in (stored in localStorage)
  const isAdminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';

  return <div>{isAdminLoggedIn ? <>{children}</> : <Navigate to="/admin-login" />}</div>;
};

export default AdminRoute;