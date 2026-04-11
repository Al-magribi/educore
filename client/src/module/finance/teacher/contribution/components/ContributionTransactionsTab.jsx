import { Button, Card, Input, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";

import { cardStyle, currencyFormatter, formatDateTime, transactionTypeOptions } from "../constants";

const { Text } = Typography;

const ContributionTransactionsTab = ({
  selectableStudents,
  summary,
  transactions,
  loading,
  filters,
  setFilters,
  deletingTransactionId,
  onCreate,
  onEdit,
  onDelete,
}) => {
  const columns = [
    {
      title: "Tanggal",
      dataIndex: "transaction_date",
      key: "transaction_date",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Jenis",
      dataIndex: "transaction_type",
      key: "transaction_type",
      render: (value) => (
        <Tag color={value === "expense" ? "red" : "green"}>
          {value === "expense" ? "Pengeluaran" : "Pemasukan"}
        </Tag>
      ),
    },
    {
      title: "Siswa",
      key: "student_name",
      render: (_, record) =>
        record.student_name ? (
          <Space direction='vertical' size={0}>
            <Text strong>{record.student_name}</Text>
            <Text type='secondary'>{record.nis || "-"}</Text>
          </Space>
        ) : (
          <Text type='secondary'>Pengeluaran umum</Text>
        ),
    },
    {
      title: "Petugas Input",
      dataIndex: "processed_by_name",
      key: "processed_by_name",
      render: (value) => value || "-",
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value, record) => (
        <Text
          style={{
            color: record.transaction_type === "expense" ? "#dc2626" : "#15803d",
            fontWeight: 600,
          }}
        >
          {record.transaction_type === "expense" ? "-" : "+"}
          {currencyFormatter.format(Number(value || 0))}
        </Text>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button type='link' onClick={() => onEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title='Hapus transaksi ini?'
            onConfirm={() => onDelete(record)}
            okButtonProps={{
              loading: deletingTransactionId === record.transaction_id,
            }}
          >
            <Button type='link' danger>
              Hapus
            </Button>
          </Popconfirm>
        </Space>
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
              placeholder='Jenis transaksi'
              options={transactionTypeOptions}
              style={{ width: 180 }}
              value={filters.transaction_type}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  transaction_type: value,
                }))
              }
            />
            <Select
              allowClear
              showSearch
              optionFilterProp='label'
              placeholder='Filter siswa'
              style={{ width: 280 }}
              value={filters.student_id}
              options={selectableStudents.map((item) => ({
                value: item.student_id,
                label: `${item.student_name}${item.nis ? ` (${item.nis})` : ""}`,
              }))}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  student_id: value,
                }))
              }
            />
          </Space>
          <Button type='primary' onClick={() => onCreate(null, "income")}>
            Tambah Transaksi
          </Button>
        </Space>

        <Space wrap>
          <Tag color='green'>
            Pemasukan: {currencyFormatter.format(Number(summary.income_total || 0))}
          </Tag>
          <Tag color='red'>
            Pengeluaran: {currencyFormatter.format(Number(summary.expense_total || 0))}
          </Tag>
          <Tag color='blue'>
            Saldo: {currencyFormatter.format(Number(summary.balance || 0))}
          </Tag>
        </Space>

        <Table
          rowKey='transaction_id'
          columns={columns}
          dataSource={transactions}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 980 }}
        />
      </Space>
    </Card>
  );
};

export default ContributionTransactionsTab;
