import { Card, Col, Empty, Flex, List, Row, Space, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { BellRing, Clock3 } from "lucide-react";

import {
  cardBaseStyle,
  currency,
  formatDateTime,
  statusColorMap,
} from "./constants";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

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
        <Tag color={statusColorMap[value] || "default"} style={{ borderRadius: 999 }}>
          {value}
        </Tag>
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
        <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            variant='borderless'
            style={cardBaseStyle}
            title={
              <Flex justify='space-between' align='center' gap={12}>
                <Flex align='center' gap={10}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 14,
                      background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                      color: "#2563eb",
                    }}
                  >
                    <Clock3 size={18} />
                  </div>
                  <div>
                    <Text strong style={{ display: "block", color: "#0f172a" }}>
                      Transaksi Terbaru
                    </Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      Aktivitas keuangan terakhir pada periode aktif.
                    </Text>
                  </div>
                </Flex>
                <Tag color='blue' style={{ borderRadius: 999, fontWeight: 600 }}>
                  {recentTransactions.length} item
                </Tag>
              </Flex>
            }
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
        </MotionDiv>
      </Col>

      <Col xs={24} xxl={9}>
        <MotionDiv
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <Card variant='borderless' style={cardBaseStyle}>
            <Space vertical size={18} style={{ width: "100%" }}>
              <div>
                <Flex align='center' gap={10} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 14,
                      background: "linear-gradient(135deg, #fef3c7, #fff7ed)",
                      color: "#d97706",
                    }}
                  >
                    <BellRing size={18} />
                  </div>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      Prioritas Penagihan
                    </Title>
                    <Text type='secondary'>
                      Fokus tindak lanjut untuk tagihan yang perlu perhatian.
                    </Text>
                  </div>
                </Flex>
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
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 22,
                              fontWeight: 700,
                              color: "#0f172a",
                            }}
                          >
                            {currency(item.amount)}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                            {item.note}
                          </div>
                        </div>
                        <Tag
                          color={item.status === "Terkendali" ? "green" : "orange"}
                          style={{ borderRadius: 999, fontWeight: 600 }}
                        >
                          {item.status}
                        </Tag>
                      </Flex>
                    </Card>
                  </List.Item>
                )}
              />
            </Space>
          </Card>
        </MotionDiv>
      </Col>
    </Row>
  );
};

export default FinanceDashboardActivityTab;
