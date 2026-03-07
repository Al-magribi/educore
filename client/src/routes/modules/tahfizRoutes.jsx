import { Route } from "react-router-dom";

import { AppLayout } from "../../components";
import RouteProtection from "../../utils/RouteProtection";

const renderTahfizRoutes = () => (
  <Route
    element={
      <RouteProtection allowedRoles={["admin"]} allowedLevels={["tahfiz"]} />
    }
  >
    <Route
      path="/tahfiz-dashboard"
      element={
        <AppLayout title="Dashboard Tahfiz">
          <div>Halaman Admin Tahfiz</div>
        </AppLayout>
      }
    />
  </Route>
);

export default renderTahfizRoutes;
