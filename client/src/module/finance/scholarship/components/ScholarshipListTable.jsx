import { Button, Flex, Grid, Modal, Space, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { Pencil, Trash2, Users, Wand2 } from "lucide-react";

const { Text } = Typography;
const MotionDiv = motion.div;

const ScholarshipListTable = ({
  data,
  loading,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onManageBenefits,
  onManageStudents,
  deleting,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const handleDelete = (record) => {
    Modal.confirm({
      title: `Hapus beasiswa "${record.name}"?`,
      content:
        "Semua jejak cover beasiswa ini akan dihapus. Tagihan penerima (termasuk yang sebelumnya ter-cover / cicilan) akan disinkron ulang; due tidak turun di bawah pembayaran confirmed/pending.",
      okText: "Hapus",
      okButtonProps: { danger: true, loading: deleting },
      cancelText: "Batal",
      onOk: () => onDelete(record),
    });
  };

  const columns = [
    {
      title: "Beasiswa",
      key: "name",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.code || "Tanpa kode"}
            {record.description ? ` · ${record.description}` : ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 110,
      render: (value) => (
        <Tag color={value ? "green" : "default"} style={{ borderRadius: 999 }}>
          {value ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "Aturan",
      dataIndex: "benefit_count",
      width: 90,
      render: (value) => value || 0,
    },
    {
      title: "Penerima",
      dataIndex: "student_count",
      width: 100,
      render: (value) => value || 0,
    },
    {
      title: "Cover",
      dataIndex: "total_cover",
      width: 140,
      render: (value) =>
        new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(Number(value || 0)),
    },
    {
      title: "Aksi",
      key: "action",
      width: isMobile ? 120 : 280,
      fixed: "right",
      render: (_, record) => (
        <Space wrap size={4}>
          <Button
            type={selectedId === record.id ? "primary" : "default"}
            size="small"
            onClick={() => onSelect(record)}
          >
            Pilih
          </Button>
          {!isMobile ? (
            <>
              <Button
                size="small"
                icon={<Wand2 size={14} />}
                onClick={() => onManageBenefits(record)}
              >
                Aturan
              </Button>
              <Button
                size="small"
                icon={<Users size={14} />}
                onClick={() => onManageStudents(record)}
              >
                Penerima
              </Button>
            </>
          ) : null}
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
    <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: isMobile ? 720 : undefined }}
        size={isMobile ? "small" : "middle"}
        rowClassName={(record) =>
          selectedId === record.id ? "ant-table-row-selected" : ""
        }
        onRow={(record) => ({
          onClick: () => onSelect(record),
          style: { cursor: "pointer" },
        })}
      />
      {isMobile && selectedId ? (
        <Flex gap={8} style={{ marginTop: 12 }} wrap="wrap">
          <Button
            icon={<Wand2 size={14} />}
            onClick={() =>
              onManageBenefits(data.find((item) => item.id === selectedId))
            }
          >
            Kelola Aturan
          </Button>
          <Button
            icon={<Users size={14} />}
            onClick={() =>
              onManageStudents(data.find((item) => item.id === selectedId))
            }
          >
            Kelola Penerima
          </Button>
        </Flex>
      ) : null}
    </MotionDiv>
  );
};

export default ScholarshipListTable;
