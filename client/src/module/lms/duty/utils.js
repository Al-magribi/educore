import dayjs from "dayjs";

export const formatTimestampToTime = (value) => {
  if (!value) return "";
  return dayjs(value).format("HH:mm");
};

export const buildTeacherSessionRows = (payload) => {
  const entryById = new Map(
    (payload.schedule_entries || []).map((entry) => [Number(entry.id), entry]),
  );

  if (payload.session_logs?.length) {
    return payload.session_logs.map((item, index) => {
      const entry = entryById.get(Number(item.schedule_entry_id));
      return {
        key: item.id || `session-${index}`,
        id: item.id || null,
        schedule_entry_id: item.schedule_entry_id,
        teacher_id: item.teacher_id,
        teacher_name: item.teacher_name || entry?.teacher_name,
        class_id: item.class_id || entry?.class_id,
        class_name: item.class_name || entry?.class_name,
        subject_name: item.subject_name || entry?.subject_name,
        start_time: entry?.start_time || null,
        end_time: entry?.end_time || null,
        checkin_at: item.checkin_at || null,
        checkout_at: item.checkout_at || null,
        checkin_time: formatTimestampToTime(item.checkin_at),
        checkout_time: formatTimestampToTime(item.checkout_at),
        note: item.note || "",
      };
    });
  }

  return [];
};

export const buildStudentAbsenceRows = (payload) =>
  (payload.student_absences || []).map((item, index) => ({
    key: item.id || `student-${index}`,
    student_id: item.student_id,
    class_id: item.class_id,
    reason: item.reason || "",
    follow_up: item.follow_up || "",
  }));

export const buildTeacherAbsenceRows = (payload) =>
  (payload.teacher_absences || []).map((item, index) => ({
    key: item.id || `teacher-${index}`,
    teacher_id: item.teacher_id,
    reason: item.reason || "",
    follow_up: item.follow_up || "",
  }));
