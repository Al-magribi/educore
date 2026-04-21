import { Button, Card, Dropdown, Flex, Modal, Space, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { MoreHorizontal, Plus } from "lucide-react";

import { currencyFormatter } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const OthersTypesTable = ({
  types,
  loading,
  onAddType,
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
        <Tag
          color={value ? "green" : "red"}
          style={{ borderRadius: 999, fontWeight: 600 }}
        >
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
              onOk: () => onDeleteType(record),
            });
          }
        };

        return (
          <Dropdown.Button
            type='primary'
            icon={<MoreHorizontal size={16} />}
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
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        variant='borderless'
        style={{
          borderRadius: 22,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
          border: "1px solid rgba(148,163,184,0.14)",
          boxShadow: "0 18px 36px rgba(15,23,42,0.05)",
        }}
      >
        <Flex justify='space-between' align='center' wrap='wrap' gap={12} style={{ marginBottom: 16 }}>
          <div>
            <Text strong style={{ display: "block", color: "#0f172a" }}>
              Master Jenis Biaya
            </Text>
            <Text type='secondary'>
              Kelola daftar biaya non-SPP yang dipakai pada satuan aktif.
            </Text>
          </div>
          <Button type='primary' icon={<Plus size={16} />} onClick={onAddType}>
            Atur Jenis Biaya
          </Button>
        </Flex>

        <Table
          rowKey='type_id'
          columns={columns}
          dataSource={types}
          loading={loading}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 760 }}
          locale={{ emptyText: "Belum ada jenis biaya tambahan." }}
        />
      </Card>
    </MotionDiv>
  );
};

export default OthersTypesTable;
