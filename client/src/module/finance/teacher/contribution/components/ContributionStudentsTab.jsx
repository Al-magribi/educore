import { Button, Card, Input, Select, Space, Table, Tag, Typography } from "antd";

import { cardStyle, currencyFormatter, formatDateTime } from "../constants";

const { Paragraph, Text } = Typography;

const ContributionStudentsTab = ({
  filters,
  setFilters,
  summary,
  students,
  unpaidStudents,
  loading,
  onCreatePayment,
}) => {
  const columns = [
    {
      title: "Siswa",
      key: "student",
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{record.student_name}</Text>
          <Text type='secondary'>
            {record.nis || "-"} | {record.class_name || "-"}
          </Text>
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
      title: "Petugas",
      dataIndex: "is_officer",
      key: "is_officer",
      render: (value) =>
        value ? <Tag color='blue'>Petugas</Tag> : <Text type='secondary'>-</Text>,
    },
    {
      title: "Total Setoran",
      dataIndex: "total_paid",
      key: "total_paid",
      align: "right",
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Terakhir Bayar",
      dataIndex: "last_paid_at",
      key: "last_paid_at",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Aksi",
      key: "action",
      render: (_, record) => (
        <Button type='link' onClick={() => onCreatePayment(record, "income")}>
          Catat Bayar
        </Button>
      ),
    },
  ];

  return (
    <Card style={cardStyle}>
      <Space direction='vertical' size={16} style={{ width: "100%" }}>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap>
            <Input.Search
              placeholder='Cari siswa atau NIS'
              allowClear
              style={{ width: 280 }}
              onSearch={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  search: value,
                }))
              }
            />
            <Select
              allowClear
              placeholder='Filter status bayar'
              options={[
                { value: "paid", label: "Sudah bayar" },
                { value: "unpaid", label: "Belum bayar" },
              ]}
              style={{ width: 180 }}
              value={filters.status}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  status: value,
                }))
              }
            />
          </Space>
          <Space wrap>
            <Tag color='green'>Sudah bayar: {summary.paid_students || 0}</Tag>
            <Tag color='gold'>Belum bayar: {summary.unpaid_students || 0}</Tag>
          </Space>
        </Space>

        {unpaidStudents.length > 0 ? (
          <Paragraph style={{ margin: 0 }}>
            Prioritas tindak lanjut:{" "}
            <Text strong>
              {unpaidStudents
                .slice(0, 5)
                .map((item) => item.student_name)
                .join(", ")}
            </Text>
            {unpaidStudents.length > 5
              ? ` dan ${unpaidStudents.length - 5} siswa lainnya`
              : ""}
            .
          </Paragraph>
        ) : null}

        <Table
          rowKey='student_id'
          columns={columns}
          dataSource={students}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 960 }}
        />
      </Space>
    </Card>
  );
};

export default ContributionStudentsTab;
