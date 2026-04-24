import { memo, useMemo } from "react";
import { Button, Card, Dropdown, Modal, Space, Table, Tag, Typography } from "antd";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import {
  cardStyle,
  currencyFormatter,
  formatSavingDate,
  transactionTypeMeta,
} from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const SavingTransactionTable = ({
  transactions,
  summary,
  loading,
  onEdit,
  onDelete,
  deletingId,
}) => {
  const columns = useMemo(
    () => [
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
          <Space orientation="vertical" size={0}>
            <Text strong>{record.student_name}</Text>
            <Text type="secondary">
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
        title: "Diproses Oleh",
        dataIndex: "processed_by_name",
        key: "processed_by_name",
        width: 180,
        render: (value) => value || "-",
      },
      {
        title: "Aksi",
        key: "action",
        width: 160,
        align: "center",
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
    ],
    [deletingId, onDelete, onEdit],
  );

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card
        variant="borderless"
        style={cardStyle}
        styles={{ body: { padding: 18 } }}
      >
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Space
            wrap
            size={[14, 14]}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Space orientation="vertical" size={4}>
              <Title level={5} style={{ margin: 0 }}>
                Riwayat Transaksi Tabungan
              </Title>
              <Text type="secondary">
                Pantau seluruh setoran dan penarikan siswa sesuai filter aktif.
              </Text>
            </Space>
            <Space wrap size={16}>
              <Text type="secondary">
                Setoran {currencyFormatter.format(summary?.total_deposit || 0)}
              </Text>
              <Text type="secondary">
                Penarikan {currencyFormatter.format(summary?.total_withdrawal || 0)}
              </Text>
            </Space>
          </Space>

          <Table
            rowKey="transaction_id"
            columns={columns}
            dataSource={transactions}
            loading={loading}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 980 }}
            locale={{
              emptyText: "Belum ada transaksi tabungan pada filter saat ini.",
            }}
          />
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default memo(SavingTransactionTable);
