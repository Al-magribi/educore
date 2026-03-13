import React, { useMemo, useState } from "react";
import {
  DownloadOutlined,
  InboxOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from "antd";
import { BookOpenText, Pencil, Plus } from "lucide-react";
import * as XLSX from "xlsx";

const TEMPLATE_SHEET = "Beban Ajar";
const GUIDE_SHEET = "Panduan";

const normalizeBoolean = (value, fallback) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "ya", "yes", "1"].includes(normalized)) return true;
    if (["false", "tidak", "no", "0"].includes(normalized)) return false;
  }
  return fallback;
};

const normalizeInteger = (value, fallback = null) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildTemplateRows = (rows = []) =>
  rows.map((item) => ({
    guru: item.teacher_name || "",
    mapel: item.subject_name || "",
    tingkat: item.grade_name || "",
    kelas: item.class_name || "",
    beban_sesi: item.weekly_sessions || "",
    teacher_id: item.teacher_id || "",
    subject_id: item.subject_id || "",
    class_id: item.class_id || "",
    teaching_load_id: item.teaching_load_id || "",
    max_sessions_per_meeting: item.max_sessions_per_meeting || 2,
    minimum_gap_slots: Number.isFinite(item.minimum_gap_slots)
      ? item.minimum_gap_slots
      : 4,
    require_different_days: item.require_different_days ?? true,
    is_active: item.is_active ?? true,
  }));

const buildGuideSheet = () =>
  XLSX.utils.aoa_to_sheet([
    ["Panduan Template Beban Ajar"],
    [],
    ["1", "Download template dari tombol Download Template."],
    [
      "2",
      "Isi atau ubah kolom beban_sesi sesuai kebutuhan tiap guru-mapel-kelas.",
    ],
    [
      "3",
      "Jangan ubah kolom teacher_id, subject_id, dan class_id karena dipakai sistem untuk pencocokan.",
    ],
    [
      "4",
      "Kolom lain boleh dibiarkan seperti default template jika tidak ingin diubah.",
    ],
    [
      "5",
      "Simpan file dalam format .xlsx lalu import melalui tombol Import Excel.",
    ],
    [],
    ["Kolom utama", "guru, mapel, tingkat, kelas, beban_sesi"],
    ["Kolom teknis", "teacher_id, subject_id, class_id, teaching_load_id"],
    ["Catatan beban_sesi", "Harus angka bulat lebih dari 0"],
    [
      "minimum_gap_slots",
      "Isi 0 jika mapel yang sama tidak boleh muncul lagi di hari yang sama.",
    ],
  ]);

