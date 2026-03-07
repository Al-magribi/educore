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

const renderCenterRoutes = ({ LazyPage, NotFoundRedirect, isDbEnabled }) => (
  <Route
    element={
      <RouteProtection allowedRoles={["admin"]} allowedLevels={["pusat"]} />
    }
  >
    <Route
      path="/center-dashboard"
      element={<LazyPage title="Dashboard Center" Component={CenterDash} />}
    />
    <Route
      path="/center-homebase"
      element={
        <LazyPage title="Manajemen Satuan Pendidikan" Component={CenterHome} />
      }
    />
    <Route
      path="/center-admin"
      element={<LazyPage title="Manajemen Admin" Component={CenterAdmin} />}
    />
    <Route
      path="/center-teacher"
      element={<LazyPage title="Manajement Guru" Component={CenterTeacher} />}
    />
    <Route
      path="/center-market"
      element={
        <LazyPage title="Analisis Pasar & Demografi" Component={CenterMarket} />
      }
    />
    <Route
      path="/center-config"
      element={
        isDbEnabled ? (
          <LazyPage title="Manjemen Database" Component={CenterConfig} />
        ) : (
          <NotFoundRedirect />
        )
      }
    />
  </Route>
);

export default renderCenterRoutes;
