// utils/RouterPublic.jsx
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

const RouterPublic = () => {
  const { user } = useSelector((state) => state.auth);

  if (user) {
    switch (user.role) {
      case "student":
        return <Navigate to="/siswa-dashboard" replace />;

      case "teacher":
        return <Navigate to="/guru-dashboard" replace />;

      case "parent":
        return <Navigate to="/parent-dashboard" replace />;

      // SKENARIO KHUSUS ADMIN
      case "admin":
      case "center": // Jika role center dipisah di DB, handle disini juga
        // Cek Level Admin
        if (user.level === "pusat") {
          return <Navigate to="/center-dashboard" replace />;
        } else if (user.level === "tahfiz") {
          return <Navigate to="/tahfiz-dashboard" replace />;
        } else {
          // Default: Satuan / Admin Sekolah
          return <Navigate to="/admin-dashboard" replace />;
        }

      default:
        // Jika role tidak dikenali, logout atau ke home
        return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default RouterPublic;
