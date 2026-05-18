import { Button, Card, Flex, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { Plus, ReceiptText, Sparkles } from "lucide-react";

import { cardStyle } from "../constants";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const OthersHeader = ({ onOpenType }) => (
  <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
    <Card
      style={{
        ...cardStyle,
        overflow: "hidden",
        position: "relative",
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.24), transparent 28%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #0f766e 55%, #38bdf8 100%)",
        border: "none",
        boxShadow: "0 24px 54px rgba(15, 23, 42, 0.18)",
      }}
      styles={{ body: { padding: 24 } }}
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
        align='center'
        wrap='wrap'
        gap={16}
        style={{ position: "relative" }}
      >
        <Space direction='vertical' size={8}>
          <Flex align='center' gap={10} wrap='wrap'>
            <Tag
              color='cyan'
              style={{
                width: "fit-content",
                margin: 0,
                borderRadius: 999,
                paddingInline: 12,
                fontWeight: 600,
              }}
            >
              Finance / Pembayaran Lainnya
            </Tag>
            <Flex
              align='center'
              gap={6}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.16)",
                color: "#e0f2fe",
                fontWeight: 600,
              }}
            >
              <Sparkles size={14} />
              <span>Non-SPP billing workspace</span>
            </Flex>
          </Flex>
          <Flex align='center' gap={12}>
            <div
              style={{
                width: 54,
                height: 54,
                display: "grid",
                placeItems: "center",
                borderRadius: 18,
                background: "rgba(255,255,255,0.14)",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <ReceiptText size={24} />
            </div>
            <div>
              <Title level={3} style={{ color: "#fff", margin: 0 }}>
                Pengelolaan Tagihan Non-SPP
              </Title>
              <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                Kelola jenis biaya dan tagihannya di halaman ini. Input
                pembayaran dipusatkan agar monitoring tagihan non-SPP rapi dan
                mudah diikuti.
              </Text>
            </div>
          </Flex>
        </Space>
        <Button
          type='primary'
          icon={<Plus size={16} />}
          onClick={onOpenType}
          size='large'
          style={{
            borderRadius: 14,
            height: 46,
            background: "#fff",
            color: "#0f172a",
            border: "none",
            fontWeight: 600,
            boxShadow: "0 12px 24px rgba(255,255,255,0.18)",
          }}
        >
          Atur Jenis Biaya
        </Button>
      </Flex>
    </Card>
  </MotionDiv>
);

export default OthersHeader;
