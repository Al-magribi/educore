import { cloneElement, useState } from "react";
import {
  Button,
  Card,
  Dropdown,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { ChevronDown, Download, Pencil, Trash2 } from "lucide-react";

import {
  currencyFormatter,
  statusLabelMap,
  statusColorMap,
} from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const normalizeSortValue = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const comparePayments = (left, right) => {
  const gradeComparison = normalizeSortValue(left.grade_name).localeCompare(
    normalizeSortValue(right.grade_name),
    "id",
    {
      numeric: true,
      sensitivity: "base",
    },
  );

  if (gradeComparison !== 0) {
    return gradeComparison;
  }

  const classComparison = normalizeSortValue(left.class_name).localeCompare(
    normalizeSortValue(right.class_name),
    "id",
    {
      numeric: true,
      sensitivity: "base",
    },
  );

  if (classComparison !== 0) {
    return classComparison;
  }

  return String(left.student_name || "").localeCompare(
    String(right.student_name || ""),
    "id",
    {
      sensitivity: "base",
    },
  );
};

const MonthlyPaymentTable = ({
  payments,
  loading,
  selectedMonth,
  homebaseName,
  onCreatePayment,
  onEditPayment,
  onDeletePayment,
  isDeletingPayment,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState("unpaid");
  const sortedPayments = [...payments].sort(comparePayments);
  const paidPayments = sortedPayments.filter((item) => item.status === "paid");
  const unpaidPayments = sortedPayments.filter(
    (item) => item.status !== "paid",
  );

  const handleExportExcel = () => {
    const exportRows = sortedPayments.map((item, index) => ({
      No: index + 1,
      Satuan: homebaseName || "-",
      Tingkat: item.grade_name || "-",
      Kelas: item.class_name || "-",
      Nama: item.student_name || "-",
      NIS: item.nis || "-",
      Periode: item.periode_name || "-",
      Bulan: item.billing_period_label || selectedMonth || "-",
      Nominal: Number(item.amount || 0),
      "Sudah Dibayar": Number(item.paid_amount || 0),
      Status: statusLabelMap[item.status] || item.status || "-",
      "Riwayat Lunas": (item.paid_months || []).join(", ") || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pembayaran SPP");
    XLSX.writeFile(
      workbook,
      `pembayaran-spp-${String(selectedMonth || "semua")
        .replace(/\s+/g, "-")
        .toLowerCase()}.xlsx`,
    );
  };

  const handleDeletePayment = (paymentId) => {
    Modal.confirm({
      title: "Hapus pembayaran SPP ini?",
      okText: "Hapus",
      cancelText: "Batal",
      okButtonProps: {
        danger: true,
        loading: isDeletingPayment,
      },
      onOk: () => onDeletePayment(paymentId),
    });
  };

  const columns = [
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      ellipsis: true,
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{record.student_name}</Text>
          <Text
            type='secondary'
            style={{ whiteSpace: "normal", wordBreak: "break-word" }}
          >
            {`${record.nis || "-"} | ${record.class_name || "-"}`}
          </Text>
        </Space>
      ),
    },
    {
      title: "Tagihan",
      dataIndex: "billing_period_label",
      key: "billing_period_label",
      ellipsis: true,
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag
          color={statusColorMap[value]}
          style={{ borderRadius: 999, fontWeight: 600 }}
        >
          {statusLabelMap[value]}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 190,
      render: (_, record) =>
        record.status === "paid" ? (
          <Dropdown.Button
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "edit",
                  label: "Edit",
                  icon: <Pencil size={16} />,
                },
                {
                  key: "delete",
                  label: "Hapus",
                  icon: <Trash2 size={16} />,
                  danger: true,
                },
              ],
              onClick: ({ key }) => {
                if (key === "edit") {
                  onEditPayment(record);
                  return;
                }

                if (key === "delete") {
                  handleDeletePayment(record.id);
                }
              },
            }}
            buttonsRender={([leftButton, rightButton]) => [
              cloneElement(leftButton, {
                onClick: () => undefined,
              }),
              cloneElement(rightButton, {
                icon: <ChevronDown size={16} />,
              }),
            ]}
          >
            Pilih aksi
          </Dropdown.Button>
        ) : (
          <Button type='link' onClick={() => onCreatePayment(record)}>
            Input Pembayaran
          </Button>
        ),
    },
  ];

  const currentData =
    activeStatusTab === "paid" ? paidPayments : unpaidPayments;

  const renderTable = (emptyText) => (
    <Card
      variant='borderless'
      style={{
        borderRadius: 22,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        border: "1px solid rgba(148,163,184,0.14)",
        boxShadow: "0 18px 36px rgba(15,23,42,0.05)",
      }}
    >
      <Table
        rowKey={(record) =>
          record.id || `${record.student_id}-${record.periode_id}-${record.bill_month}`
        }
        columns={columns}
        dataSource={currentData}
        loading={loading}
        title={() => (
          <Space
            style={{ width: "100%", justifyContent: "space-between" }}
            wrap
          >
            <Text strong>
              Data pembayaran SPP terurut berdasarkan tingkat, kelas, dan nama.
            </Text>
            <Button icon={<Download size={16} />} onClick={handleExportExcel}>
              Download Excel
            </Button>
          </Space>
        )}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText }}
      />
    </Card>
  );

  return (
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Tabs
        activeKey={activeStatusTab}
        onChange={setActiveStatusTab}
        items={[
          {
            key: "unpaid",
            label: `Belum Lunas (${unpaidPayments.length})`,
            children: renderTable(
              "Semua siswa pada filter ini sudah melunasi SPP bulan yang dipilih.",
            ),
          },
          {
            key: "paid",
            label: `Lunas (${paidPayments.length})`,
            children: renderTable(
              "Belum ada siswa yang tercatat lunas pada bulan yang dipilih.",
            ),
          },
        ]}
      />
    </MotionDiv>
  );
};

export default MonthlyPaymentTable;
