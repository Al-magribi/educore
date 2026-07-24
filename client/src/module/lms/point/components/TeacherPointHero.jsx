import React from "react";
import { Card, Flex, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { NotebookPen, ShieldCheck, Users } from "lucide-react";

const { Title, Text } = Typography;

const heroStyle = {
  borderRadius: 28,
  overflow: "hidden",
  border: "1px solid rgba(191, 219, 254, 0.76)",
  background:
    "radial-gradient(circle at top right, rgba(56,189,248,0.26), transparent 30%), radial-gradient(circle at left center, rgba(250,204,21,0.16), transparent 32%), linear-gradient(135deg, #0f172a 0%, #0f3d8f 50%, #0ea5e9 100%)",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
};

const panelStyle = {
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.10)",
  boxShadow: "none",
};

const TeacherPointHero = ({
  isMobile,
  periode,
  homeroomClass,
  pointConfig,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.36 }}
  >
    <Card
      variant='borderless'
      style={{ ...heroStyle, borderRadius: isMobile ? 22 : 28 }}
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
              Wali Kelas
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
              {periode?.name || "Periode belum aktif"}
            </Tag>
          </Space>

          <Space align='start' size={16}>
            <span
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.14)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <NotebookPen size={26} />
            </span>
            <div>
              <Title
                level={isMobile ? 3 : 2}
                style={{ margin: 0, color: "#fff", lineHeight: 1.15 }}
              >
                Kelola Poin Siswa
              </Title>
              <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 15 }}>
                Catat prestasi dan pelanggaran siswa kelas wali Anda dengan alur
                yang cepat, rapi, dan mudah diaudit.
              </Text>
            </div>
          </Space>
        </Flex>

        <Card
          style={{ ...panelStyle, width: isMobile ? "100%" : 340 }}
          styles={{ body: { padding: 20 } }}
        >
          <Flex vertical gap={14}>
            <Space align='start'>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.14)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fde68a",
                }}
              >
                <Users size={18} />
              </span>
              <div>
                <Text style={{ color: "rgba(255,255,255,0.68)" }}>
                  Kelas wali aktif
                </Text>
                <Title level={4} style={{ margin: "2px 0 0", color: "#fff" }}>
                  {homeroomClass?.name || "-"}
                </Title>
              </div>
            </Space>

            <Space align='start'>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.14)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#bfdbfe",
                }}
              >
                <ShieldCheck size={18} />
              </span>
              <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                {pointConfig?.show_balance
                  ? "Poin bersih aktif untuk tampilan rangkuman siswa."
                  : "Rangkuman akumulasi prestasi dan pelanggaran."}
              </Text>
            </Space>
          </Flex>
        </Card>
      </Flex>
    </Card>
  </motion.div>
);

export default TeacherPointHero;
