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
  actionIcon,
  isMobile,
  hideAdd = false,
  renderMobileItem,
}) => {
  const useMobileList = Boolean(isMobile && renderMobileItem);
  const rows = dataSource || [];

  return (
    <Card
      style={{
        ...sectionCardStyle,
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
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
          <div style={{ minWidth: 0 }}>
            <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
              {title}
            </Title>
            <Text type='secondary'>{description}</Text>
          </div>

          {!hideAdd ? (
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
          ) : null}
        </Flex>
      </div>

      {useMobileList ? (
        <div style={{ padding: 12 }}>
          {rows.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={emptyDescription}
            />
          ) : (
            <Flex vertical gap={10}>
              {rows.map((record, index) => (
                <div key={record.key || index}>{renderMobileItem(record, index)}</div>
              ))}
            </Flex>
          )}
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
          <Table
            rowKey='key'
            columns={columns}
            dataSource={rows}
            pagination={false}
            size={isMobile ? "small" : "middle"}
            tableLayout='fixed'
            style={{ width: "100%" }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={emptyDescription}
                />
              ),
            }}
          />
        </div>
      )}
    </Card>
  );
};

export default TeacherDutyRecordSection;
