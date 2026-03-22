import { Dropdown, Modal, Space, Table, Tag, Typography } from "antd";
import { MoreOutlined } from "@ant-design/icons";

import { currencyFormatter } from "../constants";

const { Text } = Typography;

const OthersTypesTable = ({
  types,
  loading,
  onEditType,
  onDeleteType,
  isDeletingType,
}) => {
  const columns = [
    {
      title: "Jenis Biaya",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{record.name}</Text>
          <Text
            type='secondary'
            style={{ whiteSpace: "normal", wordBreak: "break-word" }}
          >
            {record.description || "Tanpa deskripsi"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      width: 160,
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Tingkat",
      dataIndex: "grade_names",
      key: "grade_names",
      width: 180,
      render: (value) =>
        Array.isArray(value) && value.length > 0 ? value.join(", ") : "-",
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      render: (value) => (
        <Tag color={value ? "green" : "red"}>
          {value ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "Dipakai",
      dataIndex: "charge_count",
      key: "charge_count",
      width: 110,
      render: (value) => `${value || 0} tagihan`,
    },
    {
      title: "Aksi",
      key: "action",
      width: 160,
      render: (_, record) => {
        const menuItems = [
          {
            key: "edit",
            label: "Edit",
          },
          {
            key: "delete",
            label: "Hapus",
            danger: true,
          },
        ];

        const handleMenuClick = ({ key }) => {
          if (key === "edit") {
            onEditType(record);
            return;
          }

          if (key === "delete") {
            Modal.confirm({
              title: "Hapus jenis biaya ini?",
              content: `Jenis biaya ${record.name} akan dihapus.`,
              okText: "Hapus",
              cancelText: "Batal",
              okButtonProps: { danger: true, loading: isDeletingType },
              onOk: () => onDeleteType(record.type_id),
            });
          }
        };

        return (
          <Dropdown.Button
            type='primary'
            icon={<MoreOutlined />}
            menu={{
              items: menuItems,
              onClick: handleMenuClick,
            }}
            onClick={() => onEditType(record)}
          >
            Pilih Aksi
          </Dropdown.Button>
        );
      },
    },
  ];

  return (
    <Table
      rowKey='type_id'
      columns={columns}
      dataSource={types}
      loading={loading}
      pagination={{ pageSize: 8 }}
      scroll={{ x: 760 }}
      locale={{ emptyText: "Belum ada jenis biaya tambahan." }}
    />
  );
};

export default OthersTypesTable;
