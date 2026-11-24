import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";
import withMuseTheme from "../../components/ui/muse/withMuseTheme";

const BankList = lazy(() => import("../../module/cbt/bank/view/BankList"));
const ExamList = lazy(() => import("../../module/cbt/exam/view/ExamList"));
const AiConfig = lazy(() => import("../../module/teacher/ai/AiConfig"));
const ExamInterface = lazy(
  () => import("../../module/cbt/student/view/ExamInterface"),
);

// Module CBT memakai theme Muse (lihat CLAUDE.md).
const BankListPage = withMuseTheme(BankList);
const ExamListPage = withMuseTheme(ExamList);
const ExamInterfacePage = withMuseTheme(ExamInterface);

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
        Component: BankListPage,
      })}
    />
    <Route
      path="/computer-based-test/jadwal-ujian"
      element={createElement(LazyPage, {
        title: "Manajemen Jadwal Ujian",
        Component: ExamListPage,
      })}
    />
    <Route
      path="/guru/ai-config"
      element={createElement(LazyPage, {
        title: "Konfigurasi AI Guru",
        Component: AiConfig,
      })}
    />
  </Route>
);

const renderCbtStandaloneRoutes = ({ LazyRoute }) => (
  <Route element={<RouteProtection allowedRoles={["student"]} />}>
    <Route
      path="/computer-based-test/start"
      element={createElement(LazyRoute, { Component: ExamInterfacePage })}
    />
  </Route>
);

export { renderCbtShellRoutes, renderCbtStandaloneRoutes };
