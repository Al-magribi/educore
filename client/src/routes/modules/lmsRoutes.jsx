import { lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const LmsManagement = lazy(
  () => import("../../module/lms/manager/LmsManagement"),
);
const Schedule = lazy(() => import("../../module/lms/schedule/Schedule"));
const Duty = lazy(() => import("../../module/lms/duty/Duty"));

const renderLmsRoutes = ({ LazyRoute }) => (
  <Route
    element={
      <RouteProtection
        allowedRoles={["admin", "teacher", "student"]}
        allowedLevels={["satuan"]}
      />
    }
  >
    <Route
      path='/manajemen-mata-pelajaran'
      element={
        <LazyRoute title='Manajemen Mata Pelajaran' Component={LmsManagement} />
      }
    />

    <Route
      path='/manajemen-jadwal'
      element={<LazyRoute title='Manajemen Jadwal' Component={Schedule} />}
    />

    <Route
      path='/manajemen-piket'
      element={<LazyRoute title='Manajemen Piket' Component={Duty} />}
    />
  </Route>
);

export default renderLmsRoutes;
