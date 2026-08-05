import dayjs from "dayjs";

export const formatTimestampToTime = (value) => {
  if (!value) return "";
  return dayjs(value).format("HH:mm");
};

export const formatScheduleTime = (value) =>
  value ? String(value).slice(0, 5) : "-";

export const formatScheduleJamLabel = (slotNos = []) => {
  const sorted = [...(slotNos || [])]
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .sort((a, b) => a - b);

  if (!sorted.length) return "-";
  if (sorted.length === 1) return `Jam ${sorted[0]}`;
  return `Jam ${sorted[0]} - Jam ${sorted[sorted.length - 1]}`;
};

export const buildDayScheduleRows = (payload) =>
  (payload.schedule_entries || []).map((entry, index) => {
    const slotNos = Array.isArray(entry.slot_nos) ? entry.slot_nos : [];
    return {
      key: entry.id || `schedule-${index}`,
      id: entry.id,
      teacher_id: entry.teacher_id,
      teacher_name: entry.teacher_name,
      class_id: entry.class_id,
      class_name: entry.class_name,
      subject_id: entry.subject_id,
      subject_name: entry.subject_name,
      start_time: entry.start_time,
      end_time: entry.end_time,
      slot_nos: slotNos,
      jam_label: formatScheduleJamLabel(slotNos),
      time_label: `${formatScheduleTime(entry.start_time)} - ${formatScheduleTime(entry.end_time)}`,
    };
  });

export const buildTeacherSessionRows = (payload) => {
  const entryById = new Map(
    (payload.schedule_entries || []).map((entry) => [Number(entry.id), entry]),
  );

  if (payload.session_logs?.length) {
    return payload.session_logs.map((item, index) => {
      const entry = entryById.get(Number(item.schedule_entry_id));
      const slotNos = Array.isArray(entry?.slot_nos) ? entry.slot_nos : [];
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
        slot_nos: slotNos,
        jam_label: formatScheduleJamLabel(slotNos),
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
