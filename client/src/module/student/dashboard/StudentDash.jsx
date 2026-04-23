import React, { useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Grid,
  List,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  School,
  User,
} from "lucide-react";
import { useGetStudentDashQuery } from "../../../service/main/ApiDash";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const SUBJECTS_PER_PAGE = 4;

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
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
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

const slideVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const iconWrapStyle = (background, color) => ({
  width: 42,
  height: 42,
  borderRadius: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background,
  color,
});

const statCardStyle = {
  borderRadius: 24,
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
  height: "100%",
};

const cardStyle = {
  borderRadius: 24,
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
  height: "100%",
};

const heroStyle = {
  borderRadius: 28,
  overflow: "hidden",
  background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #38bdf8 100%)",
  color: "#fff",
  boxShadow: "0 24px 50px rgba(15, 23, 42, 0.18)",
};

const listItemStyle = {
  borderRadius: 18,
  border: "1px solid #e5efff",
  background: "linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%)",
  marginBottom: 12,
  padding: "14px 16px",
};

const examItemStyle = {
  borderRadius: 18,
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  marginBottom: 12,
  padding: "14px 16px",
};

const StudentDash = () => {
  const { data, isLoading, isError } = useGetStudentDashQuery();
  const [subjectPage, setSubjectPage] = useState(0);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  if (isLoading) {
    return (
      <Space direction='vertical' size={16} style={{ width: "100%" }}>
        <Skeleton.Node active style={{ width: "100%", height: 220 }} />
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((item) => (
            <Col key={item} xs={24} md={8}>
              <Card style={statCardStyle}>
                <Skeleton active paragraph={{ rows: 1 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </Space>
    );
  }

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat data dashboard siswa.'
      />
    );
  }

  const studentName = data?.student?.full_name || "Siswa";
  const studentInitial = studentName?.[0]?.toUpperCase() || "S";
  const classSummary = [
    data?.classInfo?.name || "Belum ada kelas",
    data?.classInfo?.grade || "-",
    data?.classInfo?.major && data.classInfo.major !== "-"
      ? data.classInfo.major
      : null,
  ]
    .filter(Boolean)
    .join(" • ");
  const subjects = data?.subjects || [];
  const exams = data?.exams || [];
  const totalSubjectPages = Math.max(
    1,
    Math.ceil(subjects.length / SUBJECTS_PER_PAGE),
  );
  const safeSubjectPage = Math.min(subjectPage, totalSubjectPages - 1);
  const pagedSubjects = subjects.slice(
    safeSubjectPage * SUBJECTS_PER_PAGE,
    safeSubjectPage * SUBJECTS_PER_PAGE + SUBJECTS_PER_PAGE,
  );

  const stats = [
    {
      key: "subjects",
      title: "Mata Pelajaran",
      value: subjects.length,
      suffix: "mapel",
      icon: <BookOpen size={20} />,
      bg: "#dbeafe",
      color: "#1d4ed8",
    },
    {
      key: "exams",
      title: "Ujian Aktif",
      value: exams.length,
      suffix: "ujian",
      icon: <ClipboardList size={20} />,
      bg: "#dcfce7",
      color: "#15803d",
    },
    {
      key: "school",
      title: "Sekolah",
      value: data?.homebase?.name || "-",
      icon: <School size={20} />,
      bg: "#fef3c7",
      color: "#b45309",
    },
  ];

  return (
    <MotionDiv
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 16 : 20,
      }}
    >
      <MotionDiv variants={itemVariants}>
        <Card
          bordered={false}
          style={heroStyle}
          bodyStyle={{ padding: isMobile ? 20 : 28 }}
        >
          <Row gutter={[24, 24]} align='middle'>
            <Col xs={24} lg={16}>
              <Space
                size={isMobile ? 14 : 16}
                align='start'
                wrap
                style={{
                  width: "100%",
                  justifyContent: isMobile ? "center" : "flex-start",
                }}
              >
                <MotionDiv
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35 }}
                >
                  <Avatar
                    size={isMobile ? 64 : 76}
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      color: "#fff",
                      fontSize: isMobile ? 24 : 28,
                      fontWeight: 800,
                      border: "1px solid rgba(255,255,255,0.22)",
                    }}
                  >
                    {studentInitial}
                  </Avatar>
                </MotionDiv>

                <Space
                  direction='vertical'
                  size={6}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: isMobile ? "center" : "left",
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.75)" }}>
                    Dashboard Siswa
                  </Text>
                  <Title
                    level={isMobile ? 4 : 3}
                    style={{ color: "#fff", margin: 0, lineHeight: 1.15 }}
                  >
                    {studentName}
                  </Title>

                  <Space
                    wrap
                    size={[8, 8]}
                    style={{
                      justifyContent: isMobile ? "center" : "flex-start",
                    }}
                  >
                    <Tag
                      bordered={false}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.14)",
                        color: "#fff",
                      }}
                    >
                      <Space size={6}>
                        <User size={14} />
                        <span>NIS {data?.student?.nis || "-"}</span>
                      </Space>
                    </Tag>
                    <Tag
                      bordered={false}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.14)",
                        color: "#fff",
                      }}
                    >
                      <Space size={6}>
                        <School size={14} />
                        <span>{classSummary}</span>
                      </Space>
                    </Tag>
                  </Space>
                </Space>
              </Space>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                bordered={false}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  backdropFilter: "blur(10px)",
                }}
                bodyStyle={{ padding: isMobile ? 18 : 20 }}
              >
                <Space direction='vertical' size={14} style={{ width: "100%" }}>
                  <div>
                    <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                      Periode Aktif
                    </Text>
                    <Title
                      level={4}
                      style={{ color: "#fff", margin: "4px 0 0" }}
                    >
                      {data?.activePeriode?.name || "Periode belum aktif"}
                    </Title>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Row gutter={[16, 16]}>
          {stats.map((item) => (
            <Col key={item.key} xs={24} md={8}>
              <MotionDiv whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                <Card bordered={false} style={statCardStyle}>
                  <Space direction='vertical' size={10}>
                    <div style={iconWrapStyle(item.bg, item.color)}>
                      {item.icon}
                    </div>
                    <Text type='secondary'>{item.title}</Text>
                    <Statistic
                      value={item.value}
                      suffix={item.suffix}
                      valueStyle={{
                        fontSize: isMobile ? 24 : 28,
                        fontWeight: 800,
                        color: "#0f172a",
                        wordBreak: "break-word",
                      }}
                    />
                  </Space>
                </Card>
              </MotionDiv>
            </Col>
          ))}
        </Row>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              bordered={false}
              style={cardStyle}
              title={
                <Space>
                  <BookOpen size={18} />
                  <span>Mata Pelajaran</span>
                </Space>
              }
              extra={
                subjects.length > SUBJECTS_PER_PAGE ? (
                  <Space size={8}>
                    <Button
                      size='small'
                      shape='circle'
                      icon={<ChevronLeft size={16} />}
                      disabled={safeSubjectPage === 0}
                      onClick={() =>
                        setSubjectPage((current) => Math.max(current - 1, 0))
                      }
                    />
                    <Text type='secondary'>
                      {safeSubjectPage + 1}/{totalSubjectPages}
                    </Text>
                    <Button
                      size='small'
                      shape='circle'
                      icon={<ChevronRight size={16} />}
                      disabled={safeSubjectPage === totalSubjectPages - 1}
                      onClick={() =>
                        setSubjectPage((current) =>
                          Math.min(current + 1, totalSubjectPages - 1),
                        )
                      }
                    />
                  </Space>
                ) : null
              }
            >
              {subjects.length ? (
                <AnimatePresence mode='wait'>
                  <motion.div
                    key={safeSubjectPage}
                    variants={slideVariants}
                    initial='initial'
                    animate='animate'
                    exit='exit'
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <List
                      dataSource={pagedSubjects}
                      renderItem={(item) => (
                        <List.Item style={listItemStyle}>
                          <div
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: isMobile ? "flex-start" : "center",
                              justifyContent: "space-between",
                              gap: 12,
                              flexDirection: isMobile ? "column" : "row",
                            }}
                          >
                            <List.Item.Meta
                              style={{ margin: 0 }}
                              title={
                                <Text strong style={{ color: "#0f172a" }}>
                                  {item.name}
                                </Text>
                              }
                              description={
                                <Text type='secondary'>
                                  {item.code ||
                                    "Kode mata pelajaran belum tersedia"}
                                </Text>
                              }
                            />
                            <Tag
                              color='blue'
                              style={{ borderRadius: 999, marginInlineEnd: 0 }}
                            >
                              Mapel
                            </Tag>
                          </div>
                        </List.Item>
                      )}
                    />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <Empty description='Daftar mata pelajaran belum tersedia.' />
              )}
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card
              bordered={false}
              style={cardStyle}
              title={
                <Space>
                  <ClipboardList size={18} />
                  <span>Ujian Aktif</span>
                </Space>
              }
            >
              {exams.length ? (
                <List
                  dataSource={exams}
                  renderItem={(item) => (
                    <List.Item style={examItemStyle}>
                      <div style={{ width: "100%" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: isMobile ? "stretch" : "flex-start",
                            marginBottom: 10,
                            flexDirection: isMobile ? "column" : "row",
                          }}
                        >
                          <div>
                            <Text
                              strong
                              style={{ color: "#0f172a", display: "block" }}
                            >
                              {item.name}
                            </Text>
                            <Text type='secondary'>
                              {item.subject_name ||
                                "Mata pelajaran belum tersedia"}
                            </Text>
                          </div>
                          <Tag
                            color='green'
                            style={{
                              borderRadius: 999,
                              marginInlineEnd: 0,
                              alignSelf: isMobile ? "flex-start" : "auto",
                            }}
                          >
                            Aktif
                          </Tag>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: isMobile ? "flex-start" : "center",
                            flexDirection: isMobile ? "column" : "row",
                          }}
                        >
                          <Text type='secondary'>Durasi</Text>
                          <Text strong>{item.duration_minutes || 0} menit</Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description='Belum ada ujian aktif.' />
              )}
            </Card>
          </Col>
        </Row>
      </MotionDiv>
    </MotionDiv>
  );
};

export default StudentDash;
