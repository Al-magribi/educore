import { Button, Card, Dropdown, Modal, Space, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { Download, MoreHorizontal } from "lucide-react";
import * as XLSX from "xlsx";

import {
  chargeStatusColorMap,
  chargeStatusLabelMap,
  currencyFormatter,
} from "../constants";
import OthersInstallmentHistory from "./OthersInstallmentHistory";

const { Text } = Typography;
const MotionDiv = motion.div;

const normalizeSortValue = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const getPeriodeName = (record = {}) =>
  record.periode_name ||
  record.periode?.periode_name ||
  record.periode?.name ||
  record.academic_year ||
  record.school_year ||
  "-";

const OthersChargesTable = ({
  charges,
  loading,
  onDeleteCharge,
  isDeletingCharge,
}) => {
  const sortedCharges = [...charges].sort((left, right) => {
    const gradeComparison = normalizeSortValue(left.grade_name).localeCompare(
      normalizeSortValue(right.grade_name),
      "id",
      { numeric: true, sensitivity: "base" },
    );

    if (gradeComparison !== 0) {
      return gradeComparison;
    }

    const classComparison = normalizeSortValue(left.class_name).localeCompare(
      normalizeSortValue(right.class_name),
      "id",
      { numeric: true, sensitivity: "base" },
    );

    if (classComparison !== 0) {
      return classComparison;
    }

    const studentComparison = normalizeSortValue(
      left.student_name,
    ).localeCompare(normalizeSortValue(right.student_name), "id", {
      numeric: true,
      sensitivity: "base",
    });

    if (studentComparison !== 0) {
      return studentComparison;
    }

    return normalizeSortValue(left.type_name).localeCompare(
      normalizeSortValue(right.type_name),
      "id",
      { numeric: true, sensitivity: "base" },
    );
  });

  const handleExportExcel = () => {
    const exportRows = sortedCharges.map((item, index) => ({
      No: index + 1,
      Tingkat: item.grade_name || "-",
      Kelas: item.class_name || "-",
      Nama: item.student_name || "-",
      NIS: item.nis || "-",
      Periode: item.periode_name || "-",
      "Jenis Biaya": item.type_name || "-",
      Tagihan: Number(item.amount_due || 0),
      Dibayar: Number(item.paid_amount || 0),
      Sisa: Number(item.remaining_amount || 0),
      Status: chargeStatusLabelMap[item.status] || item.status || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pembayaran Lainnya");
    XLSX.writeFile(workbook, "pembayaran-lainnya.xlsx");
  };

  const columns = [
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      width: 220,
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{record.student_name}</Text>
          <Text
            type='secondary'
            style={{ whiteSpace: "normal", wordBreak: "break-word" }}
          >
            {`${record.nis || "-"} | ${record.grade_name || "-"} | ${record.class_name || "-"} | ${getPeriodeName(record) || "-"}`}
          </Text>
        </Space>
      ),
    },
    {
      title: "Jenis Biaya / Tagihan",
      key: "type_name",
      width: 220,
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{record.type_name || "-"}</Text>
          <Text type='secondary'>
            {currencyFormatter.format(Number(record.amount_due || 0))}
          </Text>
        </Space>
      ),
    },
    {
      title: "Pembayaran",
      key: "payment_summary",
      width: 200,
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>
            {currencyFormatter.format(Number(record.paid_amount || 0))}
          </Text>
          <Text type='secondary'>
            Sisa {currencyFormatter.format(Number(record.remaining_amount || 0))}
          </Text>
        </Space>
      ),
    },
    {
      title: "Ket",
      key: "status_summary",
      width: 120,
      render: (_, record) => {
        const installmentCount = Number(record.installment_count || 0);

        return (
          <Space direction='vertical' size={4}>
            <Tag
              color={chargeStatusColorMap[record.status]}
              style={{ borderRadius: 999, fontWeight: 600 }}
            >
              {chargeStatusLabelMap[record.status]}
            </Tag>
            <Text type='secondary'>
              {installmentCount > 0 ? `Cicilan Ke-${installmentCount}` : "-"}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Aksi",
      key: "action",
      width: 160,
      render: (_, record) => {
        const hasCharge = Boolean(record.charge_id);
        const menuItems = hasCharge
          ? [
              {
                key: "delete",
                label: "Hapus",
                danger: true,
              },
            ]
          : [];

        const handleMenuClick = ({ key }) => {
          if (key === "delete") {
            Modal.confirm({
              title: "Hapus tagihan ini?",
              okText: "Hapus",
              cancelText: "Batal",
              okButtonProps: { danger: true },
              onOk: () => onDeleteCharge(record),
            });
          }
        };

        if (!hasCharge) {
          return "-";
        }

        return (
          <Dropdown.Button
            type='primary'
            icon={<MoreHorizontal size={16} />}
            menu={{
              items: menuItems,
              onClick: handleMenuClick,
            }}
            onClick={() => handleMenuClick({ key: "delete" })}
            loading={isDeletingCharge}
          >
            Pilih Aksi
          </Dropdown.Button>
        );
      },
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
            record.charge_id ||
            `${record.periode_id}-${record.student_id}-${record.type_id}`
          }
          columns={columns}
          dataSource={sortedCharges}
          loading={loading}
          title={() => (
            <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
              <Text strong>
                Data pembayaran lain terurut berdasarkan tingkat, kelas, nama, dan
                jenis biaya.
              </Text>
              <Button icon={<Download size={16} />} onClick={handleExportExcel}>
                Download Excel
              </Button>
            </Space>
          )}
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender: (record) => (
              <OthersInstallmentHistory charge={record} />
            ),
            rowExpandable: (record) => Boolean(record.charge_id),
          }}
          locale={{ emptyText: "Belum ada tagihan pembayaran lainnya." }}
        />
      </Card>
    </MotionDiv>
  );
};

export default OthersChargesTable;
