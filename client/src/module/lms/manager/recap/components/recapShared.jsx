import React from "react";
import { Card, Empty, Flex, List, Tag, Typography } from "antd";
import { recordCardStyle } from "./recapStyles";

const { Text, Title } = Typography;

export const RecapSectionHeader = ({ title, description, tags, isMobile }) => (
  <Flex
    justify='space-between'
    align={isMobile ? "stretch" : "flex-start"}
    vertical={isMobile}
    gap={12}
    style={{ width: "100%", minWidth: 0 }}
  >
    <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
      <Title level={5} style={{ margin: 0, fontSize: isMobile ? 15 : 16 }}>
        {title}
      </Title>
      {description ? (
        <Text type='secondary' style={{ fontSize: isMobile ? 12 : 13 }}>
          {description}
        </Text>
      ) : null}
    </Flex>
    {tags ? (
      <Flex gap={8} wrap='wrap' style={{ flexShrink: 0, minWidth: 0 }}>
        {tags}
      </Flex>
    ) : null}
  </Flex>
);

export const RecapToolbar = ({ isMobile, filters, actions }) => (
  <Flex
    justify='space-between'
    align={isMobile ? "stretch" : "center"}
    wrap='wrap'
    gap={10}
    style={{ width: "100%", minWidth: 0, marginTop: 16 }}
  >
    <Flex
      gap={10}
      wrap='wrap'
      align={isMobile ? "stretch" : "center"}
      style={{ minWidth: 0, flex: isMobile ? "1 1 100%" : "1 1 260px" }}
    >
      {filters}
    </Flex>
    {actions ? (
      <Flex
        gap={8}
        wrap='wrap'
        style={{ minWidth: 0, width: isMobile ? "100%" : undefined }}
      >
        {actions}
      </Flex>
    ) : null}
  </Flex>
);

export const RecapStatTags = ({ items = [], isMobile }) => {
  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length) return null;

  return (
    <Flex wrap='wrap' gap={8} style={{ marginTop: 14, minWidth: 0 }}>
      {visibleItems.map((item) => (
        <Tag
          key={item.key}
          color={item.color}
          icon={item.icon}
          style={{ margin: 0, fontSize: isMobile ? 11 : 12 }}
        >
          {item.label}
        </Tag>
      ))}
    </Flex>
  );
};

/** Card header for one record: order badge, primary/secondary label, trailing score. */
export const RecordCard = ({ index, title, subtitle, extra, children }) => (
  <Card style={recordCardStyle} styles={{ body: { padding: 14 } }}>
    <Flex vertical gap={12} style={{ minWidth: 0 }}>
      <Flex justify='space-between' align='flex-start' gap={10}>
        <Flex gap={10} align='flex-start' style={{ minWidth: 0, flex: 1 }}>
          {index === undefined || index === null ? null : (
            <span
              style={{
                flexShrink: 0,
                minWidth: 26,
                height: 26,
                padding: "0 6px",
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                background: "#f1f5fb",
                color: "#475569",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {index}
            </span>
          )}
          <Flex vertical gap={2} style={{ minWidth: 0, flex: 1 }}>
            <Text
              strong
              ellipsis={{
                tooltip: typeof title === "string" ? title : undefined,
              }}
              style={{ fontSize: 14, maxWidth: "100%" }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text type='secondary' style={{ fontSize: 12 }}>
                {subtitle}
              </Text>
            ) : null}
          </Flex>
        </Flex>
        {extra ? <div style={{ flexShrink: 0 }}>{extra}</div> : null}
      </Flex>
      {children}
    </Flex>
  </Card>
);

/** Compact label/value tiles used inside record cards. */
export const MetricGrid = ({ items = [], columns = 2 }) => {
  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 8,
      }}
    >
      {visibleItems.map((item) => (
        <div
          key={item.key}
          style={{
            borderRadius: 10,
            border: "1px solid #eef2f7",
            background: "#f8fafc",
            padding: "8px 10px",
            minWidth: 0,
          }}
        >
          <Text
            type='secondary'
            style={{ fontSize: 11, display: "block", lineHeight: 1.3 }}
          >
            {item.label}
          </Text>
          <div
            style={{
              marginTop: 3,
              fontSize: 13,
              fontWeight: 600,
              color: "#0f172a",
              lineHeight: 1.3,
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export const DetailSection = ({ title, children }) => (
  <Flex vertical gap={6} style={{ minWidth: 0 }}>
    <Text
      type='secondary'
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: "uppercase",
      }}
    >
      {title}
    </Text>
    {children}
  </Flex>
);

/** Label on the left, value pinned right; used for score breakdowns. */
export const KeyValueRows = ({ items = [] }) => {
  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length) return null;

  return (
    <Flex vertical gap={6} style={{ minWidth: 0 }}>
      {visibleItems.map((item) => (
        <Flex
          key={item.key}
          justify='space-between'
          align='center'
          gap={10}
          style={{ minWidth: 0 }}
        >
          <Text
            type='secondary'
            ellipsis={{ tooltip: item.tooltip || item.label }}
            style={{ fontSize: 12, minWidth: 0, flex: 1 }}
          >
            {item.label}
          </Text>
          <div style={{ flexShrink: 0, fontSize: 13, fontWeight: 600 }}>
            {item.value}
          </div>
        </Flex>
      ))}
    </Flex>
  );
};

/** Mobile replacement for a table: paginated stack of record cards. */
export const RecapMobileList = ({
  dataSource = [],
  loading = false,
  renderItem,
  emptyText = "Belum ada data.",
  pageSize = 8,
}) => (
  <List
    dataSource={dataSource}
    loading={loading}
    split={false}
    locale={{
      emptyText: (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      ),
    }}
    pagination={
      dataSource.length > pageSize
        ? {
            pageSize,
            size: "small",
            align: "center",
            showSizeChanger: false,
            style: { marginTop: 4, marginBottom: 0 },
          }
        : false
    }
    renderItem={(item, index) => (
      <List.Item
        style={{ padding: 0, marginBottom: 10, borderBlockEnd: "none" }}
      >
        {renderItem(item, index)}
      </List.Item>
    )}
  />
);
