import { Suspense, createElement } from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { useLoadUserQuery } from "./service/auth/ApiAuth";
import { AppLayout, AppMetadata, LoadApp } from "./components";
import RouteProtection from "./utils/RouteProtection";
import { FEATURES, hasFeature } from "./config/productFeatures";
import resolveUserHomePath from "./utils/resolveUserHomePath";

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

const NotFoundRedirect = () => {
  const { user, isInitialized } = useSelector((state) => state.auth);

  if (!isInitialized) {
    return <LoadApp />;
  }

  if (!user) {
    return <Navigate to='/' replace />;
  }

  const homePath = resolveUserHomePath(user);

  if (homePath) {
    return <Navigate to={homePath} replace />;
  }

  return <Navigate to='/' replace />;
};

// Dengan `title`, halaman dibungkus AppLayout; tanpa `title`, hanya Suspense.
const LazyRoute = ({ title, Component: RouteComponent }) => {
  const content = (
    <Suspense fallback={<LoadApp />}>
      {RouteComponent ? createElement(RouteComponent) : null}
    </Suspense>
  );

  if (!title) return content;

  return <AppLayout title={title}>{content}</AppLayout>;
};

const LazyPage = ({ title, Component: PageComponent }) => (
  <AppLayout title={title}>
    <LazyRoute Component={PageComponent} />
  </AppLayout>
);

// Kontrak route: SEMUA render*Routes menerima objek yang sama ini.
// Feature menambah route hanya di routes/modules/<domain>Routes.jsx (satu
// default export), lengkap dengan RouteProtection-nya sendiri. Jangan menambah
// route domain ke centerRoutes/adminRoutes/roleRoutes atau ke file ini.
const routeContext = {
  LazyPage,
  LazyRoute,
  NotFoundRedirect,
  isCbtEnabled,
  isDbEnabled,
  isLmsEnabled,
  isTahfizEnabled,
  isFinanceEnabled,
};

const App = () => {
  useLoadUserQuery();

  return (
    <Suspense fallback={<LoadApp />}>
      <BrowserRouter>
        <AppMetadata />
        <Routes>
          {renderPublicRoutes()}

          <Route
            element={
              <RouteProtection
                allowedRoles={["admin", "teacher", "student", "parent", "staff"]}
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
              {renderCenterRoutes(routeContext)}
              {renderAdminRoutes(routeContext)}
              {isCbtEnabled && renderCbtShellRoutes(routeContext)}
              {isLmsEnabled && renderLmsRoutes(routeContext)}
              {isDbEnabled && renderDbRoutes(routeContext)}
              {isFinanceEnabled && renderFinanceRoutes(routeContext)}
              {isTahfizEnabled && renderTahfizRoutes(routeContext)}
              {renderRoleRoutes(routeContext)}
            </Route>
          </Route>

          {isCbtEnabled && renderCbtStandaloneRoutes(routeContext)}

          <Route path='*' element={<NotFoundRedirect />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
  );
};

export default App;
