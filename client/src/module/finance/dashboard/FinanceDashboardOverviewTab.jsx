import { Card, Col, Flex, Row, Space, Typography } from "antd";
import { ReceiptText, Users } from "lucide-react";

import {
  cardBaseStyle,
  currency,
  summaryIconMap,
  summaryToneMap,
} from "./constants";

const { Title, Text } = Typography;

const FinanceDashboardOverviewTab = ({
  summaryCards,
  summary,
  meta,
  spp,
}) => (
  <Space vertical size={16} style={{ width: "100%" }}>
    <Row gutter={[16, 16]}>
      {summaryCards.map((item) => {
        const tone = summaryToneMap[item.key];
        const Icon = summaryIconMap[item.key];
        return (
          <Col xs={24} sm={12} xl={12} xxl={6} key={item.key}>
            <Card variant='borderless' style={cardBaseStyle}>
              <Space vertical size={14} style={{ width: "100%" }}>
                <Flex justify='space-between' align='start'>
                  <div>
                    <Text type='secondary'>{item.title}</Text>
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 28,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {currency(item.value)}
                    </div>
                  </div>
                  <Flex
                    align='center'
                    justify='center'
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 18,
                      background: tone.bg,
                      color: tone.color,
                    }}
                  >
                    {Icon ? <Icon size={20} /> : null}
                  </Flex>
                </Flex>
                <Text style={{ fontSize: 12, color: "#64748b" }}>{item.note}</Text>
              </Space>
            </Card>
          </Col>
        );
      })}
    </Row>

    <Row gutter={[16, 16]}>
      <Col xs={24}>
        <Space direction='vertical' size={16} style={{ width: "100%" }}>
          <Card variant='borderless' style={cardBaseStyle}>
            <Space vertical size={10}>
              <Flex align='center' gap={10}>
                <Users size={18} color='#1d4ed8' />
                <Text strong>Cakupan Data</Text>
              </Flex>
              <Title level={3} style={{ margin: 0 }}>
                {summary?.total_students || 0}
              </Title>
              <Text type='secondary'>
                {summary?.total_classes || 0} kelas, {summary?.total_grades || 0}{" "}
                tingkat, {summary?.homebase_count || 0} satuan aktif.
              </Text>
            </Space>
          </Card>

          <Card variant='borderless' style={cardBaseStyle}>
            <Space vertical size={10}>
              <Flex align='center' gap={10}>
                <ReceiptText size={18} color='#15803d' />
                <Text strong>Master Aktif</Text>
              </Flex>
              <Text>Tarif SPP: {summary?.active_spp_tariffs || 0}</Text>
              <Text>Jenis pembayaran lain: {summary?.active_other_types || 0}</Text>
              <Text>
                SPP target {meta?.current_month_label || "-"}:{" "}
                {currency(spp?.expected_current_month)}
              </Text>
            </Space>
          </Card>
        </Space>
      </Col>
    </Row>
  </Space>
);

export default FinanceDashboardOverviewTab;
