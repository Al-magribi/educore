import React from "react";
import {
  Badge,
  Card,
  Col,
  Grid,
  Row,
  Space,
  Tabs,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  BookOpenText,
  Layers2,
  ScrollText,
  Sparkles,
  Waves,
} from "lucide-react";
import {
  useGetJuzListQuery,
  useGetSurahListQuery,
} from "../../../../service/tahfiz/ApiAlquran";
import Surah from "./Surah";
import Juz from "./Juz";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const summaryStyles = [
  {
    label: "Total Surah",
    key: "surah",
    icon: <BookOpenText size={18} />,
    bg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
    color: "#1d4ed8",
  },
  {
    label: "Total Juz",
    key: "juz",
    icon: <Layers2 size={18} />,
    bg: "linear-gradient(135deg, #bfdbfe, #dbeafe)",
    color: "#1e40af",
  },
  {
    label: "Total Ayat",
    key: "ayat",
    icon: <ScrollText size={18} />,
    bg: "linear-gradient(135deg, #e0f2fe, #dbeafe)",
    color: "#0369a1",
  },
];

const Alquran = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const surahQuery = useGetSurahListQuery();
  const juzQuery = useGetJuzListQuery();

  const totalAyat =
    surahQuery.data?.reduce(
      (accumulator, surah) => accumulator + (surah.number_of_verses || 0),
      0,
    ) || 0;

  const summaryItems = [
    { ...summaryStyles[0], value: surahQuery.data?.length || 0 },
    { ...summaryStyles[1], value: juzQuery.data?.length || 0 },
    { ...summaryStyles[2], value: totalAyat },
  ];

  const createTabLabel = (label, icon, caption, count) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          background: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
          color: "#1d4ed8",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>
          {label} <Badge count={count} showZero />
        </span>
        {!isMobile ? (
          <span style={{ fontSize: 12, color: "rgba(100, 116, 139, 0.95)" }}>
            {caption}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <MotionDiv variants={containerVariants} initial='hidden' animate='show'>
      <Space direction='vertical' size={18} style={{ width: "100%" }}>
        <MotionDiv variants={itemVariants}>
          <Card
            style={{
              borderRadius: 26,
              border: "none",
              overflow: "hidden",
              background:
                "radial-gradient(circle at top left, rgba(147,197,253,0.34), transparent 30%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #38bdf8 100%)",
              boxShadow: "0 26px 54px rgba(15, 23, 42, 0.18)",
            }}
            styles={{ body: { padding: screens.md ? 24 : 18 } }}
          >
            <Space direction='vertical' size={8} style={{ color: "#fff" }}>
              <Space size={10} wrap>
                <Space
                  size={6}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.18)",
                  }}
                >
                  <Waves size={14} />
                  <Text style={{ color: "#e0f2fe", fontWeight: 600 }}>
                    Al-Qur&apos;an Workspace
                  </Text>
                </Space>
              </Space>
              <Title
                level={screens.md ? 3 : 4}
                style={{ margin: 0, color: "#fff" }}
              >
                Referensi Al-Qur&apos;an
              </Title>
              <Text style={{ color: "rgba(241,245,249,0.88)", maxWidth: 760 }}>
                Akses data Surah dan Juz dengan tampilan yang lebih fokus,
                cepat dipindai, dan siap untuk operasional harian tim Tahfiz.
              </Text>
            </Space>
          </Card>
        </MotionDiv>

        <Row gutter={[14, 14]}>
          {summaryItems.map((item) => (
            <Col xs={24} md={8} key={item.key}>
              <MotionDiv variants={itemVariants} style={{ height: "100%" }}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 20,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.07)",
                    height: "100%",
                  }}
                  styles={{ body: { padding: 18 } }}
                >
                  <Space
                    align='start'
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Space direction='vertical' size={4}>
                      <Text type='secondary'>{item.label}</Text>
                      <Title level={3} style={{ margin: 0 }}>
                        {item.value}
                      </Title>
                    </Space>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        background: item.bg,
                        color: item.color,
                      }}
                    >
                      {item.icon}
                    </div>
                  </Space>
                </Card>
              </MotionDiv>
            </Col>
          ))}
        </Row>

        <MotionDiv variants={itemVariants}>
          <Card
            style={{
              borderRadius: 24,
              border: "1px solid #e2e8f0",
              boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
            }}
          >
            <Tabs
              defaultActiveKey='surah'
              size={isMobile ? "middle" : "large"}
              tabBarGutter={12}
              tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
              items={[
                {
                  key: "surah",
                  label: createTabLabel(
                    "Surah",
                    <BookOpenText size={16} />,
                    "Daftar surah Al-Qur'an",
                    surahQuery.data?.length || 0,
                  ),
                  children: (
                    <Surah
                      data={surahQuery.data || []}
                      isLoading={surahQuery.isLoading}
                      isFetching={surahQuery.isFetching}
                      isError={surahQuery.isError}
                      refetch={surahQuery.refetch}
                    />
                  ),
                },
                {
                  key: "juz",
                  label: createTabLabel(
                    "Juz",
                    <Layers2 size={16} />,
                    "Rentang dan detail juz",
                    juzQuery.data?.length || 0,
                  ),
                  children: (
                    <Juz
                      data={juzQuery.data || []}
                      isLoading={juzQuery.isLoading}
                      isFetching={juzQuery.isFetching}
                      isError={juzQuery.isError}
                      refetch={juzQuery.refetch}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </MotionDiv>

        {(surahQuery.isFetching || juzQuery.isFetching) &&
        (surahQuery.data?.length || juzQuery.data?.length) ? (
          <MotionDiv variants={itemVariants}>
            <Space size={8}>
              <Sparkles size={14} color='#1d4ed8' />
              <Text type='secondary'>Menyegarkan data Al-Qur&apos;an...</Text>
            </Space>
          </MotionDiv>
        ) : null}
      </Space>
    </MotionDiv>
  );
};

export default Alquran;
