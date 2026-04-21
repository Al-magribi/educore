import React from "react";
import { motion } from "framer-motion";
import { Card, Space, Button, Typography, Flex } from "antd";
import { Trash2, X } from "lucide-react";

const MotionDiv = motion.div;

const QuestionBulkActions = ({ selectedCount, onCancel, onDelete }) => {
  if (selectedCount === 0) return null;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card
        size="small"
        style={{
          marginBottom: 20,
          background:
            "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(236,253,245,0.98))",
          backdropFilter: "blur(6px)",
          border: "1px solid #bfdbfe",
          position: "sticky",
          top: 16,
          zIndex: 100,
          borderRadius: 18,
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.10)",
        }}
      >
        <Flex
          justify="space-between"
          align="center"
          gap={12}
          wrap="wrap"
          style={{ padding: "6px 8px" }}
        >
          <Space size="middle" wrap>
            <Typography.Text strong style={{ color: "#1d4ed8" }}>
              {selectedCount} soal terpilih
            </Typography.Text>
            <Button
              type="text"
              size="small"
              onClick={onCancel}
              icon={<X size={14} />}
              style={{ color: "#0284c7" }}
            >
              Batalkan seleksi
            </Button>
          </Space>
          <Button
            type="primary"
            danger
            icon={<Trash2 size={16} />}
            onClick={onDelete}
            style={{ borderRadius: 10 }}
          >
            Hapus Terpilih
          </Button>
        </Flex>
      </Card>
    </MotionDiv>
  );
};

export default QuestionBulkActions;
