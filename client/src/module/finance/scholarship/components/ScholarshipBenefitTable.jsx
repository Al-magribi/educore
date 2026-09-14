import { Button, Empty, Flex, Modal, Space, Table, Tag, Typography } from "antd";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  benefitTargetLabel,
  benefitTypeLabel,
  currencyFormatter,
} from "../constants";

const { Text } = Typography;

const ScholarshipBenefitTable = ({
  scholarship,
  benefits = [],
  loading,
  onAdd,
  onEdit,
  onDelete,
  deleting,
}) => {
  if (!scholarship) {
    return (
      <Empty description="Pilih beasiswa di tab Daftar terlebih dahulu" />
    );
  }

  const handleDelete = (record) => {
    Modal.confirm({
      title: "Hapus aturan potongan ini?",
      content:
        "Tagihan penerima akan disinkron ulang. Due tidak turun di bawah pembayaran confirmed/pending; jika cover dicabut, tagihan bisa naik kembali.",
      okText: "Hapus",
      okButtonProps: { danger: true, loading: deleting },
      cancelText: "Batal",
      onOk: () => onDelete(record),
    });
  };

  const columns = [
    {
      title: "Target",
      dataIndex: "benefit_target",
      width: 150,
      render: (value) => (
        <Tag color={value === "spp" ? "blue" : "cyan"}>
          {benefitTargetLabel[value] || value}
        </Tag>
      ),
    },
    {
      title: "Jenis",
      dataIndex: "benefit_type",
      width: 110,
      render: (value) => benefitTypeLabel[value] || value,
    },
    {
      title: "Detail",
      key: "detail",
      render: (_, record) => {
        if (record.benefit_target === "spp") {
          const months = record.months || [];
          if (months.length === 0) {
            return <Text type="secondary">Belum ada bulan</Text>;
          }
          return (
            <Space wrap size={[4, 4]}>
              {months.map((month) => (
                <Tag key={`${month.periode_id}-${month.month_num}`}>
                  {month.periode_name} · {month.month_label}
                </Tag>
              ))}
            </Space>
          );
        }

        return (
          <Space direction="vertical" size={0}>
            <Text strong>{record.component_name || `Komponen #${record.component_id}`}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.periode_name
                ? `Periode: ${record.periode_name}`
                : "Semua periode"}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Nominal",
      key: "amount",
      width: 140,
      render: (_, record) =>
        record.benefit_type === "full"
          ? "Gratis penuh"
          : currencyFormatter.format(Number(record.amount || 0)),
    },
    {
      title: "Aksi",
      key: "action",
      width: 110,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<Pencil size={14} />}
            onClick={() => onEdit(record)}
          />
          <Button
            size="small"
            danger
            icon={<Trash2 size={14} />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Flex justify="space-between" align="center" gap={8} wrap="wrap">
        <div>
          <Text strong>{scholarship.name}</Text>
          <div>
            <Text type="secondary">
              {benefits.length} aturan potongan aktif pada beasiswa ini
            </Text>
          </div>
        </div>
        <Button
          type="primary"
          icon={<Plus size={14} />}
          onClick={onAdd}
          disabled={scholarship.is_active === false}
        >
          Tambah Aturan
        </Button>
      </Flex>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={benefits}
        columns={columns}
        pagination={false}
        scroll={{ x: 760 }}
        size="middle"
        locale={{ emptyText: "Belum ada aturan potongan" }}
      />
    </Space>
  );
};

export default ScholarshipBenefitTable;
