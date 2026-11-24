import React, { useMemo, useState } from "react";
import {
  Button,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckOutlined,
  CheckSquareOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  useGetTablesQuery,
  useResetTablesMutation,
} from "../../../../service/center/ApiDatabase";
import { CardTitle, IconBox, MuseCard } from "../../../../components/ui/muse";
import { museColors, museRadius } from "../../../../config/theme";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const HIDDEN_SCHEMAS = ["pgboss"];
const HIDDEN_TABLES = [
  "db_city",
  "db_district",
  "db_village",
  "db_province",
  "configurations",
  "t_ayah",
  "t_juz",
  "t_juz_detail",
  "t_surah",
];
const schemaColors = [
  "blue",
  "cyan",
  "geekblue",
  "green",
  "gold",
  "orange",
  "magenta",
  "purple",
];

const getTableMeta = (table, index = 0) => {
  if (typeof table === "string") {
    const [schemaPart, tablePart] = table.includes(".")
      ? table.split(".")
      : ["public", table];

    return {
      key: table.includes(".") ? table : `public.${table}`,
      schema: schemaPart,
      tableName: tablePart,
      fullName: table.includes(".") ? table : `public.${table}`,
      color: schemaColors[index % schemaColors.length],
    };
  }

  return {
    key: table.fullName,
    schema: table.schema,
    tableName: table.tableName,
    fullName: table.fullName,
    color: schemaColors[index % schemaColors.length],
  };
};

