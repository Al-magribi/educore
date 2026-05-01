import { Card, Flex, Grid, Tabs, Typography, theme } from "antd";
import { motion } from "framer-motion";
import { GraduationCap, ScanSearch, UsersRound } from "lucide-react";
import StudentReport from "./StudentReport";
import TeacherReport from "./TeacherReport";
import { itemVariants } from "../config/configShared";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const AttendanceReport = () => {
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
          color: "#0f766e",
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

  return (
    <MotionDiv variants={itemVariants}>
      <Card
        bordered={false}
        style={{
          borderRadius: token.borderRadiusXL,
          boxShadow: token.boxShadowSecondary,
        }}
        styles={{ body: { padding: isMobile ? 14 : 18 } }}
      >
        <Flex vertical gap={18}>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            gap={12}
          >
            <div>
              <Flex align='center' gap={10} wrap='wrap'>
                <ScanSearch size={18} color='#0f766e' />
                <Text strong style={{ color: "#0f172a", fontSize: 17 }}>
                  Laporan Presensi
                </Text>
              </Flex>
              <Text type='secondary'>
                Pantau rekap harian siswa dan guru dari data absensi RFID yang sudah dievaluasi.
              </Text>
            </div>
          </Flex>

          <Tabs
            defaultActiveKey='students'
            size={isMobile ? "middle" : "large"}
            tabBarGutter={8}
            items={[
              {
                key: "students",
                label: createTabLabel(
                  "Presensi Siswa",
                  <GraduationCap size={16} />,
                  "Harian siswa",
                ),
                children: <StudentReport />,
              },
              {
                key: "teachers",
                label: createTabLabel(
                  "Presensi Guru",
                  <UsersRound size={16} />,
                  "Harian & sesi",
                ),
                children: <TeacherReport />,
              },
            ]}
          />
        </Flex>
      </Card>
    </MotionDiv>
  );
};

export default AttendanceReport;
