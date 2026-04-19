import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
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
  buildStudentAbsenceRows,
  buildTeacherAbsenceRows,
  buildTeacherSessionRows,
} from "./utils";

const { Text, Title } = Typography;
const { TextArea } = Input;

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
      const existing = studentAbsences.findIndex((item) => item.key === nextRow.key);
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
    const nextStudentAbsences = studentAbsences.filter((item) => item.key !== key);
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
      const existing = teacherAbsences.findIndex((item) => item.key === nextRow.key);
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
    const nextTeacherAbsences = teacherAbsences.filter((item) => item.key !== key);
    const saved = await handleSave(
      { teacher_absences: nextTeacherAbsences },
      "Catatan guru tidak masuk berhasil dihapus.",
    );
    if (!saved) return;
    setTeacherAbsences(nextTeacherAbsences);
  };

  const openCreateSessionModal = () => {
    setSessionForm(createEmptySessionForm(dateValue));
    setSessionModalOpen(true);
  };

  const openEditSessionModal = (record) => {
    setSessionForm({
      key: record.key,
      teacher_id: record.teacher_id,
      class_id: record.class_id,
      schedule_entry_id: record.schedule_entry_id,
      checkin_at: record.checkin_at ? dayjs(record.checkin_at) : null,
      checkout_at: record.checkout_at ? dayjs(record.checkout_at) : null,
      note: record.note || "",
    });
    setSessionModalOpen(true);
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

    const selectedEntry = sessionCatalog.find(
      (item) => Number(item.class_id) === Number(sessionForm.class_id),
    );
    if (!selectedEntry) {
      message.warning("Kelas yang dipilih tidak valid.");
      return;
    }

    const nextRow = {
      key: sessionForm.key || `session-new-${Date.now()}`,
      schedule_entry_id: selectedEntry.schedule_entry_id,
      teacher_id: selectedEntry.teacher_id,
      teacher_name: selectedEntry.teacher_name,
      class_id: selectedEntry.class_id,
      class_name: selectedEntry.class_name,
      subject_name: selectedEntry.subject_name,
      start_time: selectedEntry.start_time,
      end_time: selectedEntry.end_time,
      checkin_at: sessionForm.checkin_at
        ? sessionForm.checkin_at.toISOString()
        : null,
      checkout_at: sessionForm.checkout_at
        ? sessionForm.checkout_at.toISOString()
        : null,
      note: sessionForm.note || "",
    };

    const nextTeacherSessions = (() => {
      const existing = teacherSessions.findIndex((item) => item.key === nextRow.key);
      if (existing >= 0) {
        return teacherSessions.map((item) =>
          item.key === nextRow.key ? nextRow : item,
        );
      }
      const withoutDuplicate = teacherSessions.filter(
        (item) =>
          Number(item.teacher_id) !== Number(nextRow.teacher_id) ||
          Number(item.class_id) !== Number(nextRow.class_id),
      );
      return [...withoutDuplicate, nextRow];
    })();

    const saved = await handleSave(
      { teacher_sessions: nextTeacherSessions },
      sessionForm.key
        ? "Perubahan guru masuk kelas berhasil disimpan."
        : "Catatan guru masuk kelas berhasil ditambahkan.",
    );

    if (!saved) return;

    setTeacherSessions(nextTeacherSessions);
    closeSessionModal();
  };

  const removeTeacherSessionRow = async (key) => {
    const nextTeacherSessions = teacherSessions.filter((item) => item.key !== key);
    const saved = await handleSave(
      { teacher_sessions: nextTeacherSessions },
      "Catatan guru masuk kelas berhasil dihapus.",
    );
    if (!saved) return;
    setTeacherSessions(nextTeacherSessions);
  };

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
      render: (value) => value || <Text type="secondary">-</Text>,
    },
    {
      title: "Aksi",
      dataIndex: "action",
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<Pencil size={14} />}
            onClick={() => openEditStudentModal(record)}
          />
          <Popconfirm
            title="Hapus catatan siswa ini?"
            okText="Ya"
            cancelText="Tidak"
            onConfirm={() => removeStudentAbsenceRow(record.key)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const teacherSessionColumns = [
    {
      title: "Guru",
      dataIndex: "teacher_name",
      render: (value, record) => (
        <div>
          <Text strong>{value}</Text>
          <div style={{ color: "#667085", fontSize: 12 }}>
            {record.class_name} - {record.subject_name}
          </div>
        </div>
      ),
    },
    {
      title: "Jadwal",
      dataIndex: "schedule",
      width: 170,
      render: (_, record) =>
        `${String(record.start_time || "").slice(0, 5)} - ${String(record.end_time || "").slice(0, 5)}`,
    },
    {
      title: "Masuk",
      dataIndex: "checkin_at",
      width: 170,
      render: (value) =>
        value ? dayjs(value).format("DD MMM YYYY HH:mm") : "-",
    },
    {
      title: "Keluar",
      dataIndex: "checkout_at",
      width: 170,
      render: (value) =>
        value ? dayjs(value).format("DD MMM YYYY HH:mm") : "-",
    },
    {
      title: "Catatan",
      dataIndex: "note",
      render: (value) => value || <Text type="secondary">-</Text>,
    },
    {
      title: "Aksi",
      dataIndex: "action",
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<Pencil size={14} />}
            onClick={() => openEditSessionModal(record)}
          />
          <Popconfirm
            title="Hapus catatan guru masuk kelas ini?"
            okText="Ya"
            cancelText="Tidak"
            onConfirm={() => removeTeacherSessionRow(record.key)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
      render: (value) => value || <Text type="secondary">-</Text>,
    },
    {
      title: "Aksi",
      dataIndex: "action",
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<Pencil size={14} />}
            onClick={() => openEditTeacherAbsenceModal(record)}
          />
          <Popconfirm
            title="Hapus catatan guru tidak masuk ini?"
            okText="Ya"
            cancelText="Tidak"
            onConfirm={() => removeTeacherAbsenceRow(record.key)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      {payload.assignment?.note ? (
        <Alert
          showIcon
          type="info"
          title="Catatan Admin"
          description={payload.assignment.note}
        />
      ) : null}

      <Tabs
        items={[
          {
            key: "student-absence",
            label: (
              <Space size={6}>
                <Users size={14} />
                Siswa Tidak Masuk
              </Space>
            ),
            children: (
              <Flex vertical gap={12}>
                <Flex
                  justify="space-between"
                  align="center"
                  wrap="wrap"
                  gap={8}
                >
                  <Text type="secondary">
                    Catat siswa yang tidak masuk pada hari ini.
                  </Text>
                  <Button
                    type="dashed"
                    icon={<Plus size={14} />}
                    onClick={openCreateStudentModal}
                  >
                    Tambah Siswa
                  </Button>
                </Flex>

                <Table
                  rowKey="key"
                  columns={studentColumns}
                  dataSource={studentAbsences}
                  pagination={false}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Belum ada catatan siswa tidak masuk."
                      />
                    ),
                  }}
                  scroll={{ x: 760 }}
                />
              </Flex>
            ),
          },
          {
            key: "teacher-session",
            label: (
              <Space size={6}>
                <CalendarCheck2 size={14} />
                Guru Masuk Kelas
              </Space>
            ),
            children: (
              <Flex vertical gap={12}>
                <Flex
                  justify="space-between"
                  align="center"
                  wrap="wrap"
                  gap={8}
                >
                  <Text type="secondary">
                    Kelola catatan guru masuk kelas untuk hari ini.
                  </Text>
                  <Button
                    type="dashed"
                    icon={<Plus size={14} />}
                    onClick={openCreateSessionModal}
                  >
                    Tambah Catatan
                  </Button>
                </Flex>

                <Table
                  rowKey="key"
                  columns={teacherSessionColumns}
                  dataSource={teacherSessions}
                  pagination={false}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Belum ada catatan guru masuk kelas."
                      />
                    ),
                  }}
                  scroll={{ x: 900 }}
                />
              </Flex>
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
              <Flex vertical gap={12}>
                <Flex
                  justify="space-between"
                  align="center"
                  wrap="wrap"
                  gap={8}
                >
                  <Text type="secondary">
                    Catat guru yang tidak masuk beserta alasannya.
                  </Text>
                  <Button
                    type="dashed"
                    icon={<Plus size={14} />}
                    onClick={openCreateTeacherAbsenceModal}
                  >
                    Tambah Guru
                  </Button>
                </Flex>

                <Table
                  rowKey="key"
                  columns={teacherAbsenceColumns}
                  dataSource={teacherAbsences}
                  pagination={false}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Belum ada catatan guru tidak masuk."
                      />
                    ),
                  }}
                  scroll={{ x: 760 }}
                />
              </Flex>
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
              <Flex vertical gap={16}>
                <div>
                  <Title level={5} style={{ marginTop: 0 }}>
                    Catatan Harian
                  </Title>
                  <TextArea
                    rows={8}
                    value={dailyNote}
                    onChange={(event) => setDailyNote(event.target.value)}
                    placeholder="Tulis ringkasan kondisi harian, kejadian penting, atau tindak lanjut yang perlu diketahui admin."
                    maxLength={2000}
                    showCount
                  />
                </div>

                <Flex justify="flex-end" wrap="wrap">
                  <Button type="primary" onClick={handleSave} loading={saving}>
                    Simpan Catatan Harian
                  </Button>
                </Flex>
              </Flex>
            ),
          },
        ]}
      />

      <Modal
        title={
          studentForm.key
            ? "Ubah Catatan Siswa Tidak Masuk"
            : "Tambah Catatan Siswa Tidak Masuk"
        }
        open={studentModalOpen}
        onCancel={closeStudentModal}
        onOk={submitStudentModal}
        okText={studentForm.key ? "Simpan Perubahan" : "Tambah"}
        width={720}
      >
        <Flex vertical gap={12}>
          <Select
            placeholder="Pilih kelas"
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
          />

          <Select
            placeholder="Pilih siswa"
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
          />

          <Input
            value={studentForm.reason}
            onChange={(event) =>
              setStudentForm((prev) => ({
                ...prev,
                reason: event.target.value,
              }))
            }
            placeholder="Alasan / keterangan"
          />

          <Input
            value={studentForm.follow_up}
            onChange={(event) =>
              setStudentForm((prev) => ({
                ...prev,
                follow_up: event.target.value,
              }))
            }
            placeholder="Tindak lanjut"
          />
        </Flex>
      </Modal>

      <Modal
        title={
          teacherForm.key
            ? "Ubah Catatan Guru Tidak Masuk"
            : "Tambah Catatan Guru Tidak Masuk"
        }
        open={teacherModalOpen}
        onCancel={closeTeacherModal}
        onOk={submitTeacherModal}
        okText={teacherForm.key ? "Simpan Perubahan" : "Tambah"}
        width={640}
      >
        <Flex vertical gap={12}>
          <Select
            virtual={false}
            placeholder="Pilih guru"
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
          />

          <Input
            value={teacherForm.reason}
            onChange={(event) =>
              setTeacherForm((prev) => ({
                ...prev,
                reason: event.target.value,
              }))
            }
            placeholder="Alasan"
          />

          <Input
            value={teacherForm.follow_up}
            onChange={(event) =>
              setTeacherForm((prev) => ({
                ...prev,
                follow_up: event.target.value,
              }))
            }
            placeholder="Tindak lanjut"
          />
        </Flex>
      </Modal>

      <Modal
        title={
          sessionForm.key
            ? "Ubah Catatan Guru Masuk Kelas"
            : "Tambah Catatan Guru Masuk Kelas"
        }
        open={sessionModalOpen}
        onCancel={closeSessionModal}
        onOk={submitSessionModal}
        okText={sessionForm.key ? "Simpan Perubahan" : "Tambah"}
        width={720}
      >
        <Flex vertical gap={12}>
          <Select
            placeholder="Pilih guru"
            value={sessionForm.teacher_id}
            showSearch
            optionFilterProp="label"
            virtual={false}
            allowClear
            options={teacherOptions}
            onChange={handleSessionTeacherChange}
          />

          <Select
            placeholder="Pilih kelas sesuai penugasan"
            value={sessionForm.class_id}
            showSearch
            optionFilterProp="label"
            virtual={false}
            allowClear
            options={sessionClassOptions}
            onChange={handleSessionClassChange}
            disabled={!sessionForm.teacher_id}
          />

          <Flex wrap="wrap" gap={12}>
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format="DD MMM YYYY HH:mm"
              style={{ flex: "1 1 240px" }}
              value={sessionForm.checkin_at}
              onChange={(value) =>
                setSessionForm((prev) => ({
                  ...prev,
                  checkin_at: value,
                }))
              }
              placeholder="Tanggal & jam masuk"
            />
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format="DD MMM YYYY HH:mm"
              style={{ flex: "1 1 240px" }}
              value={sessionForm.checkout_at}
              onChange={(value) =>
                setSessionForm((prev) => ({
                  ...prev,
                  checkout_at: value,
                }))
              }
              placeholder="Tanggal & jam keluar"
            />
          </Flex>

          <Input
            value={sessionForm.note}
            onChange={(event) =>
              setSessionForm((prev) => ({
                ...prev,
                note: event.target.value,
              }))
            }
            placeholder="Catatan sesi kelas"
          />
        </Flex>
      </Modal>
    </Flex>
  );
};

export default TeacherDutyWorkspace;
