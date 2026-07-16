import { useEffect, useState } from "react";
import { Button, Card, Dropdown, Flex, Modal, Space, Table, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { currencyFormatter } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;
const DEFAULT_PAGE_SIZE = 8;
const PAGE_SIZE_OPTIONS = [8, 10, 20, 50, 100];

const OthersTypesTable = ({
  types,
  loading,
  onAddType,
  onEditType,
  onDeleteType,
  onBulkDeleteType,
  isDeletingType,
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const validKeys = new Set(types.map((item) => item.type_id));
    setSelectedRowKeys((previous) =>
      previous.filter((key) => validKeys.has(key)),
    );
  }, [types]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(types.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [types.length, pageSize, currentPage]);

  const handleBulkDelete = () => {
    const selectedRecords = types.filter(
      (item) =>
        selectedRowKeys.includes(item.type_id) &&
        Number(item.charge_count || 0) === 0,
    );

    if (selectedRecords.length === 0) {
      Modal.warning({
        title: "Tidak ada jenis biaya yang dapat dihapus",
        content:
          "Jenis biaya yang sudah dipakai pada tagihan tidak dapat dihapus secara massal.",
      });
      return;
    }

    Modal.confirm({
      title: `Hapus ${selectedRecords.length} jenis biaya terpilih?`,
      content:
        "Hanya jenis biaya yang belum dipakai pada tagihan yang akan dihapus.",
      okText: "Hapus",
      cancelText: "Batal",
      okButtonProps: { danger: true, loading: isDeletingType },
      onOk: async () => {
        await onBulkDeleteType(selectedRecords);
        setSelectedRowKeys([]);
      },
    });
  };

  const openCoverageModal = (record) => {
    const isStudentScope = record.scope === "student";
    const grades = Array.isArray(record.grade_names)
      ? record.grade_names.filter(Boolean)
      : [];
    const students = Array.isArray(record.student_names)
      ? record.student_names.filter(Boolean)
      : [];
    const items = isStudentScope ? students : grades;

    Modal.info({
      title: isStudentScope
        ? `Siswa terpilih (${students.length || record.student_count || 0})`
        : `Tingkat berlaku (${grades.length})`,
      width: 420,
      okText: "Tutup",
      content:
        items.length > 0 ? (
          <Space direction='vertical' size={6} style={{ width: "100%", marginTop: 8 }}>
            {items.map((item) => (
              <Tag
                key={item}
                color={isStudentScope ? "blue" : "cyan"}
                style={{
                  borderRadius: 999,
                  margin: 0,
                  whiteSpace: "normal",
                  maxWidth: "100%",
                }}
              >
                {item}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type='secondary'>
            {isStudentScope
              ? "Belum ada siswa pada roster ini."
              : "Belum ada tingkat yang ditetapkan."}
          </Text>
        ),
    });
  };

  const columns = [
    {
      title: "Jenis Biaya / Periode",
      key: "name_periode",
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{record.name}</Text>
          <Text type='secondary'>{record.periode_name || "-"}</Text>
          <Text
            type='secondary'
            style={{ whiteSpace: "normal", wordBreak: "break-word" }}
          >
            {record.description || "Tanpa deskripsi"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      width: 160,
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Cakupan",
      key: "scope",
      width: 160,
      render: (_, record) => {
        const isStudentScope = record.scope === "student";
        const count = isStudentScope
          ? Number(record.student_count || record.student_ids?.length || 0)
          : Array.isArray(record.grade_names)
            ? record.grade_names.filter(Boolean).length
            : 0;

        return (
          <Button
            size='small'
            type={isStudentScope ? "default" : "primary"}
            ghost={!isStudentScope}
            onClick={() => openCoverageModal(record)}
            style={{ borderRadius: 999, fontWeight: 600 }}
          >
            {isStudentScope ? `Individu (${count})` : `Tingkat (${count})`}
          </Button>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      render: (value) => (
        <Tag
          color={value ? "green" : "red"}
          style={{ borderRadius: 999, fontWeight: 600 }}
        >
          {value ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 160,
      render: (_, record) => {
        const used = Number(record.charge_count || 0) > 0;
        const menuItems = [
          {
            key: "edit",
            label: "Edit",
          },
          {
            key: "delete",
            label: used ? "Tidak dapat dihapus" : "Hapus",
            danger: true,
            disabled: used,
          },
        ];

        const handleMenuClick = ({ key }) => {
          if (key === "edit") {
            onEditType(record);
            return;
          }

          if (key === "delete") {
            if (used) {
              return;
            }

            Modal.confirm({
              title: "Hapus jenis biaya ini?",
              content: `Jenis biaya ${record.name} akan dihapus dari periode terkait.`,
              okText: "Hapus",
              cancelText: "Batal",
              okButtonProps: { danger: true, loading: isDeletingType },
              onOk: () => onDeleteType(record),
            });
          }
        };

        return (
          <Dropdown.Button
            type='primary'
            icon={<MoreHorizontal size={16} />}
            menu={{
              items: menuItems,
              onClick: handleMenuClick,
            }}
            onClick={() => onEditType(record)}
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
        <Flex justify='space-between' align='center' wrap='wrap' gap={12} style={{ marginBottom: 16 }}>
          <div>
            <Text strong style={{ display: "block", color: "#0f172a" }}>
              Master Jenis Biaya
            </Text>
            <Text type='secondary'>
              Per tingkat untuk biaya massal; per individu untuk gelombang.
              Jenis yang sudah punya tagihan tidak dapat dihapus.
            </Text>
          </div>
          <Space wrap>
            {selectedRowKeys.length > 0 ? (
              <Button
                danger
                icon={<Trash2 size={16} />}
                loading={isDeletingType}
                onClick={handleBulkDelete}
              >
                Hapus Terpilih ({selectedRowKeys.length})
              </Button>
            ) : null}
            <Button type='primary' icon={<Plus size={16} />} onClick={onAddType}>
              Atur Jenis Biaya
            </Button>
          </Space>
        </Flex>

        <Table
          rowKey='type_id'
          columns={columns}
          dataSource={types}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} dari ${total} jenis biaya`,
            onChange: (page, nextPageSize) => {
              setCurrentPage(page);
              setPageSize(nextPageSize);
            },
          }}
          scroll={{ x: 860 }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({
              disabled: Number(record.charge_count || 0) > 0,
            }),
          }}
          locale={{ emptyText: "Belum ada jenis biaya tambahan." }}
        />
      </Card>
    </MotionDiv>
  );
};

export default OthersTypesTable;
