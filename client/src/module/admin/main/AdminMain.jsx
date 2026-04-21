import React, { Suspense, lazy } from "react";
import {
  Calendar,
  Folders,
  GitBranch,
  GraduationCap,
  Database,
  Sparkles,
  ChevronRight,
} from "lucide-react";
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
            variant='borderless'
            style={{
              borderRadius: token.borderRadiusXL,
              overflow: "hidden",
              background:
                "radial-gradient(circle at top left, rgba(56,189,248,0.28), transparent 28%), radial-gradient(circle at right center, rgba(255,255,255,0.16), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #38bdf8 100%)",
              boxShadow: "0 26px 54px rgba(15, 23, 42, 0.20)",
              position: "relative",
            }}
            styles={{ body: { padding: isMobile ? 20 : 28 } }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)",
                pointerEvents: "none",
              }}
            />

            <Flex
              justify='space-between'
              align={isMobile ? "stretch" : "center"}
              vertical={isMobile}
              gap={isMobile ? 16 : 18}
              style={{ position: "relative" }}
            >
              <Flex vertical gap={10} style={{ maxWidth: 760, flex: 1 }}>
                <Flex align='center' gap={10} wrap='wrap'>
                  <Flex
                    align='center'
                    gap={8}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      color: "#e0f2fe",
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    <Database size={16} />
                    <span>MASTER DATA</span>
                  </Flex>

                  <Flex
                    align='center'
                    gap={6}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 999,
                      background: "rgba(15,23,42,0.18)",
                      color: "#dbeafe",
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Pusat Pengelolaan Akademik</span>
                  </Flex>
                </Flex>

                <Title
                  level={isMobile ? 3 : 2}
                  style={{
                    margin: 0,
                    color: "#f8fafc",
                    lineHeight: 1.15,
                  }}
                >
                  Kelola data pokok lebih cepat, rapi, dan konsisten.
                </Title>

                <Text
                  style={{
                    maxWidth: 640,
                    color: "rgba(241,245,249,0.84)",
                    fontSize: isMobile ? 14 : 15,
                  }}
                >
                  Semua pengaturan inti seperti periode, jurusan, tingkat, dan
                  kelas disusun dalam satu workspace agar administrasi lebih
                  fokus dan mudah dipantau.
                </Text>
              </Flex>

              <Flex
                vertical
                gap={10}
                style={{
                  display: isMobile ? "none" : "flex",
                  minWidth: isMobile ? "100%" : 260,
                  maxWidth: isMobile ? "100%" : 280,
                  padding: isMobile ? 14 : 16,
                  borderRadius: 20,
                  background: "rgba(15, 23, 42, 0.18)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Text
                  style={{
                    color: "#e0f2fe",
                    fontWeight: 700,
                    letterSpacing: 0.3,
                  }}
                >
                  Area Yang Dikelola
                </Text>

                <Flex vertical gap={10}>
                  {["Periode Akademik", "Jurusan & Program", "Tingkat & Kelas"].map(
                    (item) => (
                      <Flex
                        key={item}
                        justify='space-between'
                        align='center'
                        style={{
                          padding: isMobile ? "9px 11px" : "10px 12px",
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.10)",
                          color: "#f8fafc",
                          fontSize: isMobile ? 13 : 14,
                        }}
                      >
                        <span>{item}</span>
                        <ChevronRight size={16} color='rgba(248,250,252,0.88)' />
                      </Flex>
                    ),
                  )}
                </Flex>
              </Flex>
            </Flex>
          </Card>
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
