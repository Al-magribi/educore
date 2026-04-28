import { Suspense, createElement } from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { useLoadUserQuery } from "./service/auth/ApiAuth";
import { AppLayout, AppMetadata, LoadApp } from "./components";
import RouteProtection from "./utils/RouteProtection";
import { FEATURES, hasFeature } from "./config/productFeatures";

import renderPublicRoutes from "./routes/modules/publicRoutes";
import renderCenterRoutes from "./routes/modules/centerRoutes";
import renderAdminRoutes from "./routes/modules/adminRoutes";
import {
  renderCbtShellRoutes,
  renderCbtStandaloneRoutes,
} from "./routes/modules/cbtRoutes";
import renderLmsRoutes from "./routes/modules/lmsRoutes";
import renderDbRoutes from "./routes/modules/dbRoutes";
import renderFinanceRoutes from "./routes/modules/financeRoutes";
import renderTahfizRoutes from "./routes/modules/tahfizRoutes";
import renderRoleRoutes from "./routes/modules/roleRoutes";

const isCbtEnabled = hasFeature(FEATURES.CBT);
const isDbEnabled = hasFeature(FEATURES.DB);
const isLmsEnabled = hasFeature(FEATURES.LMS);
const isTahfizEnabled = hasFeature(FEATURES.TAHFIZ);
const isFinanceEnabled = hasFeature(FEATURES.FINANCE);
const isFinanceLevel = (level) => level === "finance" || level === "keuangan";

const NotFoundRedirect = () => {
  const { user, isInitialized } = useSelector((state) => state.auth);

  if (!isInitialized) {
    return <LoadApp />;
  }

  if (!user) {
    return <Navigate to='/' replace />;
  }

  switch (user.role) {
    case "student":
      return <Navigate to='/siswa-dashboard' replace />;
    case "teacher":
      return <Navigate to='/guru-dashboard' replace />;
    case "parent":
      return <Navigate to='/orangtua-dashboard' replace />;
    case "admin":
    case "center":
      if (user.level === "pusat") {
        return <Navigate to='/center-dashboard' replace />;
      }
      if (user.level === "tahfiz") {
        if (!isTahfizEnabled) {
          return <Navigate to='/admin-dashboard' replace />;
        }
        return <Navigate to='/tahfiz-dashboard' replace />;
      }
      if (isFinanceLevel(user.level)) {
        if (!isFinanceEnabled) {
          return <Navigate to='/admin-dashboard' replace />;
        }
        return <Navigate to='/finance-dashboard' replace />;
      }
      return <Navigate to='/admin-dashboard' replace />;
    default:
      return <Navigate to='/' replace />;
  }
};

const LazyRoute = ({ Component }) => (
  <Suspense fallback={<LoadApp />}>
    {Component ? createElement(Component) : null}
  </Suspense>
);

const LazyPage = ({ title, Component }) => (
  <AppLayout title={title}>
    <LazyRoute Component={Component} />
  </AppLayout>
);

const App = () => {
  useLoadUserQuery();

  return (
    <BrowserRouter>
      <AppMetadata />
      <Routes>
        {renderPublicRoutes()}

        <Route
          element={
            <RouteProtection
              allowedRoles={["admin", "teacher", "student", "parent"]}
              allowedLevels={[
                "pusat",
                "satuan",
                "tahfiz",
                "finance",
                "keuangan",
              ]}
            />
          }
        >
          <Route element={<AppLayout asShell />}>
            {renderCenterRoutes({
              LazyPage,
              NotFoundRedirect,
              isDbEnabled,
            })}

            {renderAdminRoutes({
              LazyPage,
            })}

            {isCbtEnabled &&
              renderCbtShellRoutes({
                LazyPage,
              })}

            {isLmsEnabled &&
              renderLmsRoutes({
                LazyPage,
                NotFoundRedirect,
              })}

            {isDbEnabled &&
              renderDbRoutes({
                LazyPage,
                NotFoundRedirect,
              })}

            {isFinanceEnabled &&
              renderFinanceRoutes({
                LazyPage,
              })}

            {isTahfizEnabled &&
              renderTahfizRoutes({
                LazyPage,
              })}

            {renderRoleRoutes({
              LazyPage,
              NotFoundRedirect,
              isCbtEnabled,
            })}
          </Route>
        </Route>

        {isCbtEnabled &&
          renderCbtStandaloneRoutes({
            LazyRoute,
          })}

        <Route path='*' element={<NotFoundRedirect />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
