import React from "react";
import { Card, Flex, Grid, Select, Space, Typography } from "antd";
import { Layers } from "lucide-react";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const LearningFilters = ({
  gradeOptions,
  classOptions,
  filterGradeId,
  filterClassId,
  onGradeChange,
  onClassChange,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const controlStyle = isMobile
    ? { width: "100%" }
    : { minWidth: 200, flex: "1 1 200px", maxWidth: 320 };

  return (
    <Card
      style={{ borderRadius: 12 }}
      styles={{ body: { padding: isMobile ? 14 : 20 } }}
    >
      <Flex
        align={isMobile ? "stretch" : "center"}
        gap={12}
        wrap='wrap'
        vertical={isMobile}
      >
        <Space size={8} style={{ flexShrink: 0 }}>
          <Layers size={16} />
          <Text strong>Filter</Text>
        </Space>
        <Select
          allowClear
          placeholder='Pilih tingkat'
          style={controlStyle}
          options={gradeOptions}
          value={filterGradeId}
          onChange={onGradeChange}
        />
        <Select
          allowClear
          placeholder='Pilih kelas'
          style={controlStyle}
          options={classOptions}
          value={filterClassId}
          onChange={onClassChange}
        />
      </Flex>
    </Card>
  );
};

export default LearningFilters;
