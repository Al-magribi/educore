import { Card, Flex, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { CreditCard, ShieldCheck, Sparkles } from "lucide-react";

const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const ParentTransactionHero = ({ student, summary }) => (
  <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <Card
      variant='borderless'
      style={{
        overflow: "hidden",
        position: "relative",
        borderRadius: 28,
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 28%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0f766e 100%)",
        boxShadow: "0 24px 56px rgba(15, 23, 42, 0.18)",
      }}
      styles={{ body: { padding: 28 } }}
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
        align='flex-start'
        justify='space-between'
        gap={20}
        wrap='wrap'
        style={{ position: "relative" }}
      >
        <Space direction='vertical' size={12} style={{ maxWidth: 760 }}>
          <Flex align='center' gap={10} wrap='wrap'>
            <Tag
              color='cyan'
              style={{
                width: "fit-content",
                margin: 0,
                borderRadius: 999,
                paddingInline: 12,
                fontWeight: 700,
              }}
            >
              Portal Pembayaran Orang Tua
            </Tag>
            <Flex
              align='center'
              gap={6}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.16)",
                color: "#dbeafe",
                fontWeight: 600,
              }}
            >
              <Sparkles size={14} />
              <span>Invoice siap dipantau</span>
            </Flex>
          </Flex>

          <Title
            level={2}
            style={{ margin: 0, color: "#fff", lineHeight: 1.1 }}
          >
            Riwayat pembayaran sekolah
          </Title>

          <Paragraph
            style={{
              marginBottom: 0,
              maxWidth: 760,
              color: "rgba(255,255,255,0.82)",
              fontSize: 16,
            }}
          >
            Pantau status SPP bulanan, pembayaran lainnya, cicilan, dan invoice
            resmi untuk {student?.student_name || "anak Anda"}.
          </Paragraph>
        </Space>
      </Flex>
    </Card>
  </MotionDiv>
);

export default ParentTransactionHero;
