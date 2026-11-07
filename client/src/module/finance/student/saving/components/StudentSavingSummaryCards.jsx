import { Card, Col, Row, Statistic, Typography } from "antd";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  PiggyBank,
  Wallet,
} from "lucide-react";

import { cardStyle, currencyFormatter } from "../constants";

const { Text } = Typography;

const items = [
  {
    key: "balance",
    title: "Saldo Tabungan",
    valueKey: "balance",
    icon: Wallet,
    color: "#0284c7",
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
  },
  {
    key: "deposit",
    title: "Total Setoran",
    valueKey: "total_deposit",
    icon: ArrowDownToLine,
    color: "#059669",
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
  },
  {
    key: "withdrawal",
    title: "Total Penarikan",
    valueKey: "total_withdrawal",
    icon: ArrowUpFromLine,
    color: "#d97706",
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
  },
  {
    key: "transaction_count",
    title: "Jumlah Transaksi",
    valueKey: "transaction_count",
    icon: PiggyBank,
    color: "#7c3aed",
  },
];

const StudentSavingSummaryCards = ({ summary }) => (
  <Row gutter={[16, 16]}>
    {items.map((item) => {
      const Icon = item.icon;
      const value = summary?.[item.valueKey] || 0;

      return (
        <Col xs={12} xl={6} key={item.key}>
          <Card style={cardStyle} styles={{ body: { padding: 18 } }}>
            <Statistic
              title={item.title}
              value={value}
              formatter={item.formatter}
              prefix={<Icon size={16} color={item.color} />}
            />
          </Card>
        </Col>
      );
    })}
  </Row>
);

export default StudentSavingSummaryCards;
