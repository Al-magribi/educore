import dayjs from "dayjs";
import {
  Avatar,
  Button,
  Card,
  Dropdown,
  Flex,
  Grid,
  Input,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronDown,
  Pencil,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  Wallet,
  Sparkles,
} from "lucide-react";
import { getPeriodeTagColor } from "./transactionFormShared.jsx";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const summaryCardStyles = [
  {
    bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    color: "#2563eb",
  },
  {
    bg: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
    color: "#475569",
  },
  {
    bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    color: "#15803d",
  },
  {
    bg: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
    color: "#d97706",
  },
];

const getPrimaryInvoice = (record) => {
  if (!record) {
    return null;
  }

  return (record.invoices || []).find((invoice) => invoice?.id) || null;
};

const getStatusTagColor = (status) => {
  if (status === "confirmed") {
    return "success";
  }

  if (status === "pending") {
    return "gold";
  }

  if (status === "rejected") {
    return "red";
  }

  if (status === "cancelled") {
    return "default";
  }

  if (status === "expired") {
    return "volcano";
  }

  if (status === "refunded") {
    return "purple";
  }

  return "blue";
};

const TransactionList = ({
  user,
  homebases,
  periodes,
  transactions,
  transactionSummary,
  transactionFilters,
  setTransactionFilters,
  loading,
  isDeletingTransaction,
  isConfirmingTransaction,
  activeInvoiceId,
  onEdit,
  onDelete,
  onViewInvoice,
  onApprove,
  onReject,
  onRevoke,
  onCreate,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const selectedHomebaseId = transactionFilters.homebase_id;
  const activeHomebaseName =
    (homebases || []).find(
      (item) => Number(item.id) === Number(selectedHomebaseId),
    )?.name ||
    (selectedHomebaseId
      ? user?.homebase_name || user?.homebase_id || "-"
      : "Semua satuan");
  const totalRecords = Number(transactionSummary.total_records || 0);
  const currentPage = Number(
    transactionSummary.page || transactionFilters.page || 1,
  );
  const pageSize = Number(
    transactionSummary.limit || transactionFilters.limit || 10,
  );
  const totalAmount = transactions.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  const pendingCount = transactions.filter(
    (item) => item.status === "pending",
  ).length;
  const confirmedCount = transactions.filter(
    (item) => item.status === "confirmed",
  ).length;
  const rejectedCount = transactions.filter(
    (item) => item.status === "rejected",
  ).length;

  const summaryItems = [
    {
      title: "Total transaksi",
      value: totalRecords,
      prefix: <Receipt size={16} />,
    },
    {
      title: isMobile ? "Nominal halaman" : "Nominal halaman ini",
      value: totalAmount,
      prefix: <Wallet size={16} />,
      formatter: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Terkonfirmasi",
      value: confirmedCount,
    },
    {
      title: isMobile ? "Pending/tolak" : "Pending / ditolak",
      value: pendingCount + rejectedCount,
    },
  ];

  const renderActions = (record) => {
    const primaryInvoice = getPrimaryInvoice(record);
    const menuItems = [];

    if (primaryInvoice) {
      menuItems.push({
        key: "invoice",
        label: "Lihat invoice",
        icon: <Receipt size={14} />,
      });
    }

    if (record.proof_url) {
      menuItems.push({
        key: "proof",
        label: (
          <a
            href={record.proof_url}
            target='_blank'
            rel='noreferrer'
            onClick={(event) => event.stopPropagation()}
          >
            Lihat bukti
          </a>
        ),
      });
    }

    if (record.can_confirm) {
      menuItems.push(
        {
          key: "approve",
          label: "Approve",
          icon: <ShieldCheck size={14} />,
        },
        {
          key: "reject",
          label: "Reject",
          danger: true,
          icon: <ShieldX size={14} />,
        },
      );
    }

    if (record.can_revoke) {
      menuItems.push({
        key: "revoke",
        label: "Revoke",
        icon: <RotateCcw size={14} />,
      });
    }

    if (record.can_manage) {
      menuItems.push({
        key: "edit",
        label: "Edit transaksi",
        icon: <Pencil size={14} />,
      });
    }

    if (record.can_delete) {
      menuItems.push({
        key: "delete",
        label: "Hapus transaksi",
        danger: true,
        icon: <Trash2 size={14} />,
      });
    }

    if (menuItems.length === 0) {
      return <Text type='secondary'>Tidak ada aksi</Text>;
    }

    return (
      <Dropdown
        trigger={["click"]}
        disabled={isDeletingTransaction || isConfirmingTransaction}
        menu={{
          items: menuItems,
          onClick: ({ key, domEvent }) => {
            domEvent?.stopPropagation?.();

            if (isDeletingTransaction || isConfirmingTransaction) {
              return;
            }

            if (key === "invoice") {
              onViewInvoice?.(primaryInvoice?.id, record);
              return;
            }

            if (key === "approve") {
              onApprove?.(record);
              return;
            }

            if (key === "reject") {
              onReject?.(record);
              return;
            }

            if (key === "revoke") {
              onRevoke?.(record);
              return;
            }

            if (key === "edit") {
              onEdit?.(record);
              return;
            }

            if (key === "delete") {
              Modal.confirm({
                title: "Hapus transaksi ini?",
                content:
                  "Pembayaran, invoice yang tidak lagi dipakai, dan bukti transaksi lokal akan ikut dibersihkan.",
                okText: "Hapus",
                okButtonProps: { danger: true },
                cancelText: "Batal",
                onOk: () => onDelete?.(record),
              });
            }
          },
        }}
      >
        <Button
          type={
            Number(primaryInvoice?.id) === Number(activeInvoiceId)
              ? "primary"
              : "default"
          }
          size={isMobile ? "small" : "middle"}
          icon={<Receipt size={14} />}
          loading={isDeletingTransaction || isConfirmingTransaction}
          block={isMobile}
        >
          Opsi
          <ChevronDown size={14} style={{ marginLeft: 8 }} />
        </Button>
      </Dropdown>
    );
  };

  const desktopColumns = [
    {
      title: "Tanggal & Keterangan",
      key: "transaction_info",
      width: 280,
      render: (_, record) => (
        <Space vertical size={2}>
          <Text
            strong
            style={{
              color: "#0f172a",
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            {record.description || "-"}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.paid_at
              ? dayjs(record.paid_at).format("DD MMM YYYY HH:mm")
              : "Tanggal belum tercatat"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      render: (_, record) => (
        <Space size={12} align='start'>
          <Avatar
            size={40}
            style={{
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(14,165,233,0.24))",
              color: "#1d4ed8",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(record.student_name || "?").slice(0, 1).toUpperCase()}
          </Avatar>
          <Space vertical size={1}>
            <Text
              strong
              style={{
                color: "#0f172a",
                fontSize: 15,
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              {record.student_name}
            </Text>
            <Text
              type='secondary'
              style={{ whiteSpace: "normal", wordBreak: "break-word" }}
            >
              {`${record.nis || "-"} | ${record.grade_name || "-"}${record.class_name ? ` | ${record.class_name}` : ""}`}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (_, record) => (
        <Tag
          color={getStatusTagColor(record.status)}
          style={{ borderRadius: 999 }}
        >
          {record.status_label || "-"}
        </Tag>
      ),
    },
    {
      title: "Nominal",
      key: "amount",
      width: 220,
      render: (_, record) => (
        <Space vertical size={1}>
          <Text strong style={{ color: "#0f172a", fontSize: 15 }}>
            {currencyFormatter.format(Number(record.amount || 0))}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.notes ||
              (record.status === "pending"
                ? "Menunggu proses verifikasi"
                : "Tidak ada catatan")}
          </Text>
        </Space>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 180,
      fixed: "right",
      render: (_, record) => renderActions(record),
    },
  ];

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
                  color: "#0f172a",
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
                {`${record.nis || "-"} · ${record.class_name || record.grade_name || "-"}`}
              </Text>
            </div>
            <Tag
              color={getStatusTagColor(record.status)}
              style={{ borderRadius: 999, margin: 0 }}
            >
              {record.status_label || "-"}
            </Tag>
          </Flex>

          <div>
            <Text
              strong
              style={{
                display: "block",
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              {record.description || "-"}
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {record.paid_at
                ? dayjs(record.paid_at).format("DD MMM YYYY HH:mm")
                : "Tanggal belum tercatat"}
            </Text>
          </div>

          <Flex justify='space-between' align='center' gap={8} wrap='wrap'>
            <Text strong style={{ fontSize: 15, color: "#0f172a" }}>
              {currencyFormatter.format(Number(record.amount || 0))}
            </Text>
            <div style={{ minWidth: 110 }}>{renderActions(record)}</div>
          </Flex>
        </Flex>
      ),
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Flex vertical gap='middle'>
        <Flex vertical gap={isMobile ? 14 : 18}>
          <Card
            variant='borderless'
            style={{
              borderRadius: isMobile ? 20 : 24,
              overflow: "hidden",
              position: "relative",
              background:
                "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 28%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f766e 100%)",
              boxShadow: "0 22px 48px rgba(15, 23, 42, 0.16)",
            }}
            styles={{ body: { padding: isMobile ? 16 : 22 } }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)",
                pointerEvents: "none",
              }}
            />
            <Flex
              justify='space-between'
              align={isMobile ? "stretch" : "center"}
              vertical={isMobile}
              wrap='wrap'
              gap={16}
              style={{ position: "relative" }}
            >
              <Space vertical size={8} style={{ minWidth: 0, flex: 1 }}>
                <Flex align='center' gap={10} wrap='wrap'>
                  <Tag
                    color='cyan'
                    style={{
                      borderRadius: 999,
                      paddingInline: 12,
                      fontWeight: 600,
                      margin: 0,
                      fontSize: isMobile ? 12 : 14,
                    }}
                  >
                    Finance / Transaksi
                  </Tag>
                  <Flex
                    align='center'
                    gap={6}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      color: "#e0f2fe",
                      fontWeight: 600,
                      fontSize: isMobile ? 12 : 14,
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Payment transaction workspace</span>
                  </Flex>
                </Flex>
                <div style={{ minWidth: 0 }}>
                  <Title
                    level={isMobile ? 4 : 3}
                    style={{ margin: 0, color: "#fff", lineHeight: 1.25 }}
                  >
                    Input Transaksi Admin
                  </Title>
                  {!isMobile ? (
                    <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                      Kelola input transaksi, review pembayaran, dan tindak lanjut
                      status pembayaran dari satu layar.
                    </Text>
                  ) : null}
                </div>
                <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
                  Satuan aktif: {activeHomebaseName}
                </Text>
              </Space>

              <Button
                type='primary'
                onClick={onCreate}
                icon={<ArrowUpRight size={16} />}
                size='large'
                block={isMobile}
                style={{
                  borderRadius: 14,
                  height: 46,
                  background: "#fff",
                  color: "#0f172a",
                  border: "none",
                  fontWeight: 600,
                  boxShadow: "0 12px 24px rgba(255,255,255,0.18)",
                }}
              >
                Transaksi Baru
              </Button>
            </Flex>
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(auto-fit, minmax(180px, 1fr))",
              gap: isMobile ? 10 : 14,
            }}
          >
            {summaryItems.map((item, index) => (
              <MotionDiv
                key={item.title}
                whileHover={isMobile ? undefined : { y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <Card
                  variant='borderless'
                  style={{
                    borderRadius: isMobile ? 14 : 18,
                    background: summaryCardStyles[index].bg,
                    height: "100%",
                  }}
                  styles={{ body: { padding: isMobile ? 12 : 18 } }}
                >
                  <Statistic
                    title={
                      <span style={{ fontSize: isMobile ? 12 : 14 }}>
                        {item.title}
                      </span>
                    }
                    value={item.value}
                    prefix={item.prefix}
                    formatter={item.formatter}
                    styles={{
                      content: {
                        color: summaryCardStyles[index].color,
                        fontSize: isMobile ? 18 : undefined,
                      },
                    }}
                  />
                </Card>
              </MotionDiv>
            ))}
          </div>
        </Flex>

        <Flex vertical gap={isMobile ? 14 : 20}>
          <div
            style={{
              padding: isMobile ? 12 : 16,
              borderRadius: isMobile ? 14 : 18,
              border: "1px solid rgba(148, 163, 184, 0.18)",
              background: "rgba(248, 250, 252, 0.9)",
            }}
          >
            <Flex
              justify='space-between'
              align={isMobile ? "stretch" : "center"}
              vertical={isMobile}
              wrap='wrap'
              gap={12}
            >
              <Space vertical size={2} style={{ minWidth: 0, flex: 1 }}>
                <Text strong style={{ color: "#0f172a" }}>
                  Filter Transaksi
                </Text>
                <Text type='secondary' style={{ fontSize: isMobile ? 12 : 13 }}>
                  {isMobile
                    ? "Filter satuan, status, dan pencarian transaksi."
                    : "Gunakan filter untuk memilih satuan, status pembayaran, dan menelusuri transaksi lebih cepat."}
                </Text>
              </Space>
              <Text type='secondary' style={{ fontSize: 13 }}>
                {(transactions || []).length} data · halaman {currentPage}
              </Text>
            </Flex>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                gap: 12,
                marginTop: 16,
              }}
            >
              <Select
                value={selectedHomebaseId}
                options={(homebases || []).map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                onChange={(value) =>
                  setTransactionFilters((previous) => ({
                    ...previous,
                    page: 1,
                    homebase_id: value || undefined,
                    periode_id: undefined,
                  }))
                }
                placeholder='Pilih satuan'
                size='large'
                disabled={(homebases || []).length <= 1}
                virtual={false}
                allowClear
                style={{ width: "100%" }}
              />
              <Select
                allowClear
                placeholder='Filter periode'
                value={transactionFilters.periode_id}
                options={(periodes || []).map((item) => ({
                  value: item.id,
                  label: (
                    <Flex justify='space-between' align='center' gap={12}>
                      <span>{item.name}</span>
                      <Tag
                        color={getPeriodeTagColor(item.is_active)}
                        style={{ margin: 0, borderRadius: 999 }}
                      >
                        {item.is_active ? "Aktif" : "Tidak Aktif"}
                      </Tag>
                    </Flex>
                  ),
                  searchLabel: item.name,
                }))}
                onChange={(value) =>
                  setTransactionFilters((previous) => ({
                    ...previous,
                    page: 1,
                    periode_id: value || undefined,
                  }))
                }
                optionFilterProp='searchLabel'
                size='large'
                virtual={false}
                style={{ width: "100%" }}
              />
              <Input
                placeholder='Cari nama siswa / NIS'
                value={transactionFilters.search}
                prefix={<Search size={16} color='#94a3b8' />}
                onChange={(event) =>
                  setTransactionFilters((previous) => ({
                    ...previous,
                    page: 1,
                    search: event.target.value,
                  }))
                }
                size='large'
                style={{ width: "100%" }}
              />
              <Select
                allowClear
                placeholder='Filter jenis pembayaran'
                value={transactionFilters.category}
                options={[
                  { value: "spp", label: "SPP" },
                  { value: "other", label: "Pembayaran Lainnya" },
                  { value: "mixed", label: "Gabungan" },
                ]}
                onChange={(value) =>
                  setTransactionFilters((previous) => ({
                    ...previous,
                    page: 1,
                    category: value || undefined,
                  }))
                }
                size='large'
                virtual={false}
                style={{ width: "100%" }}
              />
              <Select
                allowClear
                placeholder='Filter sumber pembayaran'
                value={transactionFilters.payment_source}
                options={[
                  { value: "admin_manual", label: "Input Admin" },
                  { value: "parent_manual", label: "Transfer Bank" },
                  { value: "midtrans", label: "Midtrans" },
                ]}
                onChange={(value) =>
                  setTransactionFilters((previous) => ({
                    ...previous,
                    page: 1,
                    payment_source: value || undefined,
                  }))
                }
                size='large'
                virtual={false}
                style={{ width: "100%" }}
              />
              <Select
                allowClear
                placeholder='Filter status pembayaran'
                value={transactionFilters.status}
                options={[
                  { value: "pending", label: "Menunggu Proses" },
                  { value: "confirmed", label: "Terkonfirmasi" },
                  { value: "rejected", label: "Ditolak" },
                  { value: "cancelled", label: "Dibatalkan" },
                  { value: "expired", label: "Kedaluwarsa" },
                  { value: "refunded", label: "Refund" },
                ]}
                onChange={(value) =>
                  setTransactionFilters((previous) => ({
                    ...previous,
                    page: 1,
                    status: value || undefined,
                  }))
                }
                size='large'
                virtual={false}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <Card
            variant='borderless'
            style={{
              borderRadius: isMobile ? 16 : 22,
              border: "1px solid rgba(148,163,184,0.14)",
              overflow: "hidden",
            }}
            styles={{ body: { padding: isMobile ? 8 : 0 } }}
          >
            <Table
              rowKey={(record) =>
                `${record.category || "transaction"}-${record.id}`
              }
              columns={isMobile ? mobileColumns : desktopColumns}
              dataSource={transactions}
              loading={loading}
              size={isMobile ? "small" : "middle"}
              scroll={isMobile ? undefined : { x: 1100 }}
              pagination={{
                current: currentPage,
                pageSize,
                total: totalRecords,
                size: isMobile ? "small" : "default",
                showSizeChanger: !isMobile,
                pageSizeOptions: [10, 20, 50, 100],
                showTotal: isMobile
                  ? undefined
                  : (total, range) =>
                      `${range[0]}-${range[1]} dari ${total} transaksi`,
                onChange: (page, nextPageSize) =>
                  setTransactionFilters((previous) => ({
                    ...previous,
                    page: nextPageSize !== previous.limit ? 1 : page,
                    limit: nextPageSize,
                  })),
              }}
              locale={{
                emptyText: "Belum ada transaksi pada filter saat ini.",
              }}
            />
          </Card>
        </Flex>
      </Flex>
    </MotionDiv>
  );
};

export default TransactionList;
