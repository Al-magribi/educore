// utils/RouteProtection.jsx
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

// Tambahkan prop allowedLevels
const RouteProtection = ({ allowedRoles, allowedLevels }) => {
  const { user } = useSelector((state) => state.auth);

  // 1. Jika User null (tidak login), tendang ke Login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2. Cek Role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // 3. Cek Level hanya untuk Admin
  // Jika role admin dan allowedLevels didefinisikan, maka user.level harus ada di dalamnya
  if (
    user.role === "admin" &&
    allowedLevels &&
    (!user.level || !allowedLevels.includes(user.level))
  ) {
    return <Navigate to="/" replace />;
    // Opsional: Redirect ke dashboard user itu sendiri jika unauthorized
  }

  return <Outlet />;
};

export default RouteProtection;
