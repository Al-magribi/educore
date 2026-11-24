import React from "react";
import { Button, Card, Flex, Input, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { FileText, Save } from "lucide-react";

import { museColors, museRadius, museShadow } from "../../../../config/theme";
import { IconBox } from "../../../../components/ui/muse";
const { TextArea } = Input;
const { Text, Title } = Typography;

const panelCardStyle = {
  borderRadius: museRadius.card,
  background: "#ffffff",
  boxShadow: museShadow.card,
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
    noteLength === 0
      ? "Kosong"
      : noteLength < 120
        ? "Draft singkat"
        : "Siap disimpan";

  return (
    <Flex vertical gap={16}>
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
                  <IconBox icon={<FileText size={20} />} size={40} />
                  <div>
                    <Title level={5} style={{ margin: 0, color: museColors.text }}>
                      Editor Catatan Harian
                    </Title>
                    <Text type='secondary'>
                      Gunakan gaya bahasa ringkas, informatif, dan mudah
                      ditindaklanjuti.
                    </Text>
                  </div>
                </Space>
              </div>

              <Button
                type='primary'
                icon={<Save size={14} />}
                onClick={onSave}
                loading={saving}
                style={{
                  width: isMobile ? "100%" : "auto",
                  borderRadius: museRadius.card,
                  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.18)",
                }}
              >
                Simpan Catatan Harian
              </Button>
            </Flex>

            <Card
              size='small'
              style={{
                borderRadius: museRadius.card,
                border: `1px solid ${museColors.divider}`,
                background: museColors.bgLayout,
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Flex vertical gap={8}>
                <Text strong style={{ color: museColors.text }}>
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
                borderRadius: museRadius.card,
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
