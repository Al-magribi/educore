import { memo, useMemo } from "react";
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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const renderActions = (record) => {
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
        size={isMobile ? "small" : "middle"}
        menu={{
          items,
          onClick: handleMenuClick,
        }}
        trigger={["click"]}
        icon={<ChevronDown size={16} />}
        loading={deletingId === record.transaction_id}
        onClick={() => onEdit(record)}
      >
        {isMobile ? "Aksi" : "Pilih Aksi"}
      </Dropdown.Button>
    );
  };

  const desktopColumns = useMemo(
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
          <Space orientation='vertical' size={0}>
            <Text strong style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
              {record.student_name}
            </Text>
            <Text type='secondary' style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
              {record.nis || "-"} | {record.class_name || "-"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Periode",
        dataIndex: "periode_name",
        key: "periode_name",
        width: 130,
        render: (value) => value || "-",
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
        fixed: "right",
        render: (_, record) => renderActions(record),
      },
    ],
    [deletingId, isMobile, onDelete, onEdit],
  );

  const mobileColumns = [
    {
      title: "Transaksi",
      key: "transaction",
      render: (_, record) => (
        <Flex vertical gap={10} style={{ width: "100%" }}>
          <Flex justify='space-between' align='flex-start' gap={8}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text
                strong
                style={{
                  display: "block",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
              >
                {record.student_name}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {record.nis || "-"} · {record.class_name || "-"}
              </Text>
            </div>
            <Tag
              color={transactionTypeMeta[record.transaction_type]?.color || "default"}
              style={{ margin: 0 }}
            >
              {transactionTypeMeta[record.transaction_type]?.label ||
                record.transaction_type}
            </Tag>
          </Flex>

          <Flex justify='space-between' align='center' gap={8} wrap='wrap'>
            <div>
              <Text
                strong
                style={{
                  color:
                    record.transaction_type === "withdrawal"
                      ? "#d97706"
                      : "#059669",
                  fontSize: 15,
                }}
              >
                {record.transaction_type === "withdrawal" ? "- " : "+ "}
                {currencyFormatter.format(Number(record.amount || 0))}
              </Text>
              <Text type='secondary' style={{ display: "block", fontSize: 12 }}>
                {formatSavingDate(record.transaction_date)}
                {record.periode_name ? ` · ${record.periode_name}` : ""}
              </Text>
              {record.description ? (
                <Text
                  type='secondary'
                  style={{
                    display: "block",
                    fontSize: 12,
                    wordBreak: "break-word",
                  }}
                >
                  {record.description}
                </Text>
              ) : null}
            </div>
            <div>{renderActions(record)}</div>
          </Flex>
        </Flex>
      ),
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card
        variant='borderless'
        style={{
          ...cardStyle,
          borderRadius: isMobile ? 16 : undefined,
          overflow: "hidden",
        }}
        styles={{ body: { padding: isMobile ? 10 : 18 } }}
      >
        <Space orientation='vertical' size={16} style={{ width: "100%" }}>
          <Flex
            wrap
            gap={14}
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            style={{ width: "100%" }}
          >
            <Space orientation='vertical' size={4} style={{ minWidth: 0 }}>
              <Title level={5} style={{ margin: 0, fontSize: isMobile ? 15 : undefined }}>
                Riwayat Transaksi Tabungan
              </Title>
              {!isMobile ? (
                <Text type='secondary'>
                  Pantau seluruh setoran dan penarikan siswa sesuai filter aktif.
                </Text>
              ) : null}
            </Space>
            <Space wrap size={[8, 8]}>
              <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                Setoran {currencyFormatter.format(summary?.total_deposit || 0)}
              </Text>
              <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                Penarikan{" "}
                {currencyFormatter.format(summary?.total_withdrawal || 0)}
              </Text>
            </Space>
          </Flex>

          <Table
            rowKey='transaction_id'
            columns={isMobile ? mobileColumns : desktopColumns}
            dataSource={transactions}
            loading={loading}
            size={isMobile ? "small" : "middle"}
            pagination={{
              pageSize: isMobile ? 6 : 8,
              size: isMobile ? "small" : "default",
              showSizeChanger: !isMobile,
            }}
            scroll={isMobile ? undefined : { x: 980 }}
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
