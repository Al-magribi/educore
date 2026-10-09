import { Card, Col, Row, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";

import { cardStyle, currencyFormatter, formatDateTime } from "../constants";

const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const StudentContributionSummaryTab = ({
  summary,
  incomeTransactions,
  expenseTransactions,
}) => {
  const incomeColumns = [
    {
      title: "Tanggal",
      dataIndex: "transaction_date",
      key: "transaction_date",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <>
          <Text strong>{record.student_name || "-"}</Text>
          <br />
          <Text type="secondary">{record.nis || "-"}</Text>
        </>
      ),
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value) => (
        <Text strong style={{ color: "#15803d" }}>
          +{currencyFormatter.format(Number(value || 0))}
        </Text>
      ),
    },
  ];

  const expenseColumns = [
    {
      title: "Tanggal",
      dataIndex: "transaction_date",
      key: "transaction_date",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Keperluan",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value) => (
        <Text strong style={{ color: "#dc2626" }}>
          -{currencyFormatter.format(Number(value || 0))}
        </Text>
      ),
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={8}>
        <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card
            variant="borderless"
            style={cardStyle}
            styles={{ body: { padding: 18 } }}
          >
            <SpaceBlock title="Ringkasan Dana">
              <Paragraph>
                Ringkasan ini menampilkan total pemasukan, total pengeluaran,
                dan saldo kas kelas yang sedang berjalan.
              </Paragraph>
              <Paragraph>
                <Text strong>Total pemasukan:</Text>{" "}
                {currencyFormatter.format(Number(summary.income_total || 0))}
              </Paragraph>
              <Paragraph>
                <Text strong>Total pengeluaran:</Text>{" "}
                {currencyFormatter.format(Number(summary.expense_total || 0))}
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                <Text strong>Saldo akhir:</Text>{" "}
                <Tag color="blue">
                  {currencyFormatter.format(Number(summary.balance || 0))}
                </Tag>
              </Paragraph>
            </SpaceBlock>
          </Card>
        </MotionDiv>
      </Col>

      <Col xs={24} xl={16}>
        <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card
            variant="borderless"
            style={cardStyle}
            styles={{ body: { padding: 18 } }}
          >
            <SpaceBlock title="Detail Pemasukan Terbaru">
              <Table
                rowKey="transaction_id"
                columns={incomeColumns}
                dataSource={incomeTransactions.slice(0, 10)}
                pagination={false}
              />
            </SpaceBlock>
          </Card>
        </MotionDiv>
      </Col>

      <Col xs={24}>
        <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card
            variant="borderless"
            style={cardStyle}
            styles={{ body: { padding: 18 } }}
          >
            <SpaceBlock title="Detail Pengeluaran">
              <Table
                rowKey="transaction_id"
                columns={expenseColumns}
                dataSource={expenseTransactions}
                pagination={{ pageSize: 10 }}
              />
            </SpaceBlock>
          </Card>
        </MotionDiv>
      </Col>
    </Row>
  );
};

const SpaceBlock = ({ title, children }) => (
  <>
    <Title level={5} style={{ marginTop: 0 }}>
      {title}
    </Title>
    {children}
  </>
);

export default StudentContributionSummaryTab;
