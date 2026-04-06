import { Alert, Button, Card, Flex, Space, Tag, Typography } from "antd";

import { cardStyle } from "../constants";

const { Text, Title } = Typography;

const ContributionHeader = ({
  activePeriode,
  access,
  onOpenOfficerModal,
  onOpenTransactionModal,
}) => (
  <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
    <Flex justify='space-between' align='center' wrap='wrap' gap={16}>
      <Space vertical size={4}>
        <Text
          type='secondary'
          style={{
            fontSize: 12,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Finance / Kas Kelas
        </Text>
        <Title level={4} style={{ margin: 0 }}>
          Kelola Kas Kelas
        </Title>
        <Space wrap>
          <Tag color='green'>{activePeriode?.name || "Periode aktif"}</Tag>
          <Tag color='blue'>
            {`Wali Kelas ${access?.homeroom_class?.name || ""}`.trim()}
          </Tag>
        </Space>
      </Space>

      <Space wrap>
        <Button onClick={onOpenOfficerModal}>Atur Petugas</Button>
        <Button
          type='primary'
          onClick={() => onOpenTransactionModal(null, "income")}
        >
          Catat Transaksi
        </Button>
      </Space>
    </Flex>

    <Alert
      showIcon
      type='info'
      style={{ marginTop: 16, borderRadius: 16 }}
      message='Kas kelas mengikuti periode aktif dan kelas wali saat ini.'
      description='Pembayaran bersifat bebas. Status belum bayar dihitung dari siswa kelas aktif yang belum memiliki transaksi pemasukan kas pada periode aktif.'
    />
  </Card>
);

export default ContributionHeader;
