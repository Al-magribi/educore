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
import { SquarePen, Trash } from "lucide-react";

import { cardStyle, currencyFormatter, formatDateTime } from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const StudentContributionTransactionsTab = ({
  access,
  variant,
  selectableStudents,
  transactions,
  loading,
  filters,
  setFilters,
  deletingTransactionId,
  onCreate,
  onEdit,
  onDelete,
}) => {
  const isIncomeTab = variant === "income";

  const columns = [
    {
      title: "Tanggal",
      dataIndex: "transaction_date",
      key: "transaction_date",
      render: (value) => formatDateTime(value),
    },

    {
      title: "Siswa",
      key: "student",
      render: (_, record) =>
        record.student_name ? (
          <Space orientation='vertical' size={0}>
            <Text strong>{record.student_name}</Text>
            <Text type='secondary'>{record.nis || "-"}</Text>
          </Space>
        ) : (
          <Text type='secondary'>Pengeluaran umum</Text>
        ),
    },

    {
      title: "Input Oleh",
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
            color:
              record.transaction_type === "expense" ? "#dc2626" : "#15803d",
            fontWeight: 700,
          }}
        >
          {record.transaction_type === "expense" ? "-" : "+"}
          {currencyFormatter.format(Number(value || 0))}
        </Text>
      ),
    },
  ];

  if (access?.is_officer) {
    columns.push({
      title: "Aksi",
      key: "action",
      align: "center",
      render: (_, record) => {
        const menuItems = [
          {
            key: "edit",
            label: "Edit transaksi",
            icon: <SquarePen size={14} />,
          },
          {
            key: "delete",
            label: "Hapus transaksi",
            icon: <Trash size={14} />,
            danger: true,
          },
        ];

        return (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: menuItems,
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
        );
      },
    });
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card
        variant='borderless'
        style={cardStyle}
        styles={{ body: { padding: 18 } }}
      >
        <Space orientation='vertical' size={16} style={{ width: "100%" }}>
          <Space
            wrap
            size={[14, 14]}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Space orientation='vertical' size={4}>
              <Title level={5} style={{ margin: 0 }}>
                {isIncomeTab
                  ? "Daftar Pemasukan Kas"
                  : "Daftar Pengeluaran Kas"}
              </Title>
              <Text type='secondary'>
                {isIncomeTab
                  ? "Pantau pembayaran siswa dan cari transaksi berdasarkan siswa pembayar."
                  : "Pantau pengeluaran kas kelas berdasarkan kebutuhan dan riwayat pencatatan."}
              </Text>
            </Space>

            {access?.is_officer ? (
              <Button
                type='primary'
                onClick={() =>
                  onCreate(null, isIncomeTab ? "income" : "expense")
                }
                style={{ borderRadius: 999, fontWeight: 600 }}
              >
                {isIncomeTab ? "Catat Pembayaran" : "Catat Pengeluaran"}
              </Button>
            ) : null}
          </Space>

          <Space wrap size={[12, 12]} style={{ width: "100%" }}>
            <Input.Search
              placeholder={
                isIncomeTab
                  ? "Cari siswa pembayar"
                  : "Cari keperluan pengeluaran"
              }
              allowClear
              style={{ width: 280, maxWidth: "100%" }}
              onSearch={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  search: value,
                }))
              }
            />
            {isIncomeTab ? (
              <Select
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                virtual={false}
                placeholder='Filter siswa'
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
            ) : null}
          </Space>

          <Table
            rowKey='transaction_id'
            columns={columns}
            dataSource={transactions}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default StudentContributionTransactionsTab;
