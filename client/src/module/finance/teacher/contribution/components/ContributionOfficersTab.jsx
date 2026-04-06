import { Button, Card, Popconfirm, Space, Table, Tag, Typography } from "antd";

import { cardStyle, formatDateTime } from "../constants";

const { Paragraph, Text } = Typography;

const ContributionOfficersTab = ({
  officers,
  loading,
  removingOfficerId,
  onOpenOfficerModal,
  onRemoveOfficer,
}) => {
  const columns = [
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
      title: "Kelas",
      dataIndex: "class_name",
      key: "class_name",
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
    {
      title: "Catatan",
      dataIndex: "notes",
      key: "notes",
      render: (value) => value || "-",
    },
    {
      title: "Aksi",
      key: "action",
      render: (_, record) =>
        record.is_active ? (
          <Popconfirm
            title='Nonaktifkan petugas ini?'
            onConfirm={() => onRemoveOfficer(record.student_id)}
            okButtonProps={{ loading: removingOfficerId === record.student_id }}
          >
            <Button type='link' danger>
              Nonaktifkan
            </Button>
          </Popconfirm>
        ) : (
          <Text type='secondary'>-</Text>
        ),
    },
  ];

  return (
    <Card style={cardStyle}>
      <Space direction='vertical' size={16} style={{ width: "100%" }}>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Paragraph style={{ margin: 0 }}>
            Petugas aktif dapat membantu pencatatan kas kelas pada periode aktif ini.
          </Paragraph>
          <Button onClick={onOpenOfficerModal}>Tambah Petugas</Button>
        </Space>

        <Table
          rowKey='officer_id'
          columns={columns}
          dataSource={officers}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </Space>
    </Card>
  );
};

export default ContributionOfficersTab;
