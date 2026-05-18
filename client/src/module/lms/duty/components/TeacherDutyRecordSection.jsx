import React from "react";
import { Button, Card, Empty, Flex, Table, Typography } from "antd";

const { Text, Title } = Typography;

const sectionCardStyle = {
  borderRadius: 22,
  border: "1px solid #e7eef6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.05)",
};

const TeacherDutyRecordSection = ({
  title,
  description,
  addButtonText,
  onAdd,
  columns,
  dataSource,
  emptyDescription,
  scrollX,
  actionIcon,
  isMobile,
}) => (
  <Card
    style={sectionCardStyle}
    styles={{ body: { padding: 0, overflow: "hidden" } }}
  >
    <div
      style={{
        padding: isMobile ? 16 : 20,
        borderBottom: "1px solid #edf2f7",
        background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
      }}
    >
      <Flex
        vertical={isMobile}
        justify='space-between'
        align={isMobile ? "stretch" : "center"}
        gap={12}
      >
        <div>
          <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
            {title}
          </Title>
          <Text type='secondary'>{description}</Text>
        </div>

        <Button
          type='dashed'
          icon={actionIcon}
          onClick={onAdd}
          style={{
            width: isMobile ? "100%" : "auto",
            borderRadius: 12,
            height: 40,
          }}
        >
          {addButtonText}
        </Button>
      </Flex>
    </div>

    <Table
      rowKey='key'
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={emptyDescription}
          />
        ),
      }}
      scroll={{ x: scrollX }}
    />
  </Card>
);

export default TeacherDutyRecordSection;
