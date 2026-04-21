import React, { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  SquareUser,
  Users,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Card, Flex, Grid, Tabs, Typography, theme } from "antd";
import { LoadApp } from "../../../components";

const Subject = lazy(() => import("./subject/Subject"));
const Teacher = lazy(() => import("./teacher/Teacher"));
const StudentPage = lazy(() => import("./student/StudentPage"));

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
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
          <Card
            bordered={false}
            style={{
              borderRadius: token.borderRadiusXL,
              overflow: "hidden",
              position: "relative",
              background:
                "radial-gradient(circle at top left, rgba(125,211,252,0.24), transparent 26%), linear-gradient(135deg, #0f172a 0%, #0f766e 48%, #22c55e 100%)",
              boxShadow: "0 24px 50px rgba(15, 23, 42, 0.18)",
            }}
            styles={{ body: { padding: isMobile ? 20 : 26 } }}
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
              gap={16}
              style={{ position: "relative" }}
            >
              <Flex vertical gap={10} style={{ maxWidth: 740, flex: 1 }}>
                <Flex align='center' gap={10} wrap='wrap'>
                  <Flex
                    align='center'
                    gap={8}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      color: "#ecfeff",
                      fontWeight: 700,
                      letterSpacing: 0.4,
                    }}
                  >
                    <GraduationCap size={16} />
                    <span>AKADEMIK</span>
                  </Flex>

                  <Flex
                    align='center'
                    gap={6}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 999,
                      background: "rgba(15,23,42,0.18)",
                      color: "#dcfce7",
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Guru, siswa, dan mapel</span>
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
                  Kelola Ekosistem Akademik
                </Title>

                <Text
                  style={{
                    maxWidth: 680,
                    color: "rgba(240,249,255,0.88)",
                    fontSize: isMobile ? 14 : 15,
                  }}
                >
                  Atur mata pelajaran, data guru, dan data siswa.
                </Text>
              </Flex>

              {!isMobile && (
                <Card
                  bordered={false}
                  style={{
                    minWidth: 250,
                    borderRadius: 22,
                    background: "rgba(15, 23, 42, 0.18)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    backdropFilter: "blur(8px)",
                  }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Flex vertical gap={10}>
                    <Text
                      style={{
                        color: "#d1fae5",
                        fontWeight: 700,
                        letterSpacing: 0.3,
                      }}
                    >
                      Modul Aktif
                    </Text>
                    {[
                      "Mata pelajaran & struktur ajar",
                      "Guru & distribusi pengajar",
                      "Siswa & administrasi akademik",
                    ].map((item) => (
                      <div
                        key={item}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.10)",
                          color: "#f8fafc",
                          fontSize: 14,
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </Flex>
                </Card>
              )}
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
