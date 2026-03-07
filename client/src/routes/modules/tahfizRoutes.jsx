import { lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const TahfizDashboard = lazy(
  () => import("../../module/tahfiz/dashboard/TahfizDashboard"),
);
const Alquran = lazy(() => import("../../module/tahfiz/alquran/view/Alquran"));
const Halaqoh = lazy(() => import("../../module/tahfiz/halaqoh/view/Halaqoh"));
const Target = lazy(() => import("../../module/tahfiz/target/Target"));

const renderTahfizRoutes = ({ LazyPage }) => (
  <Route
    element={
      <RouteProtection allowedRoles={["admin"]} allowedLevels={["tahfiz"]} />
    }
  >
    <Route
      path="/tahfiz-dashboard"
      element={<LazyPage title="Dashboard Tahfiz" Component={TahfizDashboard} />}
    />
    <Route
      path="/tahfiz-alquran"
      element={<LazyPage title="Referensi Al-Qur'an" Component={Alquran} />}
    />
    <Route
      path="/tahfiz-halaqoh"
      element={<LazyPage title="Manajemen Halaqoh" Component={Halaqoh} />}
    />
    <Route
      path="/tahfiz-target"
      element={<LazyPage title="Target Tahfiz" Component={Target} />}
    />
    <Route
      path="/tahfiz-penilaian"
      element={<LazyPage title="Manajemen Halaqoh" Component={Halaqoh} />}
    />
    <Route
      path="/tahfiz-hafalan"
      element={<LazyPage title="Target Tahfiz" Component={Target} />}
    />
  </Route>
);

export default renderTahfizRoutes;
