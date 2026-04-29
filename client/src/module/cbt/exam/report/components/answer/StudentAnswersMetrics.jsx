import React from "react";
import { Card, Grid, Typography } from "antd";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const StudentAnswersMetrics = ({ manualOnly, totalQuestions, sectionsLength, displayedScore, reviewSummary, essayCount }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const items = [
    {
      key: "questions",
      label: manualOnly ? "Soal Dikoreksi" : "Total Soal",
      value: totalQuestions,
      color: "#1d4ed8",
    },
    {
      key: "sections",
      label: "Kelompok Soal",
      value: sectionsLength,
      color: "#15803d",
    },
    {
      key: "score",
      label: "Total Skor",
      value: `${displayedScore}/100`,
      color: displayedScore >= 75 ? "#16a34a" : "#d97706",
    },
    {
      key: "review_status",
      label: "Status Uraian",
      value: `${reviewSummary.finalized}/${essayCount || 0} Final`,
      color:
        reviewSummary.pending > 0
          ? "#d97706"
          : reviewSummary.reviewed > 0
            ? "#2563eb"
            : "#16a34a",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
        gap: 16,
      }}
    >
      {items.map((item) => (
        <Card
          key={item.key}
          variant='borderless'
          style={{
            borderRadius: 22,
            boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: 18 } }}
        >
          <Text type='secondary'>{item.label}</Text>
          <Title
            level={isMobile ? 4 : 3}
            style={{ margin: "4px 0 0", color: item.color }}
          >
            {item.value}
          </Title>
        </Card>
      ))}
    </div>
  );
};

export default StudentAnswersMetrics;
