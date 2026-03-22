import { Badge, Button, Card, Flex, Typography } from "antd";

import { cardStyle } from "../constants";

const { Title, Text } = Typography;

const OthersHeader = ({ onOpenType }) => (
  <Card
    style={{
      ...cardStyle,
      background: "linear-gradient(135deg, #0f172a 0%, #0f766e 55%, #38bdf8 100%)",
    }}
    styles={{ body: { padding: 28 } }}
  >
    <Flex justify='space-between' align='center' wrap='wrap' gap={16}>
      <div>
        <Badge
          color='#99f6e4'
          text={<Text style={{ color: "#ccfbf1" }}>Finance / Pembayaran Lainnya</Text>}
        />
        <Title level={2} style={{ color: "#fff", margin: "8px 0 4px" }}>
          Pengelolaan Tagihan Non-SPP
        </Title>
        <Text style={{ color: "rgba(255,255,255,0.82)" }}>
          Kelola jenis biaya dan tagihannya di halaman ini. Input pembayaran
          sekarang dipusatkan dari halaman transaksi agar SPP dan non-SPP bisa
          dicatat bersamaan.
        </Text>
      </div>
      <Button onClick={onOpenType}>Atur Jenis Biaya</Button>
    </Flex>
  </Card>
);

export default OthersHeader;
