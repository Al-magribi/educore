import { Card, Space, Tag, Typography } from "antd";
import { PiggyBank } from "lucide-react";

import { cardStyle } from "../constants";

const { Text, Title } = Typography;

const StudentSavingHeader = ({ activePeriode, student }) => (
  <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
    <Space direction='vertical' size={6} style={{ width: "100%" }}>
      <Text
        type='secondary'
        style={{
          fontSize: 12,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        Keuangan / Tabungan Saya
      </Text>

      <Space align='center'>
        <PiggyBank size={20} color='#0284c7' />
        <Title level={4} style={{ margin: 0 }}>
          Riwayat tabungan siswa
        </Title>
      </Space>

      <Text type='secondary'>
        Lihat saldo, mutasi setoran, dan penarikan tabungan pada periode aktif.
      </Text>

      <Space wrap>
        <Tag color='blue'>{activePeriode?.name || "Periode aktif"}</Tag>
        <Tag color='cyan'>
          {student?.class_name || "-"}
          {student?.grade_name ? ` • ${student.grade_name}` : ""}
        </Tag>
      </Space>
    </Space>
  </Card>
);

export default StudentSavingHeader;
