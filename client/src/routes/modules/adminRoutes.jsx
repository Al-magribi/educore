import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const AdminDash = lazy(() => import("../../module/admin/dashboard/AdminDash"));
const AdminMain = lazy(() => import("../../module/admin/main/AdminMain"));
const AdminAcademinc = lazy(
  () => import("../../module/admin/academic/AdminAcademinc"),
);

const renderAdminRoutes = ({ LazyPage }) => (
  <Route
    element={
      <RouteProtection allowedRoles={["admin"]} allowedLevels={["satuan"]} />
    }
  >
    <Route
      path="/admin-dashboard"
      element={createElement(LazyPage, {
        title: "Dashboard Satuan",
        Component: AdminDash,
      })}
    />
    <Route
      path="/admin-data-pokok"
      element={createElement(LazyPage, {
        title: "Data Pokok",
        Component: AdminMain,
      })}
    />
    <Route
      path="/admin-data-akademik"
      element={createElement(LazyPage, {
        title: "Manajemen Pendidikan",
        Component: AdminAcademinc,
      })}
    />
  </Route>
);

export default renderAdminRoutes;
