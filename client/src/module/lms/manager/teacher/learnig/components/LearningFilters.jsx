import React from "react";
import { Card, Flex, Select, Space, Typography } from "antd";
import { Layers } from "lucide-react";

const { Text } = Typography;

const LearningFilters = ({
  gradeOptions,
  classOptions,
  filterGradeId,
  filterClassId,
  onGradeChange,
  onClassChange,
}) => {
  return (
    <Card style={{ borderRadius: 12 }}>
      <Flex align="center" gap={12} wrap="wrap">
        <Space size={8}>
          <Layers size={16} />
          <Text strong>Filter</Text>
        </Space>
        <Select
          allowClear
          placeholder="Pilih tingkat"
          style={{ minWidth: 200 }}
          options={gradeOptions}
          value={filterGradeId}
          onChange={onGradeChange}
        />
        <Select
          allowClear
          placeholder="Pilih kelas"
          style={{ minWidth: 220 }}
          options={classOptions}
          value={filterClassId}
          onChange={onClassChange}
        />
      </Flex>
    </Card>
  );
};

export default LearningFilters;
