import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const FinanceDash = lazy(
  () => import("../../module/finance/dashboard/FinanceDash"),
);

const renderFinanceRoutes = ({ LazyPage }) => {
  const Page = LazyPage;

  return (
    <Route
      element={
        <RouteProtection
          allowedRoles={["admin"]}
          allowedLevels={["finance", "keuangan"]}
        />
      }
    >
      <Route
        path="/finance-dashboard"
        element={<Page title="Dashboard Keuangan" Component={FinanceDash} />}
      />
    </Route>
  );
};

export default renderFinanceRoutes;
