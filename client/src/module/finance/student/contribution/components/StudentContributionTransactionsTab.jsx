import { Button, Card, Input, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";

import {
  cardStyle,
  currencyFormatter,
  formatDateTime,
  transactionTypeLabel,
} from "../constants";

const { Text } = Typography;

const StudentContributionTransactionsTab = ({
  access,
  variant,
  selectableStudents,
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
          {transactionTypeLabel(value)}
        </Tag>
      ),
    },
    {
      title: "Siswa",
      key: "student",
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
      title: "Keterangan",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Input Oleh",
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
  ];

  const isIncomeTab = variant === "income";

  if (access?.is_officer) {
    columns.push({
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
    });
  }

  return (
    <Card style={cardStyle}>
      <Space direction='vertical' size={16} style={{ width: "100%" }}>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap>
            <Input.Search
              placeholder={isIncomeTab ? "Cari siswa pembayar" : "Cari keperluan pengeluaran"}
              allowClear
              style={{ width: 280 }}
              onSearch={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  search: value,
                }))
              }
            />
            {isIncomeTab ? (
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
            ) : null}
          </Space>

          {access?.is_officer ? (
            <Button
              type='primary'
              onClick={() => onCreate(null, isIncomeTab ? "income" : "expense")}
            >
              {isIncomeTab ? "Catat Pembayaran" : "Catat Pengeluaran"}
            </Button>
          ) : null}
        </Space>

        <Table
          rowKey='transaction_id'
          columns={columns}
          dataSource={transactions}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1100 }}
        />
      </Space>
    </Card>
  );
};

export default StudentContributionTransactionsTab;
