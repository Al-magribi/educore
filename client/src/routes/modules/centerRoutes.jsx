import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";
import withMuseTheme from "../../components/ui/muse/withMuseTheme";

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

// Module center memakai theme Muse (lihat CLAUDE.md).
const CenterDashPage = withMuseTheme(CenterDash);
const CenterHomePage = withMuseTheme(CenterHome);
const CenterAdminPage = withMuseTheme(CenterAdmin);
const CenterTeacherPage = withMuseTheme(CenterTeacher);
const CenterMarketPage = withMuseTheme(CenterMarket);
const CenterConfigPage = withMuseTheme(CenterConfig);

const renderCenterRoutes = ({ LazyPage, NotFoundRedirect, isDbEnabled }) => (
  <Route
    element={
      <RouteProtection allowedRoles={["admin"]} allowedLevels={["pusat"]} />
    }
  >
    <Route
      path='/center-dashboard'
      element={createElement(LazyPage, {
        title: "Dashboard Center",
        Component: CenterDashPage,
      })}
    />
    <Route
      path='/center-homebase'
      element={createElement(LazyPage, {
        title: "Manajemen Satuan Pendidikan",
        Component: CenterHomePage,
      })}
    />
    <Route
      path='/center-admin'
      element={createElement(LazyPage, {
        title: "Manajemen Admin",
        Component: CenterAdminPage,
      })}
    />
    <Route
      path='/center-teacher'
      element={createElement(LazyPage, {
        title: "Manajemen Guru",
        Component: CenterTeacherPage,
      })}
    />
    <Route
      path='/center-analysis'
      element={createElement(LazyPage, {
        title: "Analisis Pasar & Demografi",
        Component: CenterMarketPage,
      })}
    />
    <Route
      path='/center-config'
      element={
        isDbEnabled ? (
          createElement(LazyPage, {
            title: "Manajemen Database",
            Component: CenterConfigPage,
          })
        ) : (
          createElement(NotFoundRedirect)
        )
      }
    />
  </Route>
);

export default renderCenterRoutes;
