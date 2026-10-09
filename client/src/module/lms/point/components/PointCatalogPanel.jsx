import React from "react";
import { Card, Empty, Flex, Table, Tag, Typography } from "antd";
import { ShieldAlert, Trophy } from "lucide-react";
import { POINT_TYPE_LABELS } from "../utils/pointCatalog";

const { Text, Title } = Typography;

const panelStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const TypeHeading = ({ type }) => {
  const isReward = type === "reward";
  const Icon = isReward ? Trophy : ShieldAlert;
  return (
    <Flex align='center' gap={10}>
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: isReward ? "#fffbeb" : "#fef2f2",
          color: isReward ? "#a16207" : "#b91c1c",
        }}
      >
        <Icon size={16} />
      </span>
      <Title level={4} style={{ margin: 0 }}>
        Bobot {POINT_TYPE_LABELS[type]}
      </Title>
    </Flex>
  );
};

const CategoryBlock = ({ category, index, isMobile }) => {
  const columns = [
    {
      title: "No",
      width: 60,
      render: (_, __, rowIndex) => rowIndex + 1,
    },
    {
      title: "Jenis",
      dataIndex: "name",
      render: (value, record) => (
        <Flex vertical gap={2}>
          <Text strong>{value}</Text>
          {record.description ? (
            <Text style={{ color: "#64748b" }}>{record.description}</Text>
          ) : null}
        </Flex>
      ),
    },
    {
      title: "Bobot",
      dataIndex: "point_value",
      width: 90,
      align: "center",
      render: (value) => <Text strong>{value}</Text>,
    },
  ];

  return (
    <div>
      <Tag
        style={{
          marginBottom: 10,
          borderRadius: 999,
          paddingInline: 12,
          background: "#f8fafc",
          borderColor: "#e2e8f0",
          color: "#0f172a",
          fontWeight: 700,
        }}
      >
        {String.fromCharCode(65 + index)}. {category.name}
      </Tag>
      {isMobile ? (
        <Flex vertical gap={8}>
          {(category.rules || []).map((rule, ruleIndex) => (
            <Card
              key={rule.id}
              style={{ borderRadius: 14, border: "1px solid #e5edf6" }}
              styles={{ body: { padding: 12 } }}
            >
              <Flex justify='space-between' gap={10}>
                <Text>
                  {ruleIndex + 1}. {rule.name}
                </Text>
                <Text strong>{rule.point_value}</Text>
              </Flex>
            </Card>
          ))}
        </Flex>
      ) : (
        <Table
          rowKey='id'
          size='small'
          pagination={false}
          dataSource={category.rules || []}
          columns={columns}
        />
      )}
    </div>
  );
};

const CatalogColumn = ({ type, groups = [], isMobile }) => (
  <Card style={panelStyle} styles={{ body: { padding: 18 } }}>
    <Flex vertical gap={16}>
      <TypeHeading type={type} />
      {groups.length ? (
        groups.map((category, index) => (
          <CategoryBlock
            key={`${type}-${category.id || "none"}`}
            category={category}
            index={index}
            isMobile={isMobile}
          />
        ))
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={`Belum ada bobot ${POINT_TYPE_LABELS[type].toLowerCase()}.`}
        />
      )}
    </Flex>
  </Card>
);

const PointCatalogPanel = ({ catalog, isMobile = false }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: 16,
    }}
  >
    <CatalogColumn
      type='reward'
      groups={catalog?.reward || []}
      isMobile={isMobile}
    />
    <CatalogColumn
      type='punishment'
      groups={catalog?.punishment || []}
      isMobile={isMobile}
    />
  </div>
);

export default PointCatalogPanel;
