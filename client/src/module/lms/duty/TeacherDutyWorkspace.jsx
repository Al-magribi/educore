import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Flex,
  Grid,
  Input,
  Popconfirm,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CalendarCheck2,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useSaveTeacherDutyReportMutation } from "../../../service/lms/ApiDuty";
import {
  buildDayScheduleRows,
  buildStudentAbsenceRows,
  buildTeacherAbsenceRows,
  buildTeacherSessionRows,
  formatScheduleJamLabel,
  formatScheduleTime,
} from "./utils";
import TeacherDutyDailyNotePanel from "./components/TeacherDutyDailyNotePanel";
import TeacherDutyFormModal from "./components/TeacherDutyFormModal";
import TeacherDutyRecordSection from "./components/TeacherDutyRecordSection";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const modalInputStyle = {
  borderRadius: 14,
};

const mobileItemCardStyle = {
  borderRadius: 16,
  border: "1px solid #e8eef5",
  background: "#f8fbff",
};

const createEmptySessionForm = (dateValue) => ({
  key: null,
  teacher_id: null,
  class_id: null,
  schedule_entry_id: null,
  checkin_at: dayjs(`${dateValue} 07:00`, "YYYY-MM-DD HH:mm"),
  checkout_at: dayjs(`${dateValue} 08:00`, "YYYY-MM-DD HH:mm"),
  note: "",
});

const createEmptyStudentAbsenceForm = () => ({
  key: null,
  student_id: null,
  class_id: null,
  reason: "",
  follow_up: "",
});

const createEmptyTeacherAbsenceForm = () => ({
  key: null,
  teacher_id: null,
  reason: "",
  follow_up: "",
});

