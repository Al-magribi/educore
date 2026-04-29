import React from "react";
import { Progress, Space, Tag, Tooltip, Typography } from "antd";
import {
  formatPercent,
  getBloomCode,
  getBloomName,
  getBloomTitle,
  getLevelKey,
  levelColorMap,
} from "./bloomUtils";

const { Text } = Typography;

export const BloomTag = ({ record, compact = false }) => (
  <Space size={compact ? 4 : 8} wrap>
    <Tag
      color={levelColorMap[record?.bloom_level] || "default"}
      style={{ margin: 0, borderRadius: 999 }}
    >
      {getBloomCode(record?.bloom_level)}
    </Tag>
    {!compact ? <Text strong>{getBloomName(record)}</Text> : null}
  </Space>
);

export const BloomProgress = ({ value, strokeColor = "#2563eb" }) => (
  <Progress
    percent={Number(value || 0)}
    size='small'
    strokeColor={strokeColor}
    showInfo
  />
);

export const StudentProfileTags = ({ record }) => (
  <Space size={[4, 6]} wrap>
    {record.by_bloom_level.map((item) => (
      <Tooltip
        key={`${record.student_id}-${getLevelKey(item.bloom_level)}`}
        title={`${getBloomTitle(item)}: ${formatPercent(item.correct_percentage)}`}
      >
        <Tag
          color={levelColorMap[item.bloom_level] || "default"}
          style={{ margin: 0, borderRadius: 999 }}
        >
          {getBloomCode(item.bloom_level)} {formatPercent(item.correct_percentage)}
        </Tag>
      </Tooltip>
    ))}
  </Space>
);
