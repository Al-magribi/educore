import {
  Button,
  Card,
  Dropdown,
  Flex,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { ChevronDown, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";

import { currencyFormatter } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const MonthlyTariffTable = ({
  tariffs,
  loading,
  onEdit,
  onDelete,
  isDeletingTariff,
  onCreate,
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
        <Tag
          color={value ? "green" : "default"}
          style={{ borderRadius: 999, fontWeight: 600 }}
        >
          {value ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Dropdown
          trigger={["click"]}
          disabled={isDeletingTariff}
          menu={{
            items: [
              {
                key: "edit",
                label: "Edit tarif",
                icon: <Pencil size={14} />,
              },
              {
                key: "delete",
                label: "Hapus tarif",
                danger: true,
                icon: <Trash2 size={14} />,
              },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent?.stopPropagation?.();

              if (key === "edit") {
                onEdit(record);
                return;
              }

              if (key === "delete") {
                Modal.confirm({
                  title: "Hapus tarif SPP ini?",
                  content:
                    "Tarif yang sudah dipakai pembayaran tidak dapat dihapus.",
                  okText: "Hapus",
                  okButtonProps: { danger: true },
                  cancelText: "Batal",
                  onOk: () => onDelete(record.id),
                });
              }
            },
          }}
        >
          <Button icon={<ReceiptText size={14} />} loading={isDeletingTariff}>
            Opsi
            <ChevronDown size={14} style={{ marginLeft: 8 }} />
          </Button>
        </Dropdown>
      ),
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
        <Flex
          justify='space-between'
          align='center'
          wrap='wrap'
          gap={12}
          style={{ marginBottom: 16 }}
        >
          <Space align='center' size={10}>
            <span
              style={{
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
                borderRadius: 14,
                background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                color: "#2563eb",
              }}
            >
              <ReceiptText size={18} />
            </span>
            <div>
              <Text strong style={{ display: "block", color: "#0f172a" }}>
                Tarif SPP Aktif
              </Text>
              <Text type='secondary'>
                Tarif berlaku per satuan, periode, dan tingkat.
              </Text>
            </div>
          </Space>
          <Button type='primary' icon={<Plus size={16} />} onClick={onCreate}>
            Tambah Tarif SPP
          </Button>
        </Flex>
        <Table
          rowKey='id'
          columns={columns}
          dataSource={tariffs}
          loading={loading}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </MotionDiv>
  );
};

export default MonthlyTariffTable;
