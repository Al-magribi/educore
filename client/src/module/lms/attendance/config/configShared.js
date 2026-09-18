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
  activity_attendance: {
    title: "Absensi Kegiatan Ekstra",
    description:
      "Aktifkan absensi kegiatan ekstrakurikuler dari device khusus (policy per user/hari/jam).",
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
  {
    label: "Kegiatan Ekstra - Fixed",
    value: "activity_fixed",
    role: "all",
  },
];

export const POLICY_TARGET_ROLE_OPTIONS = [
  { label: "Siswa", value: "student" },
  { label: "Guru", value: "teacher" },
  { label: "Guru & Siswa", value: "all" },
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

/** Normalize DB/API time (`11:00:00`, dayjs, Date) to `HH:mm` or null. */
export const toTimeHm = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value?.format === "function") {
    return value.format("HH:mm");
  }
  const text = String(value).trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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
      checkin_start: toTimeHm(current?.checkin_start),
      checkin_end: toTimeHm(current?.checkin_end),
      reference_checkin_time: toTimeHm(current?.reference_checkin_time),
      late_tolerance_minutes: Number(current?.late_tolerance_minutes || 0),
      checkout_start: toTimeHm(current?.checkout_start),
      reference_checkout_time: toTimeHm(current?.reference_checkout_time),
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
