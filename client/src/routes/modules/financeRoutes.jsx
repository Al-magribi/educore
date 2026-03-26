import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const FinanceDash = lazy(() => import("../../module/finance/dashboard/FinanceDash"));

const renderFinanceRoutes = ({ LazyPage }) => (
  <Route
    element={
      <RouteProtection allowedRoles={["admin"]} allowedLevels={["finance"]} />
    }
  >
    <Route
      path="/finance-dashboard"
      element={createElement(LazyPage, {
        title: "Dashboard Finance",
        Component: FinanceDash,
      })}
    />
  </Route>
);

export default renderFinanceRoutes;
