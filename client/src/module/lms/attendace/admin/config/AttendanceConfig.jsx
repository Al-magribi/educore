import { useState } from "react";
import { Button, Card, Flex, Grid, Skeleton, Tabs, Typography, theme } from "antd";
import { motion } from "framer-motion";
import {
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  Cpu,
  Network,
  Settings2,
} from "lucide-react";
import { useGetAttendanceConfigQuery } from "../../../../../service/lms/ApiAttendance";
import FeatureSettingsTab from "./tabs/FeatureSettingsTab";
import PolicySettingsTab from "./tabs/PolicySettingsTab";
import DeviceSettingsTab from "./tabs/DeviceSettingsTab";
import AssignmentPolicyTab from "./tabs/AssignmentPolicyTab";
import AttendanceReport from "../report/AttendanceReport";
import AttendanceGuideModal from "./AttendanceGuideModal";
import { containerVariants, itemVariants } from "./configShared";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const AttendanceConfig = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();
  const [guideOpen, setGuideOpen] = useState(false);

  const {
    data: bootstrap,
    isLoading: loadingBootstrap,
    isFetching: fetchingBootstrap,
  } = useGetAttendanceConfigQuery();

  if (loadingBootstrap) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  const featureRows = bootstrap?.data?.features || [];
  const policyRows = bootstrap?.data?.policies || [];
  const deviceRows = bootstrap?.data?.devices || [];
  const classRows = bootstrap?.data?.classes || [];

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
        "Fitur",
        <Settings2 size={16} />,
        "Konfigurasi aktif",
      ),
      key: "fitur",
      children: <FeatureSettingsTab featureRows={featureRows} />,
    },
    {
      label: createTabLabel(
        "Policy",
        <CalendarClock size={16} />,
        "Aturan absensi",
      ),
      key: "policy",
      children: (
        <PolicySettingsTab
          fallbackPolicies={policyRows}
          loadingFallback={fetchingBootstrap}
        />
      ),
    },
    {
      label: createTabLabel("Device RFID", <Cpu size={16} />, "Manajemen alat"),
      key: "device",
      children: (
        <DeviceSettingsTab
          fallbackDevices={deviceRows}
          classRows={classRows}
          loadingFallback={fetchingBootstrap}
        />
      ),
    },
    {
      label: createTabLabel(
        "Assignment",
        <Network size={16} />,
        "Pemetaan policy",
      ),
      key: "assignment",
      children: <AssignmentPolicyTab />,
    },
    {
      label: createTabLabel(
        "Laporan",
        <ClipboardList size={16} />,
        "Presensi siswa & guru",
      ),
      key: "report",
      children: <AttendanceReport />,
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
        gap: 20,
        padding: isMobile ? 0 : "0 4px 12px",
      }}
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
                  <CalendarClock size={16} />
                  <span>PRESENSI RFID</span>
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
                Konfigurasi Presensi RFID
              </Title>

              <Text
                style={{
                  maxWidth: 680,
                  color: "rgba(240,249,255,0.88)",
                  fontSize: isMobile ? 14 : 15,
                }}
              >
                Kelola fitur, policy absensi harian, dan perangkat RFID dalam
                satu workspace terintegrasi.
              </Text>
            </Flex>

            <Button
              type='default'
              size='large'
              icon={<BookOpenCheck size={16} />}
              onClick={() => setGuideOpen(true)}
              style={{
                alignSelf: isMobile ? "stretch" : "center",
                height: 48,
                borderRadius: 14,
                fontWeight: 600,
                background: "rgba(255,255,255,0.95)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#0f766e",
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)",
              }}
            >
              Panduan Presensi
            </Button>
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
            defaultActiveKey='fitur'
            size={isMobile ? "middle" : "large"}
            tabBarGutter={8}
            tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
          />
        </Card>
      </MotionDiv>

      <AttendanceGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </MotionDiv>
  );
};

export default AttendanceConfig;
