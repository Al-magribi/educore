import { Card, Col, Row, Statistic, Typography } from "antd";

import { cardStyle } from "../constants";

const { Text } = Typography;

const MonthlySummaryCards = ({ items }) => (
  <Row gutter={[16, 16]}>
    {items.map((item) => (
      <Col xs={24} md={12} xl={6} key={item.key}>
        <Card style={cardStyle}>
          <Statistic
            title={item.title}
            value={item.value}
            formatter={(value) =>
              item.prefix
              ? `${item.prefix}${new Intl.NumberFormat("id-ID").format(value || 0)}`
              : new Intl.NumberFormat("id-ID").format(value || 0)
            }
          />
          <Text
            type='secondary'
            style={{
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: 13,
            }}
          >
            {item.note}
          </Text>
        </Card>
      </Col>
    ))}
  </Row>
);

export default MonthlySummaryCards;
