// utils/RouteProtection.jsx
import { LoadApp } from "../components";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

const RouteProtection = ({ allowedRoles, allowedLevels }) => {
  const { user, isInitialized } = useSelector((state) => state.auth);

  // Tahan redirect sampai status sesi hasil bootstrap awal sudah diketahui.
  if (!isInitialized) {
    return <LoadApp />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (
    user.role === "admin" &&
    allowedLevels &&
    (!user.level || !allowedLevels.includes(user.level))
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RouteProtection;
