import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const TahfizDashboard = lazy(
  () => import("../../module/tahfiz/dashboard/TahfizDashboard"),
);
const Alquran = lazy(() => import("../../module/tahfiz/alquran/view/Alquran"));
const Halaqoh = lazy(() => import("../../module/tahfiz/halaqoh/view/Halaqoh"));
const Target = lazy(() => import("../../module/tahfiz/target/Target"));

const renderTahfizRoutes = ({ LazyPage } = {}) =>
  LazyPage ? (
    <Route
      element={
        <RouteProtection allowedRoles={["admin"]} allowedLevels={["tahfiz"]} />
      }
    >
      <Route
        path='/tahfiz-dashboard'
        element={createElement(LazyPage, {
          title: "Dashboard Tahfiz",
          Component: TahfizDashboard,
        })}
      />
      <Route
        path='/tahfiz-alquran'
        element={createElement(LazyPage, {
          title: "Referensi Al-Qur'an",
          Component: Alquran,
        })}
      />
      <Route
        path='/tahfiz-halaqoh'
        element={createElement(LazyPage, {
          title: "Manajemen Halaqoh",
          Component: Halaqoh,
        })}
      />
      <Route
        path='/tahfiz-target'
        element={createElement(LazyPage, {
          title: "Target Tahfiz",
          Component: Target,
        })}
      />
      <Route
        path='/tahfiz-penilaian'
        element={createElement(LazyPage, {
          title: "Manajemen Halaqoh",
          Component: Halaqoh,
        })}
      />
      <Route
        path='/tahfiz-hafalan'
        element={createElement(LazyPage, {
          title: "Target Tahfiz",
          Component: Target,
        })}
      />
    </Route>
  ) : null;

export default renderTahfizRoutes;
