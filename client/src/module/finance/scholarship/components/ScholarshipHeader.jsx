import { Button, Card, Flex, Grid, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { FundOutlined } from "@ant-design/icons";
import { Plus, Sparkles } from "lucide-react";

import { cardStyle } from "../constants";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const ScholarshipHeader = ({ onCreate }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        style={{
          ...cardStyle,
          overflow: "hidden",
          position: "relative",
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.24), transparent 28%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)",
          border: "none",
          boxShadow: "0 24px 54px rgba(15, 23, 42, 0.18)",
        }}
        styles={{ body: { padding: isMobile ? 16 : 24 } }}
      >
        <Flex
          justify="space-between"
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          wrap="wrap"
          gap={16}
          style={{ position: "relative" }}
        >
          <Space direction="vertical" size={8} style={{ minWidth: 0, flex: 1 }}>
            <Flex align="center" gap={10} wrap="wrap">
              <Tag
                color="blue"
                style={{
                  width: "fit-content",
                  margin: 0,
                  borderRadius: 999,
                  paddingInline: 12,
                  fontWeight: 600,
                }}
              >
                Finance / Beasiswa
              </Tag>
              <Flex
                align="center"
                gap={6}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  color: "#e0f2fe",
                  fontWeight: 600,
                  fontSize: isMobile ? 12 : 14,
                }}
              >
                <Sparkles size={14} />
                <span>Potongan SPP & biaya lainnya</span>
              </Flex>
            </Flex>
            <Flex align="center" gap={12}>
              <div
                style={{
                  width: isMobile ? 44 : 54,
                  height: isMobile ? 44 : 54,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  flexShrink: 0,
                  fontSize: isMobile ? 20 : 24,
                }}
              >
                <FundOutlined />
              </div>
              <div style={{ minWidth: 0 }}>
                <Title
                  level={isMobile ? 4 : 3}
                  style={{ color: "#fff", margin: 0, lineHeight: 1.25 }}
                >
                  Pengelolaan Beasiswa
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.78)" }}>
                  Buat beasiswa, tentukan potongan, lalu pilih penerima siswa.
                </Text>
              </div>
            </Flex>
          </Space>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={onCreate}
            size="large"
            block={isMobile}
            style={{
              height: isMobile ? 42 : 46,
              borderRadius: 14,
              fontWeight: 600,
              background: "#fff",
              color: "#1d4ed8",
              border: "none",
            }}
          >
            Tambah Beasiswa
          </Button>
        </Flex>
      </Card>
    </MotionDiv>
  );
};

export default ScholarshipHeader;
