import dayjs from "dayjs";
import {
  Avatar,
  Button,
  Card,
  Dropdown,
  Flex,
  Input,
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
  Search,
  Trash2,
  Wallet,
  Sparkles,
} from "lucide-react";

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

const TransactionList = ({
  user,
  homebases,
  transactions,
  transactionSummary,
  transactionFilters,
  setTransactionFilters,
  loading,
  isDeletingTransaction,
  onEdit,
  onDelete,
  onCreate,
}) => {
  const activeHomebaseName =
    (homebases || []).find((item) => item.id === transactionFilters.homebase_id)
      ?.name ||
    user?.homebase_name ||
    user?.homebase_id ||
    "-";
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
  const sppCount = transactions.filter(
    (item) => item.category === "spp",
  ).length;
  const otherCount = transactions.filter(
    (item) => item.category === "other",
  ).length;
  const mixedCount = transactions.filter(
    (item) => item.category === "mixed",
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
      title: "Transaksi SPP",
      value: sppCount,
    },
    {
      title: "Non-SPP & gabungan",
      value: otherCount + mixedCount,
    },
  ];

  const transactionColumns = [
    {
      title: "Tanggal",
      dataIndex: "paid_at",
      key: "paid_at",
      width: 140,
      render: (value) => (
        <Space vertical size={0}>
          <Text strong style={{ color: "#0f172a" }}>
            {value ? dayjs(value).format("DD MMM YYYY") : "-"}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {value ? dayjs(value).format("HH:mm") : "Tidak tercatat"}
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
              {`${record.nis || "-"} | ${record.grade_name || "-"} ${record.class_name ? `| ${record.class_name}` : ""}`}
            </Text>
            <Text type='secondary'>
              {`${record.periode_name || "-"} | ${record.homebase_name || "-"}`}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: "Keterangan",
      dataIndex: "description",
      key: "description",
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
          <Flex align='center' gap={8} wrap='wrap'>
            <Tag color='blue' style={{ borderRadius: 999, margin: 0 }}>
              {record.category === "spp"
                ? "SPP"
                : record.category === "other"
                  ? "Lainnya"
                  : "Gabungan"}
            </Tag>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {record.notes || "Tidak ada catatan"}
            </Text>
          </Flex>
        </Space>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 150,
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
            onDelete(record);
          }
        };

        return (
          <Dropdown.Button
            type='primary'
            menu={{
              items,
              onClick: handleMenuClick,
            }}
            trigger={["click"]}
            icon={<ChevronDown size={16} />}
            loading={isDeletingTransaction}
            onClick={() => {
              onEdit(record);
            }}
            style={{ borderRadius: 12 }}
          >
            Pilih Aksi
          </Dropdown.Button>
        );
      },
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Flex vertical gap={"middle"}>
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
                    Daftar Transaksi
                  </Title>
                  <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                    Kelola transaksi pembayaran siswa, telusuri histori, dan
                    buka wizard transaksi baru dari satu panel kerja yang lebih
                    fokus.
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
                Buat Transaksi
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
                  Gunakan pencarian dan filter untuk mempercepat penelusuran
                  data.
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
                value={transactionFilters.homebase_id}
                options={(homebases || []).map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                onChange={(value) =>
                  setTransactionFilters((previous) => ({
                    ...previous,
                    page: 1,
                    homebase_id: value || undefined,
                  }))
                }
                placeholder='Pilih satuan'
                size='large'
                disabled={(homebases || []).length <= 1}
                virtual={false}
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
              emptyText: "Belum ada transaksi pada filter saat ini.",
            }}
          />
        </Flex>
      </Flex>
    </MotionDiv>
  );
};

export default TransactionList;
