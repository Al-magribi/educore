import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpenText,
  CalendarRange,
  ClipboardCheck,
  Filter,
  GraduationCap,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useGetParentAcademicReportQuery } from "../../../service/lms/ApiParent";
import {
  MONTH_OPTIONS,
  SEMESTER_MONTHS,
} from "../student/subject/components/report/constants";

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
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

const panelCardStyle = {
  borderRadius: 24,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 20px 44px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
};

const getDefaultPublishedMonth = () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const releaseDay = 10;
  const offset = now.getDate() < releaseDay ? 2 : 1;
  return ((currentMonth - offset - 1 + 12) % 12) + 1;
};

const deriveSemesterFromMonth = (monthValue) => {
  const monthNum = Number(monthValue);
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) return 1;
  return monthNum >= 7 ? 1 : 2;
};

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toFixedOrDash = (value) => {
  const parsed = toNumberOrNull(value);
  return parsed === null ? "-" : parsed.toFixed(2);
};

const toPercentOrDash = (value) => {
  const parsed = toNumberOrNull(value);
  return parsed === null ? "-" : `${parsed.toFixed(2)}%`;
};

const averageValues = (values) => {
  const safeValues = values
    .map((item) => toNumberOrNull(item))
    .filter((item) => item !== null);

  if (!safeValues.length) return null;
  return Number(
    (
      safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length
    ).toFixed(2),
  );
};

const hasSubjectReportData = (report) => {
  const attendanceTotal = Number(report?.attendance?.total_meetings || 0);
  const attendanceRate = toNumberOrNull(report?.attendance?.percent_hadir);
  const attitudeAverage = toNumberOrNull(
    report?.attitude?.score?.average_score,
  );
  const formativeAverage = toNumberOrNull(report?.formative?.average_score);
  const summativeAverage = toNumberOrNull(report?.summative?.average_score);
  const formativeItems = Number(report?.formative?.total_entries || 0);
  const summativeItems = Number(report?.summative?.total_entries || 0);
  const teacherNote = String(report?.attitude?.teacher_note || "").trim();

  return Boolean(
    attendanceTotal > 0 ||
    attendanceRate !== null ||
    attitudeAverage !== null ||
    formativeAverage !== null ||
    summativeAverage !== null ||
    formativeItems > 0 ||
    summativeItems > 0 ||
    teacherNote,
  );
};

const getAttendanceCaption = (attendance) => {
  if (!attendance) return "Belum ada catatan kehadiran.";
  return `H:${attendance.summary?.hadir || 0} I:${attendance.summary?.izin || 0} S:${
    attendance.summary?.sakit || 0
  } A:${attendance.summary?.alpa || 0}`;
};

const detailCardStyle = {
  borderRadius: 14,
  padding: "10px 12px",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "rgba(255,255,255,0.76)",
};

const renderAttitudeDetail = (attitude) => {
  const metrics = [
    { key: "kinerja", label: "Kinerja", value: attitude?.score?.kinerja },
    {
      key: "kedisiplinan",
      label: "Kedisiplinan",
      value: attitude?.score?.kedisiplinan,
    },
    { key: "keaktifan", label: "Keaktifan", value: attitude?.score?.keaktifan },
    {
      key: "percaya_diri",
      label: "Percaya Diri",
      value: attitude?.score?.percaya_diri,
    },
  ].filter((item) => item.value !== null && item.value !== undefined);

  if (!metrics.length && !attitude?.teacher_note) {
    return (
      <Text type='secondary' style={{ fontSize: 12 }}>
        Detail sikap belum tersedia.
      </Text>
    );
  }

  return (
    <Space vertical size={8} style={{ width: "100%" }}>
      {metrics.length ? (
        <Flex gap={8} wrap='wrap'>
          {metrics.map((item) => (
            <Tag key={item.key} style={{ marginRight: 0, borderRadius: 999 }}>
              {item.label}: {toFixedOrDash(item.value)}
            </Tag>
          ))}
        </Flex>
      ) : null}
      <Text type='secondary' style={{ fontSize: 12 }}>
        {attitude?.teacher_note || "Catatan guru belum tersedia."}
      </Text>
    </Space>
  );
};