const DbTables = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data: tables, isLoading } = useGetTablesQuery();
  const [resetTables, { isLoading: isResetting }] = useResetTablesMutation();

  const [selectedTables, setSelectedTables] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [schemaFilter, setSchemaFilter] = useState("all");

  const normalizedTables = useMemo(() => {
    if (!tables) {
      return [];
    }

    return tables
      .map((table, index) => getTableMeta(table, index))
      .filter(
        (table) =>
          !HIDDEN_SCHEMAS.includes(table.schema) &&
          !HIDDEN_TABLES.includes(table.tableName),
      );
  }, [tables]);

  const schemaOptions = useMemo(() => {
    const schemas = Array.from(
      new Set(normalizedTables.map((table) => table.schema)),
    ).sort((a, b) => a.localeCompare(b));

    return [
      { value: "all", label: "Semua Schema" },
      ...schemas.map((schema) => ({
        value: schema,
        label: schema,
      })),
    ];
  }, [normalizedTables]);

  const filteredTables = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const schemaScopedTables =
      schemaFilter === "all"
        ? normalizedTables
        : normalizedTables.filter((table) => table.schema === schemaFilter);

    if (!keyword) {
      return schemaScopedTables;
    }

    return schemaScopedTables.filter((table) =>
      [table.fullName, table.schema, table.tableName].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [normalizedTables, schemaFilter, searchTerm]);

  const schemaSummary = useMemo(() => {
    const counts = filteredTables.reduce((acc, table) => {
      acc[table.schema] = (acc[table.schema] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts);
  }, [filteredTables]);

  const visibleKeys = filteredTables.map((table) => table.key);
  const allVisibleSelected =
    filteredTables.length > 0 &&
    filteredTables.every((table) => selectedTables.includes(table.key));
  const hasPartialSelection = selectedTables.length > 0 && !allVisibleSelected;

  const toggleSelection = (tableKey) => {
    setSelectedTables((prev) =>
      prev.includes(tableKey)
        ? prev.filter((item) => item !== tableKey)
        : [...prev, tableKey],
    );
  };

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedTables((prev) =>
        prev.filter((item) => !visibleKeys.includes(item)),
      );
      return;
    }

    setSelectedTables((prev) => Array.from(new Set([...prev, ...visibleKeys])));
  };

  const handleResetExecute = async () => {
    if (selectedTables.length === 0) {
      return;
    }

    try {
      await resetTables({ tables: selectedTables }).unwrap();
      message.success(
        `${selectedTables.length} tabel berhasil dikosongkan dan ID direset!`,
      );
      setSelectedTables([]);
    } catch (error) {
      message.error(error?.data?.message || "Gagal mereset tabel");
    }
  };

  const renderCard = (table) => {
    const isSelected = selectedTables.includes(table.key);

    return (
      <Col xs={24} sm={12} md={8} lg={6} key={table.key} style={{ minWidth: 0 }}>
        <div
          role="checkbox"
          aria-checked={isSelected}
          tabIndex={0}
          onClick={() => toggleSelection(table.key)}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              toggleSelection(table.key);
            }
          }}
          style={{
            cursor: "pointer",
            border: `1px solid ${isSelected ? museColors.primary : museColors.divider}`,
            borderRadius: museRadius.card,
            background: isSelected ? museColors.primarySoft : "#fff",
            padding: isMobile ? 12 : 16,
            transition: "border-color 0.2s, background 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 12,
            height: "100%",
            minWidth: 0,
          }}
        >
          <IconBox
            icon={isSelected ? <CheckOutlined /> : <DatabaseOutlined />}
            tone={isSelected ? "primary" : museColors.muted}
            size={36}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ display: "block" }} ellipsis={{ tooltip: table.fullName }}>
              {table.tableName}
            </Text>
            <Tag color={table.color} style={{ margin: "4px 0 0", fontSize: 11 }}>
              {table.schema}
            </Tag>
          </div>
        </div>
      </Col>
    );
  };

  return (
    <MuseCard
      title={
        <CardTitle
          title={
            <Flex align="center" gap={8}>
              {isMobile ? "Manajemen Tabel" : "Manajemen Data Tabel"}
              {normalizedTables.length > 0 ? (
                <Tag style={{ margin: 0 }}>{normalizedTables.length}</Tag>
              ) : null}
            </Flex>
          }
          description={
            isMobile
              ? undefined
              : "Kosongkan tabel beserta reset identity-nya. Admin pusat/center dan relasi u_admin tetap dipertahankan."
          }
        />
      }
      extra={
        <Flex gap={8} wrap style={{ padding: "8px 0" }}>
          <Select
            aria-label="Filter schema"
            value={schemaFilter}
            onChange={setSchemaFilter}
            options={schemaOptions}
            style={{ width: isMobile ? "100%" : 180 }}
          />
          <Input
            aria-label="Cari tabel"
            placeholder={isMobile ? "Cari tabel..." : "Cari schema atau tabel..."}
            prefix={<SearchOutlined style={{ color: museColors.muted }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: isMobile ? "100%" : 240 }}
            allowClear
          />
        </Flex>
      }
    >
      <Flex vertical gap={16} style={{ width: "100%", minWidth: 0 }}>
        <Flex
          justify="space-between"
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          wrap
          gap={12}
          style={{
            padding: isMobile ? 12 : 16,
            background: museColors.bgLayout,
            borderRadius: museRadius.item,
            minWidth: 0,
          }}
        >
          <Flex wrap gap={8} align="center">
            <Button
              type={allVisibleSelected ? "primary" : "default"}
              icon={<CheckSquareOutlined />}
              onClick={handleSelectAll}
              block={isMobile}
            >
              {allVisibleSelected ? "Batal Pilih Semua" : "Pilih Semua"}
            </Button>

            {schemaSummary.map(([schema, count], index) => (
              <Tag key={schema} color={schemaColors[index % schemaColors.length]} style={{ margin: 0 }}>
                {schema}: {count}
              </Tag>
            ))}

            {selectedTables.length > 0 ? (
              <Text strong>{selectedTables.length} tabel dipilih</Text>
            ) : null}

            {hasPartialSelection && !isMobile ? (
              <Text type="secondary">Sebagian tabel terlihat sudah dipilih</Text>
            ) : null}
          </Flex>

          {selectedTables.length > 0 ? (
            <Popconfirm
              title="Kosongkan Data Tabel?"
              description={`Tindakan ini akan menghapus permanen seluruh data pada ${selectedTables.length} tabel yang dipilih, menjalankan CASCADE, dan mereset identity/ID-nya. Admin pusat/center di u_users dan relasinya di u_admin tetap dipertahankan.`}
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
                block={isMobile}
              >
                {isMobile
                  ? `Kosongkan (${selectedTables.length})`
                  : `Kosongkan Data (${selectedTables.length})`}
              </Button>
            </Popconfirm>
          ) : null}
        </Flex>

        {isLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : filteredTables.length > 0 ? (
          <Row gutter={[16, 16]}>{filteredTables.map((table) => renderCard(table))}</Row>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={searchTerm ? "Tabel tidak ditemukan. Coba kata kunci lain." : "Tidak ada tabel tersedia"}
          />
        )}
      </Flex>
    </MuseCard>
  );
};

export default DbTables;
