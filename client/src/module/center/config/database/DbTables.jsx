import React, { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import {
  AppstoreOutlined,
  CheckCircleFilled,
  CheckSquareOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  useGetTablesQuery,
  useResetTablesMutation,
} from "../../../../service/center/ApiDatabase";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const DbTables = () => {
  const { data: tables, isLoading } = useGetTablesQuery();
  const [resetTables, { isLoading: isResetting }] = useResetTablesMutation();

  const [selectedTables, setSelectedTables] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTables = useMemo(() => {
    if (!tables) {
      return [];
    }

    return tables.filter((t) =>
      t.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [tables, searchTerm]);

  const toggleSelection = (tableName) => {
    setSelectedTables((prev) =>
      prev.includes(tableName)
        ? prev.filter((t) => t !== tableName)
        : [...prev, tableName],
    );
  };

  const handleSelectAll = () => {
    if (selectedTables.length === filteredTables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(filteredTables);
    }
  };

  const handleResetExecute = async () => {
    if (selectedTables.length === 0) {
      return;
    }

    try {
      await resetTables({ tables: selectedTables }).unwrap();
      message.success(`${selectedTables.length} tabel berhasil dikosongkan!`);
      setSelectedTables([]);
    } catch (error) {
      message.error(error?.data?.message || "Gagal mereset tabel");
    }
  };

  const renderCard = (tableName) => {
    const isSelected = selectedTables.includes(tableName);

    return (
      <Col xs={24} sm={12} md={8} lg={6} key={tableName}>
        <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <div
            onClick={() => toggleSelection(tableName)}
            style={{
              position: "relative",
              cursor: "pointer",
              border: `1px solid ${isSelected ? "#60a5fa" : "#dbe2ea"}`,
              borderRadius: 20,
              background: isSelected
                ? "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(14,165,233,0.08))"
                : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
              padding: 16,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 12,
              minHeight: 92,
              boxShadow: isSelected
                ? "0 16px 40px rgba(37,99,235,0.12)"
                : "0 10px 24px rgba(15,23,42,0.04)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background: isSelected ? "#2563eb" : "#eef2ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isSelected ? "#fff" : "#4f46e5",
                flexShrink: 0,
              }}
            >
              {isSelected ? <CheckCircleFilled /> : <DatabaseOutlined />}
            </div>

            <div style={{ flex: 1, overflow: "hidden" }}>
              <Text
                strong={isSelected}
                style={{
                  color: isSelected ? "#1d4ed8" : "#0f172a",
                  display: "block",
                }}
                ellipsis={{ tooltip: tableName }}
              >
                {tableName}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Public Schema
              </Text>
            </div>

            {isSelected ? (
              <CheckCircleFilled
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  fontSize: 18,
                  color: "#2563eb",
                }}
              />
            ) : null}
          </div>
        </MotionDiv>
      </Col>
    );
  };

  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: 22,
        border: "1px solid rgba(148, 163, 184, 0.14)",
        boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
      }}
      styles={{ body: { padding: 18 } }}
    >
      <Space orientation="vertical" size={18} style={{ width: "100%" }}>
        <Space
          wrap
          size={[12, 12]}
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Space align="center" size={12}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                background: "rgba(99,102,241,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4f46e5",
              }}
            >
              <AppstoreOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                Manajemen Data Tabel
              </Title>
              <Text style={{ color: "#64748b" }}>
                Pilih tabel yang ingin dikosongkan dengan kontrol yang lebih
                jelas.
              </Text>
            </div>
            {tables ? (
              <Badge count={tables.length} style={{ backgroundColor: "#64748b" }} />
            ) : null}
          </Space>

          <Input
            placeholder="Cari tabel..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 220, borderRadius: 999 }}
            allowClear
          />
        </Space>

        <div
          style={{
            padding: 16,
            background: "#f8fafc",
            borderRadius: 18,
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <Space wrap>
            <Button
              type={
                selectedTables.length > 0 &&
                selectedTables.length === filteredTables.length
                  ? "primary"
                  : "default"
              }
              icon={<CheckSquareOutlined />}
              onClick={handleSelectAll}
              style={{ borderRadius: 999 }}
            >
              {selectedTables.length === filteredTables.length
                ? "Batal Pilih Semua"
                : "Pilih Semua"}
            </Button>

            {selectedTables.length > 0 ? (
              <Text strong style={{ color: "#d97706" }}>
                {selectedTables.length} tabel dipilih
              </Text>
            ) : null}
          </Space>

          {selectedTables.length > 0 ? (
            <Popconfirm
              title="Kosongkan Data Tabel?"
              description={`Tindakan ini akan menghapus permanen seluruh data pada ${selectedTables.length} tabel yang dipilih.`}
              onConfirm={handleResetExecute}
              okText="Ya, Hapus Data"
              cancelText="Batal"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                loading={isResetting}
                style={{ borderRadius: 999, fontWeight: 600 }}
              >
                Kosongkan Data ({selectedTables.length})
              </Button>
            </Popconfirm>
          ) : null}
        </div>

        <Spin spinning={isLoading} tip="Memuat daftar tabel...">
          {filteredTables.length > 0 ? (
            <Row gutter={[16, 16]}>
              {filteredTables.map((table) => renderCard(table))}
            </Row>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                searchTerm ? "Tabel tidak ditemukan" : "Tidak ada tabel tersedia"
              }
            />
          )}
        </Spin>
      </Space>
    </Card>
  );
};

export default DbTables;
