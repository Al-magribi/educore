import React from "react";
import { Button, Space, Typography } from "antd";

const { Text } = Typography;

const GroupFormFooter = ({ totalPoints, onClose, isCreating, canSubmit }) => (
  <Space
    align="center"
    style={{
      width: "100%",
      justifyContent: "space-between",
      borderTop: "1px solid #f0f0f0",
      paddingTop: 12,
    }}
  >
    <Text type="secondary">Total poin gabungan: {totalPoints} (harus 100).</Text>
    <Space>
      <Button onClick={onClose} disabled={isCreating}>
        Batal
      </Button>
      <Button
        type="primary"
        htmlType="submit"
        disabled={!canSubmit}
        loading={isCreating}
      >
        Buat Bank Gabungan
      </Button>
    </Space>
  </Space>
);

export default GroupFormFooter;
