import { Card, Col, Empty, Row, Space, Typography } from "antd";
import { Clock3, IdCard, Landmark } from "lucide-react";

import {
  cardStyle,
  currencyFormatter,
  formatSavingDate,
} from "../constants";

const { Text, Title } = Typography;

const StudentSavingOverviewTab = ({ student, summary }) => {
  if (!student) {
    return (
      <Card style={cardStyle}>
        <Empty description='Data tabungan siswa belum tersedia.' />
      </Card>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}>
        <Card style={cardStyle}>
          <Space direction='vertical' size={14} style={{ width: "100%" }}>
            <div>
              <Text type='secondary'>Pemilik Tabungan</Text>
              <Title level={4} style={{ margin: "4px 0 0" }}>
                {student.student_name}
              </Title>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <Card size='small' style={{ borderRadius: 16 }}>
                  <Space direction='vertical' size={2}>
                    <Space align='center'>
                      <IdCard size={16} color='#2563eb' />
                      <Text strong>NIS</Text>
                    </Space>
                    <Text>{student.nis || "-"}</Text>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size='small' style={{ borderRadius: 16 }}>
                  <Space direction='vertical' size={2}>
                    <Space align='center'>
                      <Landmark size={16} color='#0891b2' />
                      <Text strong>Kelas</Text>
                    </Space>
                    <Text>{student.class_name || "-"}</Text>
                  </Space>
                </Card>
              </Col>
            </Row>

            <Card
              size='small'
              style={{
                borderRadius: 18,
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              }}
            >
              <Text type='secondary'>Saldo terakhir</Text>
              <Title level={3} style={{ margin: "6px 0 0" }}>
                {currencyFormatter.format(Number(summary?.balance || 0))}
              </Title>
            </Card>
          </Space>
        </Card>
      </Col>

      <Col xs={24} lg={10}>
        <Card style={cardStyle}>
          <Space direction='vertical' size={14} style={{ width: "100%" }}>
            <div>
              <Text type='secondary'>Aktivitas</Text>
              <Title level={5} style={{ margin: "4px 0 0" }}>
                Ringkasan mutasi
              </Title>
            </div>

            <Card size='small' style={{ borderRadius: 16 }}>
              <Space align='center'>
                <Clock3 size={16} color='#7c3aed' />
                <Space direction='vertical' size={0}>
                  <Text strong>Transaksi terakhir</Text>
                  <Text type='secondary'>
                    {formatSavingDate(summary?.latest_transaction_date)}
                  </Text>
                </Space>
              </Space>
            </Card>

            <Card size='small' style={{ borderRadius: 16 }}>
              <Text strong>Jumlah setoran</Text>
              <div>{summary?.deposit_count || 0} transaksi</div>
            </Card>

            <Card size='small' style={{ borderRadius: 16 }}>
              <Text strong>Jumlah penarikan</Text>
              <div>{summary?.withdrawal_count || 0} transaksi</div>
            </Card>
          </Space>
        </Card>
      </Col>
    </Row>
  );
};

export default StudentSavingOverviewTab;
