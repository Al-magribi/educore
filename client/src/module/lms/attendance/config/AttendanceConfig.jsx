import { useState } from "react";
import { Button, Card, Flex, Grid, Skeleton, Tabs, Typography, theme } from "antd";
import { motion } from "framer-motion";
import {
  BookOpenCheck,
  CalendarClock,
  Cpu,
  Network,
  Settings2,
} from "lucide-react";
import { useGetAttendanceConfigQuery } from "../../../../service/lms/ApiAttendance";
import FeatureSettingsTab from "./tabs/FeatureSettingsTab";
import PolicySettingsTab from "./tabs/PolicySettingsTab";
import DeviceSettingsTab from "./tabs/DeviceSettingsTab";
import AssignmentPolicyTab from "./tabs/AssignmentPolicyTab";
import AttendanceGuideModal from "./AttendanceGuideModal";
import { containerVariants, itemVariants } from "./configShared";
import PageHeader from "../../../../components/ui/PageHeader";

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
        <PageHeader
          title='Konfigurasi Presensi RFID'
          description='Kelola fitur, policy absensi harian, dan perangkat RFID dalam satu workspace.'
          extra={
            <Button
              icon={<BookOpenCheck size={16} />}
              onClick={() => setGuideOpen(true)}
            >
              Panduan Presensi
            </Button>
          }
        />
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Card
          variant="borderless"
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
