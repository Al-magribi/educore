import { Button, Card, Col, Empty, Row, Space, Tag, Typography } from "antd";
import { ArrowDownCircle, ArrowUpCircle, PiggyBank } from "lucide-react";

import { cardStyle, currencyFormatter, formatSavingDate } from "../constants";

const { Text, Title } = Typography;

const SavingStudentsList = ({ students, loading, onCreate }) => {
  if (!loading && students.length === 0) {
    return (
      <Card style={cardStyle}>
        <Empty description='Belum ada siswa yang sesuai dengan filter aktif.' />
      </Card>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {students.map((student) => (
        <Col xs={24} md={12} xl={8} key={student.student_id}>
          <Card
            loading={loading}
            style={cardStyle}
            styles={{ body: { padding: 18 } }}
          >
            <Space vertical size={14} style={{ width: "100%" }}>
              <Space
                align='start'
                style={{ width: "100%", justifyContent: "space-between" }}
              >
                <Space vertical size={2}>
                  <Title level={5} style={{ margin: 0 }}>
                    {student.student_name}
                  </Title>
                  <Text type='secondary'>
                    {student.nis || "-"} | {student.class_name || "-"}
                  </Text>
                </Space>
                <Tag color={student.balance > 0 ? "green" : "default"}>
                  {student.balance > 0 ? "Aktif" : "Belum ada saldo"}
                </Tag>
              </Space>

              <Card
                size='small'
                style={{
                  borderRadius: 18,
                  background:
                    "linear-gradient(135deg, #eff6ff 0%, #dcfce7 100%)",
                  border: "1px solid rgba(59, 130, 246, 0.12)",
                }}
              >
                <Space vertical size={2}>
                  <Text type='secondary'>Saldo Saat Ini</Text>
                  <Space align='center'>
                    <PiggyBank size={18} color='#059669' />
                    <Title level={4} style={{ margin: 0 }}>
                      {currencyFormatter.format(student.balance)}
                    </Title>
                  </Space>
                </Space>
              </Card>

              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Card size='small' style={{ borderRadius: 16 }}>
                    <Text type='secondary'>Setoran</Text>
                    <div style={{ fontWeight: 600 }}>
                      {currencyFormatter.format(student.deposit_total)}
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size='small' style={{ borderRadius: 16 }}>
                    <Text type='secondary'>Penarikan</Text>
                    <div style={{ fontWeight: 600 }}>
                      {currencyFormatter.format(student.withdrawal_total)}
                    </div>
                  </Card>
                </Col>
              </Row>

              <Text type='secondary'>
                {student.transaction_count > 0
                  ? `Terakhir transaksi ${formatSavingDate(student.last_transaction_date)}`
                  : "Belum ada transaksi pada periode aktif."}
              </Text>

              <Space wrap style={{ width: "100%" }}>
                <Button
                  type='primary'
                  icon={<ArrowDownCircle size={16} />}
                  onClick={() => onCreate(student, "deposit")}
                >
                  Setoran
                </Button>
                <Button
                  icon={<ArrowUpCircle size={16} />}
                  onClick={() => onCreate(student, "withdrawal")}
                >
                  Penarikan
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default SavingStudentsList;
