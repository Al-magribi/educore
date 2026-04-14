import { Button, Dropdown, Modal, Space, Table, Tag, Typography } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";

import {
  chargeStatusColorMap,
  chargeStatusLabelMap,
  currencyFormatter,
} from "../constants";
import OthersInstallmentHistory from "./OthersInstallmentHistory";

const { Text } = Typography;

const normalizeSortValue = (value = "") =>
  String(value || "").trim().toLowerCase();

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

    const studentComparison = normalizeSortValue(left.student_name).localeCompare(
      normalizeSortValue(right.student_name),
      "id",
      { numeric: true, sensitivity: "base" },
    );

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
            {`${record.nis || "-"} | ${record.class_name || "-"} | ${record.periode_name || "-"}`}
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
      title: "Dibayar",
      dataIndex: "paid_amount",
      key: "paid_amount",
      width: 140,
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Sisa",
      dataIndex: "remaining_amount",
      key: "remaining_amount",
      width: 140,
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (value) => (
        <Tag color={chargeStatusColorMap[value]}>{chargeStatusLabelMap[value]}</Tag>
      ),
    },
    {
      title: "Cicilan",
      dataIndex: "installment_count",
      key: "installment_count",
      width: 120,
      render: (value) => (Number(value || 0) > 0 ? `Ke-${value}` : "-"),
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
            icon={<MoreOutlined />}
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
          <Text strong>Data pembayaran lain terurut berdasarkan tingkat, kelas, nama, dan jenis biaya.</Text>
          <Button onClick={handleExportExcel}>Download Excel</Button>
        </Space>
      )}
      pagination={{ pageSize: 10 }}
      scroll={{ x: 1280 }}
      expandable={{
        expandedRowRender: (record) => (
          <OthersInstallmentHistory charge={record} />
        ),
        rowExpandable: (record) => Boolean(record.charge_id),
      }}
      locale={{ emptyText: "Belum ada tagihan pembayaran lainnya." }}
    />
  );
};

export default OthersChargesTable;
