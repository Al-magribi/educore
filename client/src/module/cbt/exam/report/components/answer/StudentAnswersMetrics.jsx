import React from "react";
import { Card, Grid, Typography } from "antd";
import { museColors, museRadius, museShadow } from "../../../../../../config/theme";

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
      color: museColors.primary,
    },
    {
      key: "sections",
      label: "Kelompok Soal",
      value: sectionsLength,
      color: museColors.success,
    },
    {
      key: "score",
      label: "Total Skor",
      value: `${displayedScore}/100`,
      color: displayedScore >= 75 ? museColors.success : museColors.warning,
    },
    {
      key: "review_status",
      label: manualOnly ? "Status Manual" : "Status Uraian",
      value: `${reviewSummary.finalized}/${essayCount || 0} Final`,
      color:
        reviewSummary.pending > 0
          ? museColors.warning
          : reviewSummary.reviewed > 0
            ? museColors.primary
            : museColors.success,
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
            borderRadius: museRadius.card,
            boxShadow: museShadow.card,
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
