// Milik feature/db. Tambahkan preload halaman domain ini di sini, bukan di AppLayout.
const dbPreloads = {
  "/admin-database": () =>
    import("../../../module/database/manager/DatabaseManager"),
  "/siswa-database": () =>
    import("../../../module/database/view/StudentDatabase"),
  "/orangtua-database-siswa": () =>
    import("../../../module/database/view/ParentStudentDatabase"),
  "/guru-database-kelas": () =>
    import("../../../module/database/manager/ClassDbManager"),
};

export default dbPreloads;
