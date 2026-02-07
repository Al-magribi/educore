import React, { useState, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Input,
  Button,
  Badge,
  Space,
  theme,
  Popconfirm,
  message,
  Empty,
  Spin,
} from "antd";
import {
  DatabaseOutlined,
  CheckCircleFilled,
  SearchOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  CheckSquareOutlined,
  CloseSquareOutlined,
} from "@ant-design/icons";
import {
  useGetTablesQuery,
  useResetTablesMutation,
} from "../../../../service/center/ApiDatabase";

const { Text, Title } = Typography;

const DbTables = () => {
  const { token } = theme.useToken();
  const { data: tables, isLoading } = useGetTablesQuery();
  const [resetTables, { isLoading: isResetting }] = useResetTablesMutation();

  const [selectedTables, setSelectedTables] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter tabel berdasarkan pencarian
  const filteredTables = useMemo(() => {
    if (!tables) return [];
    return tables.filter((t) =>
      t.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [tables, searchTerm]);

  // Handle klik kartu (Select/Deselect)
  const toggleSelection = (tableName) => {
    setSelectedTables((prev) =>
      prev.includes(tableName)
        ? prev.filter((t) => t !== tableName)
        : [...prev, tableName],
    );
  };

  // Pilih Semua / Hapus Semua Pilihan
  const handleSelectAll = () => {
    if (selectedTables.length === filteredTables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(filteredTables);
    }
  };

  // Eksekusi Reset (Truncate)
  const handleResetExecute = async () => {
    if (selectedTables.length === 0) return;
    try {
      await resetTables({ tables: selectedTables }).unwrap();
      message.success(`${selectedTables.length} tabel berhasil dikosongkan!`);
      setSelectedTables([]);
    } catch (error) {
      message.error(error?.data?.message || "Gagal mereset tabel");
    }
  };

  // --- Render Card Item ---
  const renderCard = (tableName) => {
    const isSelected = selectedTables.includes(tableName);

    return (
      <Col xs={24} sm={12} md={8} lg={6} key={tableName}>
        <div
          onClick={() => toggleSelection(tableName)}
          style={{
            position: "relative",
            cursor: "pointer",
            border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
            borderRadius: token.borderRadiusLG,
            backgroundColor: isSelected
              ? token.colorPrimaryBg
              : token.colorBgContainer,
            padding: "16px",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            height: "100%",
          }}
          className="db-card-hover" // Bisa tambahkan CSS hover effect global jika mau
        >
          {/* Icon Indikator */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: isSelected
                ? token.colorPrimary
                : token.colorFillAlter,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isSelected ? "#fff" : token.colorTextSecondary,
              transition: "all 0.2s",
            }}
          >
            {isSelected ? <CheckCircleFilled /> : <DatabaseOutlined />}
          </div>

          {/* Nama Tabel */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <Text
              strong={isSelected}
              style={{
                color: isSelected ? token.colorPrimary : token.colorText,
                display: "block",
              }}
              ellipsis={{ tooltip: tableName }}
            >
              {tableName}
            </Text>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              Public Schema
            </Text>
          </div>

          {/* Badge Centang Pojok (Optional Visual) */}
          {isSelected && (
            <div
              style={{
                position: "absolute",
                top: -8,
                right: -8,
                color: token.colorPrimary,
                backgroundColor: token.colorBgContainer,
                borderRadius: "50%",
              }}
            >
              <CheckCircleFilled style={{ fontSize: 20 }} />
            </div>
          )}
        </div>
      </Col>
    );
  };

  return (
    <Card
      title={
        <Space>
          <AppstoreOutlined />
          <span>Manajemen Data Tabel</span>
          {tables && (
            <Badge
              count={tables.length}
              style={{ backgroundColor: token.colorTextSecondary }}
            />
          )}
        </Space>
      }
      extra={
        <Space>
          {/* Search Input */}
          <Input
            placeholder="Cari tabel..."
            prefix={
              <SearchOutlined style={{ color: token.colorTextQuaternary }} />
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
        </Space>
      }
      style={{ minHeight: 400 }}
    >
      {/* Toolbar Selection */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: token.colorFillQuaternary,
          borderRadius: token.borderRadiusLG,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <Space>
          <Button
            type={
              selectedTables.length > 0 &&
              selectedTables.length === filteredTables.length
                ? "primary"
                : "default"
            }
            icon={
              selectedTables.length === filteredTables.length ? (
                <CheckSquareOutlined />
              ) : (
                <CheckSquareOutlined />
              )
            }
            onClick={handleSelectAll}
          >
            {selectedTables.length === filteredTables.length
              ? "Batal Pilih Semua"
              : "Pilih Semua"}
          </Button>

          {selectedTables.length > 0 && (
            <Text strong type="warning">
              {selectedTables.length} Tabel dipilih
            </Text>
          )}
        </Space>

        {/* Action Button */}
        {selectedTables.length > 0 && (
          <Popconfirm
            title="Kosongkan Data Tabel?"
            description={`Tindakan ini akan menghapus permanen (TRUNCATE) seluruh data pada ${selectedTables.length} tabel yang dipilih.`}
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
            >
              Kosongkan Data ({selectedTables.length})
            </Button>
          </Popconfirm>
        )}
      </div>

      {/* Grid Content */}
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
    </Card>
  );
};

export default DbTables;
