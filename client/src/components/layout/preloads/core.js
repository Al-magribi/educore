// Preload modul halaman inti (center, admin, dashboard) saat menu di-hover.
// Milik branch `main`. Domain lain menambah entri di file domainnya sendiri.
const corePreloads = {
  "/profile": () => import("../../profile/Profile"),
  "/center-dashboard": () =>
    import("../../../module/center/dashboard/CenterDash"),
  "/center-homebase": () =>
    import("../../../module/center/homebase/CenterHome"),
  "/center-admin": () => import("../../../module/center/admin/CenterAdmin"),
  "/center-teacher": () =>
    import("../../../module/center/teacher/CenterTeacher"),
  "/center-market": () => import("../../../module/center/market/CenterMarket"),
  "/center-config": () => import("../../../module/center/config/CenterConfig"),
  "/admin-dashboard": () =>
    import("../../../module/admin/dashboard/AdminDash"),
  "/admin-data-pokok": () => import("../../../module/admin/main/AdminMain"),
  "/admin-data-akademik": () =>
    import("../../../module/admin/academic/AdminAcademinc"),
  "/siswa-dashboard": () =>
    import("../../../module/student/dashboard/StudentDash"),
  "/orangtua-dashboard": () =>
    import("../../../module/parent/dashboard/ParentDash"),
  "/guru-dashboard": () =>
    import("../../../module/teacher/dashboard/TeacherDash"),
};

export default corePreloads;
