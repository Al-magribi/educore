import { useState } from "react";
import { Button, Popconfirm, Space, Table, Tabs, Tag, Typography } from "antd";

import {
  currencyFormatter,
  statusColorMap,
  statusLabelMap,
} from "../constants";

const { Text } = Typography;

const parseClassName = (className = "") => {
  const normalizedClassName = String(className).trim().toLowerCase();
  const match = normalizedClassName.match(/^(\d+)\s*([a-z]*)/i);

  if (!match) {
    return {
      grade: Number.MAX_SAFE_INTEGER,
      suffix: normalizedClassName,
    };
  }

  return {
    grade: Number(match[1]),
    suffix: match[2] || "",
  };
};

const comparePaymentsByClass = (left, right) => {
  const leftClass = parseClassName(left.class_name);
  const rightClass = parseClassName(right.class_name);

  if (leftClass.grade !== rightClass.grade) {
    return leftClass.grade - rightClass.grade;
  }

  const suffixComparison = leftClass.suffix.localeCompare(rightClass.suffix, "id", {
    numeric: true,
    sensitivity: "base",
  });

  if (suffixComparison !== 0) {
    return suffixComparison;
  }

  return String(left.student_name || "").localeCompare(
    String(right.student_name || ""),
    "id",
    {
      sensitivity: "base",
    }
  );
};

const MonthlyPaymentTable = ({
  payments,
  loading,
  onCreatePayment,
  onEditPayment,
  onDeletePayment,
  isDeletingPayment,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState("unpaid");
  const sortedPayments = [...payments].sort(comparePaymentsByClass);
  const paidPayments = sortedPayments.filter((item) => item.status === "paid");
  const unpaidPayments = sortedPayments.filter((item) => item.status === "unpaid");

  const columns = [
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      ellipsis: true,
      render: (_, record) => (
        <Space vertical size={0}>
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
      title: "Riwayat Lunas",
      key: "paid_months",
      ellipsis: true,
      render: (_, record) =>
        (record.paid_months || []).length > 0
          ? record.paid_months.join(", ")
          : "-",
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
        <Tag color={statusColorMap[value]}>{statusLabelMap[value]}</Tag>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 190,
      render: (_, record) =>
        record.status === "paid" ? (
          <Space>
            <Button type='link' onClick={() => onEditPayment(record)}>
              Edit
            </Button>
            <Popconfirm
              title='Hapus pembayaran SPP ini?'
              onConfirm={() => onDeletePayment(record.id)}
              okText='Hapus'
              cancelText='Batal'
            >
              <Button type='link' danger loading={isDeletingPayment}>
                Hapus
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <Button type='link' onClick={() => onCreatePayment(record)}>
            Input Pembayaran
          </Button>
        ),
    },
  ];

  const currentData =
    activeStatusTab === "paid" ? paidPayments : unpaidPayments;

  return (
    <Tabs
      activeKey={activeStatusTab}
      onChange={setActiveStatusTab}
      items={[
        {
          key: "unpaid",
          label: `Belum Lunas (${unpaidPayments.length})`,
          children: (
            <Table
              rowKey={(record) =>
                record.id ||
                `${record.student_id}-${record.periode_id}-${record.bill_month}`
              }
              columns={columns}
              dataSource={currentData}
              loading={loading}
              pagination={{ pageSize: 10 }}
              locale={{
                emptyText:
                  "Semua siswa pada filter ini sudah melunasi SPP bulan yang dipilih.",
              }}
            />
          ),
        },
        {
          key: "paid",
          label: `Lunas (${paidPayments.length})`,
          children: (
            <Table
              rowKey={(record) =>
                record.id ||
                `${record.student_id}-${record.periode_id}-${record.bill_month}`
              }
              columns={columns}
              dataSource={currentData}
              loading={loading}
              pagination={{ pageSize: 10 }}
              locale={{
                emptyText:
                  "Belum ada siswa yang tercatat lunas pada bulan yang dipilih.",
              }}
            />
          ),
        },
      ]}
    />
  );
};

export default MonthlyPaymentTable;
