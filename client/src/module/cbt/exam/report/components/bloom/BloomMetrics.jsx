import React from "react";
import { Card, Flex, Space, Typography } from "antd";
import { metricCardStyle } from "./bloomUtils";

const { Text, Title } = Typography;

const BloomMetrics = ({ isMobile, metricItems }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
      gap: 12,
    }}
  >
    {metricItems.map((item) => (
      <Card
        key={item.label}
        variant='borderless'
        style={metricCardStyle}
        styles={{ body: { padding: 16 } }}
      >
        <Flex align='center' justify='space-between' gap={12}>
          <Space direction='vertical' size={4}>
            <Text type='secondary'>{item.label}</Text>
            <Space size={6} align='baseline'>
              <Title level={4} style={{ margin: 0, color: item.color }}>
                {item.value}
              </Title>
              {item.suffix ? (
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {item.suffix}
                </Text>
              ) : null}
            </Space>
          </Space>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff",
              color: item.color,
            }}
          >
            {item.icon}
          </div>
        </Flex>
      </Card>
    ))}
  </div>
);

export default BloomMetrics;
