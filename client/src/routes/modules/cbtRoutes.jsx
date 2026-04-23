import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const BankList = lazy(() => import("../../module/cbt/bank/view/BankList"));
const ExamList = lazy(() => import("../../module/cbt/exam/view/ExamList"));
const ExamInterface = lazy(
  () => import("../../module/cbt/student/view/ExamInterface"),
);

const renderCbtShellRoutes = ({ LazyPage }) => (
  <Route
    element={
      <RouteProtection allowedRoles={["teacher", "admin"]} allowedLevels={["satuan"]} />
    }
  >
    <Route
      path="/computer-based-test/bank"
      element={createElement(LazyPage, {
        title: "Manajemen Bank Soal",
        Component: BankList,
      })}
    />
    <Route
      path="/computer-based-test/jadwal-ujian"
      element={createElement(LazyPage, {
        title: "Manajemen Jadwal Ujian",
        Component: ExamList,
      })}
    />
  </Route>
);

const renderCbtStandaloneRoutes = ({ LazyRoute }) => (
  <Route element={<RouteProtection allowedRoles={["student"]} />}>
    <Route
      path="/computer-based-test/start"
      element={createElement(LazyRoute, { Component: ExamInterface })}
    />
  </Route>
);

export { renderCbtShellRoutes, renderCbtStandaloneRoutes };
