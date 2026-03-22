import { Badge, Button, Card, Flex, Typography } from "antd";

import { cardStyle } from "../constants";

const { Title, Text } = Typography;

const MonthlyHeader = ({ onOpenTariff }) => (
  <Card
    style={{
      ...cardStyle,
      background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)",
    }}
    styles={{ body: { padding: 28 } }}
  >
    <Flex justify='space-between' align='center' wrap='wrap' gap={16}>
      <div>
        <Badge color='#93c5fd' text={<Text style={{ color: "#dbeafe" }}>Finance / SPP</Text>} />
        <Title level={2} style={{ color: "#fff", margin: "8px 0 4px" }}>
          Pengelolaan Pembayaran SPP Bulanan
        </Title>
        <Text style={{ color: "rgba(255,255,255,0.82)" }}>
          Kelola tarif SPP per satuan, periode, dan tingkat, lalu pantau status
          pembayaran siswa. Input pembayaran sekarang dipusatkan dari halaman transaksi.
        </Text>
      </div>
      <Button onClick={onOpenTariff}>Atur Tarif SPP</Button>
    </Flex>
  </Card>
);

export default MonthlyHeader;
