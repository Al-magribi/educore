import { Button, Card, Flex, Space, Tag, Typography } from "antd";

import { cardStyle } from "../constants";

const { Title, Text } = Typography;

const MonthlyHeader = ({ onOpenTariff }) => (
  <Card
    style={{
      ...cardStyle,
      background: "#ffffff",
      border: "1px solid rgba(148, 163, 184, 0.18)",
      boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
    }}
    styles={{ body: { padding: 22 } }}
  >
    <Flex justify='space-between' align='center' wrap='wrap' gap={16}>
      <Space direction='vertical' size={6}>
        <Tag
          color='blue'
          style={{
            width: "fit-content",
            margin: 0,
            borderRadius: 999,
            paddingInline: 10,
          }}
        >
          Finance / SPP
        </Tag>
        <Title level={3} style={{ margin: 0, color: "#0f172a" }}>
          Pembayaran SPP Bulanan
        </Title>
        <Text type='secondary'>
          Kelola tarif per periode dan tingkat, lalu pantau status pembayaran siswa.
        </Text>
      </Space>
      <Button type='primary' onClick={onOpenTariff}>
        Atur Tarif
      </Button>
    </Flex>
  </Card>
);

export default MonthlyHeader;
