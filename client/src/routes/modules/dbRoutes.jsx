import { lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const DatabaseManager = lazy(
  () => import("../../module/database/manager/DatabaseManager"),
);
const ClassDbManager = lazy(
  () => import("../../module/database/manager/ClassDbManager"),
);
const StudentDatabase = lazy(
  () => import("../../module/database/view/StudentDatabase"),
);
const ParentStudentDatabase = lazy(
  () => import("../../module/database/view/ParentStudentDatabase"),
);

const renderDbRoutes = ({ LazyPage }) => (
  <>
    <Route
      element={
        <RouteProtection allowedRoles={["admin"]} allowedLevels={["satuan"]} />
      }
    >
      <Route
        path="/admin-database"
        element={<LazyPage title="Database Siswa" Component={DatabaseManager} />}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
      <Route
        path="/guru-database-kelas"
        element={<LazyPage title="Database Kelas" Component={ClassDbManager} />}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["student"]} />}>
      <Route
        path="/siswa-database"
        element={<LazyPage title="Database Siswa" Component={StudentDatabase} />}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["parent"]} />}>
      <Route
        path="/orangtua-database-siswa"
        element={
          <LazyPage title="Database Data Siswa" Component={ParentStudentDatabase} />
        }
      />
    </Route>
  </>
);

export default renderDbRoutes;
