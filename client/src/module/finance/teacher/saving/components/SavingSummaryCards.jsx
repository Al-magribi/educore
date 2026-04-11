import { memo } from "react";
import { Card, Col, Row, Statistic, Typography } from "antd";
import { PiggyBank, Users, WalletCards } from "lucide-react";

import { cardStyle, currencyFormatter } from "../constants";

const { Text } = Typography;

const items = [
  {
    key: "students",
    title: "Total Siswa",
    dataKey: "total_students",
    icon: Users,
    color: "#2563eb",
    note: "Siswa pada akses aktif",
  },
  {
    key: "active",
    title: "Siswa Aktif",
    dataKey: "active_students",
    icon: PiggyBank,
    color: "#059669",
    note: "Sudah memiliki transaksi",
  },
  {
    key: "balance",
    title: "Saldo",
    dataKey: "total_balance",
    icon: WalletCards,
    color: "#7c3aed",
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    note: "Akumulasi saldo tabungan",
  },
  {
    key: "deposit",
    title: "Total Setoran",
    dataKey: "total_deposit",
    icon: PiggyBank,
    color: "#16a34a",
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    note: "Setoran pada periode aktif",
  },
];

const SavingSummaryCards = ({ summary }) => (
  <Row gutter={[16, 16]}>
    {items.map((item) => {
      const Icon = item.icon;
      const value = summary?.[item.dataKey] || 0;

      return (
        <Col xs={12} xl={6} key={item.key}>
          <Card style={cardStyle} styles={{ body: { padding: 18 } }}>
            <Statistic
              title={item.title}
              value={value}
              formatter={item.formatter}
              prefix={<Icon size={16} color={item.color} />}
            />
            <Text type='secondary'>{item.note}</Text>
          </Card>
        </Col>
      );
    })}
  </Row>
);

export default memo(SavingSummaryCards);
