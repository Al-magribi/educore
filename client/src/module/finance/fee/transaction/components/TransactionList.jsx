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
import {
  ArrowUpRight,
  ChevronDown,
  Pencil,
  Receipt,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";

const { Text } = Typography;

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const statusColors = {
  spp: "blue",
  other: "green",
  mixed: "gold",
};

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

  const transactionColumns = [
    {
      title: "Tanggal",
      dataIndex: "paid_at",
      key: "paid_at",
      width: 140,
      render: (value) => (
        <Space direction='vertical' size={0}>
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
          <Space direction='vertical' size={1}>
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
      title: "Jenis",
      dataIndex: "category",
      key: "category",
      width: 110,
      render: (value) => (
        <Tag
          color={statusColors[value] || "default"}
          style={{
            borderRadius: 999,
            paddingInline: 10,
            fontWeight: 600,
          }}
        >
          {value === "spp" ? "SPP" : value === "other" ? "Lainnya" : "Gabungan"}
        </Tag>
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
      width: 180,
      render: (_, record) => (
        <Space direction='vertical' size={1}>
          <Text strong style={{ color: "#0f172a", fontSize: 15 }}>
            {currencyFormatter.format(Number(record.amount || 0))}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.notes || "Tidak ada catatan"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 150,
      render: (_, record) => {
        const items = [
          ...(record.category !== "mixed"
            ? [
                {
                  key: "edit",
                  label: "Edit",
                  icon: <Pencil size={14} />,
                },
              ]
            : []),
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
            menu={{
              items,
              onClick: handleMenuClick,
            }}
            trigger={["click"]}
            icon={<ChevronDown size={16} />}
            loading={isDeletingTransaction}
            onClick={() => {
              if (record.category !== "mixed") {
                onEdit(record);
              }
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
    <Card
      styles={{
        body: {
          padding: 24,
        },
      }}
      title={
        <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
          <Text strong style={{ fontSize: 18, color: "#0f172a" }}>
            Daftar Transaksi
          </Text>
          <Button
            type='primary'
            onClick={onCreate}
            icon={<ArrowUpRight size={16} />}
            style={{
              borderRadius: 12,
              boxShadow: "0 12px 22px rgba(37, 99, 235, 0.18)",
            }}
          >
            Buat Transaksi
          </Button>
        </Flex>
      }
    >
      <Flex vertical gap={20}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          <Card
            bordered={false}
            style={{
              borderRadius: 18,
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            }}
            styles={{ body: { padding: 18 } }}
          >
            <Statistic
              title='Total transaksi'
              value={totalRecords}
              prefix={<Receipt size={16} />}
            />
          </Card>
          <Card
            bordered={false}
            style={{
              borderRadius: 18,
              background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
            }}
            styles={{ body: { padding: 18 } }}
          >
            <Statistic
              title='Nominal halaman ini'
              value={totalAmount}
              prefix={<Wallet size={16} />}
              formatter={(value) =>
                currencyFormatter.format(Number(value || 0))
              }
            />
          </Card>
          <Card
            bordered={false}
            style={{
              borderRadius: 18,
              background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            }}
            styles={{ body: { padding: 18 } }}
          >
            <Statistic title='Transaksi SPP' value={sppCount} />
          </Card>
          <Card
            bordered={false}
            style={{
              borderRadius: 18,
              background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
            }}
            styles={{ body: { padding: 18 } }}
          >
            <Statistic title='Pembayaran lainnya' value={otherCount} />
          </Card>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 18,
            border: "1px solid rgba(148, 163, 184, 0.18)",
            background: "rgba(248, 250, 252, 0.9)",
          }}
        >
          <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
            <Space direction='vertical' size={2}>
              <Text strong style={{ color: "#0f172a" }}>
                Filter Transaksi
              </Text>
              <Text type='secondary' style={{ fontSize: 13 }}>
                Gunakan pencarian dan filter untuk mempercepat penelusuran data.
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
          scroll={{ x: 1100 }}
          locale={{
            emptyText: "Belum ada transaksi pada filter saat ini.",
          }}
        />
      </Flex>
    </Card>
  );
};

export default TransactionList;
