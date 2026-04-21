import { Card, Flex, Grid, Select, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { Building2, Landmark, Settings2, Sparkles } from "lucide-react";
import { cardStyle } from "../../fee/others/constants";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const SettingHeader = ({ homebases, selectedHomebaseId, onChange }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const selectedHomebase = homebases.find((item) => item.id === selectedHomebaseId);

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        style={{
          ...cardStyle,
          overflow: "hidden",
          position: "relative",
          border: "none",
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 26%), radial-gradient(circle at right top, rgba(255,255,255,0.14), transparent 22%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 56%, #0f766e 100%)",
          boxShadow: "0 24px 54px rgba(15, 23, 42, 0.18)",
        }}
        styles={{ body: { padding: isMobile ? 20 : 24 } }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.07), transparent 42%)",
            pointerEvents: "none",
          }}
        />
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          gap={18}
          style={{ position: "relative" }}
        >
          <Space direction='vertical' size={12} style={{ flex: 1 }}>
            <Flex align='center' gap={10} wrap='wrap'>
              <Tag
                color='cyan'
                style={{
                  borderRadius: 999,
                  paddingInline: 12,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                Finance / Pengaturan Pembayaran
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
                <span>Workspace siap produksi</span>
              </Flex>
            </Flex>

            <Flex align='flex-start' gap={14}>
              <div
                style={{
                  width: isMobile ? 48 : 56,
                  height: isMobile ? 48 : 56,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  flexShrink: 0,
                  boxShadow: "0 16px 28px rgba(15, 23, 42, 0.16)",
                }}
              >
                <Settings2 size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: "#fff" }}>
                  Midtrans, Rekening, dan Profil Invoice
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.82)", maxWidth: 760 }}>
                  Kelola kanal pembayaran, rekening tujuan transfer, dan identitas
                  invoice tiap satuan dalam satu workspace yang ringkas dan rapi.
                </Text>
              </div>
            </Flex>

            <Flex gap={12} wrap='wrap'>
              <div
                style={{
                  minWidth: 180,
                  padding: "12px 14px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                <Flex align='center' gap={8} style={{ color: "#e2e8f0" }}>
                  <Building2 size={15} />
                  <Text style={{ color: "#e2e8f0" }}>Satuan tersedia</Text>
                </Flex>
                <Title level={5} style={{ margin: "8px 0 0", color: "#fff" }}>
                  {homebases.length} unit
                </Title>
              </div>
              <div
                style={{
                  minWidth: 220,
                  padding: "12px 14px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                <Flex align='center' gap={8} style={{ color: "#e2e8f0" }}>
                  <Landmark size={15} />
                  <Text style={{ color: "#e2e8f0" }}>Satuan aktif</Text>
                </Flex>
                <Title
                  level={5}
                  style={{ margin: "8px 0 0", color: "#fff" }}
                >
                  {selectedHomebase?.name || "Belum dipilih"}
                </Title>
              </div>
            </Flex>
          </Space>

          <div
            style={{
              minWidth: isMobile ? "100%" : 300,
              width: isMobile ? "100%" : 320,
              padding: isMobile ? 16 : 18,
              borderRadius: 22,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.16)",
              backdropFilter: "blur(14px)",
            }}
          >
            <Text
              style={{
                display: "block",
                marginBottom: 8,
                color: "#e2e8f0",
                fontWeight: 600,
              }}
            >
              Pilih satuan kerja
            </Text>
            <Select
              size='large'
              value={selectedHomebaseId}
              onChange={onChange}
              options={homebases.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              style={{ width: "100%" }}
              placeholder='Pilih satuan'
              disabled={homebases.length <= 1}
            />
            <Text
              style={{
                display: "block",
                marginTop: 10,
                color: "rgba(255,255,255,0.72)",
                fontSize: 12,
              }}
            >
              Setiap perubahan konfigurasi akan tersimpan khusus untuk satuan
              yang dipilih.
            </Text>
          </div>
        </Flex>
      </Card>
    </MotionDiv>
  );
};

export default SettingHeader;
