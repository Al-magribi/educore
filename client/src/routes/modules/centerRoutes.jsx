import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const CenterDash = lazy(
  () => import("../../module/center/dashboard/CenterDash"),
);
const CenterHome = lazy(
  () => import("../../module/center/homebase/CenterHome"),
);
const CenterAdmin = lazy(() => import("../../module/center/admin/CenterAdmin"));
const CenterTeacher = lazy(
  () => import("../../module/center/teacher/CenterTeacher"),
);
const CenterMarket = lazy(
  () => import("../../module/center/market/CenterMarket"),
);
const CenterConfig = lazy(
  () => import("../../module/center/config/CenterConfig"),
);

const renderCenterRoutes = (routeHelpers) => (
  <Route
    element={
      <RouteProtection allowedRoles={["admin"]} allowedLevels={["pusat"]} />
    }
  >
    <Route
      path='/center-dashboard'
      element={createElement(LazyPage, {
        title: "Dashboard Center",
        Component: CenterDash,
      })}
    />
    <Route
      path='/center-homebase'
      element={createElement(LazyPage, {
        title: "Manajemen Satuan Pendidikan",
        Component: CenterHome,
      })}
    />
    <Route
      path='/center-admin'
      element={createElement(LazyPage, {
        title: "Manajemen Admin",
        Component: CenterAdmin,
      })}
    />
    <Route
      path='/center-teacher'
      element={createElement(LazyPage, {
        title: "Manajement Guru",
        Component: CenterTeacher,
      })}
    />
    <Route
      path='/center-analysis'
      element={createElement(LazyPage, {
        title: "Analisis Pasar & Demografi",
        Component: CenterMarket,
      })}
    />
    <Route
      path='/center-config'
      element={
        isDbEnabled ? (
          createElement(LazyPage, {
            title: "Manjemen Database",
            Component: CenterConfig,
          })
        ) : (
          createElement(NotFoundRedirect)
        )
      }
    />
  </Route>
);

export default renderCenterRoutes;
