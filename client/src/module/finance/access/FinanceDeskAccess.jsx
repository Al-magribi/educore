import { Result } from "antd";
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadApp } from "../../../components";
import resolveUserHomePath from "../../../utils/resolveUserHomePath";

const FinanceDeskAccess = ({
  allowedLevels = ["finance", "keuangan", "satuan", "pusat"],
  allowFinanceStaff = true,
}) => {
  const { user, isInitialized } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isInitialized) {
    return <LoadApp />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const homePath = resolveUserHomePath(user);
  const deny = () => {
    if (homePath && homePath !== location.pathname) {
      return <Navigate to={homePath} replace />;
    }

    return (
      <Result
        status="403"
        title="Akses ditolak"
        subTitle="Akun ini belum ditugaskan untuk keuangan satuan ini."
      />
    );
  };

  if (user.role === "teacher") {
    if (allowFinanceStaff && user.can_manage_finance === true) {
      return <Outlet />;
    }
    return deny();
  }

  if (
    user.role === "admin" &&
    user.level &&
    allowedLevels.includes(user.level)
  ) {
    return <Outlet />;
  }

  return deny();
};

export default FinanceDeskAccess;
