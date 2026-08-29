import { Navigate, Outlet } from "react-router-dom";
import { getAdminToken } from "../../services/api";

export default function ProtectedRoute() {
  const token = getAdminToken();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
