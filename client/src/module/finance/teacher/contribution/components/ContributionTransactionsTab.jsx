import {
  Button,
  Card,
  Dropdown,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { EllipsisOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

import {
  cardStyle,
  currencyFormatter,
  formatDateTime,
  transactionTypeOptions,
} from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const ContributionTransactionsTab = ({
  selectableStudents,
  summary,
  transactions,
  loading,
  filters,
  setFilters,
  deletingTransactionId,
  onCreate,
  onEdit,
  onDelete,
}) => {
  const columns = [
    {
      title: "Tanggal",
      dataIndex: "transaction_date",
      key: "transaction_date",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Jenis",
      dataIndex: "transaction_type",
      key: "transaction_type",
      render: (value) => (
        <Tag color={value === "expense" ? "red" : "green"}>
          {value === "expense" ? "Pengeluaran" : "Pemasukan"}
        </Tag>
      ),
    },
    {
      title: "Siswa",
      key: "student_name",
      render: (_, record) =>
        record.student_name ? (
          <Space orientation="vertical" size={0}>
            <Text strong>{record.student_name}</Text>
            <Text type="secondary">{record.nis || "-"}</Text>
          </Space>
        ) : (
          <Text type="secondary">Pengeluaran umum</Text>
        ),
    },
    {
      title: "Petugas Input",
      dataIndex: "processed_by_name",
      key: "processed_by_name",
      render: (value) => value || "-",
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value, record) => (
        <Text
          style={{
            color: record.transaction_type === "expense" ? "#dc2626" : "#15803d",
            fontWeight: 600,
          }}
        >
          {record.transaction_type === "expense" ? "-" : "+"}
          {currencyFormatter.format(Number(value || 0))}
        </Text>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      align: "center",
      render: (_, record) => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              {
                key: "edit",
                label: "Edit transaksi",
              },
              {
                key: "delete",
                label: "Hapus transaksi",
                danger: true,
              },
            ],
            onClick: ({ key }) => {
              if (key === "edit") {
                onEdit(record);
              }

              if (key === "delete") {
                onDelete(record);
              }
            },
          }}
        >
          <Button
            icon={<EllipsisOutlined />}
            loading={deletingTransactionId === record.transaction_id}
            style={{ borderRadius: 999 }}
          >
            Aksi
          </Button>
        </Dropdown>
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
                Riwayat Transaksi Kas Kelas
              </Title>
              <Text type="secondary">
                Lihat semua pemasukan dan pengeluaran kas kelas berdasarkan
                siswa, jenis transaksi, dan petugas input.
              </Text>
            </Space>

            <Button
              type="primary"
              onClick={() => onCreate(null, "income")}
              style={{ borderRadius: 999, fontWeight: 600 }}
            >
              Tambah Transaksi
            </Button>
          </Space>

          <Space wrap size={[12, 12]} style={{ width: "100%" }}>
            <Input.Search
              placeholder="Cari siswa atau NIS"
              allowClear
              style={{ width: 280, maxWidth: "100%" }}
              onSearch={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  search: value,
                }))
              }
            />
            <Select
              allowClear
              placeholder="Jenis transaksi"
              options={transactionTypeOptions}
              style={{ width: 180, maxWidth: "100%" }}
              value={filters.transaction_type}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  transaction_type: value,
                }))
              }
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Filter siswa"
              style={{ width: 280, maxWidth: "100%" }}
              value={filters.student_id}
              options={selectableStudents.map((item) => ({
                value: item.student_id,
                label: `${item.student_name}${item.nis ? ` (${item.nis})` : ""}`,
              }))}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  student_id: value,
                }))
              }
            />
          </Space>

          <Space wrap>
            <Tag color="green">
              Pemasukan: {currencyFormatter.format(Number(summary.income_total || 0))}
            </Tag>
            <Tag color="red">
              Pengeluaran: {currencyFormatter.format(Number(summary.expense_total || 0))}
            </Tag>
            <Tag color="blue">
              Saldo: {currencyFormatter.format(Number(summary.balance || 0))}
            </Tag>
          </Space>

          <Table
            rowKey="transaction_id"
            columns={columns}
            dataSource={transactions}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 980 }}
          />
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default ContributionTransactionsTab;
