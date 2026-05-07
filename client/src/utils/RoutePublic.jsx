// utils/RouterPublic.jsx
import { LoadApp } from "../components";
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import resolveUserHomePath from "./resolveUserHomePath";

const RouterPublic = () => {
  const { user, isInitialized } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isInitialized) {
    return <LoadApp />;
  }

  if (user) {
    const homePath = resolveUserHomePath(user);

    if (homePath && homePath !== location.pathname) {
      return <Navigate to={homePath} replace />;
    }
  }

  return <Outlet />;
};

export default RouterPublic;