const renderFormativeDetail = (details = EMPTY_LIST) => {
  if (!details.length) {
    return (
      <Text type='secondary' style={{ fontSize: 12 }}>
        Detail formatif belum tersedia.
      </Text>
    );
  }

  return (
    <Space vertical size={8} style={{ width: "100%" }}>
      {details.map((detail) => (
        <div
          key={detail.id || `${detail.chapter_id}-${detail.type || "f"}`}
          style={detailCardStyle}
        >
          <Flex justify='space-between' align='start' gap={12}>
            <Space vertical size={0} style={{ minWidth: 0 }}>
              <Text strong style={{ fontSize: 12 }}>
                {detail.chapter_title || "Bab"}
              </Text>
              <Text type='secondary' style={{ fontSize: 11 }}>
                {detail.type || "Formatif"}
              </Text>
            </Space>
            <Tag color='gold' style={{ marginRight: 0, borderRadius: 999 }}>
              {detail.score ?? "-"}
            </Tag>
          </Flex>
        </div>
      ))}
    </Space>
  );
};

const renderSummativeDetail = (details = EMPTY_LIST) => {
  if (!details.length) {
    return (
      <Text type='secondary' style={{ fontSize: 12 }}>
        Detail sumatif belum tersedia.
      </Text>
    );
  }

  return (
    <Space vertical size={8} style={{ width: "100%" }}>
      {details.map((detail) => (
        <div
          key={detail.id || `${detail.chapter_id}-${detail.type || "s"}`}
          style={detailCardStyle}
        >
          <Space vertical size={8} style={{ width: "100%" }}>
            <Flex justify='space-between' align='start' gap={12}>
              <Space vertical size={0} style={{ minWidth: 0 }}>
                <Text strong style={{ fontSize: 12 }}>
                  {detail.chapter_title || "Bab"}
                </Text>
                <Text type='secondary' style={{ fontSize: 11 }}>
                  {detail.type || "Sumatif"}
                </Text>
              </Space>
              <Tag color='blue' style={{ marginRight: 0, borderRadius: 999 }}>
                Akhir {detail.final_score ?? "-"}
              </Tag>
            </Flex>

            <Flex gap={8} wrap='wrap'>
              <Tag style={{ marginRight: 0, borderRadius: 999 }}>
                Tulis {detail.score_written ?? "-"}
              </Tag>
              <Tag style={{ marginRight: 0, borderRadius: 999 }}>
                Praktik {detail.score_skill ?? "-"}
              </Tag>
            </Flex>
          </Space>
        </div>
      ))}
    </Space>
  );
};

