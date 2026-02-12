// App.jsx
import { Suspense, lazy } from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useLoadUserQuery } from "./service/auth/ApiAuth";
import { AppMetadata, LoadApp } from "./components";
import RouterPublic from "./utils/RoutePublic";
import RouteProtection from "./utils/RouteProtection";

import { Forgot, Reset, Signin, Signup } from "./module/auth";

const Profile = lazy(() => import("./components/profile/Profile"));

// ADMIN LEVEL CENTER
const CenterDash = lazy(() => import("./module/center/dashboard/CenterDash"));
const CenterHome = lazy(() => import("./module/center/homebase/CenterHome"));
const CenterAdmin = lazy(() => import("./module/center/admin/CenterAdmin"));
const CenterTeacher = lazy(() => import("./module/center/teacher/CenterTeacher"));
const CenterMarket = lazy(() => import("./module/center/market/CenterMarket"));
const CenterConfig = lazy(() => import("./module/center/config/CenterConfig"));

// ADMIN LEVEL SATUAN
const AdminDash = lazy(() => import("./module/admin/dashboard/AdminDash"));
const AdminMain = lazy(() => import("./module/admin/main/AdminMain"));
const AdminAcademinc = lazy(
  () => import("./module/admin/academic/AdminAcademinc"),
);

// CBT (ADMIN LEVEL SATUAN & GURU)
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

const App = () => {
  useLoadUserQuery();

  return (
    <BrowserRouter>
      <AppMetadata />
      <Suspense fallback={<LoadApp />}>
        <Routes>
          {/* === PUBLIC ROUTES === */}
          {/* RouterPublic akan otomatis redirect user login ke dashboard masing-masing */}
          <Route element={<RouterPublic />}>
            <Route path="/" element={<Signin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<Forgot />} />
            <Route path="/reset-password" element={<Reset />} />
          </Route>

          {/* === PROTECTED ROUTES === */}

          {/* 1. ADMIN PUSAT (Center) */}
          {/* Bisa diakses oleh role 'center' ATAU 'admin' dengan level 'pusat' */}
          <Route
            element={
              <RouteProtection
                allowedRoles={["admin"]}
                allowedLevels={["pusat"]}
              />
            }
          >
            <Route path="/center-dashboard" element={<CenterDash />} />
            <Route path="/center-homebase" element={<CenterHome />} />
            <Route path="/center-admin" element={<CenterAdmin />} />
            <Route path="/center-teacher" element={<CenterTeacher />} />
            <Route path="/center-market" element={<CenterMarket />} />
            <Route path="/center-config" element={<CenterConfig />} />
          </Route>

          {/* 2. ADMIN SATUAN (Sekolah Biasa) */}
          <Route
            element={
              <RouteProtection
                allowedRoles={["admin"]}
                allowedLevels={["satuan"]} // sesuaikan dengan default db
              />
            }
          >
            {/* <Route path="/admin-dashboard" element={<AdminDash />} /> */}
            <Route path="/admin-dashboard" element={<AdminDash />} />
            <Route path="/admin-data-pokok" element={<AdminMain />} />
            <Route path="/admin-data-akademik" element={<AdminAcademinc />} />
          </Route>

          {/* 3. CBT */}
          {/* LEVEL SATUAN & GURU */}
          <Route
            element={
              <RouteProtection
                allowedRoles={["teacher", "admin"]}
                allowedLevels={["satuan"]}
              />
            }
          >
            <Route path="/computer-based-test/bank" element={<BankList />} />
            <Route
              path="/computer-based-test/jadwal-ujian"
              element={<ExamList />}
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
            {/* <Route path="/tahfiz-dashboard" element={<TahfizDash />} /> */}
            <Route
              path="/tahfiz-dashboard"
              element={<div>Halaman Admin Tahfiz</div>}
            />
          </Route>

          {/* 5. TEACHER */}
          <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
            {/* <Route path="/teacher-dashboard" element={<TeacherDash />} /> */}
            <Route path="/guru-dashboard" element={<TeacherDash />} />
          </Route>

          {/* 6. STUDENT */}
          <Route element={<RouteProtection allowedRoles={["student"]} />}>
            {/* <Route path="/student-dashboard" element={<StudentDash />} /> */}
            <Route path="/siswa-dashboard" element={<StudentDash />} />
            <Route path="/siswa/jadwal-ujian" element={<StudentExamList />} />
            <Route
              path="/computer-based-test/start"
              element={<ExamInterface />}
            />
          </Route>

          {/* 7. PARENT */}
          <Route element={<RouteProtection allowedRoles={["parent"]} />}>
            {/* <Route path="/parent-dashboard" element={<ParentDash />} /> */}
            <Route
              path="/parent-dashboard"
              element={<div>Halaman Orang Tua</div>}
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
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* 9. CATCH-ALL */}
          <Route path="*" element={<NotFoundRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
