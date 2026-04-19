import { lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const CenterDash = lazy(() => import("../../module/center/dashboard/CenterDash"));
const CenterHome = lazy(() => import("../../module/center/homebase/CenterHome"));
const CenterAdmin = lazy(() => import("../../module/center/admin/CenterAdmin"));
const CenterTeacher = lazy(
  () => import("../../module/center/teacher/CenterTeacher"),
);
const CenterMarket = lazy(() => import("../../module/center/market/CenterMarket"));
const CenterConfig = lazy(() => import("../../module/center/config/CenterConfig"));

const renderCenterRoutes = (routeHelpers) => (
  <Route
    element={
      <RouteProtection allowedRoles={["admin"]} allowedLevels={["pusat"]} />
    }
  >
    <Route
      path="/center-dashboard"
      element={
        <routeHelpers.LazyPage title="Dashboard Center" Component={CenterDash} />
      }
    />
    <Route
      path="/center-homebase"
      element={
        <routeHelpers.LazyPage
          title="Manajemen Satuan Pendidikan"
          Component={CenterHome}
        />
      }
    />
    <Route
      path="/center-admin"
      element={
        <routeHelpers.LazyPage title="Manajemen Admin" Component={CenterAdmin} />
      }
    />
    <Route
      path="/center-teacher"
      element={
        <routeHelpers.LazyPage
          title="Manajement Guru"
          Component={CenterTeacher}
        />
      }
    />
    <Route
      path="/center-market"
      element={
        <routeHelpers.LazyPage
          title="Analisis Pasar & Demografi"
          Component={CenterMarket}
        />
      }
    />
    <Route
      path="/center-config"
      element={
        routeHelpers.isDbEnabled ? (
          <routeHelpers.LazyPage
            title="Manjemen Database"
            Component={CenterConfig}
          />
        ) : (
          <routeHelpers.NotFoundRedirect />
        )
      }
    />
  </Route>
);

export default renderCenterRoutes;
