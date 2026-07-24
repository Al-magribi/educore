import React, { useMemo, useState } from "react";
import { Alert, Card, Col, Empty, Flex, Grid, Row, Space, Tag, Typography } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpenText,
  CalendarRange,
  ChartColumnBig,
  ClipboardCheck,
} from "lucide-react";
import { useGetStudentSubjectReportQuery } from "../../../../../service/lms/ApiRecap";
import AttendanceSection from "./report/AttendanceSection";
import AttitudeSection from "./report/AttitudeSection";
import { MONTH_OPTIONS, SEMESTER_MONTHS } from "./report/constants";
import ReportHeader from "./report/ReportHeader";
import ReportSummaryCards from "./report/ReportSummaryCards";
import ScoreSectionCard from "./report/ScoreSectionCard";
import { formatDateDisplay } from "./report/utils";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;
const EMPTY_LIST = [];

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
};

const infoCardStyle = {
  borderRadius: 22,
  height: "100%",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 16px 36px rgba(15, 23, 42, 0.08)",
};

const ReportTab = ({ subject, classId }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const now = new Date();
  const initialMonth = now.getMonth() + 1;
  const initialSemester = initialMonth >= 7 ? 1 : 2;

  const [selectedSemester, setSelectedSemester] = useState(initialSemester);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  const {
    data: reportRes,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetStudentSubjectReportQuery(
    {
      subjectId: subject?.id,
      classId,
      semester: selectedSemester,
      month: selectedMonth,
    },
    {
      skip: !subject?.id || !classId || !selectedSemester || !selectedMonth,
    },
  );

  const reportData = reportRes?.data || {};
  const meta = reportData?.meta || {};
  const attendance = reportData?.attendance || {};
  const attitude = reportData?.attitude || {};
  const formative = reportData?.formative || {};
  const summative = reportData?.summative || {};
  const availableFiltersSource = meta?.available_filters;

  const availableFilters = useMemo(
    () => availableFiltersSource || EMPTY_LIST,
    [availableFiltersSource],
  );

  const semesterOptions = useMemo(
    () =>
      availableFilters.map((item) => ({
        value: Number(item.semester),
        label: `Semester ${item.semester}`,
      })),
    [availableFilters],
  );

  const safeSelectedSemester = useMemo(() => {
    if (!semesterOptions.length) return selectedSemester;
    const selectedExists = semesterOptions.some(
      (item) => Number(item.value) === Number(selectedSemester),
    );
    return selectedExists ? selectedSemester : Number(semesterOptions[0].value);
  }, [selectedSemester, semesterOptions]);

  const monthOptions = useMemo(() => {
    const semesterFilter = availableFilters.find(
      (item) => Number(item.semester) === Number(safeSelectedSemester),
    );

    if (semesterFilter?.months?.length) {
      return semesterFilter.months.map((monthItem) => ({
        value: Number(monthItem.month),
        label:
          monthItem.month_name ||
          MONTH_OPTIONS.find(
            (monthOption) => monthOption.value === Number(monthItem.month),
          )?.label,
      }));
    }

    const fallbackMonths = SEMESTER_MONTHS[safeSelectedSemester] || [];
    return MONTH_OPTIONS.filter((item) =>
      fallbackMonths.includes(Number(item.value)),
    );
  }, [availableFilters, safeSelectedSemester]);

  const safeSelectedMonth = useMemo(() => {
    if (!monthOptions.length) return selectedMonth;
    const selectedExists = monthOptions.some(
      (item) => Number(item.value) === Number(selectedMonth),
    );
    return selectedExists ? selectedMonth : Number(monthOptions[0].value);
  }, [monthOptions, selectedMonth]);

  const attendanceRows = (attendance.records || []).map((item, index) => ({
    key: `${item.date}-${index}`,
    no: index + 1,
    date: formatDateDisplay(item.date),
    status_code: item.status_code || "-",
    status_name: item.status_name || "-",
  }));

  const formativeRows = (formative.entries || []).map((item, index) => ({
    key: item.id || `formative-${index}`,
    no: index + 1,
    chapter_title: item.chapter_title || "-",
    score: item.score,
  }));

  const summativeRows = (summative.entries || []).map((item, index) => ({
    key: item.id || `summative-${index}`,
    no: index + 1,
    chapter_title: item.chapter_title || "-",
    score_written: item.score_written,
    score_skill: item.score_skill,
    final_score: item.final_score,
  }));

  const formativeColumns = [
    { title: "No", dataIndex: "no", width: 56, align: "center" },
    {
      title: "Bab",
      dataIndex: "chapter_title",
      render: (value) => (
        <div style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{value}</div>
      ),
    },
    {
      title: "Nilai",
      dataIndex: "score",
      width: 88,
      align: "center",
      render: (value) => value ?? "-",
    },
  ];

  const summativeColumns = [
    { title: "No", dataIndex: "no", width: 56, align: "center" },
    {
      title: "Bab",
      dataIndex: "chapter_title",
      render: (value) => (
        <div style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{value}</div>
      ),
    },
    {
      title: "Tertulis",
      dataIndex: "score_written",
      width: 88,
      align: "center",
      render: (value) => value ?? "-",
    },
    {
      title: "Praktik",
      dataIndex: "score_skill",
      width: 88,
      align: "center",
      render: (value) => value ?? "-",
    },
    {
      title: "Akhir",
      dataIndex: "final_score",
      width: 88,
      align: "center",
      render: (value) => (
        <Tag color='blue' style={{ marginRight: 0, borderRadius: 999 }}>
          {value ?? "-"}
        </Tag>
      ),
    },
  ];

  const hasAnyData =
    attendanceRows.length > 0 || formativeRows.length > 0 || summativeRows.length > 0;

  const infoCards = [
    {
      key: "period",
      label: "Periode Aktif",
      value: `Semester ${safeSelectedSemester}`,
      caption:
        monthOptions.find((item) => Number(item.value) === Number(safeSelectedMonth))?.label ||
        "Bulan belum tersedia",
      icon: <CalendarRange size={18} />,
      background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
      color: "#1d4ed8",
    },
    {
      key: "attendance",
      label: "Presensi Tercatat",
      value: attendanceRows.length,
      caption: "Entri kehadiran pada periode ini",
      icon: <ClipboardCheck size={18} />,
      background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)",
      color: "#15803d",
    },
    {
      key: "assessment",
      label: "Penilaian Tersedia",
      value: formativeRows.length + summativeRows.length,
      caption: "Gabungan data formatif dan sumatif",
      icon: <ChartColumnBig size={18} />,
      background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
      color: "#b45309",
    },
  ];

  return (
    <MotionDiv
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <MotionDiv variants={itemVariants}>
        <Card
          bordered={false}
          style={{
            borderRadius: 26,
            overflow: "hidden",
            background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #38bdf8 100%)",
            boxShadow: "0 24px 52px rgba(15, 23, 42, 0.16)",
          }}
          styles={{ body: { padding: isMobile ? 18 : 24 } }}
        >
          <Flex
            justify='space-between'
            align={isMobile ? "flex-start" : "center"}
            gap={18}
            wrap='wrap'
          >
            <Space align='start' size={14}>
              <div
                style={{
                  width: isMobile ? 52 : 60,
                  height: isMobile ? 52 : 60,
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.16)",
                  flexShrink: 0,
                }}
              >
                <BarChart3 size={isMobile ? 26 : 30} />
              </div>

              <Space direction='vertical' size={5} style={{ minWidth: 0 }}>
                <Text style={{ color: "rgba(255,255,255,0.74)" }}>
                  Workspace Laporan
                </Text>
                <Title
                  level={isMobile ? 4 : 3}
                  style={{ color: "#fff", margin: 0, lineHeight: 1.15 }}
                >
                  Ringkasan Belajar {subject?.name || meta.subject_name || "Mata Pelajaran"}
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.82)", maxWidth: 760 }}>
                  Pantau kehadiran, sikap, dan capaian penilaian dalam satu tampilan yang
                  ringkas agar progres belajar lebih mudah dibaca.
                </Text>
              </Space>
            </Space>

            <Tag
              style={{
                marginRight: 0,
                borderRadius: 999,
                paddingInline: 14,
                height: 34,
                lineHeight: "32px",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                borderColor: "rgba(255,255,255,0.18)",
              }}
              icon={<BookOpenText size={12} />}
            >
              {meta.class_name || subject?.class_name || "Kelas aktif"}
            </Tag>
          </Flex>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <ReportHeader
          subjectName={subject?.name || meta.subject_name}
          className={meta.class_name}
          selectedSemester={safeSelectedSemester}
          setSelectedSemester={setSelectedSemester}
          semesterOptions={semesterOptions}
          selectedMonth={safeSelectedMonth}
          setSelectedMonth={setSelectedMonth}
          monthOptions={monthOptions}
          onRefresh={() => refetch()}
        />
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Row gutter={[16, 16]}>
          {infoCards.map((item) => (
            <Col key={item.key} xs={24} sm={12} xl={8}>
              <Card bordered={false} style={infoCardStyle} styles={{ body: { padding: 18 } }}>
                <Flex align='center' justify='space-between' gap={16}>
                  <Space direction='vertical' size={4} style={{ minWidth: 0 }}>
                    <Text type='secondary'>{item.label}</Text>
                    <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                      {item.value}
                    </Title>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {item.caption}
                    </Text>
                  </Space>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: item.background,
                      color: item.color,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      </MotionDiv>

      <AnimatePresence mode='wait'>
        {isError ? (
          <MotionDiv
            key='error'
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Alert
              type='error'
              showIcon
              message='Gagal memuat laporan pembelajaran'
              description={error?.data?.message || "Terjadi kendala saat mengambil laporan belajar."}
              style={{ borderRadius: 18 }}
            />
          </MotionDiv>
        ) : !isFetching && !hasAnyData ? (
          <MotionDiv
            key='empty'
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card
              bordered={false}
              style={{
                borderRadius: 24,
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
              }}
              styles={{ body: { padding: isMobile ? 24 : 32 } }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction='vertical' size={4}>
                    <Text strong style={{ fontSize: 16 }}>
                      Belum ada data laporan untuk periode ini
                    </Text>
                    <Text type='secondary'>
                      Coba ganti semester atau bulan untuk melihat laporan pembelajaran lain.
                    </Text>
                  </Space>
                }
              />
            </Card>
          </MotionDiv>
        ) : (
          <MotionDiv
            key='content'
            variants={containerVariants}
            initial='hidden'
            animate='show'
            exit={{ opacity: 0, y: -12 }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <MotionDiv variants={itemVariants}>
              <ReportSummaryCards
                loading={isFetching}
                attendance={attendance}
                attitude={attitude}
                formative={formative}
                summative={summative}
              />
            </MotionDiv>

            <MotionDiv variants={itemVariants}>
              <AttendanceSection
                dataSource={attendanceRows}
                attendance={attendance}
                loading={isFetching}
                tableSize={screens.xs ? "small" : "middle"}
              />
            </MotionDiv>

            <MotionDiv variants={itemVariants}>
              <AttitudeSection attitude={attitude} />
            </MotionDiv>

            <MotionDiv variants={itemVariants}>
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <ScoreSectionCard
                    title='Formatif'
                    color='#f59e0b'
                    average={formative.average_score}
                    columns={formativeColumns}
                    dataSource={formativeRows}
                    loading={isFetching}
                    tableSize={screens.xs ? "small" : "middle"}
                    emptyText='Belum ada data formatif.'
                  />
                </Col>
                <Col xs={24} lg={12}>
                  <ScoreSectionCard
                    title='Sumatif'
                    color='#2563eb'
                    average={summative.average_score}
                    columns={summativeColumns}
                    dataSource={summativeRows}
                    loading={isFetching}
                    tableSize={screens.xs ? "small" : "middle"}
                    emptyText='Belum ada data sumatif.'
                  />
                </Col>
              </Row>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </MotionDiv>
  );
};

export default ReportTab;
