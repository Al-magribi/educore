import { Card, Col, Empty, Flex, List, Row, Space, Table, Tag, Typography } from "antd";

import {
  cardBaseStyle,
  currency,
  formatDateTime,
  statusColorMap,
} from "./constants";

const { Title, Text } = Typography;

const FinanceDashboardActivityTab = ({ recentTransactions, priorities }) => {
  const transactionColumns = [
    {
      title: "Subjek",
      dataIndex: "subject",
      key: "subject",
      render: (value, record) => (
        <div>
          <Text strong>{value}</Text>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {record.channel} • {record.homebase_name || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Metode",
      dataIndex: "method",
      key: "method",
      width: 120,
      render: (value) => <Text type='secondary'>{value || "-"}</Text>,
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      align: "right",
      render: (value) => (
        <Text strong style={{ color: Number(value) < 0 ? "#b91c1c" : "#15803d" }}>
          {Number(value) < 0
            ? `- ${currency(Math.abs(Number(value)))}`
            : currency(value)}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      align: "center",
      render: (value) => (
        <Tag color={statusColorMap[value] || "default"}>{value}</Tag>
      ),
    },
    {
      title: "Waktu",
      dataIndex: "time",
      key: "time",
      width: 170,
      render: (value) => <Text type='secondary'>{formatDateTime(value)}</Text>,
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xxl={15}>
        <Card
          variant='borderless'
          style={cardBaseStyle}
          title='Transaksi Terbaru'
          extra={<Tag color='blue'>{recentTransactions.length} item</Tag>}
          styles={{ body: { paddingTop: 8 } }}
        >
          <Table
            rowKey='key'
            dataSource={recentTransactions}
            columns={transactionColumns}
            pagination={false}
            size='small'
            scroll={{ x: 760 }}
            locale={{
              emptyText: <Empty description='Belum ada transaksi' />,
            }}
          />
        </Card>
      </Col>

      <Col xs={24} xxl={9}>
        <Card variant='borderless' style={cardBaseStyle}>
          <Space vertical size={18} style={{ width: "100%" }}>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Prioritas Penagihan
              </Title>
              <Text type='secondary'>
                Ringkasan diambil dari SPP bulan berjalan dan sisa tagihan aktif.
              </Text>
            </div>
            <List
              dataSource={priorities}
              split={false}
              locale={{
                emptyText: <Empty description='Tidak ada prioritas' />,
              }}
              renderItem={(item) => (
                <List.Item style={{ padding: 0, border: "none" }}>
                  <Card
                    variant='borderless'
                    style={{
                      width: "100%",
                      borderRadius: 20,
                      background: "#f8fafc",
                      boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.12)",
                    }}
                  >
                    <Flex justify='space-between' align='start' gap={16}>
                      <div>
                        <Text strong>{item.title}</Text>
                        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                          {item.subject}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>
                          {currency(item.amount)}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                          {item.note}
                        </div>
                      </div>
                      <Tag color={item.status === "Terkendali" ? "green" : "orange"}>
                        {item.status}
                      </Tag>
                    </Flex>
                  </Card>
                </List.Item>
              )}
            />
          </Space>
        </Card>
      </Col>
    </Row>
  );
};

export default FinanceDashboardActivityTab;
