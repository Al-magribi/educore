// App.jsx
import { Suspense, lazy } from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useLoadUserQuery } from "./service/auth/ApiAuth";
import { AppLayout, AppMetadata, LoadApp } from "./components";
import RouterPublic from "./utils/RoutePublic";
import RouteProtection from "./utils/RouteProtection";

import { Forgot, Reset, Signin, Signup } from "./module/auth";

const Profile = lazy(() => import("./components/profile/Profile"));

// ADMIN LEVEL CENTER
const CenterDash = lazy(() => import("./module/center/dashboard/CenterDash"));
const CenterHome = lazy(() => import("./module/center/homebase/CenterHome"));
const CenterAdmin = lazy(() => import("./module/center/admin/CenterAdmin"));
const CenterTeacher = lazy(
  () => import("./module/center/teacher/CenterTeacher"),
);
const CenterMarket = lazy(() => import("./module/center/market/CenterMarket"));
const CenterConfig = lazy(() => import("./module/center/config/CenterConfig"));

// ADMIN LEVEL SATUAN
const AdminDash = lazy(() => import("./module/admin/dashboard/AdminDash"));
const AdminMain = lazy(() => import("./module/admin/main/AdminMain"));
const AdminAcademinc = lazy(
  () => import("./module/admin/academic/AdminAcademinc"),
);

// CBT (ADMIN LEVEL SATUAN & GURU) Menggunakan lazy
const BankList = lazy(() => import("./module/cbt/bank/view/BankList"));
const ExamList = lazy(() => import("./module/cbt/exam/view/ExamList"));
const StudentExamList = lazy(
  () => import("./module/cbt/student/view/StudentExamList"),
);
const ExamInterface = lazy(
  () => import("./module/cbt/student/view/ExamInterface"),
);

const StudentDash = lazy(
  () => import("./module/student/dashboard/StudentDash"),
);
const TeacherDash = lazy(
  () => import("./module/teacher/dashboard/TeacherDash"),
);

// LMS
const LmsManagement = lazy(() => import("./module/lms/manager/LmsManagement"));
const SubjectList = lazy(() => import("./module/lms/student/SubjectList"));
const Parent = lazy(() => import("./module/lms/parent/Parent"));

const NotFoundRedirect = () => {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  switch (user.role) {
    case "student":
      return <Navigate to="/siswa-dashboard" replace />;
    case "teacher":
      return <Navigate to="/guru-dashboard" replace />;
    case "parent":
      return <Navigate to="/parent-dashboard" replace />;
    case "admin":
    case "center":
      if (user.level === "pusat") {
        return <Navigate to="/center-dashboard" replace />;
      }
      if (user.level === "tahfiz") {
        return <Navigate to="/tahfiz-dashboard" replace />;
      }
      return <Navigate to="/admin-dashboard" replace />;
    default:
      return <Navigate to="/" replace />;
  }
};

const LazyRoute = ({ Component }) => (
  <Suspense fallback={<LoadApp />}>
    <Component />
  </Suspense>
);

const LazyPage = ({ title, Component }) => (
  <AppLayout title={title}>
    <LazyRoute Component={Component} />
  </AppLayout>
);

