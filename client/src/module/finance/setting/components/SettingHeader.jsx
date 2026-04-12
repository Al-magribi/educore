import { Card, Flex, Select, Typography } from "antd";
import { cardStyle } from "../../fee/others/constants";

const { Title, Text } = Typography;

const SettingHeader = ({ homebases, selectedHomebaseId, onChange }) => (
  <Card style={cardStyle} styles={{ body: { padding: 24 } }}>
    <Flex justify='space-between' align='center' wrap='wrap' gap={16}>
      <div>
        <Text
          type='secondary'
          style={{
            display: "block",
            fontSize: 12,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Finance / Pengaturan Pembayaran
        </Text>
        <Title level={3} style={{ margin: 0 }}>
          Midtrans dan Rekening Bank per Satuan
        </Title>
        <Text type='secondary'>
          Setiap satuan menyimpan konfigurasi gateway, rekening tujuan, dan
          data invoice masing-masing.
        </Text>
      </div>

      <div style={{ minWidth: 260 }}>
        <Text type='secondary' style={{ display: "block", marginBottom: 6 }}>
          Satuan
        </Text>
        <Select
          value={selectedHomebaseId}
          onChange={onChange}
          options={homebases.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          style={{ width: "100%" }}
          placeholder='Pilih satuan'
          disabled={homebases.length <= 1}
        />
      </div>
    </Flex>
  </Card>
);

export default SettingHeader;
