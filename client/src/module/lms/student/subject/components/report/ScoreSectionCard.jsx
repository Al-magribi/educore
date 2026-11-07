import React from "react";
import { Card, Space, Tag, Typography } from "antd";
import { ClipboardCheck } from "lucide-react";
import ResponsiveTable from "../../../../../../components/ui/ResponsiveTable";
import { round2 } from "./utils";

const { Title } = Typography;

const ScoreSectionCard = ({
  title,
  color,
  average,
  columns,
  dataSource,
  loading,
  tableSize,
  emptyText,
}) => {
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
      <Space align="center" size={10} wrap style={{ marginBottom: 12 }}>
        <ClipboardCheck size={16} color={color} />
        <Title level={5} style={{ margin: 0 }}>
          {title}
        </Title>
        <Tag color={title === "Formatif" ? "warning" : "purple"} style={{ marginRight: 0 }}>
          Rata-rata: {round2(average || 0)}
        </Tag>
      </Space>

      <ResponsiveTable
        rowKey="key"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={false}
        size={tableSize}
        locale={{ emptyText }}
        tableLayout="fixed"
      />
    </Card>
  );
};

export default ScoreSectionCard;
