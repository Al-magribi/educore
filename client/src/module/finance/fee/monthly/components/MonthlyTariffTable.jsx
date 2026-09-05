import {
  Button,
  Card,
  Dropdown,
  Flex,
  Grid,
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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const desktopColumns = [
    { title: "Periode", dataIndex: "periode_name", key: "periode_name", width: 180 },
    { title: "Tingkat", dataIndex: "grade_name", key: "grade_name", width: 140 },
    {
      title: "Tarif",
      dataIndex: "amount",
      key: "amount",
      width: 160,
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
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
      fixed: "right",
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

  const mobileColumns = [
    {
      title: "Tarif",
      key: "tariff",
      render: (_, record) => (
        <Flex vertical gap={10} style={{ width: "100%" }}>
          <Flex justify='space-between' align='flex-start' gap={8}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ display: "block" }}>
                {record.grade_name}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {record.periode_name}
              </Text>
            </div>
            <Tag
              color={record.is_active ? "green" : "default"}
              style={{ borderRadius: 999, fontWeight: 600, margin: 0 }}
            >
              {record.is_active ? "Aktif" : "Nonaktif"}
            </Tag>
          </Flex>
          <Flex justify='space-between' align='center' gap={8}>
            <Text strong>
              {currencyFormatter.format(Number(record.amount || 0))}
            </Text>
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
              <Button
                size='small'
                icon={<ReceiptText size={14} />}
                loading={isDeletingTariff}
              >
                Opsi
              </Button>
            </Dropdown>
          </Flex>
        </Flex>
      ),
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        variant='borderless'
        style={{
          borderRadius: isMobile ? 16 : 22,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
          border: "1px solid rgba(148,163,184,0.14)",
          boxShadow: "0 18px 36px rgba(15,23,42,0.05)",
          overflow: "hidden",
        }}
        styles={{ body: { padding: isMobile ? 10 : 24 } }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          wrap='wrap'
          gap={12}
          style={{ marginBottom: 16 }}
        >
          <Space align='center' size={10} style={{ minWidth: 0 }}>
            <span
              style={{
                width: isMobile ? 36 : 40,
                height: isMobile ? 36 : 40,
                display: "grid",
                placeItems: "center",
                borderRadius: 14,
                background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                color: "#2563eb",
                flexShrink: 0,
              }}
            >
              <ReceiptText size={18} />
            </span>
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ display: "block", color: "#0f172a" }}>
                Tarif SPP Aktif
              </Text>
              <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                Tarif berlaku per satuan, periode, dan tingkat.
              </Text>
            </div>
          </Space>
          <Button
            type='primary'
            icon={<Plus size={16} />}
            onClick={onCreate}
            block={isMobile}
          >
            Tambah Tarif SPP
          </Button>
        </Flex>
        <Table
          rowKey='id'
          columns={isMobile ? mobileColumns : desktopColumns}
          dataSource={tariffs}
          loading={loading}
          size={isMobile ? "small" : "middle"}
          scroll={isMobile ? undefined : { x: 760 }}
          pagination={{
            pageSize: isMobile ? 8 : 10,
            size: isMobile ? "small" : "default",
          }}
        />
      </Card>
    </MotionDiv>
  );
};

export default MonthlyTariffTable;
