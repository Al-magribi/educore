import { memo, useMemo, useState } from "react";
import {
  Col,
  DatePicker,
  Modal,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { skipToken } from "@reduxjs/toolkit/query";

import { useGetSavingTransactionsQuery } from "../../../../../service/finance/ApiSaving";
import {
  currencyFormatter,
  formatSavingDate,
  transactionTypeMeta,
} from "../constants";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const typeFilterOptions = [
  { label: "Semua", value: "all" },
  { label: "Setoran", value: "deposit" },
  { label: "Penarikan", value: "withdrawal" },
];

const summaryBoxStyle = {
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: "10px 14px",
};

const columns = [
  {
    title: "Tanggal",
    dataIndex: "transaction_date",
    key: "transaction_date",
    width: 130,
    render: (value) => formatSavingDate(value),
  },
  {
    title: "Periode",
    dataIndex: "periode_name",
    key: "periode_name",
    width: 130,
    render: (value, record) => (
      <Space orientation='vertical' size={0}>
        <Text>{value || "-"}</Text>
        <Text type='secondary' style={{ fontSize: 12 }}>
          {record.class_name || "-"}
        </Text>
      </Space>
    ),
  },
  {
    title: "Jenis",
    dataIndex: "transaction_type",
    key: "transaction_type",
    width: 120,
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
    width: 170,
    render: (value) => value || "-",
  },
];

const SavingStudentDetailModal = ({ open, student, onClose }) => {
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);

  const studentId = student?.student_id || student?.id;
  const { data: transactionsResponse, isFetching } =
    useGetSavingTransactionsQuery(
      open && studentId
        ? { student_id: studentId, periode_id: "all" }
        : skipToken,
    );

  const transactions = useMemo(
    () => transactionsResponse?.data || [],
    [transactionsResponse?.data],
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      if (typeFilter !== "all" && item.transaction_type !== typeFilter) {
        return false;
      }

      if (dateRange?.[0] && dateRange?.[1]) {
        const transactionDate = dayjs(item.transaction_date);

        if (
          transactionDate.isBefore(dateRange[0], "day") ||
          transactionDate.isAfter(dateRange[1], "day")
        ) {
          return false;
        }
      }

      return true;
    });
  }, [dateRange, transactions, typeFilter]);

  const filteredSummary = useMemo(() => {
    const totalDeposit = filteredTransactions
      .filter((item) => item.transaction_type === "deposit")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalWithdrawal = filteredTransactions
      .filter((item) => item.transaction_type === "withdrawal")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return { totalDeposit, totalWithdrawal };
  }, [filteredTransactions]);

  const handleClose = () => {
    setTypeFilter("all");
    setDateRange(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={860}
      destroyOnHidden
      centered
      title={
        <Space orientation='vertical' size={0}>
          <Title level={5} style={{ margin: 0 }}>
            Riwayat Transaksi Tabungan
          </Title>
          <Text type='secondary' style={{ fontWeight: 400 }}>
            {student?.student_name || "-"} | {student?.nis || "-"} |{" "}
            {student?.class_name || "-"}
          </Text>
        </Space>
      }
    >
      <Space orientation='vertical' size={16} style={{ width: "100%" }}>
        <Space
          wrap
          size={[12, 12]}
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Segmented
            options={typeFilterOptions}
            value={typeFilter}
            onChange={setTypeFilter}
          />
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format='DD MMM YYYY'
            placeholder={["Tanggal awal", "Tanggal akhir"]}
            allowClear
          />
        </Space>

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <div style={summaryBoxStyle}>
              <Text type='secondary'>Saldo Saat Ini</Text>
              <div style={{ fontWeight: 700, marginTop: 2 }}>
                {currencyFormatter.format(Number(student?.balance || 0))}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div style={summaryBoxStyle}>
              <Text type='secondary'>Setoran (filter aktif)</Text>
              <div style={{ fontWeight: 700, marginTop: 2, color: "#059669" }}>
                {currencyFormatter.format(filteredSummary.totalDeposit)}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div style={summaryBoxStyle}>
              <Text type='secondary'>Penarikan (filter aktif)</Text>
              <div style={{ fontWeight: 700, marginTop: 2, color: "#d97706" }}>
                {currencyFormatter.format(filteredSummary.totalWithdrawal)}
              </div>
            </div>
          </Col>
        </Row>

        <Table
          rowKey='transaction_id'
          columns={columns}
          dataSource={filteredTransactions}
          loading={isFetching}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 720 }}
          size='small'
          locale={{
            emptyText: "Tidak ada transaksi yang sesuai dengan filter.",
          }}
        />
      </Space>
    </Modal>
  );
};

export default memo(SavingStudentDetailModal);
