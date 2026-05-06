import React from "react";
import { EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Pencil, Trash2 } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  useCreateDailyReportRecordMutation,
  useDeleteDailyReportRecordMutation,
  useGetDailyReportOptionsQuery,
  useGetDailyReportRecordsQuery,
  useUpdateDailyReportRecordMutation,
  useValidateDailyReportPayloadMutation,
} from "../../../service/tahfiz/ApiReport";
import DailyReportInputModal from "./DailyReportInputModal";

const { Title, Text } = Typography;

const DailyReport = ({ embedded = false, filters: externalFilters = null }) => {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = React.useState(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState(null);
  const [dateTo, setDateTo] = React.useState(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [localHomebaseId, setLocalHomebaseId] = React.useState();
  const [localPeriodeId, setLocalPeriodeId] = React.useState();
  const [localGradeId, setLocalGradeId] = React.useState();
  const [localClassId, setLocalClassId] = React.useState();

  const isEmbedded = embedded && externalFilters;
  const homebaseId = isEmbedded ? externalFilters.homebaseId : localHomebaseId;
  const periodeId = isEmbedded ? externalFilters.periodeId : localPeriodeId;
  const gradeId = isEmbedded ? externalFilters.gradeId : localGradeId;
  const classId = isEmbedded ? externalFilters.classId : localClassId;

  const optionsQuery = useGetDailyReportOptionsQuery({
    homebase_id: homebaseId,
    periode_id: periodeId,
    grade_id: gradeId,
    class_id: classId,
  });

  React.useEffect(() => {
    if (isEmbedded) return;
    const filters = optionsQuery.data?.filters;
    if (!filters) return;
    if (localHomebaseId == null && filters.selected_homebase_id != null) {
      setLocalHomebaseId(filters.selected_homebase_id);
    }
    if (localPeriodeId == null && filters.selected_periode_id != null) {
      setLocalPeriodeId(filters.selected_periode_id);
    }
    if (localGradeId == null && filters.selected_grade_id != null) {
      setLocalGradeId(filters.selected_grade_id);
    }
    if (localClassId == null && filters.selected_class_id != null) {
      setLocalClassId(filters.selected_class_id);
    }
  }, [
    isEmbedded,
    optionsQuery.data,
    localHomebaseId,
    localPeriodeId,
    localGradeId,
    localClassId,
  ]);

  React.useEffect(() => {
    if (isEmbedded) return;
    const filters = optionsQuery.data?.filters;
    const actorRole = optionsQuery.data?.actor?.user_role;
    const availableClasses = filters?.classes || [];
    if (actorRole !== "teacher" || !availableClasses.length) return;

    const selectedClass =
      availableClasses.find((item) => item.id === localClassId) ||
      availableClasses[0];

    if (localClassId == null && selectedClass?.id != null) {
      setLocalClassId(selectedClass.id);
    }

    if (
      selectedClass?.grade_id != null &&
      localGradeId !== selectedClass.grade_id
    ) {
      setLocalGradeId(selectedClass.grade_id);
    }
  }, [isEmbedded, optionsQuery.data, localClassId, localGradeId]);

  React.useEffect(() => {
    setPage(1);
  }, [homebaseId, periodeId, gradeId, classId]);

  const recordFilters = {
    homebase_id: homebaseId,
    periode_id: periodeId,
    grade_id: gradeId,
    class_id: classId,
    page,
    page_size: pageSize,
    date_from: dateFrom ? dayjs(dateFrom).format("YYYY-MM-DD") : undefined,
    date_to: dateTo ? dayjs(dateTo).format("YYYY-MM-DD") : undefined,
  };

  const recordsQuery = useGetDailyReportRecordsQuery(recordFilters, {
    skip: !periodeId,
  });

  const [validatePayload] = useValidateDailyReportPayloadMutation();
  const [createRecord, { isLoading: creating }] =
    useCreateDailyReportRecordMutation();
  const [updateRecord, { isLoading: updating }] =
    useUpdateDailyReportRecordMutation();
  const [deleteRecord, { isLoading: deleting }] =
    useDeleteDailyReportRecordMutation();
  const startSurahId = Form.useWatch("start_surah_id", form);
  const endSurahId = Form.useWatch("end_surah_id", form);
  const startAyat = Form.useWatch("start_ayat", form);
  const endAyat = Form.useWatch("end_ayat", form);

  const data = optionsQuery.data;
  const isLoading = optionsQuery.isLoading;
  const isFetching = optionsQuery.isFetching;
  const error = optionsQuery.error;
  const actor = data?.actor || {};
  const students = data?.reference?.students || [];
  const activityTypes = data?.reference?.activity_types || [];
  const surahs = data?.reference?.surahs || [];
  const startSurahMeta =
    surahs.find((item) => item.id === startSurahId) || null;
  const endSurahMeta = surahs.find((item) => item.id === endSurahId) || null;
  const maxStartAyat = startSurahMeta?.total_ayat || undefined;
  const maxEndAyat = endSurahMeta?.total_ayat || undefined;
  const startAyatOptions = React.useMemo(() => {
    if (!maxStartAyat) return [];
    return Array.from({ length: maxStartAyat }, (_, idx) => {
      const value = idx + 1;
      return { value, label: `${value}` };
    });
  }, [maxStartAyat]);
  const endAyatOptions = React.useMemo(() => {
    if (!maxEndAyat) return [];
    return Array.from({ length: maxEndAyat }, (_, idx) => {
      const value = idx + 1;
      return { value, label: `${value}` };
    });
  }, [maxEndAyat]);

  React.useEffect(() => {
    if (!maxStartAyat) return;
    if (!startAyat || startAyat <= maxStartAyat) return;
    form.setFieldValue("start_ayat", undefined);
  }, [form, maxStartAyat, startAyat]);

  React.useEffect(() => {
    if (!maxEndAyat) return;
    if (!endAyat || endAyat <= maxEndAyat) return;
    form.setFieldValue("end_ayat", undefined);
  }, [form, maxEndAyat, endAyat]);
  const records = recordsQuery.data?.rows || [];
  const recordsMeta = recordsQuery.data?.meta || {};
  const homebases = data?.filters?.homebases || [];
  const periodes = data?.filters?.periodes || [];
  const grades = data?.filters?.grades || [];
  const classes = data?.filters?.classes || [];
  const structureFilterSpan = actor.user_role === "admin" ? 6 : 8;

  if (isLoading || isFetching) {
    return (
      <Card>
        <Space>
          <Spin size='small' />
          <Text>Menyiapkan referensi setoran hafalan...</Text>
        </Space>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        type='error'
        showIcon
        title='Gagal memuat referensi setoran hafalan'
        description={error?.data?.message || "Silakan coba lagi."}
      />
    );
  }

  const resetFormState = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ date: dayjs() });
  };

  const openCreateModal = () => {
    resetFormState();
    setIsModalOpen(true);
  };

  const normalizeForSubmit = (values) => ({
    ...recordFilters,
    student_id: values.student_id,
    date: values.date ? dayjs(values.date).format("YYYY-MM-DD") : null,
    type_id: values.type_id,
    start_surah_id: values.start_surah_id,
    start_ayat: values.start_ayat,
    end_surah_id: values.end_surah_id,
    end_ayat: values.end_ayat,
    fluency_grade: values.fluency_grade || null,
    tajweed_grade: values.tajweed_grade || null,
    note: values.note || null,
  });

  const handleSubmit = async (values) => {
    const payload = normalizeForSubmit(values);
    try {
      const validation = await validatePayload(payload).unwrap();
      if (!validation.is_valid) {
        message.error(validation.errors?.[0] || "Data setoran belum valid.");
        return;
      }

      if (editingId) {
        await updateRecord({ id: editingId, ...payload }).unwrap();
        message.success("Setoran hafalan berhasil diperbarui.");
      } else {
        await createRecord(payload).unwrap();
        message.success("Setoran hafalan berhasil disimpan.");
      }

      resetFormState();
      setIsModalOpen(false);
    } catch (err) {
      message.error(err?.data?.message || "Gagal menyimpan setoran.");
    }
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setIsModalOpen(true);
    form.setFieldsValue({
      student_id: record.student_id,
      date: record.date ? dayjs(record.date) : dayjs(),
      type_id: record.type_id,
      start_surah_id: record.start_surah_id,
      start_ayat: record.start_ayat,
      end_surah_id: record.end_surah_id,
      end_ayat: record.end_ayat,
      fluency_grade: record.fluency_grade,
      tajweed_grade: record.tajweed_grade,
      note: record.note,
    });
  };

  const handleDelete = async (recordId) => {
    try {
      await deleteRecord({ id: recordId }).unwrap();
      message.success("Setoran hafalan berhasil dihapus.");
      if (editingId === recordId) {
        resetFormState();
        setIsModalOpen(false);
      }
    } catch (err) {
      message.error(err?.data?.message || "Gagal menghapus setoran.");
    }
  };

  const recordColumns = [
    {
      title: "Tanggal",
      key: "audit",
      width: 190,
      render: (_, record) => (
        <Space vertical size={2}>
          <Text type='secondary'>
            Dibuat:{" "}
            {record.created_at
              ? dayjs(record.created_at).format("YYYY-MM-DD HH:mm")
              : "-"}
          </Text>
          <Text type='secondary'>
            Diubah:{" "}
            {record.updated_at
              ? dayjs(record.updated_at).format("YYYY-MM-DD HH:mm")
              : "-"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <Space vertical size={2}>
          <Text strong>{record.student_name}</Text>
          <Text type='secondary'>NIS: {record.nis || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Setoran",
      key: "range",
      render: (_, record) => (
        <Space vertical size={2}>
          <Text type='success'>
            {record.start_surah_name || "-"} : {record.start_ayat}
          </Text>
          <Text type='danger'>
            {record.end_surah_name || "-"} : {record.end_ayat}
          </Text>
        </Space>
      ),
    },
    {
      title: "Jenis",
      dataIndex: "activity_name",
      width: 140,
      render: (value, record) => (
        <Tag>{value || record.activity_code || "-"}</Tag>
      ),
    },
    {
      title: "Pencatat",
      key: "recorder",
      width: 180,
      render: (_, record) => (
        <Space vertical size={2}>
          <Text>{record.recorded_by_name || "-"}</Text>
          <Text type='secondary'>{record.recorded_by_role || "-"}</Text>
        </Space>
      ),
    },

    {
      title: "Aksi",
      key: "action",
      width: 120,
      render: (_, record) => {
        const canManageRecord =
          Number(record.recorded_by_user_id) === Number(actor.user_id);

        return (
          <Space>
            <Tooltip
              title={
                canManageRecord
                  ? "Edit setoran"
                  : "Hanya pencatat setoran yang dapat mengubah data ini"
              }
            >
              <Button
                size='small'
                type='text'
                shape='circle'
                icon={<Pencil size={16} />}
                disabled={!canManageRecord}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Popconfirm
              title='Hapus setoran ini?'
              onConfirm={() => handleDelete(record.id)}
              okButtonProps={{ loading: deleting }}
              disabled={!canManageRecord}
            >
              <Tooltip
                title={
                  canManageRecord
                    ? "Hapus setoran"
                    : "Hanya pencatat setoran yang dapat menghapus data ini"
                }
              >
                <Button
                  danger
                  size='small'
                  type='text'
                  shape='circle'
                  icon={<Trash2 size={16} />}
                  disabled={!canManageRecord}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const adminStructureFilterContent =
    actor.user_role === "admin" ? (
      <div
        style={{
          padding: 16,
          border: "1px solid #f0f0f0",
          borderRadius: 14,
          background: "linear-gradient(180deg, #fafcff 0%, #ffffff 100%)",
          marginBottom: 16,
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8} xl={structureFilterSpan}>
            <Text type='secondary'>Satuan</Text>
            <Select
              allowClear
              size='large'
              style={{ width: "100%", marginTop: 6 }}
              value={homebaseId}
              placeholder='Pilih satuan'
              options={homebases.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              onChange={(value) => {
                setLocalHomebaseId(value);
                setLocalPeriodeId(undefined);
                setLocalGradeId(undefined);
                setLocalClassId(undefined);
                setPage(1);
              }}
            />
          </Col>
          <Col xs={24} md={8} xl={structureFilterSpan}>
            <Text type='secondary'>Periode</Text>
            <Select
              allowClear
              size='large'
              style={{ width: "100%", marginTop: 6 }}
              value={periodeId}
              placeholder='Pilih periode'
              options={periodes.map((item) => ({
                value: item.id,
                label: `${item.name}${item.is_active ? " (Aktif)" : ""}`,
              }))}
              onChange={(value) => {
                setLocalPeriodeId(value);
                setLocalClassId(undefined);
                setPage(1);
              }}
            />
          </Col>
          <Col xs={24} md={8} xl={structureFilterSpan}>
            <Text type='secondary'>Tingkat</Text>
            <Select
              allowClear
              size='large'
              style={{ width: "100%", marginTop: 6 }}
              value={gradeId}
              placeholder='Pilih tingkat'
              options={grades.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              onChange={(value) => {
                setLocalGradeId(value);
                setLocalClassId(undefined);
                setPage(1);
              }}
            />
          </Col>
          <Col xs={24} md={8} xl={structureFilterSpan}>
            <Text type='secondary'>Kelas</Text>
            <Select
              allowClear
              size='large'
              style={{ width: "100%", marginTop: 6 }}
              value={classId}
              placeholder='Pilih kelas'
              options={classes.map((item) => ({
                value: item.id,
                label: `${item.grade_name ? `${item.grade_name} - ` : ""}${item.name}`,
              }))}
              onChange={(value) => {
                setLocalClassId(value);
                setPage(1);
              }}
            />
          </Col>
        </Row>
      </div>
    ) : null;

  return (
    <Space vertical size='large' style={{ width: "100%" }}>
      <Card
        variant='borderless'
        style={{ background: "transparent" }}
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            padding: 20,
            borderRadius: 16,
            border: "1px solid #f0f0f0",
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          }}
        >
          <Space vertical size={4}>
            <Text style={{ color: "rgba(255,255,255,0.72)" }}>
              Pencatatan Hafalan
            </Text>
            <Title level={4} style={{ color: "#fff", margin: 0 }}>
              Catatan Hafalan siswa
            </Title>
          </Space>
          <Button
            type='primary'
            size='large'
            icon={editingId ? <EditOutlined /> : <PlusOutlined />}
            onClick={openCreateModal}
            style={{
              minWidth: 180,
              background: "#fff",
              color: "#0f172a",
              borderColor: "#fff",
            }}
          >
            Input Setoran
          </Button>
        </div>
      </Card>

      <Card
        title='Riwayat Setoran'
        extra={
          <Space size={10} wrap>
            {actor.user_role === "admin" ? (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setPage(1);
                  setDateFrom(null);
                  setDateTo(null);
                  setLocalHomebaseId(data?.filters?.selected_homebase_id);
                  setLocalPeriodeId(data?.filters?.selected_periode_id);
                  setLocalGradeId(data?.filters?.selected_grade_id);
                  setLocalClassId(data?.filters?.selected_class_id);
                }}
              >
                Reset Filter
              </Button>
            ) : null}
            <DatePicker
              size='middle'
              value={dateFrom}
              format='YYYY-MM-DD'
              placeholder='Tanggal dari'
              onChange={(value) => {
                setDateFrom(value);
                setPage(1);
              }}
            />
            <DatePicker
              size='middle'
              value={dateTo}
              format='YYYY-MM-DD'
              placeholder='Tanggal sampai'
              onChange={(value) => {
                setDateTo(value);
                setPage(1);
              }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setDateFrom(null);
                setDateTo(null);
                setPage(1);
              }}
            >
              Reset Tanggal
            </Button>
          </Space>
        }
      >
        {adminStructureFilterContent}
        <Table
          rowKey='id'
          columns={recordColumns}
          dataSource={records}
          loading={recordsQuery.isLoading || recordsQuery.isFetching}
          pagination={{
            current: page,
            pageSize,
            total: recordsMeta.total || 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          scroll={{ x: 940 }}
        />
      </Card>

      <DailyReportInputModal
        open={isModalOpen}
        editingId={editingId}
        onCancel={() => {
          resetFormState();
          setIsModalOpen(false);
        }}
        form={form}
        onSubmit={handleSubmit}
        students={students}
        activityTypes={activityTypes}
        surahs={surahs}
        maxStartAyat={maxStartAyat}
        maxEndAyat={maxEndAyat}
        startAyatOptions={startAyatOptions}
        endAyatOptions={endAyatOptions}
        loading={creating || updating}
      />
    </Space>
  );
};

export default DailyReport;
