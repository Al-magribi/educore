// App.jsx
import { Suspense } from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useLoadUserQuery } from "./service/auth/ApiAuth";
import { AppMetadata, LoadApp, Profile } from "./components";
import RouterPublic from "./utils/RoutePublic";
import RouteProtection from "./utils/RouteProtection";

import { Forgot, Reset, Signin, Signup } from "./module/auth";

// ADMIN LEVEL CENTER
import {
  CenterAdmin,
  CenterConfig,
  CenterDash,
  CenterHome,
  CenterMarket,
  CenterTeacher,
} from "./module/center";

//ADMIN LEVEL SATUAN
import { AdminAcademinc, AdminDash, AdminMain } from "./module/admin";

// CBT
// ADMIN LEVEL SATUAN & GURU
import {
  BankList,
  ExamInterface,
  ExamList,
  StudentExamList,
} from "./module/cbt";
import { StudentDash } from "./module/student";
import { TeacherDash } from "./module/teacher/index.";
import { LmsManagement } from "./module/lms";

const NotFoundRedirect = () => {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return <Navigate to='/' replace />;
  }

  switch (user.role) {
    case "student":
      return <Navigate to='/siswa-dashboard' replace />;
    case "teacher":
      return <Navigate to='/guru-dashboard' replace />;
    case "parent":
      return <Navigate to='/parent-dashboard' replace />;
    case "admin":
    case "center":
      if (user.level === "pusat") {
        return <Navigate to='/center-dashboard' replace />;
      }
      if (user.level === "tahfiz") {
        return <Navigate to='/tahfiz-dashboard' replace />;
      }
      return <Navigate to='/admin-dashboard' replace />;
    default:
      return <Navigate to='/' replace />;
  }
};

const App = () => {
  const { isLoading } = useLoadUserQuery();

  if (isLoading) {
    return <LoadApp />;
  }

  return (
    <BrowserRouter>
      <AppMetadata />
      <Suspense fallback={<LoadApp />}>
        <Routes>
          {/* === PUBLIC ROUTES === */}
          {/* RouterPublic akan otomatis redirect user login ke dashboard masing-masing */}
          <Route element={<RouterPublic />}>
            <Route path='/' element={<Signin />} />
            <Route path='/signup' element={<Signup />} />
            <Route path='/forgot-password' element={<Forgot />} />
            <Route path='/reset-password' element={<Reset />} />
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
            <Route path='/center-dashboard' element={<CenterDash />} />
            <Route path='/center-homebase' element={<CenterHome />} />
            <Route path='/center-admin' element={<CenterAdmin />} />
            <Route path='/center-teacher' element={<CenterTeacher />} />
            <Route path='/center-market' element={<CenterMarket />} />
            <Route path='/center-config' element={<CenterConfig />} />
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
            <Route path='/admin-dashboard' element={<AdminDash />} />
            <Route path='/admin-data-pokok' element={<AdminMain />} />
            <Route path='/admin-data-akademik' element={<AdminAcademinc />} />
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
            <Route path='/computer-based-test/bank' element={<BankList />} />
            <Route
              path='/computer-based-test/jadwal-ujian'
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
              path='/tahfiz-dashboard'
              element={<div>Halaman Admin Tahfiz</div>}
            />
          </Route>

          {/* 5. TEACHER */}
          <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
            {/* <Route path="/teacher-dashboard" element={<TeacherDash />} /> */}
            <Route path='/guru-dashboard' element={<TeacherDash />} />
          </Route>

          {/* 6. STUDENT */}
          <Route element={<RouteProtection allowedRoles={["student"]} />}>
            {/* <Route path="/student-dashboard" element={<StudentDash />} /> */}
            <Route path='/siswa-dashboard' element={<StudentDash />} />
            <Route path='/siswa/jadwal-ujian' element={<StudentExamList />} />
            <Route
              path='/computer-based-test/start'
              element={<ExamInterface />}
            />
          </Route>

          {/* 7. PARENT */}
          <Route element={<RouteProtection allowedRoles={["parent"]} />}>
            {/* <Route path="/parent-dashboard" element={<ParentDash />} /> */}
            <Route
              path='/parent-dashboard'
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
            <Route path='/profile' element={<Profile />} />
          </Route>

          {/* 9. CATCH-ALL */}
          <Route path='*' element={<NotFoundRedirect />} />

          {/* 10. LMS */}
          <Route
            element={
              <RouteProtection allowedRoles={["admin", "teacher", "student"]} />
            }
          >
            <Route path='/manajemen-lms' element={<LmsManagement />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
