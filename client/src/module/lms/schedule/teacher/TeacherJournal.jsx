import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DownloadCloud, Pencil, Plus, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

const { Text } = Typography;
const { TextArea } = Input;

const createJournalStorageKey = (teacherId) =>
  `lms_teacher_journal_${teacherId}`;

const createInitialJournalForm = () => ({
  id: null,
  date: dayjs(),
  class_id: null,
  meeting_no: 1,
  learning_material: "",
  activity: "",
});

const TeacherJournal = ({ user, classOptions }) => {
  const [journalForm] = Form.useForm();
  const [journalRows, setJournalRows] = useState([]);
  const [editingJournalId, setEditingJournalId] = useState(null);
  const [journalFilterClass, setJournalFilterClass] = useState("all");
  const [journalFilterDate, setJournalFilterDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    const storageKey = createJournalStorageKey(user.id);
    const savedValue = window.localStorage.getItem(storageKey);

    if (!savedValue) {
      setJournalRows([]);
      journalForm.setFieldsValue(createInitialJournalForm());
      return;
    }

    try {
      const parsed = JSON.parse(savedValue);
      setJournalRows(Array.isArray(parsed) ? parsed : []);
    } catch {
      setJournalRows([]);
    }

    journalForm.setFieldsValue(createInitialJournalForm());
  }, [journalForm, user?.id]);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    const storageKey = createJournalStorageKey(user.id);
    window.localStorage.setItem(storageKey, JSON.stringify(journalRows));
  }, [journalRows, user?.id]);

  const filteredJournalRows = useMemo(() => {
    return journalRows
      .filter((item) =>
        journalFilterClass === "all"
          ? true
          : Number(item.class_id) === Number(journalFilterClass),
      )
      .filter((item) =>
        journalFilterDate
          ? item.date === journalFilterDate.format("YYYY-MM-DD")
          : true,
      )
      .sort((left, right) => {
        const dateCompare = String(right.date || "").localeCompare(
          String(left.date || ""),
        );
        if (dateCompare !== 0) return dateCompare;
        return Number(right.meeting_no || 0) - Number(left.meeting_no || 0);
      });
  }, [journalFilterClass, journalFilterDate, journalRows]);

  const handleDownload = () => {
    if (!filteredJournalRows.length) {
      message.warning("Tidak ada data jurnal untuk diunduh.");
      return;
    }

    const exportRows = filteredJournalRows.map((item, index) => ({
      No: index + 1,
      Tanggal: dayjs(item.date).format("DD MMM YYYY"),
      Kelas: item.class_name || "-",
      Pertemuan: item.meeting_no || "-",
      "Materi Pembelajaran": item.learning_material || "-",
      Kegiatan: item.activity || "-",
      Guru: item.teacher_name || user?.full_name || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jurnal Guru");

    const activeClassName =
      journalFilterClass === "all"
        ? "Semua_Kelas"
        : (classOptions.find(
            (item) => Number(item.value) === Number(journalFilterClass),
          )?.label || "Kelas");

    const safeClassName = String(activeClassName)
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_");

    XLSX.writeFile(
      workbook,
      `Jurnal_Guru_${safeClassName}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`,
    );
  };

  const resetJournalForm = () => {
    setEditingJournalId(null);
    journalForm.setFieldsValue(createInitialJournalForm());
    setModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingJournalId(null);
    journalForm.setFieldsValue(createInitialJournalForm());
    setModalOpen(true);
  };

  const handleSubmitJournal = async () => {
    try {
      const values = await journalForm.validateFields();
      const className =
        classOptions.find(
          (item) => Number(item.value) === Number(values.class_id),
        )?.label || "-";

      const nextPayload = {
        id: editingJournalId || Date.now(),
        teacher_id: user?.id,
        teacher_name: user?.full_name || "-",
        date: values.date.format("YYYY-MM-DD"),
        class_id: Number(values.class_id),
        class_name: className,
        meeting_no: Number(values.meeting_no),
        learning_material: values.learning_material.trim(),
        activity: values.activity.trim(),
        updated_at: new Date().toISOString(),
      };

      setJournalRows((current) => {
        if (editingJournalId) {
          return current.map((item) =>
            Number(item.id) === Number(editingJournalId) ? nextPayload : item,
          );
        }
        return [nextPayload, ...current];
      });

      message.success(
        editingJournalId
          ? "Jurnal berhasil diperbarui."
          : "Jurnal berhasil ditambahkan.",
      );
      resetJournalForm();
    } catch {
      return null;
    }

    return null;
  };

  const handleEditJournal = (record) => {
    setEditingJournalId(record.id);
    journalForm.setFieldsValue({
      id: record.id,
      date: dayjs(record.date),
      class_id: Number(record.class_id),
      meeting_no: Number(record.meeting_no),
      learning_material: record.learning_material,
      activity: record.activity,
    });
    setModalOpen(true);
  };

  const handleDeleteJournal = (id) => {
    setJournalRows((current) =>
      current.filter((item) => Number(item.id) !== Number(id)),
    );
    if (Number(editingJournalId) === Number(id)) {
      journalForm.setFieldsValue(createInitialJournalForm());
      setEditingJournalId(null);
      setModalOpen(false);
    }
    message.success("Jurnal berhasil dihapus.");
  };

  const journalColumns = [
    {
      title: "Tanggal",
      dataIndex: "date",
      width: 130,
      render: (value) => dayjs(value).format("DD MMM YYYY"),
    },
    {
      title: "Kelas",
      dataIndex: "class_name",
      width: 120,
      render: (value) => <Text strong>{value || "-"}</Text>,
    },
    {
      title: "Pertemuan",
      dataIndex: "meeting_no",
      width: 100,
      align: "center",
      render: (value) => <Tag color="blue">Ke-{value}</Tag>,
    },
    {
      title: "Materi Pembelajaran",
      dataIndex: "learning_material",
      render: (value) => value || "-",
    },
    {
      title: "Kegiatan",
      dataIndex: "activity",
      render: (value) => (
        <div style={{ whiteSpace: "pre-wrap" }}>{value || "-"}</div>
      ),
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
            onClick={() => handleEditJournal(record)}
          />
          <Popconfirm
            title="Hapus jurnal ini?"
            okText="Ya"
            cancelText="Tidak"
            onConfirm={() => handleDeleteJournal(record.id)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Jurnal Mengajar"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={openCreateModal}
          >
            Jurnal
          </Button>

          <Button icon={<DownloadCloud size={14} />} onClick={handleDownload}>
            Download
          </Button>
        </Space>
      }
      style={{ borderRadius: 20 }}
    >
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Space wrap>
            <Select
              value={journalFilterClass}
              onChange={setJournalFilterClass}
              style={{ minWidth: 200 }}
              options={[
                { value: "all", label: "Semua Kelas" },
                ...classOptions,
              ]}
              showSearch={{ optionFilterProp: "label" }}
              virtual={false}
              placeholder="Filter kelas"
              allowClear
            />
            <DatePicker
              value={journalFilterDate}
              onChange={setJournalFilterDate}
              format="DD MMM YYYY"
              placeholder="Filter tanggal"
              allowClear
            />
          </Space>

          <Space wrap>
            <Text type="secondary">
              Total jurnal: {filteredJournalRows.length}
            </Text>
          </Space>
        </Flex>

        <Table
          rowKey="id"
          columns={journalColumns}
          dataSource={filteredJournalRows}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Belum ada jurnal mengajar."
              />
            ),
          }}
        />
      </Flex>

      <Modal
        open={modalOpen}
        title={editingJournalId ? "Ubah Jurnal" : "Input Jurnal"}
        onCancel={resetJournalForm}
        onOk={handleSubmitJournal}
        okText={editingJournalId ? "Simpan Perubahan" : "Simpan Jurnal"}
        centered
        destroyOnHidden
      >
        <Form
          form={journalForm}
          layout="vertical"
          initialValues={createInitialJournalForm()}
        >
          <Form.Item
            name="date"
            label="Tanggal"
            rules={[{ required: true, message: "Tanggal wajib diisi." }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD MMM YYYY"
              allowClear={false}
            />
          </Form.Item>

          <Form.Item
            name="class_id"
            label="Kelas"
            rules={[{ required: true, message: "Kelas wajib dipilih." }]}
          >
            <Select
              placeholder="Pilih kelas"
              options={classOptions}
              showSearch={{ optionFilterProp: "labe" }}
              virtual={false}
            />
          </Form.Item>

          <Form.Item
            name="meeting_no"
            label="Pertemuan"
            rules={[{ required: true, message: "Pertemuan wajib diisi." }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="learning_material"
            label="Materi Pembelajaran"
            rules={[
              { required: true, message: "Materi pembelajaran wajib diisi." },
            ]}
          >
            <Input placeholder="Tulis materi pembelajaran" />
          </Form.Item>

          <Form.Item
            name="activity"
            label="Kegiatan"
            rules={[{ required: true, message: "Kegiatan wajib diisi." }]}
          >
            <TextArea
              rows={5}
              placeholder="Tulis kegiatan pembelajaran"
              maxLength={3000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TeacherJournal;
