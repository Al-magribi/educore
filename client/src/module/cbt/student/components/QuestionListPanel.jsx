import React from "react";
import { Badge, Button, Card, Divider, Space } from "antd";
import { ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import QuestionListGrid from "./QuestionListGrid";

const QuestionListPanel = ({
  open,
  onToggle,
  questionMap,
  currentIndex,
  onSelect,
  glassCard,
}) => (
  <Card
    title={
      <Space>
        <ListChecks size={18} />
        <span>Daftar Soal</span>
      </Space>
    }
    extra={
      <Button
        type="text"
        size="small"
        icon={open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        onClick={onToggle}
      />
    }
    style={glassCard}
  >
    {open && (
      <Space vertical size={8} style={{ width: "100%" }}>
        <Space size={8}>
          <Badge color="#22c55e" text="Terjawab" />
          <Badge color="#f59e0b" text="Ragu" />
          <Badge color="#94a3b8" text="Belum" />
          <Badge color="#2563eb" text="Aktif" />
        </Space>
        <Divider style={{ margin: "8px 0" }} />
        <QuestionListGrid
          questionMap={questionMap}
          currentIndex={currentIndex}
          onSelect={onSelect}
        />
      </Space>
    )}
  </Card>
);

export default QuestionListPanel;
