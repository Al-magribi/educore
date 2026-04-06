import { Alert, Button, Card, Flex, Space, Tag, Typography } from "antd";

import { cardStyle } from "../constants";

const { Text, Title } = Typography;

const StudentContributionHeader = ({
  activePeriode,
  access,
  ownStudent,
  onOpenIncomeModal,
  onOpenExpenseModal,
}) => (
  <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
    <Flex justify='space-between' align='center' wrap='wrap' gap={16}>
      <Space vertical size={4}>
        <Text
          type='secondary'
          style={{
            fontSize: 12,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Finance / Kas Kelas
        </Text>
        <Title level={4} style={{ margin: 0 }}>
          Kelola Uang Kas Kelas
        </Title>
        <Space wrap>
          <Tag color='green'>{activePeriode?.name || "Periode aktif"}</Tag>
          <Tag color={access?.is_officer ? "blue" : "default"}>
            {access?.is_officer ? "Petugas Kas" : "Siswa"}
          </Tag>
          <Tag>{access?.class_scope?.name || "-"}</Tag>
        </Space>
      </Space>

      {access?.is_officer ? (
        <Space wrap>
          <Button onClick={() => onOpenExpenseModal()}>Catat Pengeluaran</Button>
          <Button type='primary' onClick={() => onOpenIncomeModal(null)}>
            Catat Pembayaran
          </Button>
        </Space>
      ) : null}
    </Flex>

    <Alert
      showIcon
      type={access?.is_officer ? "info" : "success"}
      style={{ marginTop: 16, borderRadius: 16 }}
      message={
        access?.is_officer
          ? "Anda terdaftar sebagai petugas kas kelas pada periode aktif ini."
          : "Anda melihat status kas kelas dan riwayat pembayaran pada periode aktif ini."
      }
      description={
        ownStudent?.is_paid
          ? "Status pembayaran kas Anda sudah tercatat pada periode aktif."
          : "Pembayaran kas Anda belum tercatat pada periode aktif."
      }
    />
  </Card>
);

export default StudentContributionHeader;
