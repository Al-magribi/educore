import React from "react";
import { Card, Flex, Space, Typography } from "antd";
import { metricCardStyle } from "./itemAnalysisUtils";

const { Text, Title } = Typography;

const ItemAnalysisMetrics = ({ isMobile, metricItems }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: isMobile
        ? "repeat(2, minmax(0, 1fr))"
        : "repeat(4, minmax(0, 1fr))",
      gap: isMobile ? 10 : 12,
      width: "100%",
    }}
  >
    {metricItems.map((item) => (
      <Card
        key={item.label}
        variant='borderless'
        style={{
          ...metricCardStyle,
          borderRadius: isMobile ? 14 : 18,
          minWidth: 0,
          overflow: "hidden",
        }}
        styles={{ body: { padding: isMobile ? 12 : 16 } }}
      >
        <Flex
          align='center'
          justify='space-between'
          gap={isMobile ? 8 : 12}
          style={{ minWidth: 0 }}
        >
          <Space direction='vertical' size={2} style={{ minWidth: 0, flex: 1 }}>
            <Text
              type='secondary'
              style={{
                fontSize: isMobile ? 11 : 14,
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {isMobile && item.shortLabel ? item.shortLabel : item.label}
            </Text>
            <Space size={6} align='baseline' wrap>
              <Title
                level={isMobile ? 5 : 4}
                style={{ margin: 0, color: item.color, lineHeight: 1.1 }}
              >
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
              width: isMobile ? 32 : 42,
              height: isMobile ? 32 : 42,
              borderRadius: isMobile ? 10 : 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff",
              color: item.color,
              flexShrink: 0,
            }}
          >
            {item.icon}
          </div>
        </Flex>
      </Card>
    ))}
  </div>
);

export default ItemAnalysisMetrics;
