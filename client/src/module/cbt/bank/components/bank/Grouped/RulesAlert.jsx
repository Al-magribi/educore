import React from "react";
import { Alert, Space, Typography } from "antd";

const { Text } = Typography;

const RulesAlert = () => (
  <Alert
    type="info"
    showIcon
    title="Aturan Gabung Bank Soal"
    description={
      <Space vertical size={4}>
        <Text>Minimal pilih 2 bank soal.</Text>
        <Text>Pilih soal dari setiap bank yang akan digabung.</Text>
        <Text>Total poin soal gabungan harus 100.</Text>
      </Space>
    }
  />
);

export default RulesAlert;
