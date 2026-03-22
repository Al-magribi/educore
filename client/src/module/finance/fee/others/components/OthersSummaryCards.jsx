import { Card, Col, Row, Statistic, Typography } from "antd";

import { cardStyle, currencyFormatter } from "../constants";

const { Text } = Typography;

const OthersSummaryCards = ({ summary }) => {
  const items = [
    {
      title: "Total Tagihan",
      value: summary.total_records || 0,
      formatter: (value) => value,
      note: "Seluruh tagihan non-SPP sesuai filter",
    },
    {
      title: "Belum Bayar",
      value: summary.unpaid_count || 0,
      formatter: (value) => value,
      note: "Tagihan yang belum memiliki pembayaran",
    },
    {
      title: "Masih Cicilan",
      value: summary.partial_count || 0,
      formatter: (value) => value,
      note: "Tagihan yang baru dibayar sebagian",
    },
    {
      title: "Sudah Lunas",
      value: summary.paid_count || 0,
      formatter: (value) => value,
      note: "Tagihan yang telah tertutup seluruhnya",
    },
    {
      title: "Total Nominal",
      value: summary.total_due || 0,
      formatter: (value) => currencyFormatter.format(Number(value || 0)),
      note: "Akumulasi nominal yang ditagihkan",
    },
    {
      title: "Sudah Dibayar",
      value: summary.total_paid || 0,
      formatter: (value) => currencyFormatter.format(Number(value || 0)),
      note: "Total pembayaran yang sudah masuk",
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col xs={24} md={12} xl={8} key={item.title}>
          <Card style={cardStyle} styles={{ body: { padding: 22 } }}>
            <Statistic
              title={item.title}
              value={item.value}
              formatter={item.formatter}
            />
            <Text type='secondary'>{item.note}</Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default OthersSummaryCards;
