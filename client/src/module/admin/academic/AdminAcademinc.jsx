import React, { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Briefcase,
  SquareUser,
  Users,
} from "lucide-react";
import { Card, Flex, Grid, Tabs, theme } from "antd";
import PageHeader from "../../../components/ui/PageHeader";
import { LoadApp } from "../../../components";

const Subject = lazy(() => import("./subject/Subject"));
const Teacher = lazy(() => import("./teacher/Teacher"));
const Staff = lazy(() => import("./staff/Staff"));
const StudentPage = lazy(() => import("./student/StudentPage"));

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

const AdminAcademinc = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();

  const createTabLabel = (label, icon, caption) => (
    <Flex align='center' gap={10}>
      <span
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          background: "linear-gradient(135deg, #e0f2fe, #dcfce7)",
          color: "#0369a1",
          border: "1px solid rgba(148, 163, 184, 0.14)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <Flex vertical gap={0}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
        {!isMobile && (
          <span
            style={{
              fontSize: 12,
              color: token.colorTextSecondary,
              lineHeight: 1.2,
            }}
          >
            {caption}
          </span>
        )}
      </Flex>
    </Flex>
  );

  const items = [
    {
      label: createTabLabel(
        "Mata Pelajaran",
        <BookOpen size={16} />,
        "Kurikulum & mapel",
      ),
      key: "subject",
      children: <Subject screens={screens} />,
    },
    {
      label: createTabLabel(
        "Guru",
        <SquareUser size={16} />,
        "Tenaga pengajar",
      ),
      key: "teacher",
      children: <Teacher screens={screens} />,
    },
    {
      label: createTabLabel(
        "Tendik",
        <Briefcase size={16} />,
        "Tenaga kependidikan",
      ),
      key: "staff",
      children: <Staff />,
    },
    {
      label: createTabLabel("Siswa", <Users size={16} />, "Peserta didik"),
      key: "student",
      children: <StudentPage screens={screens} />,
    },
  ];

  return (
    <Suspense fallback={<LoadApp />}>
      <MotionDiv
        variants={containerVariants}
        initial='hidden'
        animate='visible'
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <MotionDiv variants={itemVariants}>
          <PageHeader
            title='Manajemen Pendidikan'
            description='Atur mata pelajaran, data guru, data tendik, dan data siswa.'
          />
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Card
            bordered={false}
            style={{
              borderRadius: token.borderRadiusXL,
              boxShadow: token.boxShadowSecondary,
            }}
            styles={{ body: { padding: isMobile ? 12 : 16 } }}
          >
            <Tabs
              items={items}
              defaultActiveKey='subject'
              size={isMobile ? "middle" : "large"}
              tabBarGutter={12}
              tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
            />
          </Card>
        </MotionDiv>
      </MotionDiv>
    </Suspense>
  );
};

export default AdminAcademinc;
