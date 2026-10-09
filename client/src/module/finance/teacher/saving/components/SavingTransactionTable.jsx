import { memo, useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Dropdown,
  Flex,
  Grid,
  Modal,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ChevronDown, Download, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";

import {
  cardStyle,
  currencyFormatter,
  formatSavingDate,
  transactionTypeMeta,
} from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const summaryBoxStyle = {
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  padding: "10px 12px",
  minWidth: 0,
};

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
  const isCompact = !screens.lg;

  const handleExportExcel = () => {
    if (!transactions.length) {
      message.warning("Tidak ada transaksi untuk diekspor.");
      return;
    }

    const exportRows = transactions.map((item, index) => ({
      No: index + 1,
      Periode: item.periode_name || "-",
      NIS: item.nis || "-",
      "Nama Siswa": item.student_name || "-",
      Kelas: item.class_name || "-",
      Jenis:
        transactionTypeMeta[item.transaction_type]?.label ||
        item.transaction_type ||
        "-",
      Nominal: currencyFormatter.format(Number(item.amount || 0)),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Transaksi");
    XLSX.writeFile(workbook, "tabungan-riwayat-transaksi.xlsx");
  };

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
        size='small'
        menu={{
          items,
          onClick: handleMenuClick,
        }}
        trigger={["click"]}
        icon={<ChevronDown size={16} />}
        loading={deletingId === record.transaction_id}
        onClick={() => onEdit(record)}
        style={{ maxWidth: "100%" }}
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
        width: isCompact ? 110 : 132,
        render: (value) => formatSavingDate(value),
      },
      {
        title: "Siswa",
        dataIndex: "student_name",
        key: "student_name",
        ellipsis: true,
        render: (_, record) => (
          <Space orientation='vertical' size={0} style={{ minWidth: 0, maxWidth: "100%" }}>
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
        width: isCompact ? 110 : 130,
        ellipsis: true,
        responsive: ["lg"],
        render: (value) => value || "-",
      },
      {
        title: "Jenis",
        dataIndex: "transaction_type",
        key: "transaction_type",
        width: isCompact ? 110 : 130,
        render: (value) => (
          <Tag color={transactionTypeMeta[value]?.color || "default"}>
            {transactionTypeMeta[value]?.label || value}
          </Tag>
        ),
      },
      {
        title: "Nominal / Keterangan",
        key: "amount_description",
        width: isCompact ? 180 : 220,
        render: (_, record) => (
          <Space orientation='vertical' size={0} style={{ minWidth: 0, maxWidth: "100%" }}>
            <Text
              strong
              style={{
                color:
                  record.transaction_type === "withdrawal" ? "#d97706" : "#059669",
                whiteSpace: "nowrap",
              }}
            >
              {record.transaction_type === "withdrawal" ? "- " : "+ "}
              {currencyFormatter.format(Number(record.amount || 0))}
            </Text>
            <Text
              type='secondary'
              style={{
                fontSize: 12,
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              {record.description || "-"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Diproses Oleh",
        dataIndex: "processed_by_name",
        key: "processed_by_name",
        width: 160,
        ellipsis: true,
        responsive: ["xl"],
        render: (value) => value || "-",
      },
      {
        title: "Aksi",
        key: "action",
        width: isCompact ? 120 : 150,
        align: "center",
        fixed: "right",
        render: (_, record) => renderActions(record),
      },
    ],
    [deletingId, isCompact, isMobile, onDelete, onEdit],
  );

  const mobileColumns = useMemo(
    () => [
      {
        title: "Transaksi",
        key: "transaction",
        render: (_, record) => (
          <Flex vertical gap={10} style={{ width: "100%", minWidth: 0 }}>
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
                <Text
                  type='secondary'
                  style={{
                    fontSize: 12,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  {record.nis || "-"} · {record.class_name || "-"}
                </Text>
              </div>
              <Tag
                color={
                  transactionTypeMeta[record.transaction_type]?.color || "default"
                }
                style={{ margin: 0, flexShrink: 0 }}
              >
                {transactionTypeMeta[record.transaction_type]?.label ||
                  record.transaction_type}
              </Tag>
            </Flex>

            <div style={{ minWidth: 0 }}>
              <Text
                strong
                style={{
                  color:
                    record.transaction_type === "withdrawal"
                      ? "#d97706"
                      : "#059669",
                  fontSize: 15,
                  wordBreak: "break-word",
                }}
              >
                {record.transaction_type === "withdrawal" ? "- " : "+ "}
                {currencyFormatter.format(Number(record.amount || 0))}
              </Text>
              <Text
                type='secondary'
                style={{
                  display: "block",
                  fontSize: 12,
                  wordBreak: "break-word",
                }}
              >
                {formatSavingDate(record.transaction_date)}
                {record.periode_name ? ` · ${record.periode_name}` : ""}
              </Text>
              {record.description ? (
                <Text
                  type='secondary'
                  style={{
                    display: "block",
                    fontSize: 12,
                    marginTop: 2,
                    wordBreak: "break-word",
                  }}
                >
                  {record.description}
                </Text>
              ) : null}
              <Text
                type='secondary'
                style={{ display: "block", fontSize: 12, marginTop: 2 }}
              >
                Oleh: {record.processed_by_name || "-"}
              </Text>
            </div>

            <div style={{ width: "100%" }}>{renderActions(record)}</div>
          </Flex>
        ),
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
        variant='borderless'
        style={{
          ...cardStyle,
          borderRadius: isMobile ? 16 : undefined,
          overflow: "hidden",
          width: "100%",
          maxWidth: "100%",
          ...(isMobile
            ? {
                border: "none",
                boxShadow: "none",
                background: "transparent",
              }
            : null),
        }}
        styles={{
          body: {
            padding: isMobile ? 0 : 18,
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
          },
        }}
      >
        <Space orientation='vertical' size={isMobile ? 12 : 16} style={{ width: "100%" }}>
          <Flex
            wrap
            gap={12}
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            style={{ width: "100%" }}
          >
            <Space orientation='vertical' size={4} style={{ minWidth: 0, flex: 1 }}>
              <Title
                level={5}
                style={{
                  margin: 0,
                  fontSize: isMobile ? 15 : undefined,
                  wordBreak: "break-word",
                }}
              >
                Riwayat Transaksi Tabungan
              </Title>
              {!isMobile ? (
                <Text type='secondary'>
                  Pantau seluruh setoran dan penarikan siswa sesuai filter aktif.
                </Text>
              ) : null}
            </Space>
            <Button
              icon={<Download size={16} />}
              onClick={handleExportExcel}
              disabled={!transactions.length}
              block={isMobile}
            >
              {isMobile ? "Excel" : "Export Excel"}
            </Button>
          </Flex>

          <Row gutter={[8, 8]}>
            <Col xs={24} sm={12}>
              <div style={summaryBoxStyle}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Total Setoran
                </Text>
                <div
                  style={{
                    fontWeight: 700,
                    marginTop: 2,
                    color: "#059669",
                    wordBreak: "break-word",
                  }}
                >
                  {currencyFormatter.format(summary?.total_deposit || 0)}
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div style={summaryBoxStyle}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Total Penarikan
                </Text>
                <div
                  style={{
                    fontWeight: 700,
                    marginTop: 2,
                    color: "#d97706",
                    wordBreak: "break-word",
                  }}
                >
                  {currencyFormatter.format(summary?.total_withdrawal || 0)}
                </div>
              </div>
            </Col>
          </Row>

          <div style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
            <Table
              rowKey='transaction_id'
              columns={isMobile ? mobileColumns : desktopColumns}
              dataSource={transactions}
              loading={loading}
              size='small'
              showHeader={!isMobile}
              tableLayout={isMobile ? "fixed" : undefined}
              style={{ width: "100%" }}
              styles={{
                root: { width: "100%", maxWidth: "100%" },
                content: isMobile ? { overflow: "hidden" } : undefined,
              }}
              pagination={{
                pageSize: isMobile ? 5 : 8,
                size: "small",
                showSizeChanger: !isMobile,
                showTotal: isMobile
                  ? undefined
                  : (total, range) =>
                      `${range[0]}-${range[1]} dari ${total} transaksi`,
                responsive: true,
                style: { marginBottom: 0 },
              }}
              scroll={isMobile ? undefined : { x: isCompact ? 760 : 980 }}
              locale={{
                emptyText: "Belum ada transaksi tabungan pada filter saat ini.",
              }}
            />
          </div>
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default memo(SavingTransactionTable);
