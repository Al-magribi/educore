import dayjs from "dayjs";
import {
  Avatar,
  Button,
  Card,
  Dropdown,
  Flex,
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
  const selectedHomebaseId = transactionFilters.homebase_id;
  const requiresHomebaseSelection =
    (homebases || []).length > 1 && !selectedHomebaseId;
  const activeHomebaseName =
    (homebases || []).find(
      (item) => Number(item.id) === Number(selectedHomebaseId),
    )?.name ||
    (requiresHomebaseSelection
      ? "Pilih satuan"
      : user?.homebase_name || user?.homebase_id || "-");
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
      title: "Nominal halaman ini",
      value: totalAmount,
      prefix: <Wallet size={16} />,
      formatter: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Terkonfirmasi",
      value: confirmedCount,
    },
    {
      title: "Pending / ditolak",
      value: pendingCount + rejectedCount,
    },
  ];

  const transactionColumns = [
    {
      title: "Tanggal & Keterangan",
      key: "transaction_info",
      width: 280,
      render: (_, record) => (
        <Space vertical size={2}>
          <Text strong style={{ color: "#0f172a" }}>
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
            }}
          >
            {(record.student_name || "?").slice(0, 1).toUpperCase()}
          </Avatar>
          <Space vertical size={1}>
            <Text strong style={{ color: "#0f172a", fontSize: 15 }}>
              {record.student_name}
            </Text>
            <Text type='secondary'>
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
        <Space direction='vertical' size={4}>
          <Tag
            color={getStatusTagColor(record.status)}
            style={{ borderRadius: 999 }}
          >
            {record.status_label || "-"}
          </Tag>
        </Space>
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
      render: (_, record) => {
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
          menuItems.push(
            {
              key: "edit",
              label: "Edit transaksi",
              icon: <Pencil size={14} />,
            },
            {
              key: "delete",
              label: "Hapus transaksi",
              danger: true,
              icon: <Trash2 size={14} />,
            },
          );
        }

        if (menuItems.length === 0) {
          return <Text type='secondary'>Tidak ada aksi</Text>;
        }

        return (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: menuItems,
              onClick: ({ key, domEvent }) => {
                domEvent?.stopPropagation?.();

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
              icon={<Receipt size={14} />}
              loading={isDeletingTransaction || isConfirmingTransaction}
            >
              Opsi
              <ChevronDown size={14} style={{ marginLeft: 8 }} />
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Flex vertical gap='middle'>
        <Flex vertical gap={18}>
          <Card
            variant='borderless'
            style={{
              borderRadius: 24,
              overflow: "hidden",
              position: "relative",
              background:
                "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 28%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f766e 100%)",
              boxShadow: "0 22px 48px rgba(15, 23, 42, 0.16)",
            }}
            styles={{ body: { padding: 22 } }}
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
              align='center'
              wrap='wrap'
              gap={16}
              style={{ position: "relative" }}
            >
              <Space vertical size={8}>
                <Flex align='center' gap={10} wrap='wrap'>
                  <Tag
                    color='cyan'
                    style={{
                      borderRadius: 999,
                      paddingInline: 12,
                      fontWeight: 600,
                      margin: 0,
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
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Payment transaction workspace</span>
                  </Flex>
                </Flex>
                <div>
                  <Title level={3} style={{ margin: 0, color: "#fff" }}>
                    Input Transaksi Admin
                  </Title>
                  <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                    Kelola input transaksi, review pembayaran, dan tindak lanjut
                    status pembayaran dari satu layar.
                  </Text>
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
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            {summaryItems.map((item, index) => (
              <MotionDiv
                key={item.title}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <Card
                  variant='borderless'
                  style={{
                    borderRadius: 18,
                    background: summaryCardStyles[index].bg,
                  }}
                  styles={{ body: { padding: 18 } }}
                >
                  <Statistic
                    title={item.title}
                    value={item.value}
                    prefix={item.prefix}
                    formatter={item.formatter}
                    styles={{
                      content: { color: summaryCardStyles[index].color },
                    }}
                  />
                </Card>
              </MotionDiv>
            ))}
          </div>
        </Flex>

        <Flex vertical gap={20}>
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(148, 163, 184, 0.18)",
              background: "rgba(248, 250, 252, 0.9)",
            }}
          >
            <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
              <Space vertical size={2}>
                <Text strong style={{ color: "#0f172a" }}>
                  Filter Transaksi
                </Text>
                <Text type='secondary' style={{ fontSize: 13 }}>
                  Gunakan filter untuk memilih satuan, status pembayaran, dan
                  menelusuri transaksi lebih cepat.
                </Text>
              </Space>
              <Text type='secondary' style={{ fontSize: 13 }}>
                Menampilkan {(transactions || []).length} data di halaman{" "}
                {currentPage}
              </Text>
            </Flex>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
                disabled={requiresHomebaseSelection}
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
                disabled={requiresHomebaseSelection}
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
                disabled={requiresHomebaseSelection}
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
                disabled={requiresHomebaseSelection}
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
                disabled={requiresHomebaseSelection}
              />
            </div>
          </div>

          <Table
            rowKey={(record) =>
              `${record.category || "transaction"}-${record.id}`
            }
            columns={transactionColumns}
            dataSource={transactions}
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize,
              total: totalRecords,
              showSizeChanger: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} dari ${total} transaksi`,
              onChange: (page, nextPageSize) =>
                setTransactionFilters((previous) => ({
                  ...previous,
                  page,
                  limit: nextPageSize,
                })),
            }}
            locale={{
              emptyText: requiresHomebaseSelection
                ? "Pilih homebase terlebih dahulu untuk menampilkan transaksi."
                : "Belum ada transaksi pada filter saat ini.",
            }}
          />
        </Flex>
      </Flex>
    </MotionDiv>
  );
};

export default TransactionList;
