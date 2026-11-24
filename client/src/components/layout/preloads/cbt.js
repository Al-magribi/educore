// Milik feature CBT. Tambahkan preload halaman CBT di sini, bukan di AppLayout.
const cbtPreloads = {
  "/computer-based-test/bank": () =>
    import("../../../module/cbt/bank/view/BankList"),
  "/computer-based-test/jadwal-ujian": () =>
    import("../../../module/cbt/exam/view/ExamList"),
  "/computer-based-test/start": () =>
    import("../../../module/cbt/student/view/ExamInterface"),
  "/siswa/jadwal-ujian": () =>
    import("../../../module/cbt/student/view/StudentExamList"),
  "/guru/ai-config": () => import("../../../module/teacher/ai/AiConfig"),
};

export default cbtPreloads;
