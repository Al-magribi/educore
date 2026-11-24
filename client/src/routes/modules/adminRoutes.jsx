import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";
import withMuseTheme from "../../components/ui/muse/withMuseTheme";

const AdminDash = lazy(() => import("../../module/admin/dashboard/AdminDash"));
const AdminMain = lazy(() => import("../../module/admin/main/AdminMain"));
const AdminAcademinc = lazy(
  () => import("../../module/admin/academic/AdminAcademinc"),
);

// Module admin memakai theme Muse (lihat CLAUDE.md).
const AdminDashPage = withMuseTheme(AdminDash);
const AdminMainPage = withMuseTheme(AdminMain);
const AdminAcademincPage = withMuseTheme(AdminAcademinc);

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
        Component: AdminDashPage,
      })}
    />
    <Route
      path="/admin-data-pokok"
      element={createElement(LazyPage, {
        title: "Data Pokok",
        Component: AdminMainPage,
      })}
    />
    <Route
      path="/admin-data-akademik"
      element={createElement(LazyPage, {
        title: "Manajemen Pendidikan",
        Component: AdminAcademincPage,
      })}
    />
  </Route>
);

export default renderAdminRoutes;
