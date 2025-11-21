import { Navigate } from "react-router-dom";

export default function RoleRoute({ children, allowed }) {
  const role = localStorage.getItem("role");

  if (!role) return <Navigate to="/login" replace />;

  return allowed.includes(role)
    ? children
    : <Navigate to="/dashboard" replace />;
}
