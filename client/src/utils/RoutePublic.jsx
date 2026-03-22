// utils/RouterPublic.jsx
import { LoadApp } from "../components";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { FEATURES, hasFeature } from "../config/productFeatures";

const isTahfizEnabled = hasFeature(FEATURES.TAHFIZ);
const isFinanceEnabled = hasFeature(FEATURES.FINANCE);

const RouterPublic = () => {
  const { user, isInitialized } = useSelector((state) => state.auth);

  if (!isInitialized) {
    return <LoadApp />;
  }

  if (user) {
    switch (user.role) {
      case "student":
        return <Navigate to='/siswa-dashboard' replace />;

      case "teacher":
        return <Navigate to='/guru-dashboard' replace />;

      case "parent":
        return <Navigate to='/orangtua-dashboard' replace />;

      // SKENARIO KHUSUS ADMIN
      case "admin":
      case "center": // Jika role center dipisah di DB, handle disini juga
        // Cek Level Admin
        if (user.level === "pusat") {
          return <Navigate to='/center-dashboard' replace />;
        } else if (user.level === "tahfiz") {
          return (
            <Navigate
              to={isTahfizEnabled ? "/tahfiz-dashboard" : "/admin-dashboard"}
              replace
            />
          );
        } else if (user.level === "keuangan") {
          return (
            <Navigate
              to={isFinanceEnabled ? "/finance-dashboard" : "/admin-dashboard"}
              replace
            />
          );
        } else {
          // Default: Satuan / Admin Sekolah
          return <Navigate to='/admin-dashboard' replace />;
        }

      default:
        return <Navigate to='/' replace />;
    }
  }

  return <Outlet />;
};

export default RouterPublic;
