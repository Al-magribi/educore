import React, { Suspense, lazy } from "react";
import { Calendar, Folders, GitBranch, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { Card, Flex, Grid, Tabs, Typography, theme } from "antd";
import { useSelector } from "react-redux";
import { LoadApp } from "../../../components";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
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

  const createLabel = (label, icon) => (
    <Flex align='center' gap={8}>
      <span
        style={{
          width: 28,
          height: 28,
          display: "grid",
          placeItems: "center",
          borderRadius: 10,
          background: "rgba(255,255,255,0.72)",
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Flex>
  );

  const items = [
    {
      key: "periode",
      label: createLabel("Periode", <Calendar size={14} />),
      children: <Periode screens={screens} />,
    },
    user?.unit_level === "SMA / SMK / MA" && {
      key: "major",
      label: createLabel("Jurusan", <GitBranch size={14} />),
      children: <Major screens={screens} />,
    },
    {
      key: "grade",
      label: createLabel("Tingkat", <GraduationCap size={14} />),
      children: <Grade screens={screens} />,
    },
    {
      key: "class",
      label: createLabel("Kelas", <Folders size={14} />),
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
          <Card
            bordered={false}
            style={{
              borderRadius: token.borderRadiusXL,
              overflow: "hidden",
              background:
                "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(248,250,252,0.98))",
              boxShadow: token.boxShadowTertiary,
            }}
            styles={{ body: { padding: isMobile ? 20 : 28 } }}
          >
            <Flex vertical gap={8}>
              <Text
                style={{
                  color: token.colorPrimary,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                }}
              >
                MASTER DATA
              </Text>
              <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                Kelola Data Pokok.
              </Title>
              <Text type='secondary' style={{ maxWidth: 760 }}>
                Kelola periode, jurusan, tingkat, dan kelas.
              </Text>
            </Flex>
          </Card>
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
