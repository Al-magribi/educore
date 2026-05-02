import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Flex,
  Form,
  Grid,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BookOpenText,
  DownloadCloud,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useGetClassesQuery } from "../../../../../service/lms/ApiLms";
import {
  useAddTeacherJournalMutation,
  useDeleteTeacherJournalMutation,
  useGetTeacherJournalsQuery,
  useUpdateTeacherJournalMutation,
} from "../../../../../service/lms/ApiJournal";
import JournalFormDrawer from "./components/JournalFormDrawer";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const statCardStyle = {
  borderRadius: 18,
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.05)",
  height: "100%",
};

const createInitialJournalForm = () => ({
  date: dayjs(),
  class_id: null,
  meeting_no: 1,
  learning_material: undefined,
  activity: "",
});

const TeacherJournal = ({ subjectId, subject }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [journalForm] = Form.useForm();
  const [editingJournal, setEditingJournal] = useState(null);
  const [journalFilterClass, setJournalFilterClass] = useState(null);
  const [journalFilterDate, setJournalFilterDate] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    data: classRes,
    isLoading: isClassLoading,
    isError: isClassError,
    error: classError,
  } = useGetClassesQuery(
    { subjectId, gradeId: null },
    { skip: !subjectId },
  );

  const classOptions = useMemo(
    () =>
      (classRes?.data || []).map((item) => ({
        value: Number(item.id),
        label: item.name,
      })),
    [classRes?.data],
  );

  const dateValue = journalFilterDate?.format("YYYY-MM-DD");
  const {
    data: journalRes,
    isLoading: isJournalLoading,
    isFetching: isJournalFetching,
    isError: isJournalError,
    error: journalError,
    refetch,
  } = useGetTeacherJournalsQuery(
    {
      subjectId,
      classId: journalFilterClass,
      date: dateValue,
    },
    { skip: !subjectId },
  );

  const journals = useMemo(() => journalRes?.data || [], [journalRes?.data]);
  const meta = journalRes?.meta || {};

  const [addTeacherJournal, { isLoading: isAdding }] =
    useAddTeacherJournalMutation();
  const [updateTeacherJournal, { isLoading: isUpdating }] =
    useUpdateTeacherJournalMutation();
  const [deleteTeacherJournal, { isLoading: isDeleting }] =
    useDeleteTeacherJournalMutation();

  const prepareDefaultForm = () => ({
    ...createInitialJournalForm(),
    class_id: journalFilterClass ? Number(journalFilterClass) : null,
  });

  const fillForm = (record = null) => {
    if (record) {
      journalForm.setFieldsValue({
        date: dayjs(record.journal_date),
        class_id: Number(record.class_id),
        meeting_no: Number(record.meeting_no),
        learning_material: record.learning_material || undefined,
        activity: record.activity || "",
      });
      return;
    }

    journalForm.setFieldsValue(prepareDefaultForm());
  };

  const closeDrawer = () => {
    setEditingJournal(null);
    setDrawerOpen(false);
    journalForm.resetFields();
    fillForm();
  };

  const handleResetForm = () => {
    journalForm.resetFields();
    fillForm(editingJournal);
  };

  const openCreateDrawer = () => {
    setEditingJournal(null);
    journalForm.resetFields();
    fillForm();
    setDrawerOpen(true);
  };

  const handleEditJournal = (record) => {
    setEditingJournal(record);
    journalForm.resetFields();
    fillForm(record);
    setDrawerOpen(true);
  };

  const handleSubmitJournal = async () => {
    try {
      const values = await journalForm.validateFields();
      const payload = {
        class_id: Number(values.class_id),
        journal_date: values.date.format("YYYY-MM-DD"),
        meeting_no: Number(values.meeting_no),
        learning_material: String(values.learning_material || "").trim(),
        activity: values.activity.trim(),
      };

      if (editingJournal?.id) {
        await updateTeacherJournal({
          id: editingJournal.id,
          ...payload,
        }).unwrap();
        message.success("Jurnal berhasil diperbarui.");
      } else {
        await addTeacherJournal({
          subjectId,
          ...payload,
        }).unwrap();
        message.success("Jurnal berhasil ditambahkan.");
      }

      closeDrawer();
    } catch (error) {
      if (error?.data?.message) {
        message.error(error.data.message);
      }
    }
  };

  const handleDeleteJournal = async (id) => {
    try {
      await deleteTeacherJournal(id).unwrap();
      message.success("Jurnal berhasil dihapus.");
      if (Number(editingJournal?.id) === Number(id)) {
        closeDrawer();
      }
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus jurnal.");
    }
  };

  const handleDownload = () => {
    if (!journals.length) {
      message.warning("Tidak ada data jurnal untuk diunduh.");
      return;
    }

    const exportRows = journals.map((item, index) => ({
      No: index + 1,
      Tanggal: dayjs(item.journal_date).format("DD MMM YYYY"),
      Kelas: item.class_name || "-",
      "Mata Pelajaran": item.subject_name || subject?.name || "-",
      Pertemuan: item.meeting_no || "-",
      "Materi Pembelajaran": item.learning_material || "-",
      Kegiatan: item.activity || "-",
      Guru: item.teacher_name || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jurnal Guru");

    const safeSubjectName = String(subject?.name || "Mapel")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_");

    XLSX.writeFile(
      workbook,
      `Jurnal_${safeSubjectName}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`,
    );
  };

  const columns = [
    {
      title: "Tanggal",
      dataIndex: "journal_date",
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
      width: 110,
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
      width: 140,
      render: (_, record) => (
        <Space size={6}>
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
            <Button
              danger
              size="small"
              icon={<Trash2 size={14} />}
              loading={isDeleting}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isClassError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Gagal memuat daftar kelas"
        description={
          classError?.data?.message ||
          "Data kelas untuk jurnal mengajar belum bisa dimuat."
        }
        style={{ borderRadius: 18 }}
      />
    );
  }

  return (
    <Flex vertical gap={16}>
      <Card
        style={{ borderRadius: 20 }}
        styles={{ body: { padding: isMobile ? 18 : 20 } }}
        extra={
          <Space wrap>
            <Button
              icon={<RefreshCw size={14} />}
              onClick={() => refetch()}
              loading={isJournalFetching}
            >
              Muat Ulang
            </Button>
            <Button icon={<DownloadCloud size={14} />} onClick={handleDownload}>
              Download
            </Button>
            <Button
              type="primary"
              icon={<Plus size={14} />}
              onClick={openCreateDrawer}
              style={{
                borderRadius: 12,
                boxShadow: "0 12px 24px rgba(37, 99, 235, 0.18)",
              }}
            >
              Input Jurnal
            </Button>
          </Space>
        }
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Jurnal Pembelajaran
            </Title>
            <Text type="secondary">
              Isi jurnal sesuai kelas yang Anda ampu pada mata pelajaran{" "}
              {subject?.name || meta.subject_name || "-"}.
            </Text>
          </div>

          <Space wrap>
            <Tag color="blue">{subject?.name || meta.subject_name || "-"}</Tag>
            <Tag color="green">Total Jurnal: {journals.length}</Tag>
          </Space>
        </Flex>

        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={12}
          style={{ marginTop: 16 }}
        >
          <Space wrap>
            <Select
              value={journalFilterClass}
              onChange={(value) => setJournalFilterClass(value || null)}
              style={{ minWidth: 220 }}
              options={classOptions}
              loading={isClassLoading}
              placeholder="Filter kelas"
              allowClear
              showSearch
              optionFilterProp="label"
              virtual={false}
            />
            <DatePicker
              value={journalFilterDate}
              onChange={setJournalFilterDate}
              format="DD MMM YYYY"
              placeholder="Filter tanggal"
              allowClear
            />
          </Space>

          <Text type="secondary">
            Kelas tersedia: {classOptions.length || meta.total_classes || 0}
          </Text>
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card size="small" style={statCardStyle}>
            <Space align="start">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#e0f2fe",
                  color: "#0369a1",
                  flexShrink: 0,
                }}
              >
                <BookOpenText size={18} />
              </div>
              <div>
                <Text type="secondary">Mata Pelajaran</Text>
                <Title level={5} style={{ margin: "4px 0 0" }}>
                  {subject?.name || meta.subject_name || "-"}
                </Title>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" style={statCardStyle}>
            <Text type="secondary">Total Jurnal</Text>
            <Title level={4} style={{ margin: "6px 0 0", color: "#1d4ed8" }}>
              {journals.length}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" style={statCardStyle}>
            <Text type="secondary">Kelas Tersedia</Text>
            <Title level={4} style={{ margin: "6px 0 0", color: "#15803d" }}>
              {classOptions.length || meta.total_classes || 0}
            </Title>
          </Card>
        </Col>
      </Row>

      {isJournalError ? (
        <Alert
          type="error"
          showIcon
          message="Gagal memuat jurnal pembelajaran"
          description={
            journalError?.data?.message ||
            "Terjadi kendala saat mengambil data jurnal."
          }
          style={{ borderRadius: 18 }}
        />
      ) : (
        <Card style={{ borderRadius: 20 }} styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={journals}
            loading={isJournalLoading || isJournalFetching}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 1100 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Belum ada jurnal pada mata pelajaran ini."
                />
              ),
            }}
          />
        </Card>
      )}

      <JournalFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onReset={handleResetForm}
        onSubmit={handleSubmitJournal}
        form={journalForm}
        editingJournal={editingJournal}
        subjectId={subjectId}
        subjectName={subject?.name || meta.subject_name || "-"}
        classOptions={classOptions}
        isClassLoading={isClassLoading}
        isMobile={isMobile}
        isSaving={isAdding || isUpdating}
      />
    </Flex>
  );
};

export default TeacherJournal;
