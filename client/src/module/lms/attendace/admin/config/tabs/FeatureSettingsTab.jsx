import { Flex, Grid, Tabs, Typography, theme } from "antd";
import { motion } from "framer-motion";
import { CalendarClock, CalendarDays, MessageCircle, Settings2 } from "lucide-react";
import { itemVariants } from "../configShared";
import AttendanceFeaturePanel from "./AttendanceFeaturePanel";
import HolidayCalendarTab from "./HolidayCalendarTab";
import WhatsappFeatureTab from "./WhatsappFeatureTab";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const FeatureSettingsTab = ({ featureRows = [] }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();

  const createTabLabel = (label, icon, caption) => (
    <Flex align="center" gap={10}>
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
      <Flex vertical gap={18}>
        <Flex
          justify="space-between"
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          gap={12}
        >
          <div>
            <Flex align="center" gap={10} wrap="wrap">
              <Settings2 size={18} color="#0f766e" />
              <Text strong style={{ color: "#0f172a", fontSize: 17 }}>
                Pengaturan Fitur
              </Text>
            </Flex>
            <Text type="secondary">
              Kelola toggle absensi, notifikasi WhatsApp ke orang tua, dan kalender libur sekolah.
            </Text>
          </div>
        </Flex>

        <Tabs
          defaultActiveKey="attendance"
          size={isMobile ? "middle" : "large"}
          tabBarGutter={8}
          destroyOnHidden={false}
          items={[
            {
              key: "attendance",
              label: createTabLabel(
                "Fitur Absensi",
                <CalendarClock size={16} />,
                "Toggle modul absensi",
              ),
              children: <AttendanceFeaturePanel featureRows={featureRows} />,
            },
            {
              key: "whatsapp",
              label: createTabLabel(
                "Fitur WhatsApp",
                <MessageCircle size={16} />,
                "Notifikasi ke orang tua",
              ),
              children: <WhatsappFeatureTab />,
            },
            {
              key: "holiday",
              label: createTabLabel(
                "Kalender Libur",
                <CalendarDays size={16} />,
                "Libur & akhir pekan",
              ),
              children: <HolidayCalendarTab />,
            },
          ]}
        />
      </Flex>
    </MotionDiv>
  );
};

export default FeatureSettingsTab;
