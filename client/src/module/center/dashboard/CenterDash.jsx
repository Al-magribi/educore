import React, { useMemo } from "react";
import { useGetDashboardSummaryQuery } from "../../../service/center/ApiCenterDash";
import {
  Alert,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  CheckCircleOutlined,
  FieldTimeOutlined,
  ReadOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Activity,
  BookOpenCheck,
  CalendarCheck2,
  GraduationCap,
} from "lucide-react";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

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
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

const statCardStyle = {
  borderRadius: 22,
  height: "100%",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
};

const attendanceColorMap = {
  Hadir: "#2563eb",
  Sakit: "#f59e0b",
  Izin: "#06b6d4",
  Alpha: "#ef4444",
};

const CenterDash = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { data, isLoading, isError } = useGetDashboardSummaryQuery();
  const attendanceSource = data?.attendance;
  const logsSource = data?.logs;
  const statsSource = data?.stats;

  const attendanceData = useMemo(
    () => attendanceSource || [],
    [attendanceSource],
  );
  const logsData = useMemo(() => logsSource || [], [logsSource]);
  const stats = useMemo(() => statsSource || {}, [statsSource]);

  const totalAttendance = useMemo(
    () =>
      attendanceData.reduce(
        (acc, curr) => acc + Number.parseInt(curr.count, 10),
        0,
      ) || 0,
    [attendanceData],
  );

  const statCards = [
    {
      key: "students",
      title: "Total Siswa",
      value: stats.students || 0,
      prefix: <UserOutlined style={{ color: "#2563eb" }} />,
      note: "Peserta aktif dalam sistem pusat.",
      icon: <GraduationCap size={18} />,
      background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
      color: "#1d4ed8",
    },
    {
      key: "teachers",
      title: "Total Guru",
      value: stats.teachers || 0,
      prefix: <TeamOutlined style={{ color: "#16a34a" }} />,
      note: "Pengajar yang terdaftar dan aktif.",
      icon: <Activity size={18} />,
      background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)",
      color: "#15803d",
    },
    {
      key: "exams",
      title: "Ujian Aktif (CBT)",
      value: stats.activeExams || 0,
      prefix: <ReadOutlined style={{ color: "#d97706" }} />,
      note: "Sesi ujian yang sedang tersedia.",
      icon: <BookOpenCheck size={18} />,
      background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
      color: "#b45309",
    },
    {
      key: "tahfiz",
      title: "Setoran Tahfiz (Hari Ini)",
      value: stats.tahfizToday || 0,
      prefix: <CheckCircleOutlined style={{ color: "#7c3aed" }} />,
      note: "Pencapaian harian setoran hafalan.",
      icon: <CalendarCheck2 size={18} />,
      background: "linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%)",
      color: "#7c3aed",
    },
  ];

  const logColumns = [
    {
      title: "Waktu",
      dataIndex: "created_at",
      key: "created_at",
      render: (text) => new Date(text).toLocaleString("id-ID"),
    },
    {
      title: "User",
      dataIndex: "full_name",
      key: "full_name",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Aktivitas",
      dataIndex: "action",
      key: "action",
      render: (text) => (
        <Tag color='blue' style={{ borderRadius: 999, margin: 0 }}>
          {text}
        </Tag>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card
        variant='borderless'
        style={{ borderRadius: 24 }}
        styles={{ body: { padding: 48, textAlign: "center" } }}
      >
        <Spin size='large' />
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert message='Gagal memuat data dashboard' type='error' showIcon />
    );
  }

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
              "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 26%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f766e 100%)",
            boxShadow: "0 24px 52px rgba(15, 23, 42, 0.16)",
          }}
          styles={{ body: { padding: isMobile ? 20 : 28 } }}
        >
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            gap={18}
            wrap='wrap'
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <div style={{ maxWidth: 760 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.74)",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Dashboard Center
              </Text>
              <Title
                level={isMobile ? 4 : 2}
                style={{ margin: 0, color: "#fff", lineHeight: 1.12 }}
              >
                Ringkasan operasional pusat dalam satu dashboard
              </Title>
              <Paragraph
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  color: "rgba(255,255,255,0.82)",
                  maxWidth: 760,
                }}
              >
                Pantau statistik siswa, guru, ujian aktif, kehadiran harian, dan
                aktivitas sistem terbaru dengan tampilan yang lebih rapi dan
                mudah dibaca.
              </Paragraph>
            </div>

            <Card
              variant='borderless'
              style={{
                width: 320,
                maxWidth: "100%",
                borderRadius: 24,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(10px)",
              }}
              styles={{ body: { padding: 22 } }}
            >
              <Flex vertical gap={8}>
                <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                  Sorotan hari ini
                </Text>
                <Title level={4} style={{ margin: 0, color: "#fff" }}>
                  {totalAttendance} presensi tercatat
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                  {stats.activeExams || 0} ujian aktif dan {logsData.length}{" "}
                  aktivitas terakhir terpantau.
                </Text>
              </Flex>
            </Card>
          </Flex>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Row gutter={[16, 16]}>
          {statCards.map((item) => (
            <Col key={item.key} xs={24} sm={12} xl={6}>
              <Card
                variant='borderless'
                style={statCardStyle}
                styles={{ body: { padding: 18 } }}
              >
                <Flex justify='space-between' align='start' gap={14}>
                  <div style={{ flex: 1 }}>
                    <Statistic
                      title={item.title}
                      value={item.value}
                      prefix={item.prefix}
                    />
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {item.note}
                    </Text>
                  </div>
                  <div
                    style={{
                      width: 46,
                      height: 46,
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

      <MotionDiv variants={itemVariants}>
        <Row gutter={[18, 18]}>
          <Col xs={24} lg={10}>
            <Card
              variant='borderless'
              title='Kehadiran Hari Ini'
              style={{
                borderRadius: 24,
                boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
                height: "100%",
              }}
              styles={{ body: { padding: isMobile ? 16 : 20 } }}
            >
              {attendanceData.length > 0 ? (
                <Flex vertical gap={14}>
                  {attendanceData.map((item, index) => {
                    const count = Number.parseInt(item.count, 10) || 0;
                    const percent =
                      totalAttendance > 0
                        ? Number(((count / totalAttendance) * 100).toFixed(1))
                        : 0;
                    const color = attendanceColorMap[item.status] || "#2563eb";

                    return (
                      <Card
                        key={`${item.status}-${index}`}
                        variant='borderless'
                        style={{
                          borderRadius: 18,
                          background: "#f8fafc",
                        }}
                        styles={{ body: { padding: 16 } }}
                      >
                        <Flex
                          justify='space-between'
                          align='center'
                          gap={12}
                          style={{ marginBottom: 10 }}
                        >
                          <Space direction='vertical' size={0}>
                            <Text strong>{item.status}</Text>
                            <Text type='secondary' style={{ fontSize: 12 }}>
                              {percent}% dari total presensi
                            </Text>
                          </Space>
                          <Tag
                            style={{
                              margin: 0,
                              borderRadius: 999,
                              background: `${color}16`,
                              color,
                              borderColor: "transparent",
                              fontWeight: 700,
                            }}
                          >
                            {count} siswa
                          </Tag>
                        </Flex>
                        <Progress
                          percent={percent}
                          strokeColor={color}
                          size='small'
                        />
                      </Card>
                    );
                  })}
                </Flex>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description='Belum ada data presensi hari ini'
                />
              )}
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card
              variant='borderless'
              title={
                <Space align='center' size={8}>
                  <FieldTimeOutlined />
                  <span>Aktivitas Sistem Terakhir</span>
                </Space>
              }
              style={{
                borderRadius: 24,
                boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
                height: "100%",
              }}
              styles={{ body: { padding: 0 } }}
            >
              <Table
                dataSource={logsData}
                columns={logColumns}
                pagination={false}
                rowKey={(record) =>
                  `${record.created_at}-${record.full_name}-${record.action}`
                }
                size='small'
                scroll={{ x: 640 }}
                locale={{ emptyText: "Belum ada aktivitas sistem terbaru." }}
              />
            </Card>
          </Col>
        </Row>
      </MotionDiv>
    </MotionDiv>
  );
};

export default CenterDash;
