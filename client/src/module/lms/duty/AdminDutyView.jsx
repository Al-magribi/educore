import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Card, Flex, Grid, Space, Tabs, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { ClipboardList, FileText } from "lucide-react";
import AdminDutyAssignmentTab from "./AdminDutyAssignmentTab";
import AdminDutyReportTab from "./AdminDutyReportTab";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const heroStyle = {
  borderRadius: 28,
  overflow: "hidden",
  border: "1px solid rgba(191, 219, 254, 0.7)",
  background:
    "radial-gradient(circle at top right, rgba(125, 211, 252, 0.35), transparent 30%), linear-gradient(135deg, #0f172a 0%, #0f3d8f 52%, #38bdf8 100%)",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)",
};

const statCardStyle = {
  height: "100%",
  borderRadius: 22,
  border: "1px solid #dbe7f3",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
};

const tabsCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const iconWrapStyle = (background) => ({
  width: 46,
  height: 46,
  borderRadius: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background,
  color: "#fff",
  flexShrink: 0,
});

const AdminDutyView = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [activeTab, setActiveTab] = useState("assignments");

  const selectedDateLabel = useMemo(
    () => selectedDate.format("DD MMMM YYYY"),
    [selectedDate],
  );

  const viewSummary = {
    assignments: {
      title: "Jadwal Mingguan",
      description:
        "Atur guru piket Senin–Jumat sekali saja. Jadwal berulang setiap minggu dan bisa diubah kapan saja.",
      badge: "Operasional",
    },
    reports: {
      title: "Monitoring Laporan",
      description:
        "Tinjau rekap siswa, guru, aktivitas kelas, dan catatan harian dalam satu area kerja.",
      badge: "Pengawasan",
    },
  };

  const tabItems = [
    {
      key: "assignments",
      label: (
        <Space size={8}>
          <ClipboardList size={15} />
          Penugasan
        </Space>
      ),
      children: (
        <motion.div
          key='admin-duty-assignments'
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <AdminDutyAssignmentTab />
        </motion.div>
      ),
    },
    {
      key: "reports",
      label: (
        <Space size={8}>
          <FileText size={15} />
          Laporan
        </Space>
      ),
      children: (
        <motion.div
          key='admin-duty-reports'
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <AdminDutyReportTab
            selectedDate={selectedDate}
            onChangeDate={setSelectedDate}
          />
        </motion.div>
      ),
    },
  ];

  return (
    <motion.div
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
      <motion.div variants={itemVariants}>
        <Card
          variant='borderless'
          style={{
            ...heroStyle,
            borderRadius: isMobile ? 22 : 28,
          }}
          styles={{ body: { padding: isMobile ? 20 : 28 } }}
        >
          <Flex
            vertical={isMobile}
            justify='space-between'
            align={isMobile ? "flex-start" : "center"}
            gap={18}
          >
            <Flex vertical gap={14} style={{ maxWidth: 720 }}>
              <Space size={[10, 10]} wrap>
                <Tag
                  style={{
                    margin: 0,
                    borderRadius: 999,
                    paddingInline: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                  }}
                >
                  Duty Management
                </Tag>
                <Tag
                  style={{
                    margin: 0,
                    borderRadius: 999,
                    paddingInline: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.08)",
                    color: "#dbeafe",
                  }}
                >
                  {selectedDateLabel}
                </Tag>
              </Space>

              <Title
                level={isMobile ? 3 : 2}
                style={{ margin: 0, color: "#fff", lineHeight: 1.15 }}
              >
                Kelola Piket Guru
              </Title>
            </Flex>
          </Flex>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          style={tabsCardStyle}
          styles={{
            body: {
              padding: isMobile ? 16 : 20,
            },
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size={isMobile ? "middle" : "large"}
            tabBarGutter={8}
            animated
          />
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default AdminDutyView;