const App = () => {
  useLoadUserQuery();

  return (
    <BrowserRouter>
      <AppMetadata />
      <Routes>
        {/* === PUBLIC ROUTES === */}
        {/* RouterPublic akan otomatis redirect user login ke dashboard masing-masing */}
        <Route element={<RouterPublic />}>
          <Route path="/" element={<Signin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<Forgot />} />
          <Route path="/reset-password" element={<Reset />} />
        </Route>

        {/* === PROTECTED ROUTES WITH PERSISTENT LAYOUT SHELL === */}
        <Route
          element={
            <RouteProtection
              allowedRoles={["admin", "teacher", "student", "parent"]}
              allowedLevels={["pusat", "satuan", "tahfiz"]}
            />
          }
        >
          <Route element={<AppLayout asShell />}>
            {/* 1. ADMIN PUSAT (Center) */}
            <Route
              element={
                <RouteProtection
                  allowedRoles={["admin"]}
                  allowedLevels={["pusat"]}
                />
              }
            >
              <Route
                path="/center-dashboard"
                element={
                  <LazyPage title="Dashboard Center" Component={CenterDash} />
                }
              />
              <Route
                path="/center-homebase"
                element={
                  <LazyPage
                    title="Manajemen Satuan Pendidikan"
                    Component={CenterHome}
                  />
                }
              />
              <Route
                path="/center-admin"
                element={
                  <LazyPage title="Manajemen Admin" Component={CenterAdmin} />
                }
              />
              <Route
                path="/center-teacher"
                element={
                  <LazyPage title="Manajement Guru" Component={CenterTeacher} />
                }
              />
              <Route
                path="/center-market"
                element={
                  <LazyPage
                    title="Analisis Pasar & Demografi"
                    Component={CenterMarket}
                  />
                }
              />
              <Route
                path="/center-config"
                element={
                  <LazyPage
                    title="Manjemen Database"
                    Component={CenterConfig}
                  />
                }
              />
            </Route>

            {/* 2. ADMIN SATUAN (Sekolah Biasa) */}
            <Route
              element={
                <RouteProtection
                  allowedRoles={["admin"]}
                  allowedLevels={["satuan"]}
                />
              }
            >
              <Route
                path="/admin-dashboard"
                element={
                  <LazyPage title="Dashboard Satuan" Component={AdminDash} />
                }
              />
              <Route
                path="/admin-data-pokok"
                element={<LazyPage title="Data Pokok" Component={AdminMain} />}
              />
              <Route
                path="/admin-data-akademik"
                element={
                  <LazyPage
                    title="Manajemen Pendidikan"
                    Component={AdminAcademinc}
                  />
                }
              />
            </Route>

            {/* 3. CBT */}
            <Route
              element={
                <RouteProtection
                  allowedRoles={["teacher", "admin"]}
                  allowedLevels={["satuan"]}
                />
              }
            >
              <Route
                path="/computer-based-test/bank"
                element={
                  <LazyPage title="Manajemen Bank Soal" Component={BankList} />
                }
              />
              <Route
                path="/computer-based-test/jadwal-ujian"
                element={
                  <LazyPage
                    title="Manajemen Jadwal Ujian"
                    Component={ExamList}
                  />
                }
              />
            </Route>

            {/* 4. ADMIN TAHFIZ */}
            <Route
              element={
                <RouteProtection
                  allowedRoles={["admin"]}
                  allowedLevels={["tahfiz"]}
                />
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

            {/* 5. TEACHER */}
            <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
              <Route
                path="/guru-dashboard"
                element={
                  <LazyPage title="Dashboard Guru" Component={TeacherDash} />
                }
              />
            </Route>

            {/* 6. STUDENT */}
            <Route element={<RouteProtection allowedRoles={["student"]} />}>
              <Route
                path="/siswa-dashboard"
                element={<LazyPage title="Dashboard" Component={StudentDash} />}
              />
              <Route
                path="/siswa/jadwal-ujian"
                element={
                  <LazyPage title="Jadwal Ujian" Component={StudentExamList} />
                }
              />
            </Route>

            {/* 7. PARENT */}
            <Route element={<RouteProtection allowedRoles={["parent"]} />}>
              <Route
                path="/parent-dashboard"
                element={
                  <AppLayout title="Dashboard Orang Tua">
                    <div>Halaman Orang Tua</div>
                  </AppLayout>
                }
              />
            </Route>

            {/* 8. PROFILE */}
            <Route
              element={
                <RouteProtection
                  allowedRoles={["admin", "teacher", "student", "parent"]}
                  allowedLevels={["pusat", "satuan", "tahfiz"]}
                />
              }
            >
              <Route
                path="/profile"
                element={<LazyPage title="Profile Saya" Component={Profile} />}
              />
            </Route>

            {/* 9. LMS */}
            <Route
              element={
                <RouteProtection
                  allowedRoles={["admin", "teacher", "student"]}
                />
              }
            >
              <Route
                path="/manajemen-lms"
                element={
                  <LazyPage title="Manajemen LMS" Component={LmsManagement} />
                }
              />

              <Route
                path="/manajemen-lms/data-orang-tua"
                element={
                  <LazyPage title="Daftar Orang Tua" Component={Parent} />
                }
              />

              <Route
                path="/siswa/mata-pelajaran"
                element={
                  <LazyPage title="Mata Pelajaran" Component={SubjectList} />
                }
              />
            </Route>
          </Route>
        </Route>

        {/* Student exam page intentionally outside shell (fullscreen flow) */}
        <Route element={<RouteProtection allowedRoles={["student"]} />}>
          <Route
            path="/computer-based-test/start"
            element={<LazyRoute Component={ExamInterface} />}
          />
        </Route>

        {/* CATCH-ALL */}
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
