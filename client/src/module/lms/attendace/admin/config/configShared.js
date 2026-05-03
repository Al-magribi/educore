export const DAY_OPTIONS = [
  { label: "Senin", value: 1 },
  { label: "Selasa", value: 2 },
  { label: "Rabu", value: 3 },
  { label: "Kamis", value: 4 },
  { label: "Jumat", value: 5 },
  { label: "Sabtu", value: 6 },
];

export const FEATURE_META = {
  student_daily_attendance: {
    title: "Absensi Harian Siswa",
    description:
      "Aktifkan pencatatan kehadiran harian siswa dari scan gerbang.",
  },
  student_checkout_logging: {
    title: "Log Checkout Siswa",
    description: "Aktifkan pencatatan scan pulang siswa.",
  },
  teacher_daily_attendance: {
    title: "Absensi Harian Guru",
    description: "Aktifkan evaluasi kehadiran harian guru.",
  },
  teacher_class_session_attendance: {
    title: "Absensi Sesi Kelas Guru",
    description: "Aktifkan pelacakan kepatuhan guru per sesi kelas.",
  },
};

export const POLICY_TYPE_OPTIONS = [
  { label: "Siswa - Fixed", value: "student_fixed", role: "student" },
  {
    label: "Guru - Schedule Based",
    value: "teacher_schedule_based",
    role: "teacher",
  },
  {
    label: "Guru - Fixed Daily",
    value: "teacher_fixed_daily",
    role: "teacher",
  },
];

export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const shellCardStyle = {
  borderRadius: 20,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.06)",
};

export const innerCardStyle = {
  borderRadius: 16,
  border: "1px solid #e8eef6",
  background: "#ffffff",
};

export const mapRuleRows = (rules = []) => {
  const map = new Map(
    (rules || []).map((rule) => [Number(rule.day_of_week), rule]),
  );
  return DAY_OPTIONS.map((day) => {
    const current = map.get(day.value);
    return {
      day_of_week: day.value,
      is_active: current?.is_active !== false,
      checkin_start: current?.checkin_start || null,
      checkin_end: current?.checkin_end || null,
      reference_checkin_time: current?.reference_checkin_time || null,
      late_tolerance_minutes: Number(current?.late_tolerance_minutes || 0),
      checkout_start: current?.checkout_start || null,
      reference_checkout_time: current?.reference_checkout_time || null,
      checkout_is_optional: current?.checkout_is_optional === true,
      min_presence_minutes:
        current?.min_presence_minutes === null ||
        current?.min_presence_minutes === undefined
          ? null
          : Number(current.min_presence_minutes),
      notes: current?.notes || null,
    };
  });
};
