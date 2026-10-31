import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Input,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Trash2,
} from "lucide-react";
import { useGetClassesQuery } from "../../../../../service/lms/ApiLms";
import {
  useDeleteAttendanceMutation,
  useGetAttendanceStudentsQuery,
  useSubmitAttendanceMutation,
} from "../../../../../service/lms/ApiAttendance";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const EMPTY_LIST = [];

const STATUS_OPTIONS = [
  {
    value: "Hadir",
    label: "Hadir",
    short: "H",
    color: "green",
    hex: "#16a34a",
  },
  { value: "Telat", label: "Telat", short: "T", color: "gold", hex: "#ca8a04" },
  { value: "Sakit", label: "Sakit", short: "S", color: "cyan", hex: "#0891b2" },
  { value: "Izin", label: "Izin", short: "I", color: "blue", hex: "#2563eb" },
  { value: "Alpa", label: "Alpa", short: "A", color: "red", hex: "#dc2626" },
];

const normalizeStatus = (status) => {
  if (!status) return null;
  const lower = String(status).toLowerCase();
  if (lower === "alpha" || lower === "alpa") return "Alpa";
  if (lower === "telat") return "Telat";
  if (lower === "hadir") return "Hadir";
  if (lower === "sakit") return "Sakit";
  if (lower === "izin") return "Izin";
  return status;
};

const StatusHeader = ({ option, onClick, disabled, compact = false }) => (
  <button
    type='button'
    onClick={onClick}
    disabled={disabled}
    title={`Set semua: ${option.label}`}
    style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      gap: compact ? 2 : 4,
      padding: compact ? "2px 0" : 0,
      border: "none",
      background: "transparent",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      width: "100%",
      minHeight: compact ? 44 : undefined,
      justifyContent: "center",
    }}
  >
    <span
      style={{
        width: compact ? 24 : 28,
        height: compact ? 24 : 28,
        borderRadius: 8,
        background: option.hex,
        color: "#fff",
        fontWeight: 700,
        fontSize: compact ? 12 : 13,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 14px rgba(15, 23, 42, 0.12)",
      }}
    >
      {option.short}
    </span>
    {!compact ? (
      <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>
        {option.label}
      </span>
    ) : null}
  </button>
);

const StatusRadioGroup = ({
  value,
  disabled,
  onChange,
  compact = false,
}) => (
  <Radio.Group
    value={value}
    disabled={disabled}
    onChange={(event) => onChange(event.target.value)}
    style={{ width: "100%" }}
  >
    <Flex
      justify='space-between'
      gap={compact ? 2 : 8}
      wrap={false}
      style={{ width: "100%" }}
    >
      {STATUS_OPTIONS.map((option) => (
        <Flex
          key={option.value}
          vertical
          align='center'
          gap={compact ? 2 : 4}
          style={{ flex: 1, minWidth: 0 }}
        >
          {compact ? (
            <Text style={{ fontSize: 11, color: option.hex, fontWeight: 700 }}>
              {option.short}
            </Text>
          ) : null}
          <Radio
            value={option.value}
            style={{ marginInlineEnd: 0 }}
            aria-label={option.label}
          />
        </Flex>
      ))}
    </Flex>
  </Radio.Group>
);

