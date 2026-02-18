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
import { Download, Filter, RefreshCcw, Users } from "lucide-react";
import { useGetAttendanceRecapQuery } from "../../../../../service/lms/ApiRecap";

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
  isAdminView = false,
  teacherId,
  setTeacherId,
  teachers = [],
  teacherLoading = false,
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
      teacherId,
    },
    {
      skip:
        !isActive ||
        !subjectId ||
        !classId ||
        !semester,
    },
  );

  const recapData = recapRes?.data || null;
  const recapMeta = recapData?.meta || {};
  const dayColumns = recapData?.days || [];
  const students = recapData?.students || [];

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

    const dayColumnsByMonth = dayColumns.reduce((acc, day) => {
      const monthNumber = Number(day.month || 0);
      if (!monthNumber) return acc;
      if (!acc[monthNumber]) acc[monthNumber] = [];
      acc[monthNumber].push(day);
      return acc;
    }, {});

    const monthGroups = (recapMeta.months || [])
      .map((monthMeta) => {
        const monthNumber = Number(monthMeta.month || 0);
        const monthDays = dayColumnsByMonth[monthNumber] || [];
        if (!monthDays.length) return null;
        return {
          title: monthMeta.month_name || "-",
          children: monthDays.map((day) => ({
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
          })),
        };
      })
      .filter(Boolean);

    return [
      ...baseColumns,
      ...(monthGroups.length
        ? monthGroups
        : [
            {
              title: "Tanggal",
              children: [
                {
                  title: "-",
                  dataIndex: "empty_day",
                  width: 64,
                  align: "center",
                  render: () => "-",
                },
              ],
            },
          ]),
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
  }, [dayColumns, recapMeta.months]);

  const handleDownloadAttendanceExcel = () => {
    if (!attendanceRows.length) return;
    const sheetRows = attendanceRows.map((row) => {
      const entry = {
        No: row.no,
        NIS: row.nis,
        "Nama Siswa": row.full_name,
      };

      dayColumns.forEach((day) => {
        const monthName =
          MONTH_OPTIONS.find((item) => Number(item.value) === Number(day.month))
            ?.label || "Bulan";
        const label = `${String(day.day).padStart(2, "0")} ${monthName}`;
        entry[label] = row[`day_${day.date}`] || "-";
      });

      entry.H = row.summary_hadir;
      entry.S = row.summary_sakit;
      entry.I = row.summary_izin;
      entry.A = row.summary_alpa;
      entry["%H"] = `${row.percent_hadir}%`;
      entry["%S"] = `${row.percent_sakit}%`;
      entry["%I"] = `${row.percent_izin}%`;
      entry["%A"] = `${row.percent_alpa}%`;
      return entry;
    });

    const sheet = XLSX.utils.json_to_sheet(sheetRows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Rekap Absensi");

    const selectedClassName =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const safeName =
      `Rekap_Absensi_Semester_${selectedClassName}_Semester${semester}`.replace(
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
              Rekap absensi dalam satu semester berdasarkan periode aktif dan kelas.
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
            {isAdminView && (teacherLoading || teachers.length > 0) && (
              <Select
                value={teacherId}
                onChange={(value) => setTeacherId(value || null)}
                style={{ minWidth: 220 }}
                placeholder="Semua guru"
                allowClear
                options={[
                  { value: "", label: "Semua guru" },
                  ...teachers.map((item) => ({
                    value: item.id,
                    label: item.full_name,
                  })),
                ]}
                loading={teacherLoading}
              />
            )}
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
            Semester: {recapMeta.semester || semester}
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
