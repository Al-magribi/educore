import { Select, Space, Tag } from "antd";
import { motion } from "framer-motion";

import PageHeader from "../../../../components/ui/PageHeader";

const MotionDiv = motion.div;

const SettingHeader = ({ homebases, selectedHomebaseId, onChange }) => {
  const selectedHomebase = homebases.find((item) => item.id === selectedHomebaseId);

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title='Midtrans, Rekening, dan Profil Invoice'
        description='Kelola kanal pembayaran, rekening tujuan transfer, dan identitas invoice tiap satuan. Perubahan tersimpan khusus untuk satuan yang dipilih.'
        meta={
          <Space wrap size={[8, 8]}>
            <Tag style={{ margin: 0 }}>{homebases.length} satuan tersedia</Tag>
            <Tag color='blue' style={{ margin: 0 }}>
              Aktif: {selectedHomebase?.name || "Belum dipilih"}
            </Tag>
          </Space>
        }
        extra={
          <Select
            value={selectedHomebaseId}
            onChange={onChange}
            options={homebases.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            style={{ width: 260, maxWidth: "100%" }}
            placeholder='Pilih satuan'
            disabled={homebases.length <= 1}
          />
        }
      />
    </MotionDiv>
  );
};

export default SettingHeader;
