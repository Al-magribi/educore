import React from "react";
import { Button, Card, Flex, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { Plus, ShieldCheck, Sparkles, Target } from "lucide-react";

const { Title, Text } = Typography;

const heroStyle = {
  borderRadius: 28,
  overflow: "hidden",
  border: "1px solid rgba(191, 219, 254, 0.76)",
  background:
    "radial-gradient(circle at top right, rgba(250, 204, 21, 0.18), transparent 28%), radial-gradient(circle at left center, rgba(125, 211, 252, 0.24), transparent 34%), linear-gradient(135deg, #0f172a 0%, #0f3d8f 48%, #0369a1 100%)",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
};

const panelStyle = {
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.08)",
  boxShadow: "none",
};

const iconWrapStyle = {
  width: 54,
  height: 54,
  borderRadius: 18,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.14)",
};

const PointAdminHero = ({ isMobile, activePeriode, pointConfig, onCreate }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.36 }}
  >
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
        gap={20}
      >
        <Flex vertical gap={16} style={{ maxWidth: 760 }}>
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
              Point Governance
            </Tag>
            <Tag
              style={{
                margin: 0,
                borderRadius: 999,
                paddingInline: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.08)",
                color: "#dbeafe",
              }}
            >
              {activePeriode?.name || "Periode belum aktif"}
            </Tag>
          </Space>

          <Flex align='center' gap={16}>
            <span style={iconWrapStyle}>
              <Target size={26} />
            </span>
            <div>
              <Title
                level={isMobile ? 3 : 2}
                style={{ margin: 0, color: "#fff", lineHeight: 1.15 }}
              >
                Kelola Poin Peraturan
              </Title>
              <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 15 }}>
                Susun Poin Prestasi dan Pelanggaran untuk membentuk budaya
                positif di lingkungan sekolah.
              </Text>
            </div>
          </Flex>
        </Flex>

        <Button
          type='primary'
          size='large'
          icon={<Plus size={16} />}
          onClick={onCreate}
          style={{
            borderRadius: 14,
            height: 46,
            background: "#f8fafc",
            color: "#0f172a",
            borderColor: "transparent",
            fontWeight: 700,
            boxShadow: "0 12px 24px rgba(15,23,42,0.12)",
          }}
        >
          Tambah Rule Baru
        </Button>
      </Flex>
    </Card>
  </motion.div>
);

export default PointAdminHero;
