import React, { useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Grid,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Building2,
  Hash,
  Layers3,
  ListTodo,
  School,
} from "lucide-react";
import LearningTab from "./components/LearningTab";
import ReportTab from "./components/ReportTab";
import StudentTaskView from "../task/StudentTaskView";

const { Title, Text } = Typography;
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

const Detail = ({ subject, classId, onBack }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const tabItems = useMemo(
    () => [
      {
        key: "learning",
        label: "Pembelajaran",
        icon: <BookOpen size={16} />,
        children: <LearningTab subjectId={subject?.id} classId={classId} />,
      },
      {
        key: "task",
        label: "Tugas",
        icon: <ListTodo size={16} />,
        children: <StudentTaskView subjectId={subject?.id} classId={classId} />,
      },
      {
        key: "report",
        label: "Laporan Belajar",
        icon: <BarChart3 size={16} />,
        children: <ReportTab subject={subject} classId={classId} />,
      },
    ],
    [classId, subject],
  );

  const infoCards = [
    {
      key: "code",
      label: "Kode Mapel",
      value: subject?.code || "Tanpa Kode",
      icon: <Hash size={18} />,
      background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
      color: "#1d4ed8",
    },
    {
      key: "category",
      label: "Kategori",
      value: subject?.category_name || "Umum",
      icon: <Layers3 size={18} />,
      background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)",
      color: "#15803d",
    },
    {
      key: "class",
      label: "Kelas Aktif",
      value: subject?.class_name || "Belum Terdata",
      icon: <School size={18} />,
      background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
      color: "#b45309",
    },
  ];

  return (
    <MotionDiv
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <MotionDiv variants={itemVariants}>
        <Card
          bordered={false}
          style={{
            borderRadius: 28,
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #38bdf8 100%)",
            boxShadow: "0 24px 52px rgba(15, 23, 42, 0.18)",
          }}
          styles={{ body: { padding: isMobile ? 20 : 28 } }}
        >
          <Row gutter={[20, 20]} align='middle'>
            <Col xs={24} xl={16}>
              <Flex
                vertical
                gap={16}
                style={{ alignItems: isMobile ? "stretch" : "flex-start" }}
              >
                <Button
                  icon={<ArrowLeft size={16} />}
                  onClick={onBack}
                  size={isMobile ? "middle" : "large"}
                  style={{
                    width: isMobile ? "100%" : "fit-content",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.12)",
                    borderColor: "rgba(255,255,255,0.14)",
                    color: "#fff",
                    boxShadow: "none",
                  }}
                >
                  Kembali ke daftar
                </Button>

                <Space align='start' size={16} style={{ width: "100%" }}>
                  <div
                    style={{
                      width: isMobile ? 58 : 68,
                      height: isMobile ? 58 : 68,
                      borderRadius: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,255,255,0.14)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.16)",
                      flexShrink: 0,
                    }}
                  >
                    <BookOpen size={isMobile ? 28 : 32} />
                  </div>

                  <Space direction='vertical' size={6} style={{ minWidth: 0 }}>
                    <Text style={{ color: "rgba(255,255,255,0.74)" }}>
                      Detail Mata Pelajaran
                    </Text>
                    <Title
                      level={isMobile ? 4 : 2}
                      style={{ color: "#fff", margin: 0, lineHeight: 1.15 }}
                    >
                      {subject?.name || "Mata Pelajaran"}
                    </Title>
                    <Text
                      style={{ color: "rgba(255,255,255,0.82)", maxWidth: 720 }}
                    >
                      Materi pembelajaran dan laporan belajar disajikan dalam
                      satu workspace yang rapi agar siswa lebih mudah menelusuri
                      progres belajarnya.
                    </Text>
                    <Space size={[8, 8]} wrap>
                      <Tag
                        icon={<Hash size={12} />}
                        style={{
                          marginRight: 0,
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.12)",
                          color: "#fff",
                          borderColor: "rgba(255,255,255,0.18)",
                        }}
                      >
                        {subject?.code || "Tanpa Kode"}
                      </Tag>
                      <Tag
                        icon={<Layers3 size={12} />}
                        style={{
                          marginRight: 0,
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.12)",
                          color: "#fff",
                          borderColor: "rgba(255,255,255,0.18)",
                        }}
                      >
                        {subject?.category_name || "Umum"}
                      </Tag>
                      {subject?.branch_name ? (
                        <Tag
                          icon={<Building2 size={12} />}
                          style={{
                            marginRight: 0,
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.12)",
                            color: "#fff",
                            borderColor: "rgba(255,255,255,0.18)",
                          }}
                        >
                          {subject.branch_name}
                        </Tag>
                      ) : null}
                    </Space>
                  </Space>
                </Space>
              </Flex>
            </Col>

            <Col xs={24} xl={8}>
              <MotionDiv
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  bordered={false}
                  style={{
                    borderRadius: 24,
                    background: "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(10px)",
                  }}
                  styles={{ body: { padding: isMobile ? 16 : 18 } }}
                >
                  <Space
                    direction='vertical'
                    size={10}
                    style={{ width: "100%" }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.74)" }}>
                      Ringkasan akses
                    </Text>
                    <Title
                      level={isMobile ? 5 : 4}
                      style={{ color: "#fff", margin: 0 }}
                    >
                      {subject?.name || "Mapel Aktif"}
                    </Title>
                    <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                      {subject?.class_name
                        ? `Terkait dengan kelas ${subject.class_name}.`
                        : classId
                          ? "Terhubung dengan kelas aktif yang sedang Anda buka."
                          : "Detail kelas belum tersedia pada data ini."}
                    </Text>
                  </Space>
                </Card>
              </MotionDiv>
            </Col>
          </Row>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Row gutter={[16, 16]}>
          {infoCards.map((item) => (
            <Col key={item.key} xs={24} sm={12} xl={8}>
              <Card
                bordered={false}
                style={infoCardStyle}
                styles={{ body: { padding: 18 } }}
              >
                <Flex align='center' justify='space-between' gap={16}>
                  <Space direction='vertical' size={4} style={{ minWidth: 0 }}>
                    <Text type='secondary'>{item.label}</Text>
                    <Title
                      level={isMobile ? 5 : 4}
                      style={{ margin: 0, overflowWrap: "anywhere" }}
                    >
                      {item.value}
                    </Title>
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

      <MotionDiv variants={itemVariants}>
        <Card
          bordered={false}
          style={{
            borderRadius: 26,
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
          }}
          styles={{ body: { padding: isMobile ? 14 : 18 } }}
        >
          <Tabs
            defaultActiveKey='learning'
            items={tabItems}
            tabBarGutter={isMobile ? 8 : 16}
            size={isMobile ? "middle" : "large"}
          />
        </Card>
      </MotionDiv>
    </MotionDiv>
  );
};

export default Detail;
