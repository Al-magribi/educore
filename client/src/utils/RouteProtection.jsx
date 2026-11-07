// utils/RouteProtection.jsx
import { LoadApp } from "../components";
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Result } from "antd";
import resolveUserHomePath from "./resolveUserHomePath";
import { hasStaffAssignment } from "./staffAssignment";

const RouteProtection = ({
  allowedRoles,
  allowedLevels,
  allowedAssignments,
  requireMusyrif = false,
}) => {
  const { user, isInitialized } = useSelector((state) => state.auth);
  const location = useLocation();

  // Tahan redirect sampai status sesi hasil bootstrap awal sudah diketahui.
  if (!isInitialized) {
    return <LoadApp />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const homePath = resolveUserHomePath(user);

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (homePath && homePath !== location.pathname) {
      return <Navigate to={homePath} replace />;
    }

    return (
      <Result
        status="403"
        title="Akses ditolak"
        subTitle="Role akun ini tidak punya akses ke halaman tersebut."
      />
    );
  }

  if (
    user.role === "teacher" &&
    Array.isArray(allowedAssignments) &&
    allowedAssignments.length > 0
  ) {
    const hasAssignment = allowedAssignments.some((type) =>
      hasStaffAssignment(user, type),
    );
    if (!hasAssignment) {
      if (homePath && homePath !== location.pathname) {
        return <Navigate to={homePath} replace />;
      }

      return (
        <Result
          status="403"
          title="Akses ditolak"
          subTitle="Akun guru ini belum ditugaskan untuk modul tersebut."
        />
      );
    }

    return <Outlet />;
  }

  if (
    user.role === "admin" &&
    allowedLevels &&
    (!user.level || !allowedLevels.includes(user.level))
  ) {
    if (homePath && homePath !== location.pathname) {
      return <Navigate to={homePath} replace />;
    }

    return (
      <Result
        status="403"
        title="Akses ditolak"
        subTitle="Level admin akun ini belum cocok dengan modul yang dibuka."
      />
    );
  }

  if (requireMusyrif && !user.is_musyrif) {
    return <Navigate to='/' replace />;
  }

  return <Outlet />;
};

export default RouteProtection;
