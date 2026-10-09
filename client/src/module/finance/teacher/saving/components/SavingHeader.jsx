import { memo } from "react";
import { Button, Card, Flex, Grid, Space, Tag, Typography } from "antd";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

import { cardStyle } from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const SavingHeader = ({ access, activePeriode, onCreate }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card
        variant='borderless'
        style={{
          ...cardStyle,
          overflow: "hidden",
          background:
            "radial-gradient(circle at top left, rgba(16,185,129,0.18), transparent 28%), linear-gradient(135deg, #0f172a, #166534 58%, #0f766e)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.2)",
        }}
        styles={{ body: { padding: isMobile ? 16 : 24 } }}
      >
        <Flex vertical gap={18}>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            wrap='wrap'
            gap={16}
          >
            <Space orientation='vertical' size={8} style={{ minWidth: 0, flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: "rgba(226,232,240,0.85)",
                }}
              >
                Finance / Tabungan Siswa
              </Text>
              <Title
                level={isMobile ? 4 : 3}
                style={{ margin: 0, color: "#f8fafc", lineHeight: 1.15 }}
              >
                {isMobile
                  ? "Kelola tabungan siswa"
                  : "Kelola tabungan siswa dari workspace yang lebih rapi"}
              </Title>
              {!isMobile ? (
                <Text style={{ color: "rgba(226,232,240,0.88)", maxWidth: 760 }}>
                  Pantau saldo siswa, proses setoran dan penarikan, lalu tinjau
                  histori transaksi tabungan lintas periode.
                </Text>
              ) : null}
              <Space wrap size={[10, 10]}>
                <Tag
                  color='green'
                  style={{ borderRadius: 999, paddingInline: 12, margin: 0 }}
                >
                  {activePeriode?.name || "Periode aktif"}
                </Tag>
                <Tag
                  color={access?.role_scope === "teacher" ? "blue" : "purple"}
                  style={{ borderRadius: 999, paddingInline: 12, margin: 0 }}
                >
                  {access?.role_scope === "teacher"
                    ? `Wali Kelas ${access?.homeroom_class?.name || ""}`.trim()
                    : "Admin Keuangan"}
                </Tag>
              </Space>
            </Space>

            <Button
              type='primary'
              icon={<Plus size={16} />}
              onClick={() => onCreate(null, "deposit")}
              size='large'
              block={isMobile}
              style={{
                borderRadius: 999,
                fontWeight: 600,
                background: "#f8fafc",
                color: "#0f172a",
                borderColor: "#f8fafc",
              }}
            >
              Catat Tabungan
            </Button>
          </Flex>
        </Flex>
      </Card>
    </MotionDiv>
  );
};

export default memo(SavingHeader);
