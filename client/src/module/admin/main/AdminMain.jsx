import React, { Suspense, lazy } from "react";
import {
  Calendar,
  Folders,
  GitBranch,
  GraduationCap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, Flex, Grid, Tabs, theme } from "antd";
import PageHeader from "../../../components/ui/PageHeader";
import { useSelector } from "react-redux";
import { LoadApp } from "../../../components";

const { useBreakpoint } = Grid;
const Periode = lazy(() => import("./periode/Periode"));
const Major = lazy(() => import("./major/Major"));
const Grade = lazy(() => import("./grade/Grade"));
const Classes = lazy(() => import("./classes/Classes"));
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

const AdminMain = () => {
  const { user } = useSelector((state) => state.auth);
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const createTabLabel = (label, icon, caption) => (
    <Flex align='center' gap={10}>
      <span
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          background: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
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
      key: "periode",
      label: createTabLabel("Periode", <Calendar size={16} />, "Tahun ajaran"),
      children: <Periode screens={screens} />,
    },
    user?.unit_level === "SMA / SMK / MA" && {
      key: "major",
      label: createTabLabel(
        "Jurusan",
        <GitBranch size={16} />,
        "Program studi",
      ),
      children: <Major screens={screens} />,
    },
    {
      key: "grade",
      label: createTabLabel(
        "Tingkat",
        <GraduationCap size={16} />,
        "Level jenjang",
      ),
      children: <Grade screens={screens} />,
    },
    {
      key: "class",
      label: createTabLabel(
        "Kelas",
        <Folders size={16} />,
        "Rombongan belajar",
      ),
      children: <Classes screens={screens} />,
    },
  ].filter(Boolean);

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
            title='Data Pokok'
            description='Semua pengaturan inti seperti periode, jurusan, tingkat, dan kelas disusun dalam satu workspace agar administrasi lebih fokus dan mudah dipantau.'
          />
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Card
            variant='borderless'
            style={{
              borderRadius: token.borderRadiusXL,
              boxShadow: token.boxShadowSecondary,
            }}
            styles={{ body: { padding: isMobile ? 12 : 16 } }}
          >
            <Tabs
              items={items}
              defaultActiveKey='periode'
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

export default AdminMain;
