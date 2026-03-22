import { Button, Popconfirm, Space, Table, Tag } from "antd";

import { currencyFormatter } from "../constants";

const MonthlyTariffTable = ({
  tariffs,
  loading,
  onEdit,
  onDelete,
  isDeletingTariff,
}) => {
  const columns = [
    { title: "Periode", dataIndex: "periode_name", key: "periode_name" },
    { title: "Tingkat", dataIndex: "grade_name", key: "grade_name" },
    {
      title: "Tarif",
      dataIndex: "amount",
      key: "amount",
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      render: (value) => (
        <Tag color={value ? "green" : "default"}>{value ? "Aktif" : "Nonaktif"}</Tag>
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
            title='Hapus tarif SPP ini?'
            description='Tarif yang sudah dipakai pembayaran tidak dapat dihapus.'
            onConfirm={() => onDelete(record.id)}
            okText='Hapus'
            cancelText='Batal'
          >
            <Button type='link' danger loading={isDeletingTariff}>
              Hapus
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey='id'
      columns={columns}
      dataSource={tariffs}
      loading={loading}
      scroll={{ x: 900 }}
      pagination={{ pageSize: 10 }}
    />
  );
};

export default MonthlyTariffTable;
