import { cloneElement, useState } from "react";
import {
  Button,
  Card,
  Dropdown,
  Flex,
  Grid,
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
import ScholarshipAmountCell from "../../ScholarshipAmountCell";

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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.lg;
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
      Bruto: Number(item.bruto_amount || item.amount || 0),
      Beasiswa: Number(item.scholarship_cover || 0),
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

  const renderActions = (record) => {
    if (record.status === "paid") {
      return (
        <Dropdown.Button
          size={isMobile ? "small" : "middle"}
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
          {isMobile ? "Aksi" : "Pilih aksi"}
        </Dropdown.Button>
      );
    }

    return (
      <Button
        type={isMobile ? "primary" : "link"}
        size={isMobile ? "small" : "middle"}
        block={isMobile}
        onClick={() => onCreatePayment(record)}
      >
        {isMobile ? "Bayar" : "Input Pembayaran"}
      </Button>
    );
  };

  const desktopColumns = [
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      ellipsis: true,
      width: isCompact ? 180 : 240,
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
            {record.student_name}
          </Text>
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
      width: 140,
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      width: 170,
      render: (_, record) => (
        <ScholarshipAmountCell
          amount={record.amount}
          brutoAmount={record.bruto_amount}
          scholarshipCover={record.scholarship_cover}
          hasScholarship={record.has_scholarship}
          scholarshipNames={record.scholarship_names}
        />
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
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
      width: isCompact ? 140 : 190,
      fixed: "right",
      render: (_, record) => renderActions(record),
    },
  ];

  const mobileColumns = [
    {
      title: "Pembayaran",
      key: "payment",
      render: (_, record) => (
        <Flex vertical gap={10} style={{ width: "100%" }}>
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
                {`${record.nis || "-"} · ${record.class_name || "-"}`}
              </Text>
            </div>
            <Tag
              color={statusColorMap[record.status]}
              style={{ borderRadius: 999, fontWeight: 600, margin: 0 }}
            >
              {statusLabelMap[record.status]}
            </Tag>
          </Flex>

          <Flex justify='space-between' align='center' gap={8} wrap='wrap'>
            <div>
              <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                {record.billing_period_label || selectedMonth || "-"}
              </Text>
              <ScholarshipAmountCell
                amount={record.amount}
                brutoAmount={record.bruto_amount}
                scholarshipCover={record.scholarship_cover}
              hasScholarship={record.has_scholarship}
              scholarshipNames={record.scholarship_names}
            />
            </div>
            <div style={{ minWidth: 110 }}>{renderActions(record)}</div>
          </Flex>
        </Flex>
      ),
    },
  ];

  const currentData =
    activeStatusTab === "paid" ? paidPayments : unpaidPayments;

  const renderTable = (emptyText) => (
    <Card
      variant='borderless'
      style={{
        borderRadius: isMobile ? 16 : 22,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        border: "1px solid rgba(148,163,184,0.14)",
        boxShadow: "0 18px 36px rgba(15,23,42,0.05)",
        overflow: "hidden",
      }}
      styles={{ body: { padding: isMobile ? 10 : 24 } }}
    >
      <Table
        rowKey={(record) =>
          record.id ||
          `${record.student_id}-${record.periode_id}-${record.bill_month}`
        }
        columns={isMobile ? mobileColumns : desktopColumns}
        dataSource={currentData}
        loading={loading}
        size={isMobile ? "small" : "middle"}
        scroll={isMobile ? undefined : { x: 820 }}
        title={() => (
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            gap={10}
            style={{ width: "100%" }}
          >
            <Text
              strong
              style={{
                fontSize: isMobile ? 13 : 14,
                lineHeight: 1.4,
              }}
            >
              {isMobile
                ? "Data pembayaran SPP"
                : "Data pembayaran SPP terurut berdasarkan tingkat, kelas, dan nama."}
            </Text>
            <Button
              icon={<Download size={16} />}
              onClick={handleExportExcel}
              block={isMobile}
              size={isMobile ? "middle" : "middle"}
            >
              {isMobile ? "Excel" : "Download Excel"}
            </Button>
          </Flex>
        )}
        pagination={{
          pageSize: isMobile ? 8 : 10,
          size: isMobile ? "small" : "default",
          showSizeChanger: !isMobile,
          showTotal: isMobile
            ? undefined
            : (total, range) => `${range[0]}-${range[1]} dari ${total} siswa`,
        }}
        locale={{ emptyText }}
      />
    </Card>
  );

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ width: "100%" }}
    >
      <Tabs
        activeKey={activeStatusTab}
        onChange={setActiveStatusTab}
        size={isMobile ? "small" : "middle"}
        tabBarGutter={isMobile ? 8 : 16}
        items={[
          {
            key: "unpaid",
            label: isMobile
              ? `Belum (${unpaidPayments.length})`
              : `Belum Lunas (${unpaidPayments.length})`,
            children: renderTable(
              "Semua siswa pada filter ini sudah melunasi SPP bulan yang dipilih.",
            ),
          },
          {
            key: "paid",
            label: isMobile
              ? `Lunas (${paidPayments.length})`
              : `Lunas (${paidPayments.length})`,
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
