import { Card, Descriptions, Space, Table, Tag, Typography } from "antd";

import { cardStyle, currencyFormatter, formatDateTime } from "../constants";

const { Paragraph, Text } = Typography;

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
        <Space direction='vertical' size={0}>
          <Text strong>{record.student_name}</Text>
          <Text type='secondary'>{record.nis || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (value) =>
        value ? <Tag color='blue'>Aktif</Tag> : <Tag color='default'>Nonaktif</Tag>,
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
        <Space direction='vertical' size={0}>
          <Text strong>{record.student_name}</Text>
          <Text type='secondary'>{record.nis || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Status Bayar",
      dataIndex: "is_paid",
      key: "is_paid",
      render: (value) =>
        value ? <Tag color='green'>Sudah Bayar</Tag> : <Tag color='gold'>Belum Bayar</Tag>,
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
        value ? <Tag color='blue'>Petugas</Tag> : <Text type='secondary'>-</Text>,
    },
  ];

  return (
    <Space direction='vertical' size={16} style={{ width: "100%" }}>
      <Card style={cardStyle}>
        <Descriptions column={{ xs: 1, md: 2, xl: 4 }} size='small'>
          <Descriptions.Item label='Nama'>
            {ownStudent?.student_name || "-"}
          </Descriptions.Item>
          <Descriptions.Item label='NIS'>
            {ownStudent?.nis || "-"}
          </Descriptions.Item>
          <Descriptions.Item label='Status Bayar'>
            {ownStudent?.is_paid ? (
              <Tag color='green'>Sudah Bayar</Tag>
            ) : (
              <Tag color='gold'>Belum Bayar</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label='Total Setoran'>
            {currencyFormatter.format(Number(ownStudent?.total_paid || 0))}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={cardStyle} title='Petugas Kas Kelas'>
        <Table
          rowKey='officer_id'
          columns={officerColumns}
          dataSource={officers}
          pagination={false}
          scroll={{ x: 720 }}
        />
      </Card>

      <Card style={cardStyle} title='Status Pembayaran Kelas'>
        <Paragraph style={{ marginTop: 0 }}>
          Tabel ini menampilkan siswa di kelas aktif beserta status pembayaran kas
          pada periode berjalan.
        </Paragraph>
        <Table
          rowKey='student_id'
          columns={studentColumns}
          dataSource={students}
          loading={studentsLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 840 }}
        />
      </Card>
    </Space>
  );
};

export default StudentContributionOverviewTab;
