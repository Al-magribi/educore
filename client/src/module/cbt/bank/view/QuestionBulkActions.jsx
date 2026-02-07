import React from "react";
import { Card, Space, Button, Typography, Flex } from "antd";
import { Trash2, X } from "lucide-react";

const QuestionBulkActions = ({ selectedCount, onCancel, onDelete }) => {
  if (selectedCount === 0) return null;

  return (
    <Card
      size="small"
      style={{
        marginBottom: 20,
        backgroundColor: "rgba(230, 247, 255, 0.95)",
        backdropFilter: "blur(4px)",
        border: "1px solid #91d5ff",
        position: "sticky",
        top: 16,
        zIndex: 100,
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Flex
        justify="space-between"
        align="center"
        style={{ padding: "4px 8px" }}
      >
        <Space size="middle">
          <Typography.Text strong style={{ color: "#0050b3" }}>
            {selectedCount} soal terpilih
          </Typography.Text>
          <Button
            type="text"
            size="small"
            onClick={onCancel}
            icon={<X size={14} />}
            style={{ color: "#40a9ff" }}
          >
            Batalkan seleksi
          </Button>
        </Space>
        <Button
          type="primary"
          danger
          icon={<Trash2 size={16} />}
          onClick={onDelete}
          style={{ borderRadius: 6 }}
        >
          Hapus Terpilih
        </Button>
      </Flex>
    </Card>
  );
};

export default QuestionBulkActions;
