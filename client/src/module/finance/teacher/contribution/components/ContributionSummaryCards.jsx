import {
  CheckCircleOutlined,
  DollarOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Statistic } from "antd";

import { cardStyle, currencyFormatter } from "../constants";

const ContributionSummaryCards = ({ summary }) => {
  const items = [
    {
      title: "Saldo Kas",
      value: summary.balance || 0,
      color: "#0f766e",
      icon: <DollarOutlined />,
      currency: true,
    },
    {
      title: "Siswa Sudah Bayar",
      value: summary.paid_students || 0,
      color: "#166534",
      icon: <CheckCircleOutlined />,
    },
    {
      title: "Siswa Belum Bayar",
      value: summary.unpaid_students || 0,
      color: "#b45309",
      icon: <TeamOutlined />,
    },
    {
      title: "Petugas Aktif",
      value: summary.active_officers || 0,
      color: "#1d4ed8",
      icon: <UserSwitchOutlined />,
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col xs={24} sm={12} xl={6} key={item.title}>
          <Card style={cardStyle}>
            <Statistic
              title={item.title}
              value={item.value}
              valueStyle={{ color: item.color, fontSize: 28 }}
              prefix={item.icon}
              formatter={(value) =>
                item.currency
                  ? currencyFormatter.format(Number(value || 0))
                  : value
              }
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default ContributionSummaryCards;