const ScheduleLoadCard = ({
  canManage,
  classes,
  grades,
  subjects,
  teachers,
  teacherAssignments,
  sessionShortages,
  loading,
  onSave,
  onImport,
}) => {
  const [openModal, setOpenModal] = useState(false);
  const [editingLoadId, setEditingLoadId] = useState(null);
  const [teacherKeyword, setTeacherKeyword] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [form] = Form.useForm();

  const classOptions = useMemo(
    () => (classes || []).map((item) => ({ value: item.id, label: item.name })),
    [classes],
  );
  const gradeOptions = useMemo(
    () => (grades || []).map((item) => ({ value: item.id, label: item.name })),
    [grades],
  );
  const subjectOptions = useMemo(
    () =>
      (subjects || []).map((item) => ({ value: item.id, label: item.name })),
    [subjects],
  );
  const teacherOptions = useMemo(
    () =>
      (teachers || []).map((item) => ({
        value: item.id,
        label: item.full_name,
      })),
    [teachers],
  );

  const sortedAssignments = useMemo(() => {
    return [...(teacherAssignments || [])].sort((a, b) => {
      const teacherCompare = (a.teacher_name || "").localeCompare(
        b.teacher_name || "",
      );
      if (teacherCompare !== 0) return teacherCompare;
      const subjectCompare = (a.subject_name || "").localeCompare(
        b.subject_name || "",
      );
      if (subjectCompare !== 0) return subjectCompare;
      const gradeCompare = (a.grade_name || "").localeCompare(
        b.grade_name || "",
      );
      if (gradeCompare !== 0) return gradeCompare;
      return (a.class_name || "").localeCompare(b.class_name || "");
    });
  }, [teacherAssignments]);

  const filteredAssignments = useMemo(() => {
    const keyword = String(teacherKeyword || "")
      .trim()
      .toLowerCase();
    return sortedAssignments.filter((item) => {
      const matchTeacher = keyword
        ? String(item.teacher_name || "")
            .toLowerCase()
            .includes(keyword)
        : true;
      const matchGrade = selectedGradeId
        ? Number(item.grade_id) === Number(selectedGradeId)
        : true;
      return matchTeacher && matchGrade;
    });
  }, [sortedAssignments, teacherKeyword, selectedGradeId]);

  const shortageMap = useMemo(
    () =>
      (sessionShortages || []).reduce((acc, item) => {
        acc[item.key] = item;
        return acc;
      }, {}),
    [sessionShortages],
  );

  const filteredShortages = useMemo(() => {
    const filteredKeys = new Set(
      filteredAssignments.map((item) =>
        [item.teacher_id, item.subject_id, item.class_id].join(":"),
      ),
    );
    return (sessionShortages || []).filter((item) => filteredKeys.has(item.key));
  }, [filteredAssignments, sessionShortages]);

  const handleDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const templateSheet = XLSX.utils.json_to_sheet(
      buildTemplateRows(filteredAssignments),
    );
    XLSX.utils.book_append_sheet(workbook, templateSheet, TEMPLATE_SHEET);
    XLSX.utils.book_append_sheet(workbook, buildGuideSheet(), GUIDE_SHEET);
    XLSX.writeFile(workbook, "Template_Beban_Ajar_Per_Kelas.xlsx");
  };

  const handleImportExcel = async (file) => {
    try {
      setImporting(true);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames.includes(TEMPLATE_SHEET)
        ? TEMPLATE_SHEET
        : workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
      });

      const normalizedRows = rows
        .map((row, index) => ({
          row_no: index + 2,
          teacher_id: normalizeInteger(row.teacher_id, null),
          subject_id: normalizeInteger(row.subject_id, null),
          class_id: normalizeInteger(row.class_id, null),
          teaching_load_id: normalizeInteger(row.teaching_load_id, null),
          teacher_name: row.guru || row.teacher_name || "",
          subject_name: row.mapel || row.subject_name || "",
          class_name: row.kelas || row.class_name || "",
          weekly_sessions: normalizeInteger(row.beban_sesi, null),
          max_sessions_per_meeting: normalizeInteger(
            row.max_sessions_per_meeting,
            null,
          ),
          minimum_gap_slots: normalizeInteger(row.minimum_gap_slots, null),
          require_different_days: normalizeBoolean(
            row.require_different_days,
            true,
          ),
          is_active: normalizeBoolean(row.is_active, true),
        }))
        .filter(
          (row) =>
            row.teacher_id ||
            row.subject_id ||
            row.class_id ||
            row.weekly_sessions,
        );

      if (!normalizedRows.length) {
        message.error("File template kosong atau format sheet tidak sesuai.");
        return false;
      }

      const response = await onImport({ rows: normalizedRows });
      const importErrors = response?.data?.errors || [];
      if (importErrors.length > 0) {
        Modal.warning({
          title: "Beberapa baris gagal diimport",
          content: (
            <div>
              {importErrors.slice(0, 8).map((item, index) => (
                <div key={`${item.row_no}-${index}`}>
                  Baris {item.row_no}: {item.message}
                </div>
              ))}
            </div>
          ),
        });
      }
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal membaca atau mengimport file.",
      );
    } finally {
      setImporting(false);
    }
    return false;
  };

  const handleOpenCreate = () => {
    setEditingLoadId(null);
    form.resetFields();
    form.setFieldsValue({
      weekly_sessions: 2,
      max_sessions_per_meeting: 2,
      minimum_gap_slots: 4,
      require_different_days: true,
      allow_same_day_with_gap: true,
      is_active: true,
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (record) => {
    setEditingLoadId(record.teaching_load_id || null);
    form.setFieldsValue({
      id: record.teaching_load_id || undefined,
      class_id: record.class_id,
      subject_id: record.subject_id,
      teacher_id: record.teacher_id,
      weekly_sessions: record.weekly_sessions || 2,
      max_sessions_per_meeting: record.max_sessions_per_meeting || 2,
      minimum_gap_slots: Number.isFinite(record.minimum_gap_slots)
        ? record.minimum_gap_slots
        : 4,
      require_different_days: record.require_different_days ?? true,
      allow_same_day_with_gap: record.allow_same_day_with_gap ?? true,
      is_active: record.is_active ?? true,
    });
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSave({
      ...values,
      id: editingLoadId || values.id,
    });
    setOpenModal(false);
  };

  const assignmentColumns = [
    {
      title: "Guru",
      dataIndex: "teacher_name",
      key: "teacher_name",
      width: 220,
    },
    {
      title: "Mapel",
      dataIndex: "subject_name",
      key: "subject_name",
      width: 180,
    },
    {
      title: "Tingkat",
      dataIndex: "grade_name",
      key: "grade_name",
      width: 120,
    },
    { title: "Kelas", dataIndex: "class_name", key: "class_name", width: 160 },
    {
      title: "Beban Sesi",
      dataIndex: "weekly_sessions",
      key: "weekly_sessions",
      width: 120,
      render: (value) =>
        value ? (
          <Tag color='blue'>{value} sesi</Tag>
        ) : (
          <Tag color='default'>Belum diatur</Tag>
        ),
    },
    {
      title: "Status Beban",
      dataIndex: "teaching_load_id",
      key: "teaching_load_id",
      width: 140,
      render: (value) =>
        value ? (
          <Tag color='green'>Sudah diatur</Tag>
        ) : (
          <Tag color='orange'>Belum diatur</Tag>
        ),
    },
    {
      title: "Alokasi",
      key: "allocation_status",
      width: 220,
      render: (_, record) => {
        const shortage = shortageMap[
          [record.teacher_id, record.subject_id, record.class_id].join(":")
        ];

        if (!record.teaching_load_id) {
          return <Tag color='default'>Belum ada target sesi</Tag>;
        }

        if (!shortage) {
          return <Tag color='green'>Sudah terpenuhi</Tag>;
        }

        return (
          <Space size={[4, 4]} wrap>
            <Tag color='gold'>
              {shortage.allocated_sessions}/{shortage.required_sessions} sesi
            </Tag>
            <Tag color='red'>Kurang {shortage.missing_sessions} sesi</Tag>
          </Space>
        );
      },
    },
    {
      title: "Aksi",
      key: "action",
      width: 120,
      render: (_, record) =>
        canManage ? (
          <Button
            size='small'
            icon={<Pencil size={12} />}
            onClick={() => handleOpenEdit(record)}
          >
            Edit
          </Button>
        ) : null,
    },
  ];

  return (
    <Card
      style={{ borderRadius: 16 }}
      styles={{ body: { padding: 20 } }}
      title={
        <Space>
          <BookOpenText size={18} />
          <span>Beban Ajar Per Kelas</span>
        </Space>
      }
      extra={
        canManage ? (
          <Space wrap>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
            >
              Download Template
            </Button>
            <Upload
              accept='.xlsx,.xls'
              beforeUpload={handleImportExcel}
              showUploadList={false}
              disabled={loading || importing}
            >
              <Button icon={<UploadOutlined />} loading={importing}>
                Import Excel
              </Button>
            </Upload>
            <Button
              type='primary'
              icon={<Plus size={14} />}
              onClick={handleOpenCreate}
            >
              Atur Per Kelas
            </Button>
          </Space>
        ) : null
      }
    >
      <Alert
        showIcon
        type='info'
        title='Panduan template beban ajar'
        description={
          <div>
            1. Download template agar daftar guru, mapel, tingkat, dan kelas
            terisi otomatis.
            <br />
            2. Ubah hanya kolom `beban_sesi` sesuai jumlah sesi per minggu.
            <br />
            3. Jangan ubah kolom `teacher_id`, `subject_id`, dan `class_id`.
            <br />
            4. `minimum_gap_slots = 0` berarti mapel yang sama tidak boleh
            muncul lagi di hari yang sama.
            <br />
            5. Jika {"`minimum_gap_slots > 0`"}, sistem menganggap mapel yang
            sama boleh muncul lagi di hari yang sama dengan jarak sesuai gap.
            <br />
            6. Simpan file `.xlsx`, lalu klik `Import Excel`.
          </div>
        }
        style={{ marginBottom: 16 }}
      />

      {(sessionShortages || []).length > 0 ? (
        <Alert
          showIcon
          type='warning'
          style={{ marginBottom: 16 }}
          message={`Ada ${(sessionShortages || []).length} beban ajar yang sesi teralokasinya belum penuh`}
          description={
            filteredShortages.length > 0
              ? `${filteredShortages
                  .slice(0, 3)
                  .map(
                    (item) =>
                      `${item.teacher_name} - ${item.subject_name} ${item.class_name}: ${item.allocated_sessions}/${item.required_sessions} sesi`,
                  )
                  .join(" | ")}${filteredShortages.length > 3 ? " | ..." : ""}`
              : "Gunakan filter guru/tingkat atau lihat tab Jadwal Final untuk detail kekurangan sesi."
          }
        />
      ) : null}

      <Table
        rowKey={(record) =>
          `${record.teacher_id}-${record.subject_id}-${record.class_id || "general"}`
        }
        size='small'
        loading={loading}
        columns={assignmentColumns}
        dataSource={filteredAssignments}
        scroll={{ x: 900 }}
        pagination={{ pageSize: 8 }}
        title={() => (
          <Space
            wrap
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Space wrap>
              <Input
                allowClear
                placeholder='Filter nama guru'
                value={teacherKeyword}
                onChange={(event) => setTeacherKeyword(event.target.value)}
                style={{ width: 240 }}
              />
              <Select
                allowClear
                placeholder='Filter tingkat'
                options={gradeOptions}
                value={selectedGradeId}
                onChange={(value) => setSelectedGradeId(value)}
                style={{ width: 180 }}
              />
            </Space>
            <Tag icon={<InboxOutlined />} color='processing'>
              Template mengikuti data pada tabel saat ini
            </Tag>
          </Space>
        )}
      />

      <Modal
        open={openModal}
        title={
          editingLoadId
            ? "Edit Beban Ajar Per Kelas"
            : "Atur Beban Ajar Per Kelas"
        }
        onCancel={() => setOpenModal(false)}
        onOk={handleSubmit}
        okText='Simpan'
        confirmLoading={loading}
        centered
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='id' hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item
            name='teacher_id'
            label='Guru'
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp='label'
              options={teacherOptions}
            />
          </Form.Item>
          <Form.Item
            name='subject_id'
            label='Mata Pelajaran'
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp='label'
              options={subjectOptions}
            />
          </Form.Item>
          <Form.Item name='class_id' label='Kelas' rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp='label'
              options={classOptions}
            />
          </Form.Item>
          <Form.Item
            name='weekly_sessions'
            label='Beban sesi per minggu'
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={12} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name='max_sessions_per_meeting'
            label='Maks sesi per pertemuan'
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={4} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name='minimum_gap_slots'
            label='Minimal gap slot'
            rules={[{ required: true }]}
            extra='Isi 0 jika mapel yang sama tidak boleh muncul lagi di hari yang sama untuk kelas tersebut.'
          >
            <InputNumber min={0} max={10} style={{ width: "100%" }} />
          </Form.Item>
          <Alert
            showIcon
            type='info'
            message='Aturan gap slot'
            description='Cukup atur `minimum_gap_slots`. Nilai 0 berarti mapel yang sama tidak boleh muncul lagi di hari yang sama. Nilai lebih dari 0 berarti mapel yang sama boleh muncul lagi di hari yang sama dengan jarak minimal sesuai nilai gap.'
          />
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleLoadCard;
