import React, { useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Empty,
  Flex,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import { Download, Filter, RefreshCcw, Users } from "lucide-react";
import { useGetAttendanceRecapQuery } from "../../../../../service/lms/ApiRecap";
import {
  DetailSection,
  MetricGrid,
  RecapMobileList,
  RecapSectionHeader,
  RecapStatTags,
  RecapToolbar,
  RecordCard,
} from "./recapShared";
import {
  actionButtonStyle,
  filterControlStyle,
  surfaceCardBody,
  surfaceCardStyle,
  tableCardBody,
  tableCardStyle,
  useRecapLayout,
} from "./recapStyles";

const { Text } = Typography;

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

const STATUS_LEGEND = [
  { code: "H", label: "Hadir" },
  { code: "T", label: "Terlambat" },
  { code: "S", label: "Sakit" },
  { code: "I", label: "Izin" },
  { code: "A", label: "Alpa" },
];

const STATUS_PALETTE = {
  H: { background: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  T: { background: "#fffbeb", color: "#b45309", border: "#fde68a" },
  S: { background: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  I: { background: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  A: { background: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
};

const NEUTRAL_PALETTE = {
  background: "#f8fafc",
  color: "#94a3b8",
  border: "#e2e8f0",
};

const statusPalette = (code) => STATUS_PALETTE[code] || NEUTRAL_PALETTE;

const statusTagColor = (code) => {
  if (code === "H") return "green";
  if (code === "T") return "gold";
  if (code === "S") return "blue";
  if (code === "I") return "purple";
  if (code === "A") return "red";
  return "default";
};

const toPercentText = (value) => `${Number(value || 0)}%`;

const DayChip = ({ day, code }) => {
  const palette = statusPalette(code);
  return (
    <Flex
      vertical
      align='center'
      justify='center'
      style={{
        borderRadius: 8,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        padding: "4px 2px",
        lineHeight: 1.2,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 10, opacity: 0.75 }}>{day}</span>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{code}</span>
    </Flex>
  );
};

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
  const { screens: activeScreens, isMobile } = useRecapLayout(screens);

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
      skip: !isActive || !subjectId || !classId || !semester,
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

  const monthSections = useMemo(() => {
    const dayColumnsByMonth = dayColumns.reduce((acc, day) => {
      const monthNumber = Number(day.month || 0);
      if (!monthNumber) return acc;
      if (!acc[monthNumber]) acc[monthNumber] = [];
      acc[monthNumber].push(day);
      return acc;
    }, {});

    return (recapMeta.months || [])
      .map((monthMeta) => {
        const monthNumber = Number(monthMeta.month || 0);
        const monthDays = dayColumnsByMonth[monthNumber] || [];
        if (!monthDays.length) return null;
        return {
          key: String(monthNumber),
          name: monthMeta.month_name || "-",
          days: monthDays,
        };
      })
      .filter(Boolean);
  }, [dayColumns, recapMeta.months]);

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

    const monthGroups = monthSections.map((month) => ({
      title: month.name,
      children: month.days.map((day) => ({
        title: String(day.day).padStart(2, "0"),
        dataIndex: `day_${day.date}`,
        key: `day_${day.date}`,
        width: 56,
        align: "center",
        render: (value) => (
          <Tag color={statusTagColor(value)} style={{ marginInlineEnd: 0, minWidth: 34 }}>
            {value}
          </Tag>
        ),
      })),
    }));

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
  }, [monthSections]);

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

  const renderMobileCard = (row) => (
    <RecordCard
      index={row.no}
      title={row.full_name}
      subtitle={`NIS ${row.nis}`}
      extra={
        <Tag color={statusTagColor("H")} style={{ margin: 0 }}>
          {toPercentText(row.percent_hadir)} hadir
        </Tag>
      }
    >
      <MetricGrid
        columns={2}
        items={[
          {
            key: "hadir",
            label: "Hadir",
            value: `${row.summary_hadir} · ${toPercentText(row.percent_hadir)}`,
          },
          {
            key: "sakit",
            label: "Sakit",
            value: `${row.summary_sakit} · ${toPercentText(row.percent_sakit)}`,
          },
          {
            key: "izin",
            label: "Izin",
            value: `${row.summary_izin} · ${toPercentText(row.percent_izin)}`,
          },
          {
            key: "alpa",
            label: "Alpa",
            value: `${row.summary_alpa} · ${toPercentText(row.percent_alpa)}`,
          },
        ]}
      />

      {monthSections.length ? (
        <Collapse
          ghost
          size='small'
          items={[
            {
              key: "daily",
              label: (
                <Text style={{ fontSize: 12, fontWeight: 600 }}>
                  Rincian kehadiran harian
                </Text>
              ),
              children: (
                <Flex vertical gap={12}>
                  {monthSections.map((month) => (
                    <DetailSection key={month.key} title={month.name}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(40px, 1fr))",
                          gap: 6,
                        }}
                      >
                        {month.days.map((day) => (
                          <DayChip
                            key={day.date}
                            day={String(day.day).padStart(2, "0")}
                            code={row[`day_${day.date}`] || "-"}
                          />
                        ))}
                      </div>
                    </DetailSection>
                  ))}
                </Flex>
              ),
            },
          ]}
          styles={{ header: { paddingInline: 0 }, body: { paddingInline: 0 } }}
          style={{ borderTop: "1px solid #f1f5f9" }}
        />
      ) : null}
    </RecordCard>
  );

  return (
    <Flex vertical gap={16} style={{ width: "100%", minWidth: 0 }}>
      <Card style={surfaceCardStyle} styles={surfaceCardBody(isMobile)}>
        <RecapSectionHeader
          isMobile={isMobile}
          title='Rekapitulasi Absensi'
          description='Rekap absensi dalam satu semester berdasarkan periode aktif dan kelas.'
          tags={
            <>
              <Tag color='blue' style={{ margin: 0 }}>
                {subject?.name || recapMeta.subject_name || "Mata Pelajaran"}
              </Tag>
              <Tag color='processing' style={{ margin: 0 }}>
                {activePeriode?.name || recapMeta.periode_name || "Periode"}
              </Tag>
            </>
          }
        />

        <RecapToolbar
          isMobile={isMobile}
          filters={
            <>
              <Select
                value={semester}
                onChange={setSemester}
                style={filterControlStyle(isMobile, 160)}
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
                  style={filterControlStyle(isMobile, 220)}
                  placeholder='Semua guru'
                  allowClear
                  options={[
                    { value: "", label: "Semua guru" },
                    ...teachers.map((item) => ({
                      value: item.id,
                      label: item.full_name,
                    })),
                  ]}
                  loading={teacherLoading}
                  virtual={false}
                />
              )}
              <Select
                value={classId}
                onChange={setClassId}
                style={filterControlStyle(isMobile, 220)}
                placeholder='Pilih kelas'
                options={classes.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                loading={classLoading}
                virtual={false}
              />
            </>
          }
          actions={
            <>
              <Button
                icon={<RefreshCcw size={14} />}
                onClick={() => refetchAttendance()}
                style={actionButtonStyle(isMobile)}
              >
                Refresh
              </Button>
              <Button
                type='primary'
                icon={<Download size={14} />}
                disabled={!attendanceRows.length}
                onClick={handleDownloadAttendanceExcel}
                style={actionButtonStyle(isMobile)}
              >
                {isMobile ? "Excel" : "Download Excel"}
              </Button>
            </>
          }
        />

        <RecapStatTags
          isMobile={isMobile}
          items={[
            {
              key: "students",
              color: "geekblue",
              icon: <Users size={12} />,
              label: `Total Siswa: ${recapMeta.total_students || 0}`,
            },
            {
              key: "meetings",
              color: "cyan",
              label: `Total Pertemuan: ${recapMeta.total_meetings || 0}`,
            },
            {
              key: "semester",
              color: "purple",
              label: `Semester: ${recapMeta.semester || semester}`,
            },
          ]}
        />
      </Card>

      {!classId ? (
        <Alert
          type='info'
          showIcon
          title='Pilih kelas untuk menampilkan rekap absensi.'
        />
      ) : isMobile ? (
        <Flex vertical gap={12} style={{ minWidth: 0 }}>
          <Flex wrap='wrap' gap={6}>
            {STATUS_LEGEND.map((item) => (
              <Tag
                key={item.code}
                color={statusTagColor(item.code)}
                style={{ margin: 0, fontSize: 11 }}
              >
                {item.code} · {item.label}
              </Tag>
            ))}
          </Flex>
          <RecapMobileList
            dataSource={attendanceRows}
            loading={isFetchingAttendance}
            emptyText='Belum ada data absensi pada filter ini.'
            renderItem={renderMobileCard}
          />
        </Flex>
      ) : (
        <Card style={tableCardStyle} styles={tableCardBody}>
          {!isFetchingAttendance && !attendanceRows.length ? (
            <div style={{ padding: 24 }}>
              <Empty description='Belum ada data absensi pada filter ini.' />
            </div>
          ) : (
            <Table
              rowKey='key'
              dataSource={attendanceRows}
              columns={attendanceColumns}
              loading={isFetchingAttendance}
              pagination={false}
              size={activeScreens.lg ? "middle" : "small"}
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
