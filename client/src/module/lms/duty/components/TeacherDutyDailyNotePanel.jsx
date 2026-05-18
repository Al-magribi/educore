import React from "react";
import { Button, Card, Flex, Input, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { FileText, Save } from "lucide-react";

const { TextArea } = Input;
const { Text, Title } = Typography;

const heroCardStyle = {
  borderRadius: 22,
  overflow: "hidden",
  border: "1px solid rgba(191, 219, 254, 0.7)",
  background:
    "radial-gradient(circle at top right, rgba(125, 211, 252, 0.32), transparent 34%), linear-gradient(135deg, #0f172a 0%, #0f3d8f 52%, #38bdf8 100%)",
  boxShadow: "0 18px 44px rgba(15, 23, 42, 0.14)",
};

const panelCardStyle = {
  borderRadius: 22,
  border: "1px solid #e7eef6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.05)",
};

const statPillStyle = {
  margin: 0,
  borderRadius: 999,
  paddingInline: 12,
  paddingBlock: 4,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
};

const TeacherDutyDailyNotePanel = ({
  dailyNote,
  onChange,
  onSave,
  saving,
  isMobile,
}) => {
  const noteLength = dailyNote.trim().length;
  const noteStatus =
    noteLength === 0 ? "Kosong" : noteLength < 120 ? "Draft singkat" : "Siap disimpan";

  return (
    <Flex vertical gap={16}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26 }}
      >
        <Card
          variant='borderless'
          style={heroCardStyle}
          styles={{ body: { padding: isMobile ? 18 : 24 } }}
        >
          <Flex
            vertical={isMobile}
            justify='space-between'
            align={isMobile ? "flex-start" : "center"}
            gap={16}
          >
            <Flex vertical gap={12} style={{ maxWidth: 680 }}>
              <Space size={[8, 8]} wrap>
                <Tag style={statPillStyle}>Catatan Harian</Tag>
                <Tag style={statPillStyle}>{noteStatus}</Tag>
              </Space>

              <div>
                <Title level={4} style={{ margin: 0, color: "#fff" }}>
                  Ringkas kejadian penting hari ini dengan format yang jelas.
                </Title>
                <Text
                  style={{
                    display: "block",
                    marginTop: 8,
                    color: "rgba(255,255,255,0.82)",
                  }}
                >
                  Tulis poin operasional, kendala, tindak lanjut, dan informasi
                  penting lain agar admin mudah memahami kondisi hari ini.
                </Text>
              </div>
            </Flex>

            <Card
              style={{
                width: isMobile ? "100%" : 240,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.1)",
                boxShadow: "none",
              }}
              styles={{ body: { padding: 18 } }}
            >
              <Flex vertical gap={6}>
                <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                  Panjang catatan
                </Text>
                <Title level={3} style={{ margin: 0, color: "#fff" }}>
                  {noteLength}
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.8)" }}>
                  karakter terisi
                </Text>
              </Flex>
            </Card>
          </Flex>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, delay: 0.04 }}
      >
        <Card
          style={panelCardStyle}
          styles={{ body: { padding: isMobile ? 16 : 20 } }}
        >
          <Flex vertical gap={16}>
            <Flex
              vertical={isMobile}
              justify='space-between'
              align={isMobile ? "stretch" : "center"}
              gap={12}
            >
              <div>
                <Space size={10} align='center'>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={18} />
                  </div>
                  <div>
                    <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
                      Editor Catatan Harian
                    </Title>
                    <Text type='secondary'>
                      Gunakan gaya bahasa ringkas, informatif, dan mudah ditindaklanjuti.
                    </Text>
                  </div>
                </Space>
              </div>

              <Button
                type='primary'
                icon={<Save size={14} />}
                onClick={onSave}
                loading={saving}
                size='large'
                style={{
                  width: isMobile ? "100%" : "auto",
                  borderRadius: 14,
                  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.18)",
                }}
              >
                Simpan Catatan Harian
              </Button>
            </Flex>

            <Card
              size='small'
              style={{
                borderRadius: 18,
                border: "1px solid #e6eef7",
                background: "#f8fbff",
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Flex vertical gap={8}>
                <Text strong style={{ color: "#0f172a" }}>
                  Panduan isi catatan
                </Text>
                <Text type='secondary'>
                  Sertakan rangkuman kehadiran, kejadian penting, tindak lanjut,
                  dan hal yang perlu dipantau admin pada hari berikutnya.
                </Text>
              </Flex>
            </Card>

            <TextArea
              rows={isMobile ? 10 : 12}
              value={dailyNote}
              onChange={(event) => onChange(event.target.value)}
              placeholder='Contoh: Kegiatan belajar berjalan normal, terdapat 2 siswa izin sakit, 1 guru berhalangan hadir dan sudah dikoordinasikan dengan guru pengganti, serta ada tindak lanjut yang perlu dipantau besok.'
              maxLength={2000}
              showCount
              style={{
                borderRadius: 18,
                padding: 16,
                resize: "vertical",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            />
          </Flex>
        </Card>
      </motion.div>
    </Flex>
  );
};

export default TeacherDutyDailyNotePanel;
