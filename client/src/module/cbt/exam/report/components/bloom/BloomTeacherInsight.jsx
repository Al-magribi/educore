import React from "react";
import { Flex, Space, Tag, Typography } from "antd";
import { Clock3 } from "lucide-react";
import { formatPercent, getBloomTitle } from "./bloomUtils";

const { Text } = Typography;

const BloomTeacherInsight = ({
  activeScopeLabel,
  aggregateStats,
  hasGranularData,
  insight,
  isMobile,
}) => (
  <div
    style={{
      borderRadius: 18,
      background: "#f8fafc",
      border: "1px solid rgba(148, 163, 184, 0.18)",
      padding: isMobile ? 14 : 16,
    }}
  >
    <Flex
      align={isMobile ? "stretch" : "center"}
      justify='space-between'
      gap={12}
      wrap='wrap'
      style={{ flexDirection: isMobile ? "column" : "row" }}
    >
      <Space direction='vertical' size={4} style={{ maxWidth: 760 }}>
        <Text strong>Ringkasan Guru - {activeScopeLabel}</Text>
        <Text type='secondary'>
          Akurasi saat ini {formatPercent(aggregateStats.accuracy)} dengan status{" "}
          {insight.mastery.label.toLowerCase()}.
          {insight.strongest
            ? ` Level paling kuat adalah ${getBloomTitle(
                insight.strongest,
              )} (${formatPercent(insight.strongest.correct_percentage)}).`
            : ""}
          {insight.weakest
            ? ` Prioritas penguatan ada pada ${getBloomTitle(
                insight.weakest,
              )} (${formatPercent(insight.weakest.correct_percentage)}).`
            : ""}
        </Text>
      </Space>
      <Space size={[6, 6]} wrap>
        <Tag
          color='gold'
          icon={<Clock3 size={12} />}
          style={{ margin: 0, borderRadius: 999 }}
        >
          Pending: {aggregateStats.pending}
        </Tag>
        {hasGranularData ? (
          <Tag color='red' style={{ margin: 0, borderRadius: 999 }}>
            Perlu perhatian: {aggregateStats.needAttention} siswa
          </Tag>
        ) : null}
      </Space>
    </Flex>
  </div>
);

export default BloomTeacherInsight;