const AcademicReport = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const defaultMonth = useMemo(() => getDefaultPublishedMonth(), []);
  const [studentId, setStudentId] = useState("");
  const [selectedSemester, setSelectedSemester] = useState(
    deriveSemesterFromMonth(defaultMonth),
  );
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [subjectKeyword, setSubjectKeyword] = useState("");

  const monthOptions = useMemo(
    () =>
      MONTH_OPTIONS.filter((item) =>
        (SEMESTER_MONTHS[selectedSemester] || []).includes(Number(item.value)),
      ),
    [selectedSemester],
  );

  const safeSelectedMonth = useMemo(() => {
    if (!monthOptions.length) return selectedMonth;
    const selectedExists = monthOptions.some(
      (item) => Number(item.value) === Number(selectedMonth),
    );
    return selectedExists ? selectedMonth : Number(monthOptions[0].value);
  }, [monthOptions, selectedMonth]);

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetParentAcademicReportQuery({
    student_id: studentId || null,
    semester: selectedSemester || null,
    month: safeSelectedMonth || null,
  });

  const data = response?.data || {};
  const students = data?.students || EMPTY_LIST;
  const reports = data?.reports || EMPTY_LIST;
  const effectiveStudentId = String(
    studentId || data?.filters?.selected_student_id || "",
  );

  const selectedStudent = useMemo(
    () =>
      students.find((item) => String(item.student_id) === effectiveStudentId) ||
      null,
    [effectiveStudentId, students],
  );

  const visibleReports = useMemo(() => {
    const baseReports = reports.filter((item) => hasSubjectReportData(item));
    const trimmedKeyword = subjectKeyword.trim().toLowerCase();

    if (!trimmedKeyword) return baseReports;

    return baseReports.filter((item) =>
      [item?.subject_name, item?.subject_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(trimmedKeyword),
    );
  }, [reports, subjectKeyword]);

  return (
    <MotionDiv
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <MotionDiv variants={itemVariants}>
        <Card
          variant='borderless'
          style={{
            borderRadius: 28,
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #22c55e 100%)",
            boxShadow: "0 26px 56px rgba(15, 23, 42, 0.18)",
          }}
          styles={{ body: { padding: isMobile ? 20 : 28 } }}
        >
          <Row gutter={[24, 24]} align='middle'>
            <Col xs={24} xl={15}>
              <Space align='start' size={14}>
                <div
                  style={{
                    width: isMobile ? 54 : 64,
                    height: isMobile ? 54 : 64,
                    borderRadius: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.14)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.16)",
                    boxShadow: "0 14px 30px rgba(8, 15, 35, 0.18)",
                    flexShrink: 0,
                  }}
                >
                  <BarChart3 size={isMobile ? 28 : 32} />
                </div>

                <Space vertical size={6} style={{ minWidth: 0 }}>
                  <Text style={{ color: "rgba(255,255,255,0.74)" }}>
                    Laporan Akademik Orang Tua
                  </Text>
                  <Title
                    level={isMobile ? 4 : 2}
                    style={{ color: "#fff", margin: 0, lineHeight: 1.12 }}
                  >
                    Pantau progres Pembelajaran Anak
                  </Title>
                  <Text
                    style={{ color: "rgba(255,255,255,0.82)", maxWidth: 760 }}
                  >
                    Tampilkan hanya mata pelajaran yang memang sudah memiliki
                    laporan pada periode aktif.
                  </Text>
                </Space>
              </Space>
            </Col>

            <Col xs={24} xl={9}>
              <Card
                variant='borderless'
                style={{
                  borderRadius: 24,
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
                styles={{ body: { padding: isMobile ? 16 : 18 } }}
              >
                <Space vertical size={8} style={{ width: "100%" }}>
                  <Flex
                    justify='space-between'
                    align='center'
                    gap={12}
                    wrap='wrap'
                  >
                    <Text style={{ color: "rgba(255,255,255,0.74)" }}>
                      Ringkasan siswa aktif
                    </Text>
                    <Tag
                      style={{
                        marginRight: 0,
                        borderRadius: 999,
                        paddingInline: 12,
                        background: "rgba(255,255,255,0.12)",
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.18)",
                      }}
                      icon={<CalendarRange size={12} />}
                    >
                      Semester {selectedSemester} -{" "}
                      {monthOptions.find(
                        (item) =>
                          Number(item.value) === Number(safeSelectedMonth),
                      )?.label || "-"}
                    </Tag>
                  </Flex>

                  <div>
                    <Text
                      style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}
                    >
                      Nama Siswa
                    </Text>
                    <Title
                      level={isMobile ? 5 : 4}
                      style={{ color: "#fff", margin: 0 }}
                    >
                      {selectedStudent?.student_name ||
                        "Belum ada siswa terhubung"}
                    </Title>
                  </div>

                  <Flex gap={12} wrap='wrap'>
                    <Tag
                      style={{
                        marginRight: 0,
                        borderRadius: 999,
                        paddingInline: 12,
                        background: "rgba(255,255,255,0.12)",
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.18)",
                      }}
                      icon={<UserRound size={12} />}
                    >
                      NIS {selectedStudent?.nis || "-"}
                    </Tag>
                    <Tag
                      style={{
                        marginRight: 0,
                        borderRadius: 999,
                        paddingInline: 12,
                        background: "rgba(255,255,255,0.12)",
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.18)",
                      }}
                    >
                      {selectedStudent?.class_name || "Kelas belum tersedia"}
                    </Tag>
                  </Flex>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Card
          variant='borderless'
          style={panelCardStyle}
          styles={{ body: { padding: 20 } }}
        >
          <Flex
            justify='space-between'
            align={isMobile ? "start" : "center"}
            gap={16}
            wrap='wrap'
          >
            <Space align='start' size={14}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background:
                    "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
                  color: "#1d4ed8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Filter size={18} />
              </div>
              <Space vertical size={2} style={{ minWidth: 0 }}>
                <Title level={5} style={{ margin: 0 }}>
                  Filter Tampilan Laporan
                </Title>
                <Text type='secondary'>
                  Pilih siswa, semester, dan bulan untuk menampilkan mapel yang
                  sudah memiliki laporan.
                </Text>
              </Space>
            </Space>

            <Button
              icon={<RefreshCw size={16} />}
              onClick={() => refetch()}
              loading={isFetching}
            >
              Muat Ulang
            </Button>
          </Flex>

          <Row gutter={[16, 16]} style={{ marginTop: 18 }}>
            <Col xs={24} md={6}>
              <Text type='secondary'>Siswa</Text>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                size='large'
                value={effectiveStudentId || undefined}
                onChange={(value) => setStudentId(String(value || ""))}
                placeholder='Pilih siswa'
                options={students.map((item) => ({
                  value: String(item.student_id),
                  label: `${item.student_name} - ${item.class_name || "Tanpa kelas"}`,
                }))}
              />
            </Col>
            <Col xs={24} md={6}>
              <Text type='secondary'>Semester</Text>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                size='large'
                value={selectedSemester}
                onChange={(value) => setSelectedSemester(Number(value))}
                options={[
                  { value: 1, label: "Semester 1" },
                  { value: 2, label: "Semester 2" },
                ]}
              />
            </Col>
            <Col xs={24} md={6}>
              <Text type='secondary'>Bulan</Text>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                size='large'
                value={safeSelectedMonth}
                onChange={(value) => setSelectedMonth(Number(value))}
                options={monthOptions}
              />
            </Col>
            <Col xs={24} md={6}>
              <Text type='secondary'>Cari Mata Pelajaran</Text>
              <Input
                allowClear
                size='large'
                value={subjectKeyword}
                onChange={(event) => setSubjectKeyword(event.target.value)}
                placeholder='Cari nama atau kode mapel'
                prefix={<Search size={16} style={{ color: "#64748b" }} />}
                style={{ marginTop: 8 }}
              />
            </Col>
          </Row>
        </Card>
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
              message='Gagal memuat laporan akademik'
              description={
                error?.data?.message ||
                "Terjadi kendala saat mengambil data laporan."
              }
              style={{ borderRadius: 18 }}
            />
          </MotionDiv>
        ) : !students.length && !isLoading ? (
          <MotionDiv
            key='no-student'
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card
              variant='borderless'
              style={panelCardStyle}
              styles={{ body: { padding: isMobile ? 24 : 32 } }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space vertical size={4}>
                    <Text strong style={{ fontSize: 16 }}>
                      Belum ada siswa yang terhubung ke akun orang tua
                    </Text>
                    <Text type='secondary'>
                      Hubungkan data siswa terlebih dahulu agar laporan akademik
                      bisa ditampilkan di halaman ini.
                    </Text>
                  </Space>
                }
              />
            </Card>
          </MotionDiv>
        ) : isLoading ? (
          <MotionDiv
            key='loading'
            variants={containerVariants}
            initial='hidden'
            animate='show'
            exit={{ opacity: 0, y: -12 }}
          >
            <Row gutter={[16, 16]}>
              {[1, 2, 3, 4].map((item) => (
                <Col key={item} xs={24} lg={12}>
                  <Card
                    variant='borderless'
                    loading
                    style={panelCardStyle}
                    styles={{ body: { minHeight: 240 } }}
                  />
                </Col>
              ))}
            </Row>
          </MotionDiv>
        ) : visibleReports.length === 0 ? (
          <MotionDiv
            key='empty'
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card
              variant='borderless'
              style={panelCardStyle}
              styles={{ body: { padding: isMobile ? 24 : 32 } }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space vertical size={4}>
                    <Text strong style={{ fontSize: 16 }}>
                      Belum ada mata pelajaran dengan laporan di periode ini
                    </Text>
                    <Text type='secondary'>
                      Coba ganti semester atau bulan untuk melihat laporan
                      akademik yang sudah tersedia.
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
              <Flex
                justify='space-between'
                align={isMobile ? "start" : "center"}
                gap={12}
                wrap='wrap'
              >
                <Space vertical size={0}>
                  <Title level={4} style={{ margin: 0 }}>
                    Mata Pelajaran Dengan Laporan Aktif
                  </Title>
                  <Text type='secondary'>
                    Menampilkan {visibleReports.length} mata pelajaran yang siap
                    dibaca orang tua untuk periode terpilih.
                  </Text>
                </Space>

                {isFetching ? (
                  <Tag
                    color='processing'
                    style={{ marginRight: 0, borderRadius: 999 }}
                  >
                    Memperbarui data...
                  </Tag>
                ) : null}
              </Flex>
            </MotionDiv>

            <Row gutter={[16, 16]}>
              {visibleReports.map((item) => (
                <Col key={item.subject_id} xs={24} xl={12}>
                  <MotionDiv variants={itemVariants}>
                    <Card
                      variant='borderless'
                      style={panelCardStyle}
                      styles={{ body: { padding: isMobile ? 18 : 22 } }}
                    >
                      <Space vertical size={18} style={{ width: "100%" }}>
                        <Flex
                          justify='space-between'
                          align='start'
                          gap={12}
                          wrap='wrap'
                        >
                          <Space align='start' size={12}>
                            <div
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 16,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background:
                                  "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
                                color: "#1d4ed8",
                                flexShrink: 0,
                              }}
                            >
                              <BookOpenText size={20} />
                            </div>
                            <Space vertical size={2} style={{ minWidth: 0 }}>
                              <Title level={5} style={{ margin: 0 }}>
                                {item.subject_name}
                              </Title>
                              <Text type='secondary'>
                                {item.subject_code ||
                                  "Kode mapel belum tersedia"}
                              </Text>
                            </Space>
                          </Space>

                          <Tag
                            color='blue'
                            style={{
                              marginRight: 0,
                              borderRadius: 999,
                              paddingInline: 12,
                            }}
                          >
                            {selectedStudent?.class_name || "Kelas aktif"}
                          </Tag>
                        </Flex>

                        <Row gutter={[12, 12]}>
                          <Col xs={24} sm={12}>
                            <Card
                              size='small'
                              variant='borderless'
                              style={{
                                borderRadius: 18,
                                background:
                                  "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
                              }}
                              styles={{ body: { padding: 16 } }}
                            >
                              <Space vertical size={4}>
                                <Text type='secondary'>Kehadiran</Text>
                                <Title level={5} style={{ margin: 0 }}>
                                  {toPercentOrDash(
                                    item.attendance?.percent_hadir,
                                  )}
                                </Title>
                                <Text type='secondary' style={{ fontSize: 12 }}>
                                  {getAttendanceCaption(item.attendance)}
                                </Text>
                              </Space>
                            </Card>
                          </Col>

                          <Col xs={24} sm={12}>
                            <Card
                              size='small'
                              variant='borderless'
                              style={{
                                borderRadius: 18,
                                background:
                                  "linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)",
                              }}
                              styles={{ body: { padding: 16 } }}
                            >
                              <Space vertical size={4}>
                                <Text type='secondary'>Nilai Sikap</Text>
                                <Title level={5} style={{ margin: 0 }}>
                                  {toFixedOrDash(
                                    item.attitude?.score?.average_score,
                                  )}
                                </Title>
                                <Text type='secondary' style={{ fontSize: 12 }}>
                                  Entri sikap{" "}
                                  {item.attitude?.total_entries || 0}
                                </Text>
                                {renderAttitudeDetail(item.attitude)}
                              </Space>
                            </Card>
                          </Col>
                        </Row>

                        <Row gutter={[12, 12]}>
                          <Col xs={24} sm={12}>
                            <Card
                              size='small'
                              variant='borderless'
                              style={{
                                borderRadius: 18,
                                background:
                                  "linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)",
                              }}
                              styles={{ body: { padding: 16 } }}
                            >
                              <Space vertical size={4}>
                                <Text type='secondary'>Formatif</Text>
                                <Title level={5} style={{ margin: 0 }}>
                                  {toFixedOrDash(item.formative?.average_score)}
                                </Title>
                                <Text type='secondary' style={{ fontSize: 12 }}>
                                  {item.formative?.total_entries || 0} penilaian
                                  tercatat
                                </Text>
                                {renderFormativeDetail(item.formative?.entries)}
                              </Space>
                            </Card>
                          </Col>

                          <Col xs={24} sm={12}>
                            <Card
                              size='small'
                              variant='borderless'
                              style={{
                                borderRadius: 18,
                                background:
                                  "linear-gradient(135deg, #ecfeff 0%, #eff6ff 100%)",
                              }}
                              styles={{ body: { padding: 16 } }}
                            >
                              <Space vertical size={4}>
                                <Text type='secondary'>Sumatif</Text>
                                <Title level={5} style={{ margin: 0 }}>
                                  {toFixedOrDash(item.summative?.average_score)}
                                </Title>
                                <Text type='secondary' style={{ fontSize: 12 }}>
                                  {item.summative?.total_entries || 0} penilaian
                                  tercatat
                                </Text>
                                {renderSummativeDetail(item.summative?.entries)}
                              </Space>
                            </Card>
                          </Col>
                        </Row>
                      </Space>
                    </Card>
                  </MotionDiv>
                </Col>
              ))}
            </Row>
          </MotionDiv>
        )}
      </AnimatePresence>
    </MotionDiv>
  );
};

export default AcademicReport;
