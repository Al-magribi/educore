import React from "react";
import { Card, Flex, Select, Space, Typography } from "antd";
import { Filter } from "lucide-react";

const { Text } = Typography;

const TaskFilters = ({
  chapterOptions,
  classOptions,
  filterChapterId,
  filterClassId,
  onChapterChange,
  onClassChange,
}) => {
  return (
    <Card
      variant='borderless'
      style={{
        borderRadius: 22,
        boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
      }}
      styles={{ body: { padding: 18 } }}
    >
      <Flex align='center' gap={12} wrap='wrap'>
        <Space size={8}>
          <Filter size={16} />
          <Text strong>Filter Penugasan</Text>
        </Space>
        <Select
          allowClear
          placeholder='Semua chapter'
          style={{ minWidth: 220 }}
          options={chapterOptions}
          value={filterChapterId}
          onChange={onChapterChange}
          showSearch={{ optionFilterProp: "label" }}
          virtual={false}
        />
        <Select
          allowClear
          placeholder='Semua kelas target'
          style={{ minWidth: 220 }}
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
