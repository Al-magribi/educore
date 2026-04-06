import { Button, Card, Dropdown, Modal, Space, Table, Tag, Typography } from "antd";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";

import {
  cardStyle,
  currencyFormatter,
  formatSavingDate,
  transactionTypeMeta,
} from "../constants";

const { Text } = Typography;

const SavingTransactionTable = ({
  transactions,
  summary,
  loading,
  onEdit,
  onDelete,
  deletingId,
}) => {
  const columns = [
    {
      title: "Tanggal",
      dataIndex: "transaction_date",
      key: "transaction_date",
      width: 132,
      render: (value) => formatSavingDate(value),
    },
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
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
      title: "Jenis",
      dataIndex: "transaction_type",
      key: "transaction_type",
      width: 130,
      render: (value) => (
        <Tag color={transactionTypeMeta[value]?.color || "default"}>
          {transactionTypeMeta[value]?.label || value}
        </Tag>
      ),
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      width: 160,
      render: (value, record) => (
        <Text
          strong
          style={{
            color:
              record.transaction_type === "withdrawal" ? "#d97706" : "#059669",
          }}
        >
          {record.transaction_type === "withdrawal" ? "- " : "+ "}
          {currencyFormatter.format(Number(value || 0))}
        </Text>
      ),
    },
    {
      title: "Keterangan",
      dataIndex: "description",
      key: "description",
      render: (value) => value || "-",
    },
    {
      title: "Walas",
      dataIndex: "processed_by_name",
      key: "processed_by_name",
      width: 180,
      render: (value) => value || "-",
    },
    {
      title: "Aksi",
      key: "action",
      width: 140,
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
            Modal.confirm({
              title: "Hapus transaksi ini?",
              content: "Perubahan saldo siswa akan dihitung ulang.",
              okText: "Hapus",
              cancelText: "Batal",
              okButtonProps: { danger: true },
              onOk: () => onDelete(record),
            });
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
            loading={deletingId === record.transaction_id}
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
      title='Riwayat Transaksi Tabungan'
      extra={
        <Space wrap size={16}>
          <Text type='secondary'>
            Setoran {currencyFormatter.format(summary?.total_deposit || 0)}
          </Text>
          <Text type='secondary'>
            Penarikan {currencyFormatter.format(summary?.total_withdrawal || 0)}
          </Text>
        </Space>
      }
    >
      <Table
        rowKey='transaction_id'
        columns={columns}
        dataSource={transactions}
        loading={loading}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 980 }}
        locale={{
          emptyText: "Belum ada transaksi tabungan pada filter saat ini.",
        }}
      />
    </Card>
  );
};

export default SavingTransactionTable;
