import React from "react";
import { Badge, Divider, Modal, Space } from "antd";
import { ListChecks } from "lucide-react";
import QuestionListGrid from "./QuestionListGrid";

const QuestionListModal = ({
  open,
  onClose,
  questionMap,
  currentIndex,
  onSelect,
}) => (
  <Modal
    title={
      <Space>
        <ListChecks size={18} />
        <span>Daftar Soal</span>
      </Space>
    }
    open={open}
    onCancel={onClose}
    footer={null}
    width={360}
    styles={{ body: { paddingTop: 8 } }}
  >
    <Space vertical size={8} style={{ width: "100%" }}>
      <Space size={8}>
        <Badge color="#22c55e" text="Terjawab" />
        <Badge color="#f59e0b" text="Ragu" />
        <Badge color="#94a3b8" text="Belum" />
      </Space>
      <Divider style={{ margin: "8px 0" }} />
      <QuestionListGrid
        questionMap={questionMap}
        currentIndex={currentIndex}
        onSelect={onSelect}
        columns={5}
      />
    </Space>
  </Modal>
);

export default QuestionListModal;
