import React, { useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CalendarDays,
  Download,
  Filter,
  RefreshCcw,
  Users,
} from "lucide-react";
import { useGetAttendanceRecapQuery } from "../../../../../../service/lms/ApiRecap";

const { Title, Text } = Typography;

const MONTH_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const statusTagColor = (code) => {
  if (code === "H") return "green";
  if (code === "T") return "gold";
  if (code === "S") return "blue";
  if (code === "I") return "purple";
  if (code === "A") return "red";
  return "default";
};

const toPercentText = (value) => `${Number(value || 0)}%`;

const RecapAttendance = ({
  isActive,
  subjectId,
  subject,
  activePeriode,
  classes,
  classLoading,
  classId,
  setClassId,
  semester,
  setSemester,
  month,
  setMonth,
  monthOptions,
  screens,
}) => {
  const {
    data: recapRes,
    isFetching: isFetchingAttendance,
    refetch: refetchAttendance,
  } = useGetAttendanceRecapQuery(
    {
      subjectId,
      classId,
      semester,
      month,
    },
    {
      skip: !isActive || !subjectId || !classId || !semester || !month,
    },
  );

  const recapData = recapRes?.data || null;
  const recapMeta = recapData?.meta || {};
  const dayColumns = recapData?.days || [];
  const students = recapData?.students || [];

  const monthLabel =
    MONTH_OPTIONS.find((item) => Number(item.value) === Number(month))?.label ||
    "Bulan";

  const attendanceRows = useMemo(
    () =>
      students.map((student, index) => {
        const row = {
          key: student.student_id,
          no: index + 1,
          nis: student.nis || "-",
          full_name: student.full_name,
          summary_hadir: student.summary?.hadir || 0,
          summary_sakit: student.summary?.sakit || 0,
          summary_izin: student.summary?.izin || 0,
          summary_alpa: student.summary?.alpa || 0,
          percent_hadir: student.percent?.hadir || 0,
          percent_sakit: student.percent?.sakit || 0,
          percent_izin: student.percent?.izin || 0,
          percent_alpa: student.percent?.alpa || 0,
        };

        dayColumns.forEach((day) => {
          row[`day_${day.date}`] = student.daily?.[day.date] || "-";
        });

        return row;
      }),
    [students, dayColumns],
  );

  const attendanceColumns = useMemo(() => {
    const baseColumns = [
      {
        title: "No",
        dataIndex: "no",
        width: 64,
        fixed: "left",
        align: "center",
      },
      {
        title: "NIS",
        dataIndex: "nis",
        width: 120,
        fixed: "left",
      },
      {
        title: "Nama Siswa",
        dataIndex: "full_name",
        width: 240,
        fixed: "left",
        render: (value) => <Text strong>{value}</Text>,
      },
    ];

    const dynamicDays = dayColumns.map((day) => ({
      title: String(day.day).padStart(2, "0"),
      dataIndex: `day_${day.date}`,
      key: `day_${day.date}`,
      width: 56,
      align: "center",
      render: (value) => (
        <Tag
          color={statusTagColor(value)}
          style={{ marginInlineEnd: 0, minWidth: 34 }}
        >
          {value}
        </Tag>
      ),
    }));

    return [
      ...baseColumns,
      {
        title: monthLabel,
        children: dynamicDays.length
          ? dynamicDays
          : [
              {
                title: "-",
                dataIndex: "empty_day",
                width: 64,
                align: "center",
                render: () => "-",
              },
            ],
      },
      {
        title: "Ringkasan",
        children: [
          {
            title: "H",
            dataIndex: "summary_hadir",
            width: 66,
            align: "center",
          },
          {
            title: "S",
            dataIndex: "summary_sakit",
            width: 66,
            align: "center",
          },
          { title: "I", dataIndex: "summary_izin", width: 66, align: "center" },
          { title: "A", dataIndex: "summary_alpa", width: 66, align: "center" },
        ],
      },
      {
        title: "Presentase (%)",
        children: [
          {
            title: "H",
            dataIndex: "percent_hadir",
            width: 74,
            align: "center",
            render: toPercentText,
          },
          {
            title: "S",
            dataIndex: "percent_sakit",
            width: 74,
            align: "center",
            render: toPercentText,
          },
          {
            title: "I",
            dataIndex: "percent_izin",
            width: 74,
            align: "center",
            render: toPercentText,
          },
          {
            title: "A",
            dataIndex: "percent_alpa",
            width: 74,
            align: "center",
            render: toPercentText,
          },
        ],
      },
    ];
  }, [dayColumns, monthLabel]);

  const handleDownloadAttendanceExcel = () => {
    if (!attendanceRows.length) return;

    const headerTop = ["No", "NIS", "Nama Siswa"];
    const headerSub = ["", "", ""];

    dayColumns.forEach(() => {
      headerTop.push(monthLabel);
    });
    dayColumns.forEach((day) => {
      headerSub.push(String(day.day).padStart(2, "0"));
    });

    headerTop.push("Ringkasan", "", "", "", "Presentase (%)", "", "", "");
    headerSub.push("H", "S", "I", "A", "H", "S", "I", "A");

    const rows = attendanceRows.map((row) => {
      const base = [row.no, row.nis, row.full_name];
      dayColumns.forEach((day) => {
        base.push(row[`day_${day.date}`] || "-");
      });
      base.push(
        row.summary_hadir,
        row.summary_sakit,
        row.summary_izin,
        row.summary_alpa,
        `${row.percent_hadir}%`,
        `${row.percent_sakit}%`,
        `${row.percent_izin}%`,
        `${row.percent_alpa}%`,
      );
      return base;
    });

    const sheet = XLSX.utils.aoa_to_sheet([headerTop, headerSub, ...rows]);

    const dayStart = 3;
    const dayEnd = dayStart + dayColumns.length - 1;
    const summaryStart = dayEnd + 1;
    const summaryEnd = summaryStart + 3;
    const percentStart = summaryEnd + 1;
    const percentEnd = percentStart + 3;

    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
    ];

    if (dayColumns.length > 0) {
      merges.push({ s: { r: 0, c: dayStart }, e: { r: 0, c: dayEnd } });
    }
    merges.push(
      { s: { r: 0, c: summaryStart }, e: { r: 0, c: summaryEnd } },
      { s: { r: 0, c: percentStart }, e: { r: 0, c: percentEnd } },
    );

    sheet["!merges"] = merges;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Rekap Absensi");

    const selectedClassName =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const safeName =
      `Rekap_Absensi_${selectedClassName}_${monthLabel}_Semester${semester}`.replace(
        /[\\/:*?"<>|]/g,
        "-",
      );

    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  };

  return (
    <Flex vertical gap={16}>
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Space direction="vertical" size={2}>
            <Title level={5} style={{ margin: 0 }}>
              Rekapitulasi Absensi
            </Title>
            <Text type="secondary">
              Rekap per bulan berdasarkan periode aktif, semester, dan kelas.
            </Text>
          </Space>
          <Space wrap>
            <Tag color="blue">
              {subject?.name || recapMeta.subject_name || "Mata Pelajaran"}
            </Tag>
            <Tag color="processing">
              {activePeriode?.name || recapMeta.periode_name || "Periode"}
            </Tag>
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
              value={semester}
              onChange={setSemester}
              style={{ minWidth: 160 }}
              options={[
                { value: 1, label: "Semester 1" },
                { value: 2, label: "Semester 2" },
              ]}
              suffixIcon={<Filter size={14} />}
            />
            <Select
              value={month}
              onChange={setMonth}
              style={{ minWidth: 180 }}
              options={monthOptions}
              suffixIcon={<CalendarDays size={14} />}
            />
            <Select
              value={classId}
              onChange={setClassId}
              style={{ minWidth: 220 }}
              placeholder="Pilih kelas"
              options={classes.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              loading={classLoading}
            />
          </Space>

          <Space wrap>
            <Button
              icon={<RefreshCcw size={14} />}
              onClick={() => refetchAttendance()}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<Download size={14} />}
              disabled={!attendanceRows.length}
              onClick={handleDownloadAttendanceExcel}
            >
              Download Excel
            </Button>
          </Space>
        </Flex>

        <Flex wrap="wrap" gap={8} style={{ marginTop: 14 }}>
          <Tag color="geekblue" icon={<Users size={12} />}>
            Total Siswa: {recapMeta.total_students || 0}
          </Tag>
          <Tag color="cyan">
            Total Pertemuan: {recapMeta.total_meetings || 0}
          </Tag>
          <Tag color="purple">
            Bulan: {recapMeta.month_name || monthLabel} {recapMeta.target_year || ""}
          </Tag>
        </Flex>
      </Card>

      {!classId ? (
        <Alert
          type="info"
          showIcon
          title="Pilih kelas untuk menampilkan rekap absensi."
        />
      ) : (
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
          {!isFetchingAttendance && !attendanceRows.length ? (
            <div style={{ padding: 24 }}>
              <Empty description="Belum ada data absensi pada filter ini." />
            </div>
          ) : (
            <Table
              rowKey="key"
              dataSource={attendanceRows}
              columns={attendanceColumns}
              loading={isFetchingAttendance}
              pagination={false}
              size={screens.xs ? "small" : "middle"}
              scroll={{ x: 1200 }}
              sticky
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default RecapAttendance;
