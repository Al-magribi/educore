import React from "react";
import { Card, Empty, Flex, Table, Tag, Typography } from "antd";
import { ShieldAlert, Trophy } from "lucide-react";
import { POINT_TYPE_LABELS } from "../utils/pointCatalog";

import { museColors, museRadius, museShadow } from "../../../../config/theme";
const { Text, Title } = Typography;

const panelStyle = {
  borderRadius: museRadius.card,
  background: "#ffffff",
  boxShadow: museShadow.card,
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
          color: isReward ? "#a16207" : museColors.danger,
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
            <Text style={{ color: museColors.muted }}>{record.description}</Text>
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
          paddingInline: 12,
          background: museColors.bgLayout,
          borderColor: museColors.divider,
          color: museColors.text,
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
              style={{ borderRadius: museRadius.card, border: `1px solid ${museColors.divider}` }}
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
