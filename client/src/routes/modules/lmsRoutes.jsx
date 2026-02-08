import { lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const LmsManagement = lazy(() => import("../../module/lms/manager/LmsManagement"));

const renderLmsRoutes = ({ LazyRoute }) => (
  <Route
    element={
      <RouteProtection allowedRoles={["admin", "teacher", "student"]} />
    }
  >
    <Route
      path="/manajemen-lms"
      element={<LazyRoute Component={LmsManagement} />}
    />
  </Route>
);

export default renderLmsRoutes;
