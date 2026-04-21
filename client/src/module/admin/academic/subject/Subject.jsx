import React from "react";
import { motion } from "framer-motion";
import { Typography, Tabs, Card, Flex, Grid, Statistic } from "antd";
import {
  BookOpen,
  GitBranch,
  Layers,
  LibraryBig,
  Sparkles,
} from "lucide-react";
import CategoryPanel from "./CategoryPanel";
import BranchPanel from "./BranchPanel";
import SubjectTable from "./SubjectTable";
import {
  useGetSubjectCategoriesQuery,
  useGetSubjectBranchesQuery,
  useGetSubjectsQuery,
} from "../../../../service/academic/ApiSubject";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", staggerChildren: 0.08 },
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

const Subject = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;
  const { data: categoriesData } = useGetSubjectCategoriesQuery();
  const { data: branchesData } = useGetSubjectBranchesQuery(null);
  const { data: subjectsData } = useGetSubjectsQuery({
    page: 1,
    limit: 1,
    search: "",
    branch_id: "",
    category_id: "",
  });

  const summaryCards = [
    {
      key: "categories",
      title: "Kategori",
      value: categoriesData?.data?.length || 0,
      icon: <Layers size={18} />,
      tint: "linear-gradient(135deg, #fef3c7, #ffedd5)",
      color: "#b45309",
    },
    {
      key: "branches",
      title: "Cabang",
      value: branchesData?.data?.length || 0,
      icon: <GitBranch size={18} />,
      tint: "linear-gradient(135deg, #ccfbf1, #dbeafe)",
      color: "#0f766e",
    },
    {
      key: "subjects",
      title: "Mata Pelajaran",
      value: subjectsData?.total || subjectsData?.data?.length || 0,
      icon: <BookOpen size={18} />,
      tint: "linear-gradient(135deg, #ede9fe, #dbeafe)",
      color: "#4338ca",
    },
  ];

  const createTabLabel = (label, icon, caption) => (
    <Flex align='center' gap={10}>
      <span
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          background: "linear-gradient(135deg, #ecfeff, #eef2ff)",
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
          <span style={{ fontSize: 12, color: "rgba(15, 23, 42, 0.56)" }}>
            {caption}
          </span>
        )}
      </Flex>
    </Flex>
  );

  const items = [
    {
      key: "1",
      label: createTabLabel(
        "Kategori Mapel",
        <Layers size={16} />,
        "Pengelompokan utama",
      ),
      children: <CategoryPanel screens={activeScreens} />,
    },
    {
      key: "2",
      label: createTabLabel(
        "Cabang Mapel",
        <GitBranch size={16} />,
        "Turunan per kategori",
      ),
      children: <BranchPanel screens={activeScreens} />,
    },
    {
      key: "3",
      label: createTabLabel(
        "Mata Pelajaran",
        <BookOpen size={16} />,
        "Daftar mapel aktif",
      ),
      children: <SubjectTable screens={activeScreens} />,
    },
  ];

  return (
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
            borderRadius: 24,
            overflow: "hidden",
            background:
              "linear-gradient(135deg, rgba(236,253,245,0.98), rgba(239,246,255,0.98))",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
          }}
          styles={{ body: { padding: isMobile ? 18 : 24 } }}
        >
          <Flex
            justify='space-between'
            align={activeScreens.md ? "center" : "stretch"}
            vertical={!activeScreens.md}
            gap={16}
          >
            <div>
              <Flex
                align='center'
                gap={10}
                wrap='wrap'
                style={{ marginBottom: 8 }}
              >
                <Text
                  style={{
                    color: "#047857",
                    fontWeight: 700,
                    letterSpacing: 0.4,
                  }}
                >
                  DIREKTORI KURIKULUM
                </Text>
                <Flex
                  align='center'
                  gap={6}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(16, 185, 129, 0.10)",
                    color: "#047857",
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={14} />
                  <span>Akademik terstruktur</span>
                </Flex>
              </Flex>
              <Title level={4} style={{ margin: "0 0 4px" }}>
                Kelola kategori, cabang, dan mapel
              </Title>
              <Text type='secondary' style={{ maxWidth: 760 }}>
                Gunakan tab untuk berpindah antar modul kurikulum.
              </Text>
            </div>

            {!isMobile && (
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 20,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, #10b981, #0ea5e9)",
                  color: "#fff",
                  boxShadow: "0 18px 32px rgba(14, 165, 233, 0.24)",
                }}
              >
                <LibraryBig size={24} />
              </div>
            )}
          </Flex>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Flex gap={16} wrap='wrap'>
          {summaryCards.map((item) => (
            <MotionDiv
              key={item.key}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.18 }}
              style={{
                flex: activeScreens.md ? "1 1 0" : "1 1 100%",
                minWidth: activeScreens.md ? 0 : "100%",
              }}
            >
              <Card
                hoverable
                style={{
                  borderRadius: 22,
                  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
                }}
                styles={{ body: { padding: "18px 20px" } }}
              >
                <Flex justify='space-between' align='start'>
                  <Statistic title={item.title} value={item.value} />
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 14,
                      background: item.tint,
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                </Flex>
              </Card>
            </MotionDiv>
          ))}
        </Flex>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Card
          bordered={false}
          style={{
            borderRadius: 24,
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: activeScreens.md ? 20 : 16 } }}
        >
          <Tabs
            defaultActiveKey='1'
            items={items}
            size={isMobile ? "middle" : "large"}
            tabBarGutter={12}
            tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
          />
        </Card>
      </MotionDiv>
    </MotionDiv>
  );
};

export default Subject;
