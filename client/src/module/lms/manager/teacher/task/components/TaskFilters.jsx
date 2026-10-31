import React from "react";
import { Card, Flex, Grid, Select, Space, Typography } from "antd";
import { Filter } from "lucide-react";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const TaskFilters = ({
  chapterOptions,
  classOptions,
  filterChapterId,
  filterClassId,
  onChapterChange,
  onClassChange,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const controlStyle = isMobile
    ? { width: "100%" }
    : { minWidth: 220, flex: "1 1 220px", maxWidth: 360 };

  return (
    <Card
      variant='borderless'
      style={{
        borderRadius: 22,
        boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
      }}
      styles={{ body: { padding: isMobile ? 14 : 18 } }}
    >
      <Flex
        align={isMobile ? "stretch" : "center"}
        gap={12}
        wrap='wrap'
        vertical={isMobile}
      >
        <Space size={8} style={{ flexShrink: 0 }}>
          <Filter size={16} />
          <Text strong>Filter Penugasan</Text>
        </Space>
        <Select
          allowClear
          placeholder='Semua chapter'
          style={controlStyle}
          options={chapterOptions}
          value={filterChapterId}
          onChange={onChapterChange}
          showSearch={{ optionFilterProp: "label" }}
          virtual={false}
        />
        <Select
          allowClear
          placeholder='Semua kelas target'
          style={controlStyle}
          options={classOptions}
          value={filterClassId}
          onChange={onClassChange}
          showSearch={{ optionFilterProp: "label" }}
          virtual={false}
        />
      </Flex>
    </Card>
  );
};

export default TaskFilters;
