import { Card, Col, Flex, Row, Space, Statistic, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { Building2, CalendarRange, TrendingUp } from "lucide-react";

import { cardBaseStyle, currency, heroIcon as Landmark } from "./constants";

const { Title, Text, Paragraph } = Typography;
const MotionDiv = motion.div;

const FinanceDashboardHero = ({ meta, summary, spp, others, isMobile }) => {
  const activeScope = meta?.active_scope || [];
  const isMultiUnit = meta?.scope_type === "all_units";

  return (
    <Card
      variant='borderless'
      style={{
        ...cardBaseStyle,
        overflow: "hidden",
        position: "relative",
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.24), transparent 28%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0f766e 100%)",
        boxShadow: "0 26px 54px rgba(15, 23, 42, 0.18)",
      }}
      styles={{ body: { padding: isMobile ? 18 : 24 } }}
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
      <Row gutter={[20, 20]} style={{ position: "relative" }}>
        <Col xs={24} xl={15}>
          <Space vertical size={14} style={{ width: "100%" }}>
            <Flex align='center' gap={10} wrap='wrap'>
              <Tag color='cyan' style={{ borderRadius: 999, fontWeight: 600 }}>
                Dashboard Admin Keuangan
              </Tag>
              <Tag
                color='geekblue'
                style={{ borderRadius: 999, fontWeight: 600 }}
              >
                Bulan berjalan: {meta?.current_month_label || "-"}
              </Tag>

              <Tag color='lime' style={{ borderRadius: 999, fontWeight: 600 }}>
                Collection rate SPP: {spp?.collection_rate_current_month || 0}%
              </Tag>

              {isMultiUnit ? (
                <Tag
                  color='purple'
                  style={{ borderRadius: 999, fontWeight: 600 }}
                >
                  Satuan aktif: {activeScope.length || 0}
                </Tag>
              ) : null}
            </Flex>
            <Title
              level={isMobile ? 3 : 2}
              style={{ color: "#fff", margin: 0, lineHeight: 1.12 }}
            >
              Ringkasan keuangan sekolah
            </Title>
            <Paragraph
              style={{
                color: "rgba(255,255,255,.82)",
                margin: 0,
                maxWidth: 720,
              }}
            >
              {isMultiUnit
                ? `Menampilkan seluruh satuan dengan periode aktif masing-masing. Total satuan aktif saat ini ${activeScope.length || 0}`
                : `Periode aktif: ${meta?.active_periode?.periode_name || meta?.active_periode?.name || "-"}. Pantau pemasukan SPP, pembayaran lainnya, tabungan siswa, dan kas kelas dari satu panel kerja yang lebih fokus.`}
            </Paragraph>
          </Space>
        </Col>
        <Col xs={24} xl={9}>
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.3 }}
          >
            <Card
              variant='borderless'
              style={{
                borderRadius: 24,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(10px)",
              }}
              styles={{ body: { padding: 20 } }}
            >
              <Space vertical size={16} style={{ width: "100%" }}>
                <Statistic
                  title={
                    <span style={{ color: "rgba(255,255,255,.72)" }}>
                      Pendapatan sekolah
                    </span>
                  }
                  value={summary?.school_revenue || 0}
                  formatter={(value) => (
                    <span style={{ color: "#fff" }}>{currency(value)}</span>
                  )}
                  prefix={<Landmark size={20} color='#fff' />}
                />
              </Space>
            </Card>
          </MotionDiv>
        </Col>
      </Row>
    </Card>
  );
};

export default FinanceDashboardHero;
