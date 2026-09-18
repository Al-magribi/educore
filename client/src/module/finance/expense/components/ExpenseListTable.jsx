import { Button, Flex, Grid, Modal, Space, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { Pencil, Trash2 } from "lucide-react";

import {
  categoryColor,
  categoryLabel,
  currencyFormatter,
  paymentMethodLabel,
} from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const ExpenseListTable = ({
  data,
  loading,
  onEdit,
  onDelete,
  deleting,
  categoryMeta = {},
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const resolveCategory = (value) => ({
    label: categoryMeta[value]?.label || categoryLabel[value] || value,
    color: categoryMeta[value]?.color || categoryColor[value] || "default",
  });

  const handleDelete = (record) => {
    Modal.confirm({
      title: `Hapus pengeluaran "${record.title}"?`,
      content: "Data yang dihapus tidak dapat dikembalikan.",
      okText: "Hapus",
      okButtonProps: { danger: true, loading: deleting },
      cancelText: "Batal",
      onOk: () => onDelete(record),
    });
  };

  const desktopColumns = [
    {
      title: "Tanggal",
      dataIndex: "expense_date",
      width: 120,
      render: (value) =>
        value ? dayjs(value).format("DD MMM YYYY") : "-",
    },
    {
      title: "Pengeluaran",
      key: "title",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.title}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description || record.periode_name || "Tanpa keterangan"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Kategori",
      dataIndex: "category",
      width: 150,
      render: (value) => {
        const meta = resolveCategory(value);
        return (
          <Tag color={meta.color} style={{ borderRadius: 999 }}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Metode",
      dataIndex: "payment_method",
      width: 110,
      render: (value) => paymentMethodLabel[value] || value || "-",
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      width: 140,
      align: "right",
      render: (value) => (
        <Text strong style={{ color: "#be123c" }}>
          {currencyFormatter.format(Number(value || 0))}
        </Text>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<Pencil size={14} />}
            onClick={() => onEdit(record)}
          />
          <Button
            size="small"
            danger
            icon={<Trash2 size={14} />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  const mobileColumns = [
    {
      title: "Pengeluaran",
      key: "mobile",
      render: (_, record) => (
        <Flex vertical gap={10} style={{ width: "100%" }}>
          <Flex justify="space-between" align="flex-start" gap={8}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ display: "block", wordBreak: "break-word" }}>
                {record.title}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.expense_date
                  ? dayjs(record.expense_date).format("DD MMM YYYY")
                  : "-"}
                {record.periode_name ? ` · ${record.periode_name}` : ""}
              </Text>
            </div>
            <Tag
              color={resolveCategory(record.category).color}
              style={{ borderRadius: 999, margin: 0 }}
            >
              {resolveCategory(record.category).label}
            </Tag>
          </Flex>

          <Flex justify="space-between" align="center" gap={8}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                {paymentMethodLabel[record.payment_method] ||
                  record.payment_method}
                {record.reference_no ? ` · ${record.reference_no}` : ""}
              </Text>
              <Text strong style={{ color: "#be123c", fontSize: 16 }}>
                {currencyFormatter.format(Number(record.amount || 0))}
              </Text>
            </div>
            <Space size={4}>
              <Button
                size="small"
                icon={<Pencil size={14} />}
                onClick={() => onEdit(record)}
              />
              <Button
                size="small"
                danger
                icon={<Trash2 size={14} />}
                onClick={() => handleDelete(record)}
              />
            </Space>
          </Flex>
        </Flex>
      ),
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={isMobile ? mobileColumns : desktopColumns}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (total) => `${total} data`,
        }}
        scroll={isMobile ? undefined : { x: 900 }}
        size={isMobile ? "small" : "middle"}
      />
    </MotionDiv>
  );
};

export default ExpenseListTable;
