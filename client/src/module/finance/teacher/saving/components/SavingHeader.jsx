import { Button, Card, Flex, Space, Tag, Typography } from "antd";
import { Landmark, Plus } from "lucide-react";

import { cardStyle } from "../constants";

const { Text, Title } = Typography;

const SavingHeader = ({ access, activePeriode, onCreate }) => (
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
          Finance / Tabungan Siswa
        </Text>
        <Title level={4} style={{ margin: 0 }}>
          Kelola Tabungan Siswa
        </Title>
        <Space wrap>
          <Tag color='green'>{activePeriode?.name || "Periode aktif"}</Tag>
          <Tag color={access?.role_scope === "teacher" ? "blue" : "purple"}>
            {access?.role_scope === "teacher"
              ? `Wali Kelas ${access?.homeroom_class?.name || ""}`.trim()
              : "Admin Keuangan"}
          </Tag>
        </Space>
      </Space>

      <Button
        type='primary'
        icon={<Plus size={16} />}
        onClick={() => onCreate(null, "deposit")}
      >
        Catat Tabungan
      </Button>
    </Flex>

    <Card
      size='small'
      style={{
        marginTop: 16,
        borderRadius: 18,
        background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
        border: "1px solid rgba(16, 185, 129, 0.18)",
      }}
    >
      <Space align='start'>
        <Landmark size={18} color='#047857' style={{ marginTop: 2 }} />
        <Text type='secondary'>
          Setoran dan penarikan hanya diproses pada periode yang sedang aktif.
          Guru hanya melihat siswa dari kelas yang ditugaskan sebagai wali
          kelas.
        </Text>
      </Space>
    </Card>
  </Card>
);

export default SavingHeader;
