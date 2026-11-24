import React from "react";
import { motion } from "framer-motion";
import { Card, Space, Button, Typography, Flex } from "antd";
import { Layers, Trash2, X } from "lucide-react";
import { museColors, museRadius, museShadow } from "../../../../config/theme";

const MotionDiv = motion.div;

const QuestionBulkActions = ({ selectedCount, onCancel, onDelete, onGroup }) => {
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
          background: museColors.primarySoft,
          backdropFilter: "blur(6px)",
          border: `1px solid ${museColors.primarySoft}`,
          position: "sticky",
          top: 16,
          zIndex: 100,
          borderRadius: museRadius.card,
          boxShadow: museShadow.card,
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
            <Typography.Text strong style={{ color: museColors.primary }}>
              {selectedCount} soal terpilih
            </Typography.Text>
            <Button
              type="text"
              size="small"
              onClick={onCancel}
              icon={<X size={14} />}
              style={{ color: museColors.cyan }}
            >
              Batalkan seleksi
            </Button>
          </Space>
          <Space size={8} wrap>
            <Button
              icon={<Layers size={16} />}
              onClick={onGroup}
              disabled={selectedCount < 2}
              style={{ borderRadius: 10 }}
            >
              Jadikan grup
            </Button>
            <Button
              type="primary"
              danger
              icon={<Trash2 size={16} />}
              onClick={onDelete}
              style={{ borderRadius: 10 }}
            >
              Hapus Terpilih
            </Button>
          </Space>
        </Flex>
      </Card>
    </MotionDiv>
  );
};

export default QuestionBulkActions;
