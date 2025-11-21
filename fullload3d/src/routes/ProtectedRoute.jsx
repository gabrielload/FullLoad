import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("role"); 
  return token ? children : <Navigate to="/login" replace />;
}
