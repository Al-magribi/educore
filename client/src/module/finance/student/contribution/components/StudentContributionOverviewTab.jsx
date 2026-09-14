import { Card, Descriptions, Space, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";

import { cardStyle, currencyFormatter, formatDateTime } from "../constants";

const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const StudentContributionOverviewTab = ({
  ownStudent,
  officers,
  students,
  studentsLoading,
}) => {
  const officerColumns = [
    {
      title: "Petugas",
      key: "student_name",
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.student_name}</Text>
          <Text type="secondary">{record.nis || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (value) =>
        value ? <Tag color="blue">Aktif</Tag> : <Tag color="default">Nonaktif</Tag>,
    },
    {
      title: "Ditugaskan",
      dataIndex: "assigned_at",
      key: "assigned_at",
      render: (value) => formatDateTime(value),
    },
  ];

  const studentColumns = [
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.student_name}</Text>
          <Text type="secondary">{record.nis || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Status Bayar",
      dataIndex: "is_paid",
      key: "is_paid",
      render: (value) =>
        value ? <Tag color="green">Sudah Bayar</Tag> : <Tag color="gold">Belum Bayar</Tag>,
    },
    {
      title: "Total Setoran",
      dataIndex: "total_paid",
      key: "total_paid",
      align: "right",
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Petugas",
      dataIndex: "is_officer",
      key: "is_officer",
      render: (value) =>
        value ? <Tag color="blue">Petugas</Tag> : <Text type="secondary">-</Text>,
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
        <Card
          variant="borderless"
          style={cardStyle}
          styles={{ body: { padding: 18 } }}
        >
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Ringkasan Siswa Anda
              </Title>
              <Text type="secondary">
                Informasi ini menunjukkan status pembayaran kas pribadi Anda pada
                periode berjalan.
              </Text>
            </div>

            <Descriptions column={{ xs: 1, md: 2, xl: 4 }} size="small">
              <Descriptions.Item label="Nama">
                {ownStudent?.student_name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="NIS">
                {ownStudent?.nis || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Status Bayar">
                {ownStudent?.is_paid ? (
                  <Tag color="green">Sudah Bayar</Tag>
                ) : (
                  <Tag color="gold">Belum Bayar</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Total Setoran">
                {currencyFormatter.format(Number(ownStudent?.total_paid || 0))}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        </Card>
      </MotionDiv>

      <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
        <Card
          variant="borderless"
          style={cardStyle}
          title="Petugas Kas Kelas"
          styles={{ body: { padding: 18 } }}
        >
          <Table
            rowKey="officer_id"
            columns={officerColumns}
            dataSource={officers}
            pagination={false}
            scroll={{ x: 720 }}
          />
        </Card>
      </MotionDiv>

      <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
        <Card
          variant="borderless"
          style={cardStyle}
          title="Status Pembayaran Kelas"
          styles={{ body: { padding: 18 } }}
        >
          <Paragraph style={{ marginTop: 0, color: "#64748b" }}>
            Tabel ini menampilkan siswa di kelas aktif beserta status pembayaran
            kas pada periode berjalan.
          </Paragraph>
          <Table
            rowKey="student_id"
            columns={studentColumns}
            dataSource={students}
            loading={studentsLoading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 840 }}
          />
        </Card>
      </MotionDiv>
    </Space>
  );
};

export default StudentContributionOverviewTab;