const TeacherDutyWorkspace = ({ payload, dateValue, onRefresh }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [studentAbsences, setStudentAbsences] = useState(() =>
    buildStudentAbsenceRows(payload),
  );
  const [teacherAbsences, setTeacherAbsences] = useState(() =>
    buildTeacherAbsenceRows(payload),
  );
  const [teacherSessions, setTeacherSessions] = useState(() =>
    buildTeacherSessionRows(payload),
  );
  const [dailyNote, setDailyNote] = useState(
    payload.assignment?.report_note || "",
  );
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState(() =>
    createEmptySessionForm(dateValue),
  );
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState(
    createEmptyStudentAbsenceForm(),
  );
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherForm, setTeacherForm] = useState(
    createEmptyTeacherAbsenceForm(),
  );

  const [saveTeacherDutyReport, { isLoading: saving }] =
    useSaveTeacherDutyReportMutation();

  const students = useMemo(() => payload.students || [], [payload.students]);
  const teachers = useMemo(() => payload.teachers || [], [payload.teachers]);
  const classes = useMemo(() => payload.classes || [], [payload.classes]);
  const scheduleEntries = useMemo(
    () => payload.schedule_entries || [],
    [payload.schedule_entries],
  );
  const teacherClassAssignments = useMemo(
    () => payload.teacher_class_assignments || [],
    [payload.teacher_class_assignments],
  );
  const tapSessions = useMemo(
    () => payload.tap_sessions || [],
    [payload.tap_sessions],
  );

  const classOptions = useMemo(
    () => classes.map((item) => ({ value: item.id, label: item.name })),
    [classes],
  );

  const studentOptions = useMemo(
    () =>
      students.map((item) => ({
        value: item.student_id,
        label: `${item.full_name} (${item.nis || "-"})`,
        class_id: item.class_id,
        searchText:
          `${item.full_name} ${item.nis || ""} ${item.class_name || ""}`.toLowerCase(),
      })),
    [students],
  );

  const teacherOptions = useMemo(
    () =>
      teachers.map((item) => ({
        value: item.id,
        label: item.full_name,
        searchText: `${item.full_name} ${item.nip || ""}`.toLowerCase(),
      })),
    [teachers],
  );

  const sessionCatalog = useMemo(() => {
    const grouped = new Map();

    for (const item of teacherClassAssignments) {
      const key = `${item.teacher_id}:${item.class_id}`;
      if (grouped.has(key)) {
        continue;
      }

      const matchingEntry = scheduleEntries.find(
        (entry) =>
          Number(entry.teacher_id) === Number(item.teacher_id) &&
          Number(entry.class_id) === Number(item.class_id),
      );

      grouped.set(key, {
        schedule_entry_id: matchingEntry?.id || null,
        teacher_id: item.teacher_id,
        teacher_name: item.teacher_name,
        class_id: item.class_id,
        class_name: item.class_name,
        subject_name: item.subject_name,
        start_time: matchingEntry?.start_time || null,
        end_time: matchingEntry?.end_time || null,
        label: item.class_name,
      });
    }

    return Array.from(grouped.values());
  }, [scheduleEntries, teacherClassAssignments]);

  const sessionClassOptions = useMemo(
    () =>
      sessionCatalog
        .filter((item) =>
          sessionForm.teacher_id
            ? Number(item.teacher_id) === Number(sessionForm.teacher_id)
            : true,
        )
        .map((item) => ({
          value: item.class_id,
          label: item.label,
        })),
    [sessionCatalog, sessionForm.teacher_id],
  );

  const handleSave = async (
    overrides = {},
    successMessage = "Laporan piket harian berhasil disimpan.",
  ) => {
    const nextStudentAbsences = overrides.student_absences || studentAbsences;
    const nextTeacherAbsences = overrides.teacher_absences || teacherAbsences;
    const nextTeacherSessions = overrides.teacher_sessions || teacherSessions;
    const nextDailyNote =
      overrides.daily_note !== undefined ? overrides.daily_note : dailyNote;

    try {
      await saveTeacherDutyReport({
        duty_assignment_id: payload.assignment?.id,
        date: dateValue,
        daily_note: nextDailyNote.trim(),
        student_absences: nextStudentAbsences,
        teacher_absences: nextTeacherAbsences,
        teacher_sessions: nextTeacherSessions.map((item) => ({
          schedule_entry_id: item.schedule_entry_id,
          class_id: item.class_id,
          teacher_id: item.teacher_id,
          checkin_time: item.checkin_at
            ? dayjs(item.checkin_at).format("HH:mm")
            : "",
          checkout_time: item.checkout_at
            ? dayjs(item.checkout_at).format("HH:mm")
            : "",
          note: item.note || "",
        })),
      }).unwrap();
      message.success(successMessage);
      onRefresh();
      return true;
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan laporan piket.");
      return false;
    }
  };

  const openCreateStudentModal = () => {
    setStudentForm(createEmptyStudentAbsenceForm());
    setStudentModalOpen(true);
  };

  const openEditStudentModal = (record) => {
    setStudentForm({
      key: record.key,
      student_id: record.student_id,
      class_id: record.class_id,
      reason: record.reason || "",
      follow_up: record.follow_up || "",
    });
    setStudentModalOpen(true);
  };

  const closeStudentModal = () => {
    setStudentModalOpen(false);
    setStudentForm(createEmptyStudentAbsenceForm());
  };

  const submitStudentModal = async () => {
    if (
      !studentForm.class_id ||
      !studentForm.student_id ||
      !studentForm.reason
    ) {
      message.warning("Kelas, siswa, dan alasan wajib diisi.");
      return;
    }

    const nextRow = {
      key: studentForm.key || `student-new-${Date.now()}`,
      student_id: studentForm.student_id,
      class_id: studentForm.class_id,
      reason: studentForm.reason,
      follow_up: studentForm.follow_up || "",
    };

    const nextStudentAbsences = (() => {
      const existing = studentAbsences.findIndex(
        (item) => item.key === nextRow.key,
      );
      if (existing >= 0) {
        return studentAbsences.map((item) =>
          item.key === nextRow.key ? nextRow : item,
        );
      }
      return [...studentAbsences, nextRow];
    })();

    const saved = await handleSave(
      { student_absences: nextStudentAbsences },
      studentForm.key
        ? "Perubahan siswa tidak masuk berhasil disimpan."
        : "Catatan siswa tidak masuk berhasil ditambahkan.",
    );

    if (!saved) return;

    setStudentAbsences(nextStudentAbsences);
    closeStudentModal();
  };

  const removeStudentAbsenceRow = async (key) => {
    const nextStudentAbsences = studentAbsences.filter(
      (item) => item.key !== key,
    );
    const saved = await handleSave(
      { student_absences: nextStudentAbsences },
      "Catatan siswa tidak masuk berhasil dihapus.",
    );
    if (!saved) return;
    setStudentAbsences(nextStudentAbsences);
  };

  const openCreateTeacherAbsenceModal = () => {
    setTeacherForm(createEmptyTeacherAbsenceForm());
    setTeacherModalOpen(true);
  };

  const openEditTeacherAbsenceModal = (record) => {
    setTeacherForm({
      key: record.key,
      teacher_id: record.teacher_id,
      reason: record.reason || "",
      follow_up: record.follow_up || "",
    });
    setTeacherModalOpen(true);
  };

  const closeTeacherModal = () => {
    setTeacherModalOpen(false);
    setTeacherForm(createEmptyTeacherAbsenceForm());
  };

  const submitTeacherModal = async () => {
    if (!teacherForm.teacher_id || !teacherForm.reason) {
      message.warning("Guru dan alasan wajib diisi.");
      return;
    }

    const nextRow = {
      key: teacherForm.key || `teacher-new-${Date.now()}`,
      teacher_id: teacherForm.teacher_id,
      reason: teacherForm.reason,
      follow_up: teacherForm.follow_up || "",
    };

    const nextTeacherAbsences = (() => {
      const existing = teacherAbsences.findIndex(
        (item) => item.key === nextRow.key,
      );
      if (existing >= 0) {
        return teacherAbsences.map((item) =>
          item.key === nextRow.key ? nextRow : item,
        );
      }
      return [...teacherAbsences, nextRow];
    })();

    const saved = await handleSave(
      { teacher_absences: nextTeacherAbsences },
      teacherForm.key
        ? "Perubahan guru tidak masuk berhasil disimpan."
        : "Catatan guru tidak masuk berhasil ditambahkan.",
    );

    if (!saved) return;

    setTeacherAbsences(nextTeacherAbsences);
    closeTeacherModal();
  };

  const removeTeacherAbsenceRow = async (key) => {
    const nextTeacherAbsences = teacherAbsences.filter(
      (item) => item.key !== key,
    );
    const saved = await handleSave(
      { teacher_absences: nextTeacherAbsences },
      "Catatan guru tidak masuk berhasil dihapus.",
    );
    if (!saved) return;
    setTeacherAbsences(nextTeacherAbsences);
  };

  const closeSessionModal = () => {
    setSessionModalOpen(false);
    setSessionForm(createEmptySessionForm(dateValue));
  };

  const handleSessionTeacherChange = (teacherId) => {
    setSessionForm((prev) => ({
      ...prev,
      teacher_id: teacherId,
      class_id: null,
      schedule_entry_id: null,
    }));
  };

  const handleSessionClassChange = (classId) => {
    const selectedEntry = sessionCatalog.find(
      (item) => Number(item.class_id) === Number(classId),
    );
    setSessionForm((prev) => ({
      ...prev,
      schedule_entry_id: selectedEntry?.schedule_entry_id || null,
      class_id: selectedEntry?.class_id || null,
    }));
  };

  const submitSessionModal = async () => {
    if (!sessionForm.teacher_id || !sessionForm.class_id) {
      message.warning("Pilih guru dan kelas terlebih dahulu.");
      return;
    }

    const selectedEntry =
      scheduleEntries.find(
        (item) => Number(item.id) === Number(sessionForm.schedule_entry_id),
      ) ||
      sessionCatalog.find(
        (item) => Number(item.class_id) === Number(sessionForm.class_id),
      );

    if (!selectedEntry) {
      message.warning("Kelas yang dipilih tidak valid.");
      return;
    }

    const scheduleEntryId =
      selectedEntry.id || selectedEntry.schedule_entry_id || null;

    const nextRow = {
      key: sessionForm.key || `session-new-${Date.now()}`,
      schedule_entry_id: scheduleEntryId,
      teacher_id: selectedEntry.teacher_id,
      teacher_name: selectedEntry.teacher_name,
      class_id: selectedEntry.class_id,
      class_name: selectedEntry.class_name,
      subject_name: selectedEntry.subject_name,
      start_time: selectedEntry.start_time,
      end_time: selectedEntry.end_time,
      slot_nos: selectedEntry.slot_nos,
      jam_label: formatScheduleJamLabel(selectedEntry.slot_nos),
      checkin_at: sessionForm.checkin_at
        ? sessionForm.checkin_at.toISOString()
        : null,
      checkout_at: sessionForm.checkout_at
        ? sessionForm.checkout_at.toISOString()
        : null,
      note: sessionForm.note || "",
    };

    const nextTeacherSessions = (() => {
      const existing = teacherSessions.findIndex(
        (item) => item.key === nextRow.key,
      );
      if (existing >= 0) {
        return teacherSessions.map((item) =>
          item.key === nextRow.key ? nextRow : item,
        );
      }
      const withoutDuplicate = teacherSessions.filter(
        (item) =>
          Number(item.schedule_entry_id) !== Number(nextRow.schedule_entry_id) &&
          (Number(item.teacher_id) !== Number(nextRow.teacher_id) ||
            Number(item.class_id) !== Number(nextRow.class_id)),
      );
      return [...withoutDuplicate, nextRow];
    })();

    const nextTeacherAbsences = teacherAbsences.filter(
      (item) => Number(item.teacher_id) !== Number(nextRow.teacher_id),
    );

    const saved = await handleSave(
      {
        teacher_sessions: nextTeacherSessions,
        teacher_absences: nextTeacherAbsences,
      },
      sessionForm.key
        ? "Perubahan guru masuk kelas berhasil disimpan."
        : "Catatan guru masuk kelas berhasil ditambahkan.",
    );

    if (!saved) return;

    setTeacherSessions(nextTeacherSessions);
    setTeacherAbsences(nextTeacherAbsences);
    closeSessionModal();
  };

  const upsertTeacherSessionFromSchedule = async (record, patch, successMessage) => {
    const existing = teacherSessions.find(
      (item) =>
        Number(item.schedule_entry_id) === Number(record.id) ||
        (Number(item.teacher_id) === Number(record.teacher_id) &&
          Number(item.class_id) === Number(record.class_id)),
    );

    const nextRow = {
      key: existing?.key || `session-new-${Date.now()}`,
      schedule_entry_id: record.id,
      teacher_id: record.teacher_id,
      teacher_name: record.teacher_name,
      class_id: record.class_id,
      class_name: record.class_name,
      subject_name: record.subject_name,
      start_time: record.start_time,
      end_time: record.end_time,
      slot_nos: record.slot_nos,
      jam_label: record.jam_label,
      checkin_at: existing?.checkin_at || null,
      checkout_at: existing?.checkout_at || null,
      note: existing?.note || "",
      ...patch,
    };

    const nextTeacherSessions = [
      ...teacherSessions.filter(
        (item) =>
          item.key !== nextRow.key &&
          Number(item.schedule_entry_id) !== Number(record.id) &&
          !(
            Number(item.teacher_id) === Number(record.teacher_id) &&
            Number(item.class_id) === Number(record.class_id)
          ),
      ),
      nextRow,
    ];

    const nextTeacherAbsences = teacherAbsences.filter(
      (item) => Number(item.teacher_id) !== Number(record.teacher_id),
    );

    const saved = await handleSave(
      {
        teacher_sessions: nextTeacherSessions,
        teacher_absences: nextTeacherAbsences,
      },
      successMessage,
    );
    if (!saved) return false;

    setTeacherSessions(nextTeacherSessions);
    setTeacherAbsences(nextTeacherAbsences);
    return true;
  };

  const handleSelectScheduleSession = (record) => {
    const existing = teacherSessions.find(
      (item) =>
        Number(item.schedule_entry_id) === Number(record.id) ||
        (Number(item.teacher_id) === Number(record.teacher_id) &&
          Number(item.class_id) === Number(record.class_id)),
    );

    const defaultCheckin = record.start_time
      ? dayjs(`${dateValue} ${formatScheduleTime(record.start_time)}`, "YYYY-MM-DD HH:mm")
      : dayjs(`${dateValue} 07:00`, "YYYY-MM-DD HH:mm");
    const defaultCheckout = record.end_time
      ? dayjs(`${dateValue} ${formatScheduleTime(record.end_time)}`, "YYYY-MM-DD HH:mm")
      : dayjs(`${dateValue} 08:00`, "YYYY-MM-DD HH:mm");

    setSessionForm({
      key: existing?.key || null,
      teacher_id: record.teacher_id,
      class_id: record.class_id,
      schedule_entry_id: record.id,
      checkin_at: existing?.checkin_at
        ? dayjs(existing.checkin_at)
        : defaultCheckin,
      checkout_at: existing?.checkout_at
        ? dayjs(existing.checkout_at)
        : defaultCheckout,
      note: existing?.note || "",
    });
    setSessionModalOpen(true);
  };

  const handleMarkScheduleMasuk = async (record) => {
    const checkinAt = record.start_time
      ? dayjs(
          `${dateValue} ${formatScheduleTime(record.start_time)}`,
          "YYYY-MM-DD HH:mm",
        ).toISOString()
      : dayjs().toISOString();
    const checkoutAt = record.end_time
      ? dayjs(
          `${dateValue} ${formatScheduleTime(record.end_time)}`,
          "YYYY-MM-DD HH:mm",
        ).toISOString()
      : null;

    await upsertTeacherSessionFromSchedule(
      record,
      {
        checkin_at: checkinAt,
        checkout_at: checkoutAt,
        note: "Masuk",
      },
      `${record.teacher_name} ditandai masuk kelas.`,
    );
  };

  const markScheduleAbsence = async (record, type) => {
    const isIzin = type === "izin";
    const label = isIzin ? "Izin" : "Tidak Masuk";

    const nextTeacherSessions = teacherSessions.filter(
      (item) =>
        Number(item.schedule_entry_id) !== Number(record.id) &&
        !(
          Number(item.teacher_id) === Number(record.teacher_id) &&
          Number(item.class_id) === Number(record.class_id)
        ),
    );

    const existingAbsence = teacherAbsences.find(
      (item) => Number(item.teacher_id) === Number(record.teacher_id),
    );

    const nextAbsence = {
      key: existingAbsence?.key || `teacher-${type}-${record.teacher_id}`,
      teacher_id: record.teacher_id,
      reason: `${label} (${record.subject_name} - ${record.class_name})`,
      follow_up: existingAbsence?.follow_up || "",
    };

    const nextTeacherAbsences = [
      ...teacherAbsences.filter(
        (item) => Number(item.teacher_id) !== Number(record.teacher_id),
      ),
      nextAbsence,
    ];

    const saved = await handleSave(
      {
        teacher_sessions: nextTeacherSessions,
        teacher_absences: nextTeacherAbsences,
      },
      `${record.teacher_name} ditandai ${label.toLowerCase()}.`,
    );
    if (!saved) return;

    setTeacherSessions(nextTeacherSessions);
    setTeacherAbsences(nextTeacherAbsences);
  };

  const handleMarkScheduleTidakMasuk = (record) =>
    markScheduleAbsence(record, "tidak_masuk");

  const resolveAttendanceStatus = (session, absence) => {
    if (absence) {
      const reason = String(absence.reason || "").toLowerCase();
      if (reason.startsWith("izin")) return "izin";
      if (reason.startsWith("tidak masuk")) return "tidak_masuk";
      return "tidak_masuk";
    }
    if (session?.checkin_at) return "masuk";
    return "pending";
  };

  const guruMasukRows = useMemo(() => {
    const scheduleRows = buildDayScheduleRows({
      schedule_entries: scheduleEntries,
    });

    const firstSlot = (row) => {
      const slots = (row.slot_nos || [])
        .map(Number)
        .filter((item) => Number.isFinite(item));
      return slots.length ? Math.min(...slots) : Number.MAX_SAFE_INTEGER;
    };

    scheduleRows.sort((a, b) => {
      const classCompare = String(a.class_name || "").localeCompare(
        String(b.class_name || ""),
        "id",
        { numeric: true, sensitivity: "base" },
      );
      if (classCompare !== 0) return classCompare;

      const slotCompare = firstSlot(a) - firstSlot(b);
      if (slotCompare !== 0) return slotCompare;

      return String(a.start_time || "").localeCompare(
        String(b.start_time || ""),
      );
    });

    return scheduleRows.map((entry) => {
      const session = teacherSessions.find(
        (item) =>
          Number(item.schedule_entry_id) === Number(entry.id) ||
          (Number(item.teacher_id) === Number(entry.teacher_id) &&
            Number(item.class_id) === Number(entry.class_id)),
      );
      const absence = teacherAbsences.find(
        (item) => Number(item.teacher_id) === Number(entry.teacher_id),
      );
      const tap = tapSessions.find(
        (item) =>
          Number(item.schedule_entry_id) === Number(entry.id) ||
          (Number(item.teacher_id) === Number(entry.teacher_id) &&
            Number(item.class_id) === Number(entry.class_id)),
      );

      return {
        ...entry,
        session_key: session?.key || null,
        attendance_status: resolveAttendanceStatus(session, absence),
        checkin_at: session?.checkin_at || null,
        checkout_at: session?.checkout_at || null,
        tap_checkin_time: tap?.checkin_time || null,
        tap_checkout_time: tap?.checkout_time || null,
        note: session?.note || absence?.reason || "",
      };
    });
  }, [scheduleEntries, teacherSessions, teacherAbsences, tapSessions]);

  const studentColumns = [
    {
      title: "Siswa",
      dataIndex: "student_id",
      render: (_, record) => {
        const student = students.find(
          (item) => Number(item.student_id) === Number(record.student_id),
        );
        return (
          <div>
            <Text strong>{student?.full_name || "-"}</Text>
            <div style={{ color: "#667085", fontSize: 12 }}>
              {student?.class_name || "-"} - NIS {student?.nis || "-"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Alasan",
      dataIndex: "reason",
    },
    {
      title: "Tindak Lanjut",
      dataIndex: "follow_up",
      render: (value) => value || <Text type='secondary'>-</Text>,
    },
    {
      title: "Aksi",
      dataIndex: "action",
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <Button
            size='small'
            icon={<Pencil size={14} />}
            onClick={() => openEditStudentModal(record)}
          />
          <Popconfirm
            title='Hapus catatan siswa ini?'
            okText='Ya'
            cancelText='Tidak'
            onConfirm={() => removeStudentAbsenceRow(record.key)}
          >
            <Button danger size='small' icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderAttendanceStatusTag = (value) => {
    if (value === "masuk") {
      return (
        <Tag color='green' style={{ margin: 0, borderRadius: 999 }}>
          Masuk
        </Tag>
      );
    }
    if (value === "izin") {
      return (
        <Tag color='orange' style={{ margin: 0, borderRadius: 999 }}>
          Izin
        </Tag>
      );
    }
    if (value === "tidak_masuk") {
      return (
        <Tag color='red' style={{ margin: 0, borderRadius: 999 }}>
          Tidak Masuk
        </Tag>
      );
    }
    return <Tag style={{ margin: 0, borderRadius: 999 }}>Belum</Tag>;
  };

  const renderGuruMasukActions = (record) => (
    <Flex gap={8} wrap='wrap' align='center' style={{ width: "100%" }}>
      <Select
        size='small'
        placeholder='Pilih status'
        value={
          record.attendance_status === "masuk" ||
          record.attendance_status === "tidak_masuk"
            ? record.attendance_status
            : undefined
        }
        options={[
          { value: "masuk", label: "Masuk" },
          { value: "tidak_masuk", label: "Tidak Masuk" },
        ]}
        loading={saving}
        disabled={saving}
        onChange={(value) => {
          if (value === "masuk") {
            handleMarkScheduleMasuk(record);
          } else if (value === "tidak_masuk") {
            handleMarkScheduleTidakMasuk(record);
          }
        }}
        style={{ width: "100%" }}
      />
    </Flex>
  );

  const guruMasukColumns = [
    {
      title: "Guru / Mapel",
      dataIndex: "teacher_name",
      render: (value, record) => (
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ display: "block" }}>
            {value || "-"}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.subject_name || "-"} · {record.class_name || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "Jam",
      dataIndex: "jam_label",
      width: 140,
      render: (value, record) => (
        <div>
          <Text>{value || formatScheduleJamLabel(record.slot_nos)}</Text>
          <div style={{ color: "#667085", fontSize: 12 }}>
            {formatScheduleTime(record.start_time)} -{" "}
            {formatScheduleTime(record.end_time)}
          </div>
        </div>
      ),
    },
    {
      title: "Masuk / Keluar",
      dataIndex: "tap_checkin_time",
      width: 130,
      render: (_, record) => (
        <div>
          <Text style={{ display: "block", fontSize: 12 }}>
            Masuk: {record.tap_checkin_time || "-"}
          </Text>
          <Text style={{ display: "block", fontSize: 12 }}>
            Keluar: {record.tap_checkout_time || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "attendance_status",
      width: 120,
      render: (value) => renderAttendanceStatusTag(value),
    },
    {
      title: "Aksi",
      dataIndex: "action",
      width: 170,
      render: (_, record) => renderGuruMasukActions(record),
    },
  ];

  const renderGuruMasukMobileItem = (record) => (
    <Card
      size='small'
      style={mobileItemCardStyle}
      styles={{ body: { padding: 14 } }}
    >
      <Flex vertical gap={12}>
        <Flex justify='space-between' align='flex-start' gap={10}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text strong style={{ display: "block", color: "#0f172a" }}>
              {record.teacher_name || "-"}
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {record.subject_name || "-"} · {record.class_name || "-"}
            </Text>
          </div>
          {renderAttendanceStatusTag(record.attendance_status)}
        </Flex>

        <div>
          <Text style={{ display: "block" }}>
            {record.jam_label || formatScheduleJamLabel(record.slot_nos)}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {formatScheduleTime(record.start_time)} -{" "}
            {formatScheduleTime(record.end_time)}
          </Text>
          <Text type='secondary' style={{ display: "block", fontSize: 12 }}>
            Masuk: {record.tap_checkin_time || "-"} · Keluar:{" "}
            {record.tap_checkout_time || "-"}
          </Text>
        </div>

        {renderGuruMasukActions(record)}
      </Flex>
    </Card>
  );

  const renderStudentAbsenceMobileItem = (record) => {
    const student = students.find(
      (item) => Number(item.student_id) === Number(record.student_id),
    );

    return (
      <Card
        size='small'
        style={mobileItemCardStyle}
        styles={{ body: { padding: 14 } }}
      >
        <Flex vertical gap={10}>
          <Flex justify='space-between' align='flex-start' gap={10}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ display: "block", color: "#0f172a" }}>
                {student?.full_name || "-"}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {student?.class_name || "-"} · NIS {student?.nis || "-"}
              </Text>
            </div>
            <Space size={4}>
              <Button
                size='small'
                icon={<Pencil size={14} />}
                onClick={() => openEditStudentModal(record)}
              />
              <Popconfirm
                title='Hapus catatan siswa ini?'
                okText='Ya'
                cancelText='Tidak'
                onConfirm={() => removeStudentAbsenceRow(record.key)}
              >
                <Button danger size='small' icon={<Trash2 size={14} />} />
              </Popconfirm>
            </Space>
          </Flex>

          <div>
            <Text style={{ display: "block", fontSize: 13 }}>
              Alasan: {record.reason || "-"}
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              Tindak lanjut: {record.follow_up || "-"}
            </Text>
          </div>
        </Flex>
      </Card>
    );
  };

  const renderTeacherAbsenceMobileItem = (record) => {
    const teacher = teachers.find(
      (item) => Number(item.id) === Number(record.teacher_id),
    );

    return (
      <Card
        size='small'
        style={mobileItemCardStyle}
        styles={{ body: { padding: 14 } }}
      >
        <Flex vertical gap={10}>
          <Flex justify='space-between' align='flex-start' gap={10}>
            <Text
              strong
              style={{ color: "#0f172a", minWidth: 0, flex: 1 }}
            >
              {teacher?.full_name || "-"}
            </Text>
            <Space size={4}>
              <Button
                size='small'
                icon={<Pencil size={14} />}
                onClick={() => openEditTeacherAbsenceModal(record)}
              />
              <Popconfirm
                title='Hapus catatan guru tidak masuk ini?'
                okText='Ya'
                cancelText='Tidak'
                onConfirm={() => removeTeacherAbsenceRow(record.key)}
              >
                <Button danger size='small' icon={<Trash2 size={14} />} />
              </Popconfirm>
            </Space>
          </Flex>

          <div>
            <Text style={{ display: "block", fontSize: 13 }}>
              Alasan: {record.reason || "-"}
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              Tindak lanjut: {record.follow_up || "-"}
            </Text>
          </div>
        </Flex>
      </Card>
    );
  };

  const teacherAbsenceColumns = [
    {
      title: "Guru",
      dataIndex: "teacher_id",
      render: (_, record) => {
        const teacher = teachers.find(
          (item) => Number(item.id) === Number(record.teacher_id),
        );
        return <Text strong>{teacher?.full_name || "-"}</Text>;
      },
    },
    {
      title: "Alasan",
      dataIndex: "reason",
    },
    {
      title: "Tindak Lanjut",
      dataIndex: "follow_up",
      render: (value) => value || <Text type='secondary'>-</Text>,
    },
    {
      title: "Aksi",
      dataIndex: "action",
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <Button
            size='small'
            icon={<Pencil size={14} />}
            onClick={() => openEditTeacherAbsenceModal(record)}
          />
          <Popconfirm
            title='Hapus catatan guru tidak masuk ini?'
            okText='Ya'
            cancelText='Tidak'
            onConfirm={() => removeTeacherAbsenceRow(record.key)}
          >
            <Button danger size='small' icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Flex
      vertical
      gap={16}
      style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}
    >
      {payload.assignment?.note ? (
        <Alert
          showIcon
          type='info'
          message='Catatan Admin'
          description={payload.assignment.note}
        />
      ) : null}

      <Tabs
        style={{ width: "100%", maxWidth: "100%" }}
        items={[
          {
            key: "teacher-session",
            label: (
              <Space size={6}>
                <CalendarCheck2 size={14} />
                Guru Masuk Kelas
              </Space>
            ),
            children: (
              <TeacherDutyRecordSection
                title='Guru Masuk Kelas'
                description='Jadwal final hari ini, diurutkan per kelas dan jam. Pilih status Masuk / Tidak Masuk lewat dropdown.'
                columns={guruMasukColumns}
                dataSource={guruMasukRows}
                emptyDescription='Belum ada jadwal final untuk hari ini.'
                isMobile={isMobile}
                hideAdd
                renderMobileItem={renderGuruMasukMobileItem}
              />
            ),
          },
          {
            key: "student-absence",
            label: (
              <Space size={6}>
                <Users size={14} />
                Siswa Tidak Masuk
              </Space>
            ),
            children: (
              <TeacherDutyRecordSection
                title='Siswa Tidak Masuk'
                description='Catat siswa yang tidak masuk pada hari ini.'
                addButtonText='Tambah Siswa'
                onAdd={openCreateStudentModal}
                columns={studentColumns}
                dataSource={studentAbsences}
                emptyDescription='Belum ada catatan siswa tidak masuk.'
                isMobile={isMobile}
                actionIcon={<Plus size={14} />}
                renderMobileItem={renderStudentAbsenceMobileItem}
              />
            ),
          },

          {
            key: "teacher-absence",
            label: (
              <Space size={6}>
                <FileText size={14} />
                Guru Tidak Masuk
              </Space>
            ),
            children: (
              <TeacherDutyRecordSection
                title='Guru Tidak Masuk'
                description='Catat guru yang tidak masuk beserta alasannya.'
                addButtonText='Tambah Guru'
                onAdd={openCreateTeacherAbsenceModal}
                columns={teacherAbsenceColumns}
                dataSource={teacherAbsences}
                emptyDescription='Belum ada catatan guru tidak masuk.'
                isMobile={isMobile}
                actionIcon={<Plus size={14} />}
                renderMobileItem={renderTeacherAbsenceMobileItem}
              />
            ),
          },
          {
            key: "daily-note",
            label: (
              <Space size={6}>
                <FileText size={14} />
                Catatan Harian
              </Space>
            ),
            children: (
              <TeacherDutyDailyNotePanel
                dailyNote={dailyNote}
                onChange={setDailyNote}
                onSave={handleSave}
                saving={saving}
                isMobile={isMobile}
              />
            ),
          },
        ]}
      />

      <TeacherDutyFormModal
        title={
          studentForm.key
            ? "Ubah Catatan Siswa Tidak Masuk"
            : "Tambah Catatan Siswa Tidak Masuk"
        }
        subtitle={
          studentForm.key
            ? "Perbarui data siswa, alasan ketidakhadiran, dan tindak lanjut yang diperlukan."
            : "Isi data siswa yang tidak hadir agar laporan harian tetap lengkap dan mudah ditinjau."
        }
        open={studentModalOpen}
        onCancel={closeStudentModal}
        onOk={submitStudentModal}
        okText={studentForm.key ? "Simpan Perubahan" : "Tambah"}
        width={720}
        isMobile={isMobile}
        helperTitle='Detail ketidakhadiran siswa'
        helperDescription='Pilih kelas lebih dulu agar daftar siswa yang muncul tetap relevan.'
      >
        <Flex vertical gap={14}>
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Kelas
            </Text>
            <Select
              placeholder='Pilih kelas'
              value={studentForm.class_id}
              options={classOptions}
              onChange={(value) =>
                setStudentForm((prev) => ({
                  ...prev,
                  class_id: value,
                  student_id: null,
                }))
              }
              virtual={false}
              showSearch={{ optionFilterProp: "label" }}
              allowClear
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Siswa
            </Text>
            <Select
              placeholder='Pilih siswa'
              value={studentForm.student_id}
              showSearch={{ optionFilterProp: "label" }}
              options={studentOptions
                .filter((option) =>
                  studentForm.class_id
                    ? Number(option.class_id) === Number(studentForm.class_id)
                    : true,
                )
                .map((option) => ({
                  value: option.value,
                  label: option.label,
                  searchText: option.searchText,
                }))}
              onChange={(value) =>
                setStudentForm((prev) => ({
                  ...prev,
                  student_id: value,
                }))
              }
              virtual={false}
              allowClear
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Alasan / keterangan
            </Text>
            <Input
              value={studentForm.reason}
              onChange={(event) =>
                setStudentForm((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
              placeholder='Contoh: sakit, izin, atau terlambat hadir'
              style={modalInputStyle}
            />
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Tindak lanjut
            </Text>
            <Input
              value={studentForm.follow_up}
              onChange={(event) =>
                setStudentForm((prev) => ({
                  ...prev,
                  follow_up: event.target.value,
                }))
              }
              placeholder='Misalnya: konfirmasi wali kelas atau hubungi orang tua'
              style={modalInputStyle}
            />
          </div>
        </Flex>
      </TeacherDutyFormModal>

      <TeacherDutyFormModal
        title={
          teacherForm.key
            ? "Ubah Catatan Guru Tidak Masuk"
            : "Tambah Catatan Guru Tidak Masuk"
        }
        subtitle={
          teacherForm.key
            ? "Perbarui informasi guru yang berhalangan hadir beserta tindak lanjutnya."
            : "Catat guru yang tidak hadir untuk membantu admin meninjau kondisi operasional hari ini."
        }
        open={teacherModalOpen}
        onCancel={closeTeacherModal}
        onOk={submitTeacherModal}
        okText={teacherForm.key ? "Simpan Perubahan" : "Tambah"}
        width={640}
        isMobile={isMobile}
        helperTitle='Detail ketidakhadiran guru'
        helperDescription='Lengkapi alasan dan tindak lanjut agar koordinasi pengganti atau penyesuaian jadwal lebih mudah.'
      >
        <Flex vertical gap={14}>
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Guru
            </Text>
            <Select
              virtual={false}
              placeholder='Pilih guru'
              value={teacherForm.teacher_id}
              showSearch
              filterOption={(input, option) =>
                String(option?.searchText || "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={teacherOptions}
              onChange={(value) =>
                setTeacherForm((prev) => ({
                  ...prev,
                  teacher_id: value,
                }))
              }
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Alasan
            </Text>
            <Input
              value={teacherForm.reason}
              onChange={(event) =>
                setTeacherForm((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
              placeholder='Contoh: sakit, dinas luar, atau izin'
              style={modalInputStyle}
            />
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Tindak lanjut
            </Text>
            <Input
              value={teacherForm.follow_up}
              onChange={(event) =>
                setTeacherForm((prev) => ({
                  ...prev,
                  follow_up: event.target.value,
                }))
              }
              placeholder='Misalnya: penyesuaian jadwal atau guru pengganti'
              style={modalInputStyle}
            />
          </div>
        </Flex>
      </TeacherDutyFormModal>

      <TeacherDutyFormModal
        title={
          sessionForm.key
            ? "Ubah Catatan Guru Masuk Kelas"
            : "Tambah Catatan Guru Masuk Kelas"
        }
        subtitle={
          sessionForm.key
            ? "Perbarui data sesi kelas yang sudah dicatat sebelumnya."
            : "Catat sesi guru yang masuk kelas agar aktivitas pembelajaran harian terdokumentasi dengan rapi."
        }
        open={sessionModalOpen}
        onCancel={closeSessionModal}
        onOk={submitSessionModal}
        okText={sessionForm.key ? "Simpan Perubahan" : "Tambah"}
        width={720}
        isMobile={isMobile}
        helperTitle='Detail sesi pembelajaran'
        helperDescription='Pilih guru dan kelas sesuai penugasan, lalu lengkapi waktu masuk dan keluar kelas.'
      >
        <Flex vertical gap={14}>
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Guru
            </Text>
            <Select
              placeholder='Pilih guru'
              value={sessionForm.teacher_id}
              showSearch
              optionFilterProp='label'
              virtual={false}
              allowClear
              options={teacherOptions}
              onChange={handleSessionTeacherChange}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Kelas sesuai penugasan
            </Text>
            <Select
              placeholder='Pilih kelas sesuai penugasan'
              value={sessionForm.class_id}
              showSearch={{ optionFilterProp: "label" }}
              virtual={false}
              allowClear
              options={sessionClassOptions}
              onChange={handleSessionClassChange}
              disabled={!sessionForm.teacher_id}
              style={{ width: "100%" }}
            />
          </div>

          <Flex vertical={isMobile} gap={12}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Waktu masuk
              </Text>
              <DatePicker
                showTime={{ format: "HH:mm" }}
                format='DD MMM YYYY HH:mm'
                style={{ width: "100%" }}
                value={sessionForm.checkin_at}
                onChange={(value) =>
                  setSessionForm((prev) => ({
                    ...prev,
                    checkin_at: value,
                  }))
                }
                placeholder='Tanggal & jam masuk'
              />
            </div>
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Waktu keluar
              </Text>
              <DatePicker
                showTime={{ format: "HH:mm" }}
                format='DD MMM YYYY HH:mm'
                style={{ width: "100%" }}
                value={sessionForm.checkout_at}
                onChange={(value) =>
                  setSessionForm((prev) => ({
                    ...prev,
                    checkout_at: value,
                  }))
                }
                placeholder='Tanggal & jam keluar'
              />
            </div>
          </Flex>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Catatan sesi kelas
            </Text>
            <Input
              value={sessionForm.note}
              onChange={(event) =>
                setSessionForm((prev) => ({
                  ...prev,
                  note: event.target.value,
                }))
              }
              placeholder='Contoh: pembelajaran berjalan normal atau ada catatan khusus'
              style={modalInputStyle}
            />
          </div>
        </Flex>
      </TeacherDutyFormModal>
    </Flex>
  );
};

export default TeacherDutyWorkspace;