const Attendance = ({ subjectId, subject }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.sm;
  const controlStyle = isMobile
    ? { width: "100%" }
    : { minWidth: 160, flex: "1 1 160px", maxWidth: 240 };
  const { user } = useSelector((state) => state.auth);

  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [savingKeys, setSavingKeys] = useState(() => new Set());

  const {
    data: classRes,
    isLoading: classLoading,
    isError: isClassError,
    error: classError,
  } = useGetClassesQuery({ subjectId, gradeId: null }, { skip: !subjectId });

  const classOptions = useMemo(
    () =>
      (classRes?.data || EMPTY_LIST).map((item) => ({
        label: item.name,
        value: Number(item.id),
      })),
    [classRes?.data],
  );

  useEffect(() => {
    setSelectedClassId(null);
    setSearchText("");
    setStatusFilter("all");
    setSelectedRowKeys([]);
  }, [subjectId]);

  useEffect(() => {
    if (!classOptions.length) {
      setSelectedClassId((prev) => (prev == null ? prev : null));
      return;
    }
    setSelectedClassId((prev) => {
      const exists = classOptions.some(
        (item) => Number(item.value) === Number(prev),
      );
      if (prev != null && exists) return prev;
      return classOptions[0].value;
    });
  }, [classOptions]);

  const dateValue = selectedDate ? selectedDate.format("YYYY-MM-DD") : null;
  const {
    data: attendanceRes,
    isFetching,
    isError: isAttendanceError,
    error: attendanceError,
    refetch,
  } = useGetAttendanceStudentsQuery(
    {
      subjectId,
      classId: selectedClassId,
      date: dateValue,
    },
    { skip: !subjectId || !selectedClassId || !dateValue },
  );

  const students = attendanceRes?.data?.students ?? EMPTY_LIST;
  const meta = attendanceRes?.data?.meta || {};

  useEffect(() => {
    setRows(
      students.map((item) => ({
        key: item.student_id,
        student_id: item.student_id,
        full_name: item.full_name,
        nis: item.nis,
        nisn: item.nisn,
        class_name: item.class_name,
        status: normalizeStatus(item.status) || undefined,
      })),
    );
    setSelectedRowKeys([]);
  }, [students]);

  const [submitAttendance] = useSubmitAttendanceMutation();
  const [deleteAttendance, { isLoading: isDeleting }] =
    useDeleteAttendanceMutation();

  const filteredRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return rows.filter((row) => {
      const matchStatus =
        statusFilter === "all" ? true : row.status === statusFilter;
      const matchSearch = keyword
        ? `${row.full_name || ""} ${row.nis || ""} ${row.nisn || ""}`
            .toLowerCase()
            .includes(keyword)
        : true;
      return matchStatus && matchSearch;
    });
  }, [rows, searchText, statusFilter]);

  const statusSummary = useMemo(() => {
    const counts = STATUS_OPTIONS.reduce((acc, item) => {
      acc[item.value] = 0;
      return acc;
    }, {});
    rows.forEach((row) => {
      if (counts[row.status] !== undefined) counts[row.status] += 1;
    });
    return counts;
  }, [rows]);

  const teacherId = Number(user?.id || 0) || null;
  const canEdit = Boolean(
    subjectId && selectedClassId && dateValue && teacherId,
  );
  const isBusy = savingKeys.size > 0 || isDeleting;
  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedRowKeys.includes(row.student_id));
  const someFilteredSelected =
    filteredRows.some((row) => selectedRowKeys.includes(row.student_id)) &&
    !allFilteredSelected;

  const markSaving = (keys, active) => {
    setSavingKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => {
        if (active) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  };

  const persistStatus = async (items, previousById) => {
    if (!canEdit) {
      message.error("teacher_id tidak ditemukan. Silakan login ulang.");
      return false;
    }
    const keys = items.map((item) => item.student_id);
    markSaving(keys, true);
    try {
      await submitAttendance({
        subject_id: subjectId,
        class_id: selectedClassId,
        date: dateValue,
        teacher_id: teacherId,
        items: items.map((item) => ({
          student_id: item.student_id,
          status: item.status,
          teacher_id: teacherId,
        })),
      }).unwrap();
      return true;
    } catch (error) {
      if (previousById) {
        setRows((prev) =>
          prev.map((row) =>
            previousById.has(row.student_id)
              ? { ...row, status: previousById.get(row.student_id) }
              : row,
          ),
        );
      }
      message.error(error?.data?.message || "Gagal menyimpan absensi.");
      return false;
    } finally {
      markSaving(keys, false);
    }
  };

  const handleStatusChange = async (record, nextStatus) => {
    if (!nextStatus || record.status === nextStatus || isBusy) return;
    const previous = new Map([[record.student_id, record.status]]);
    setRows((prev) =>
      prev.map((item) =>
        item.student_id === record.student_id
          ? { ...item, status: nextStatus }
          : item,
      ),
    );
    await persistStatus(
      [{ student_id: record.student_id, status: nextStatus }],
      previous,
    );
  };

  const handleSetAllStatus = async (status) => {
    if (!status || !rows.length || isBusy) return;
    const previous = new Map(rows.map((row) => [row.student_id, row.status]));
    setRows((prev) => prev.map((item) => ({ ...item, status })));
    const ok = await persistStatus(
      rows.map((row) => ({ student_id: row.student_id, status })),
      previous,
    );
    if (ok) {
      message.success(`Semua siswa ditandai ${status}.`);
    }
  };

  const clearLocalStatus = (studentIds) => {
    const idSet = new Set(studentIds.map(Number));
    setRows((prev) =>
      prev.map((row) =>
        idSet.has(Number(row.student_id)) ? { ...row, status: undefined } : row,
      ),
    );
    setSelectedRowKeys((prev) => prev.filter((key) => !idSet.has(Number(key))));
  };

  const handleDeleteStudents = async (studentIds) => {
    if (!canEdit || !studentIds.length) return;
    try {
      await deleteAttendance({
        subject_id: subjectId,
        class_id: selectedClassId,
        date: dateValue,
        student_ids: studentIds,
      }).unwrap();
      clearLocalStatus(studentIds);
      message.success(
        studentIds.length > 1
          ? "Absensi terpilih berhasil dihapus."
          : "Absensi siswa berhasil dihapus.",
      );
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus absensi.");
    }
  };

  const toggleSelectAllFiltered = (checked) => {
    if (checked) {
      setSelectedRowKeys((prev) => {
        const next = new Set(prev);
        filteredRows.forEach((row) => next.add(row.student_id));
        return [...next];
      });
      return;
    }
    const filteredIds = new Set(filteredRows.map((row) => row.student_id));
    setSelectedRowKeys((prev) =>
      prev.filter((key) => !filteredIds.has(Number(key))),
    );
  };

  const columns = useMemo(
    () => [
      {
        title: "No",
        dataIndex: "no",
        width: isCompact ? 44 : 56,
        align: "center",
        fixed: "left",
        render: (_, __, index) => index + 1,
      },
      {
        title: "Siswa",
        dataIndex: "full_name",
        width: isCompact ? 140 : 200,
        fixed: "left",
        render: (_, record) => (
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ overflowWrap: "anywhere" }}>
              {record.full_name}
            </Text>
            <div style={{ color: "#667085", fontSize: 12 }}>
              NIS {record.nis || "-"}
            </div>
          </div>
        ),
      },
      ...STATUS_OPTIONS.map((option) => ({
        title: (
          <StatusHeader
            option={option}
            compact={isMobile}
            disabled={!rows.length || isBusy}
            onClick={() => handleSetAllStatus(option.value)}
          />
        ),
        dataIndex: option.value,
        width: isMobile ? 56 : 78,
        align: "center",
        render: (_, record) => (
          <Radio
            checked={record.status === option.value}
            disabled={savingKeys.has(record.student_id) || isDeleting}
            onChange={() => handleStatusChange(record, option.value)}
            style={{ marginInlineEnd: 0 }}
            aria-label={`${record.full_name} ${option.label}`}
          />
        ),
      })),
      {
        title: "Aksi",
        dataIndex: "action",
        width: isCompact ? 56 : 72,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Popconfirm
            title='Hapus status absensi siswa ini?'
            okText='Hapus'
            cancelText='Batal'
            disabled={!record.status || isBusy}
            onConfirm={() => handleDeleteStudents([record.student_id])}
          >
            <Button
              type='text'
              size='small'
              danger
              disabled={!record.status || isBusy}
              icon={<Trash2 size={15} />}
            />
          </Popconfirm>
        ),
      },
    ],
    // handlers are stable enough for this screen; rows/isBusy drive UI state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isBusy, isCompact, isDeleting, isMobile, rows.length, savingKeys],
  );

  const renderMobileList = () => (
    <Flex vertical gap={0}>
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #f0f0f0",
          background: "#fafafa",
        }}
      >
        <Flex align='center' justify='space-between' gap={8} wrap='wrap'>
          <Checkbox
            checked={allFilteredSelected}
            indeterminate={someFilteredSelected}
            disabled={!filteredRows.length || isBusy}
            onChange={(event) => toggleSelectAllFiltered(event.target.checked)}
          >
            Pilih semua
          </Checkbox>
          <Text type='secondary' style={{ fontSize: 12 }}>
            Ketuk header status untuk set semua
          </Text>
        </Flex>
        <Flex justify='space-between' gap={4} style={{ marginTop: 10 }}>
          {STATUS_OPTIONS.map((option) => (
            <div key={option.value} style={{ flex: 1, minWidth: 0 }}>
              <StatusHeader
                option={option}
                compact
                disabled={!rows.length || isBusy}
                onClick={() => handleSetAllStatus(option.value)}
              />
            </div>
          ))}
        </Flex>
      </div>

      {!filteredRows.length ? (
        <div style={{ padding: 24 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              rows.length === 0
                ? "Belum ada siswa terdaftar di kelas ini pada periode aktif."
                : "Tidak ada siswa yang cocok dengan filter."
            }
          />
        </div>
      ) : (
        filteredRows.map((record, index) => {
          const checked = selectedRowKeys.includes(record.student_id);
          const rowSaving =
            savingKeys.has(record.student_id) || isDeleting;
          return (
            <div
              key={record.student_id}
              style={{
                padding: "12px 12px 14px",
                borderBottom: "1px solid #f0f0f0",
                background: checked ? "#f8fbff" : "#fff",
              }}
            >
              <Flex align='flex-start' gap={10}>
                <Checkbox
                  checked={checked}
                  disabled={isBusy}
                  onChange={(event) => {
                    const nextChecked = event.target.checked;
                    setSelectedRowKeys((prev) =>
                      nextChecked
                        ? [...prev, record.student_id]
                        : prev.filter((key) => key !== record.student_id),
                    );
                  }}
                  style={{ marginTop: 2 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Flex
                    justify='space-between'
                    align='flex-start'
                    gap={8}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        #{index + 1}
                      </Text>
                      <div>
                        <Text
                          strong
                          style={{ overflowWrap: "anywhere", lineHeight: 1.3 }}
                        >
                          {record.full_name}
                        </Text>
                      </div>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        NIS {record.nis || "-"}
                      </Text>
                    </div>
                    <Popconfirm
                      title='Hapus status absensi siswa ini?'
                      okText='Hapus'
                      cancelText='Batal'
                      disabled={!record.status || isBusy}
                      onConfirm={() =>
                        handleDeleteStudents([record.student_id])
                      }
                    >
                      <Button
                        type='text'
                        size='small'
                        danger
                        disabled={!record.status || isBusy}
                        icon={<Trash2 size={15} />}
                      />
                    </Popconfirm>
                  </Flex>

                  <div style={{ marginTop: 10 }}>
                    <StatusRadioGroup
                      value={record.status}
                      disabled={rowSaving}
                      compact
                      onChange={(value) => handleStatusChange(record, value)}
                    />
                  </div>
                  {record.status ? (
                    <Tag
                      color={
                        STATUS_OPTIONS.find(
                          (item) => item.value === record.status,
                        )?.color || "default"
                      }
                      style={{ marginTop: 8, marginInlineEnd: 0 }}
                    >
                      {record.status}
                    </Tag>
                  ) : (
                    <Text
                      type='secondary'
                      style={{ display: "block", marginTop: 8, fontSize: 12 }}
                    >
                      Belum diisi
                    </Text>
                  )}
                </div>
              </Flex>
            </div>
          );
        })
      )}
    </Flex>
  );

  if (isClassError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat daftar kelas'
        description={
          classError?.data?.message ||
          "Data kelas untuk absensi belum bisa dimuat."
        }
        style={{ borderRadius: 16 }}
      />
    );
  }

  return (
    <Flex vertical gap={isMobile ? 12 : 16} style={{ width: "100%", minWidth: 0 }}>
      <Card
        style={{ borderRadius: 16, width: "100%" }}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          wrap='wrap'
          gap={12}
          vertical={isMobile}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <Title
              level={5}
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <ClipboardCheck size={18} style={{ flexShrink: 0 }} />
              <span>Absensi Kelas</span>
            </Title>
            <Space wrap size={[6, 6]} style={{ marginTop: 8 }}>
              <Tag color='blue' style={{ marginInlineEnd: 0 }}>
                {subject?.name || meta.subject_name || "Mata Pelajaran"}
              </Tag>
              <Tag
                icon={<CheckCircle2 size={12} style={{ marginRight: 4 }} />}
                color='default'
                style={{ marginInlineEnd: 0 }}
              >
                {isCompact ? "Auto-save" : "Auto-save aktif"}
              </Tag>
            </Space>
          </div>

          <Popconfirm
            title={`Hapus absensi ${selectedRowKeys.length} siswa terpilih?`}
            okText='Hapus'
            cancelText='Batal'
            disabled={!selectedRowKeys.length || isBusy}
            onConfirm={() => handleDeleteStudents(selectedRowKeys)}
          >
            <Button
              icon={<Trash2 size={14} />}
              disabled={!selectedRowKeys.length || isBusy}
              loading={isDeleting}
              block={isMobile}
              style={isMobile ? { width: "100%" } : undefined}
            >
              {isCompact
                ? `Hapus${selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}`
                : "Hapus Terpilih"}
            </Button>
          </Popconfirm>
        </Flex>

        <Flex
          wrap='wrap'
          gap={8}
          style={{ marginTop: 16, width: "100%" }}
        >
          <Select
            placeholder='Pilih kelas'
            value={selectedClassId}
            onChange={(value) =>
              setSelectedClassId(value ? Number(value) : null)
            }
            options={classOptions}
            loading={classLoading}
            style={controlStyle}
            showSearch
            optionFilterProp='label'
            virtual={false}
          />
          <DatePicker
            value={selectedDate}
            onChange={(value) => setSelectedDate(value || dayjs())}
            format={isCompact ? "DD/MM/YY" : "DD MMM YYYY"}
            allowClear={false}
            suffixIcon={<CalendarDays size={16} />}
            style={controlStyle}
            inputReadOnly={isMobile}
          />
          <Input.Search
            placeholder='Cari nama / NIS'
            allowClear
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onSearch={setSearchText}
            style={controlStyle}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={controlStyle}
            options={[
              { value: "all", label: "Semua Status" },
              ...STATUS_OPTIONS.map((item) => ({
                value: item.value,
                label: isCompact
                  ? `${item.short} — ${item.label}`
                  : item.label,
              })),
            ]}
          />
        </Flex>

        <Space wrap size={[6, 6]} style={{ marginTop: 14 }}>
          <Tag color='blue' style={{ marginInlineEnd: 0 }}>
            Total: {meta.total_students || rows.length}
          </Tag>
          {STATUS_OPTIONS.map((item) => (
            <Tag
              key={item.value}
              color={item.color}
              style={{ marginInlineEnd: 0 }}
            >
              {isCompact ? item.short : item.label}:{" "}
              {statusSummary[item.value] || 0}
            </Tag>
          ))}
        </Space>
      </Card>

      {!selectedClassId ? (
        <Alert
          type='info'
          showIcon
          message='Pilih kelas untuk mulai mengisi absensi.'
          style={{ borderRadius: 16 }}
        />
      ) : isAttendanceError ? (
        <Alert
          type='error'
          showIcon
          message='Gagal memuat data absensi'
          description={
            attendanceError?.data?.message ||
            "Terjadi kendala saat mengambil daftar siswa."
          }
          style={{ borderRadius: 16 }}
          action={
            <Button size='small' onClick={() => refetch()}>
              Coba lagi
            </Button>
          }
        />
      ) : (
        <Card
          style={{ borderRadius: 16, width: "100%", overflow: "hidden" }}
          styles={{ body: { padding: 0 } }}
          loading={isFetching && !filteredRows.length}
        >
          <Alert
            type='info'
            showIcon={!isCompact}
            message={
              isCompact
                ? "Status tersimpan otomatis saat dipilih."
                : "Perubahan status langsung tersimpan otomatis. Tidak perlu menekan tombol simpan."
            }
            style={{
              borderRadius: 0,
              border: "none",
              borderBottom: "1px solid #f0f0f0",
            }}
          />
          {isMobile ? (
            renderMobileList()
          ) : (
            <Table
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                getCheckboxProps: () => ({ disabled: isBusy }),
                columnWidth: 48,
              }}
              columns={columns}
              dataSource={filteredRows}
              pagination={false}
              loading={isFetching}
              rowKey='student_id'
              size='middle'
              scroll={{ x: 920 }}
              sticky
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      rows.length === 0
                        ? "Belum ada siswa terdaftar di kelas ini pada periode aktif."
                        : "Tidak ada siswa yang cocok dengan filter."
                    }
                  />
                ),
              }}
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default Attendance;
