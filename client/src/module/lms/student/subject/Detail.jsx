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
import PageHeader from "../../../../components/ui/PageHeader";
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
        <Flex vertical gap={8}>
          <Button
            type='link'
            icon={<ArrowLeft size={16} />}
            onClick={onBack}
            style={{ width: "fit-content", paddingInline: 0 }}
          >
            Kembali ke daftar
          </Button>
          <PageHeader
            title={subject?.name || "Mata Pelajaran"}
            description='Materi pembelajaran dan laporan belajar disajikan dalam satu workspace.'
            meta={
              <Flex gap={8} wrap='wrap'>
                <Tag>{subject?.code || "Tanpa Kode"}</Tag>
                <Tag>{subject?.category_name || "Umum"}</Tag>
                {subject?.branch_name ? <Tag>{subject.branch_name}</Tag> : null}
                <Tag>
                  {subject?.class_name
                    ? `Kelas ${subject.class_name}`
                    : classId
                      ? "Kelas aktif"
                      : "Kelas belum tersedia"}
                </Tag>
              </Flex>
            }
          />
        </Flex>
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
