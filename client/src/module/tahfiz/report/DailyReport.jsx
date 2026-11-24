import React from "react";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Empty,
  Flex,
  Form,
  Grid,
  List,
  Select,
  Skeleton,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import { NotebookPen, Plus, RotateCcw } from "lucide-react";
import dayjs from "dayjs";
import {
  useCreateDailyReportRecordMutation,
  useDeleteDailyReportRecordMutation,
  useGetDailyReportOptionsQuery,
  useGetDailyReportRecordsQuery,
  useUpdateDailyReportRecordMutation,
  useValidateDailyReportPayloadMutation,
} from "../../../service/tahfiz/ApiReport";
import PageHeader from "../../../components/ui/PageHeader";
import { CardTitle, MuseCard } from "../../../components/ui/muse";
import { EditDeleteActions } from "../../../components/ui/muse/DataSection";
import { museRadius } from "../../../config/theme";
import DailyReportInputModal from "./DailyReportInputModal";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const DailyReport = ({ embedded = false, filters: externalFilters = null }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();
  const { token } = theme.useToken();
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
  const data = optionsQuery.data;
  const actor = data?.actor || {};
  const isAdmin = actor.user_role === "admin";
  const adminStructureFilterReady = Boolean(homebaseId && periodeId);

  React.useEffect(() => {
    if (isEmbedded) return;
    const filters = optionsQuery.data?.filters;
    const actorRole = optionsQuery.data?.actor?.user_role;
    if (!filters) return;
    if (
      actorRole !== "admin" &&
      localHomebaseId == null &&
      filters.selected_homebase_id != null
    ) {
      setLocalHomebaseId(filters.selected_homebase_id);
    }
    if (
      actorRole !== "admin" &&
      localPeriodeId == null &&
      filters.selected_periode_id != null
    ) {
      setLocalPeriodeId(filters.selected_periode_id);
    }
    if (
      actorRole !== "admin" &&
      localGradeId == null &&
      filters.selected_grade_id != null
    ) {
      setLocalGradeId(filters.selected_grade_id);
    }
    if (
      actorRole !== "admin" &&
      localClassId == null &&
      filters.selected_class_id != null
    ) {
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
    page,
    page_size: pageSize,
    date_from: dateFrom ? dayjs(dateFrom).format("YYYY-MM-DD") : undefined,
    date_to: dateTo ? dayjs(dateTo).format("YYYY-MM-DD") : undefined,
  };
  const shouldApplyStructureFilters = !isAdmin || isEmbedded || adminStructureFilterReady;
  const effectiveRecordFilters = shouldApplyStructureFilters
    ? {
        ...recordFilters,
        homebase_id: homebaseId,
        periode_id: periodeId,
        grade_id: gradeId,
        class_id: classId,
      }
    : recordFilters;

  const recordsQuery = useGetDailyReportRecordsQuery(effectiveRecordFilters, {
    skip: !isAdmin && !periodeId,
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

  const isLoading = optionsQuery.isLoading;
  const isFetching = optionsQuery.isFetching;
  const error = optionsQuery.error;
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
  const disableAdminDetailFilter = isAdmin && !adminStructureFilterReady;

  if (isLoading) {
    return (
      <Flex vertical gap={24}>
        <Skeleton.Input active style={{ width: 280 }} />
        <MuseCard>
          <Skeleton active paragraph={{ rows: 6 }} />
        </MuseCard>
      </Flex>
    );
  }

  if (error) {
    return (
      <MuseCard>
        <Alert
          type='error'
          showIcon
          title='Gagal memuat referensi setoran hafalan'
          description={error?.data?.message || "Silakan muat ulang halaman."}
        />
      </MuseCard>
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
    homebase_id: homebaseId,
    periode_id: periodeId,
    grade_id: gradeId,
    class_id: classId,
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

  const formatDateTime = (value) => (value ? dayjs(value).format("DD MMM YYYY, HH:mm") : "-");

  const renderRange = (record) => (
    <Text>
      {record.start_surah_name || "-"} : {record.start_ayat ?? "-"}
      <Text type='secondary'> → </Text>
      {record.end_surah_name || "-"} : {record.end_ayat ?? "-"}
    </Text>
  );

  const renderActions = (record) => {
    const canManageRecord = Number(record.recorded_by_user_id) === Number(actor.user_id);
    return (
      <EditDeleteActions
        onEdit={canManageRecord ? () => handleEdit(record) : undefined}
        onDelete={() => handleDelete(record.id)}
        deleteTitle={`Hapus setoran ${record.student_name || "ini"}?`}
        deleteDescription='Data setoran yang dihapus tidak dapat dikembalikan.'
        deleteDisabled={!canManageRecord}
        deleteDisabledReason='Hanya pencatat setoran yang dapat menghapus data ini'
        deleting={deleting}
      />
    );
  };

  const recordColumns = [
    {
      title: "SISWA",
      key: "student",
      render: (_, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {record.student_name}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            NIS {record.nis || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "TANGGAL",
      key: "date",
      width: 150,
      render: (_, record) => (
        <Tooltip title={`Dibuat ${formatDateTime(record.created_at)} · Diubah ${formatDateTime(record.updated_at)}`}>
          <span>{record.date ? dayjs(record.date).format("DD MMM YYYY") : formatDateTime(record.created_at)}</span>
        </Tooltip>
      ),
    },
    {
      title: "SETORAN",
      key: "range",
      render: (_, record) => renderRange(record),
    },
    {
      title: "JENIS",
      dataIndex: "activity_name",
      width: 140,
      render: (value, record) => (
        <Tag color='blue' style={{ marginInlineEnd: 0 }}>
          {value || record.activity_code || "-"}
        </Tag>
      ),
    },
    {
      title: "PENCATAT",
      key: "recorder",
      width: 180,
      render: (_, record) => (
        <div>
          <Text style={{ display: "block" }}>{record.recorded_by_name || "-"}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.recorded_by_role || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "AKSI",
      key: "action",
      width: 110,
      align: "right",
      render: (_, record) => <Flex justify='flex-end'>{renderActions(record)}</Flex>,
    },
  ];

  const resetAllFilters = () => {
    setPage(1);
    setDateFrom(null);
    setDateTo(null);
    if (isAdmin) {
      setLocalHomebaseId(undefined);
      setLocalPeriodeId(undefined);
      setLocalGradeId(undefined);
      setLocalClassId(undefined);
    }
  };

  const hasActiveFilter = Boolean(
    dateFrom || dateTo || (isAdmin && (homebaseId || periodeId || gradeId || classId)),
  );

  const filterWidth = isMobile ? "100%" : 180;
  const adminStructureFilters = isAdmin ? (
    <>
      <Select
        aria-label='Filter satuan'
        allowClear
        style={{ width: filterWidth }}
        value={homebaseId}
        placeholder='Semua satuan'
        options={homebases.map((item) => ({ value: item.id, label: item.name }))}
        onChange={(value) => {
          setLocalHomebaseId(value);
          setLocalPeriodeId(undefined);
          setLocalGradeId(undefined);
          setLocalClassId(undefined);
          setPage(1);
        }}
      />
      <Select
        aria-label='Filter periode'
        allowClear
        style={{ width: filterWidth }}
        value={periodeId}
        placeholder={homebaseId ? "Pilih periode" : "Pilih satuan dulu"}
        disabled={!homebaseId}
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
      <Select
        aria-label='Filter tingkat'
        allowClear
        style={{ width: filterWidth }}
        value={gradeId}
        placeholder='Semua tingkat'
        disabled={disableAdminDetailFilter}
        options={grades.map((item) => ({ value: item.id, label: item.name }))}
        onChange={(value) => {
          setLocalGradeId(value);
          setLocalClassId(undefined);
          setPage(1);
        }}
      />
      <Select
        aria-label='Filter kelas'
        allowClear
        style={{ width: filterWidth }}
        value={classId}
        placeholder='Semua kelas'
        disabled={disableAdminDetailFilter}
        options={classes.map((item) => ({
          value: item.id,
          label: `${item.grade_name ? `${item.grade_name} - ` : ""}${item.name}`,
        }))}
        onChange={(value) => {
          setLocalClassId(value);
          setPage(1);
        }}
      />
    </>
  ) : null;

  const pagination = {
    current: page,
    pageSize,
    total: recordsMeta.total || 0,
    showSizeChanger: !isMobile,
    pageSizeOptions: [10, 20, 50],
    size: isMobile ? "small" : undefined,
    align: isMobile ? "center" : undefined,
    onChange: (nextPage, nextPageSize) => {
      setPage(nextPage);
      setPageSize(nextPageSize);
    },
  };

  const emptyNode = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        hasActiveFilter
          ? "Tidak ada setoran pada filter ini."
          : "Belum ada setoran hafalan. Klik Input Setoran untuk mencatat yang pertama."
      }
    />
  );

  const isRecordsLoading = recordsQuery.isLoading || recordsQuery.isFetching || isFetching;

  return (
    <Flex vertical gap={isMobile ? 16 : 24} style={{ minWidth: 0 }}>
      {embedded ? null : (
        <PageHeader
          title='Setoran Hafalan'
          description='Catat dan pantau setoran hafalan siswa per tanggal.'
          extra={
            <Button type='primary' icon={<Plus size={16} />} onClick={openCreateModal}>
              Input Setoran
            </Button>
          }
        />
      )}

      <MuseCard
        flush
        title={
          <CardTitle
            icon={<NotebookPen size={18} />}
            title='Riwayat Setoran'
            description={`${Number(recordsMeta.total || 0).toLocaleString("id-ID")} setoran`}
          />
        }
        extra={
          embedded ? (
            <Button type='primary' icon={<Plus size={16} />} onClick={openCreateModal}>
              Input Setoran
            </Button>
          ) : null
        }
      >
        <Flex
          gap={8}
          wrap
          style={{ padding: isMobile ? "0 16px 16px" : "0 24px 16px" }}
        >
          {adminStructureFilters}
          <DatePicker.RangePicker
            aria-label='Rentang tanggal'
            value={[dateFrom, dateTo]}
            format='DD MMM YYYY'
            placeholder={["Dari tanggal", "Sampai tanggal"]}
            allowEmpty={[true, true]}
            style={{ width: isMobile ? "100%" : 280 }}
            onChange={(values) => {
              setDateFrom(values?.[0] || null);
              setDateTo(values?.[1] || null);
              setPage(1);
            }}
          />
          {hasActiveFilter ? (
            <Button icon={<RotateCcw size={16} />} onClick={resetAllFilters}>
              Reset Filter
            </Button>
          ) : null}
        </Flex>

        {isAdmin && !adminStructureFilterReady ? (
          <div style={{ padding: isMobile ? "0 16px 16px" : "0 24px 16px" }}>
            <Alert
              type='info'
              showIcon
              title='Pilih satuan dan periode untuk memfilter per tingkat atau kelas.'
            />
          </div>
        ) : null}

        {recordsQuery.error ? (
          <div style={{ padding: isMobile ? "0 16px 16px" : "0 24px 16px" }}>
            <Alert
              type='error'
              showIcon
              title='Gagal memuat riwayat setoran'
              description={recordsQuery.error?.data?.message || "Silakan coba lagi."}
            />
          </div>
        ) : null}

        {isMobile ? (
          <List
            loading={isRecordsLoading}
            dataSource={records}
            locale={{ emptyText: emptyNode }}
            pagination={records.length ? pagination : false}
            style={{ padding: "0 12px 12px" }}
            renderItem={(record) => (
              <div
                style={{
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: museRadius.item,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <Flex justify='space-between' align='flex-start' gap={8}>
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ display: "block" }}>
                      {record.student_name}
                    </Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {record.date
                        ? dayjs(record.date).format("DD MMM YYYY")
                        : formatDateTime(record.created_at)}{" "}
                      · {record.recorded_by_name || "-"}
                    </Text>
                  </div>
                  <Flex gap={4}>{renderActions(record)}</Flex>
                </Flex>
                <div style={{ marginTop: 8 }}>{renderRange(record)}</div>
                <Tag color='blue' style={{ marginTop: 8, marginInlineEnd: 0 }}>
                  {record.activity_name || record.activity_code || "-"}
                </Tag>
              </div>
            )}
          />
        ) : (
          <Table
            rowKey='id'
            columns={recordColumns}
            dataSource={records}
            loading={isRecordsLoading}
            locale={{ emptyText: emptyNode }}
            pagination={pagination}
            scroll={{ x: true }}
          />
        )}
      </MuseCard>

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
    </Flex>
  );
};

export default DailyReport;
