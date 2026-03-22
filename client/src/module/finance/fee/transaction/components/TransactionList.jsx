import dayjs from "dayjs";
import { Button, Card, Dropdown, Input, Select, Space, Table, Tag, Typography } from "antd";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";

import { cardStyle } from "../../others/constants";

const { Text } = Typography;

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const statusColors = {
  spp: "blue",
  other: "green",
};

const TransactionList = ({
  user,
  transactions,
  transactionSummary,
  transactionFilters,
  setTransactionFilters,
  loading,
  isDeletingTransaction,
  onEdit,
  onDelete,
}) => {
  const transactionColumns = [
    {
      title: "Tanggal",
      dataIndex: "paid_at",
      key: "paid_at",
      width: 140,
      render: (value) => (value ? dayjs(value).format("DD MMM YYYY") : "-"),
    },
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{record.student_name}</Text>
          <Text type='secondary'>
            {`${record.nis || "-"} | ${record.class_name || "-"} | ${record.periode_name || "-"}`}
          </Text>
        </Space>
      ),
    },
    {
      title: "Jenis",
      dataIndex: "category",
      key: "category",
      width: 110,
      render: (value) => (
        <Tag color={statusColors[value] || "default"}>
          {value === "spp" ? "SPP" : "Lainnya"}
        </Tag>
      ),
    },
    {
      title: "Keterangan",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Nominal / Metode",
      key: "amount_method",
      width: 180,
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{currencyFormatter.format(Number(record.amount || 0))}</Text>
          <Text type='secondary'>{record.payment_method || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 150,
      render: (_, record) => {
        const items = [
          {
            key: "edit",
            label: "Edit",
            icon: <Pencil size={14} />,
          },
          {
            key: "delete",
            label: "Hapus",
            icon: <Trash2 size={14} />,
            danger: true,
          },
        ];

        const handleMenuClick = ({ key }) => {
          if (key === "edit") {
            onEdit(record);
            return;
          }

          if (key === "delete") {
            onDelete(record);
          }
        };

        return (
          <Dropdown.Button
            menu={{
              items,
              onClick: handleMenuClick,
            }}
            trigger={["click"]}
            icon={<ChevronDown size={16} />}
            loading={isDeletingTransaction}
            onClick={() => onEdit(record)}
          >
            Pilih Aksi
          </Dropdown.Button>
        );
      },
    },
  ];

  return (
    <Card
      style={cardStyle}
      title='Daftar Transaksi'
      extra={
        <Text type='secondary'>
          Satuan aktif: {user?.homebase_name || user?.homebase_id || "-"}
        </Text>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder='Cari nama siswa / NIS'
          value={transactionFilters.search}
          onChange={(event) =>
            setTransactionFilters((previous) => ({
              ...previous,
              page: 1,
              search: event.target.value,
            }))
          }
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder='Filter jenis pembayaran'
          value={transactionFilters.category}
          options={[
            { value: "spp", label: "SPP" },
            { value: "other", label: "Pembayaran Lainnya" },
          ]}
          onChange={(value) =>
            setTransactionFilters((previous) => ({
              ...previous,
              page: 1,
              category: value || undefined,
            }))
          }
          style={{ width: 220 }}
          virtual={false}
        />
      </Space>

      <Table
        rowKey='key'
        columns={transactionColumns}
        dataSource={transactions}
        loading={loading}
        pagination={{
          current: transactionSummary.page || transactionFilters.page,
          pageSize: transactionSummary.limit || transactionFilters.limit,
          total: transactionSummary.total_records || 0,
          onChange: (page) =>
            setTransactionFilters((previous) => ({
              ...previous,
              page,
            })),
        }}
        scroll={{ x: 960 }}
        locale={{
          emptyText: "Belum ada transaksi pada filter saat ini.",
        }}
      />
    </Card>
  );
};

export default TransactionList;
