import React from "react";
import { Button, Card, Flex, Input, Segmented, Space, Typography } from "antd";
import { Plus, Search, SlidersHorizontal } from "lucide-react";

const { Text } = Typography;

const toolbarCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const typeOptions = [
  { label: "Semua Tipe", value: "" },
  { label: "Prestasi", value: "reward" },
  { label: "Pelanggaran", value: "punishment" },
];

const statusOptions = [
  { label: "Semua Status", value: "" },
  { label: "Aktif", value: "true" },
  { label: "Nonaktif", value: "false" },
];

const PointRuleToolbar = ({
  search,
  pointType,
  isActive,
  onSearchChange,
  onPointTypeChange,
  onStatusChange,
  onCreate,
  isMobile,
}) => (
  <Card
    style={toolbarCardStyle}
    styles={{ body: { padding: isMobile ? 16 : 20 } }}
  >
    <Flex vertical gap={16}>
      <Flex
        vertical={isMobile}
        justify='space-between'
        align={isMobile ? "flex-start" : "center"}
        gap={12}
      >
        <Space align='start'>
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "#eff6ff",
              color: "#2563eb",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SlidersHorizontal size={18} />
          </span>
          <div>
            <Text strong style={{ color: "#0f172a", display: "block" }}>
              Filter Rule Poin
            </Text>
            <Text style={{ color: "#64748b" }}>
              Cari rule, batasi berdasarkan tipe poin, dan status aktif.
            </Text>
          </div>
        </Space>

        <Button
          type='primary'
          icon={<Plus size={16} />}
          onClick={onCreate}
          style={{
            borderRadius: 14,
            height: 42,
            background: "#0f172a",
            borderColor: "#0f172a",
            fontWeight: 700,
            width: isMobile ? "100%" : "auto",
          }}
        >
          Tambah Rule
        </Button>
      </Flex>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "minmax(240px, 1.2fr) auto auto",
          gap: 12,
        }}
      >
        <Input
          allowClear
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          prefix={<Search size={16} color='#64748b' />}
          placeholder='Cari nama rule atau deskripsi'
          style={{ borderRadius: 14, height: 42 }}
        />
        <Segmented
          block
          options={typeOptions}
          value={pointType}
          onChange={onPointTypeChange}
        />
        <Segmented
          block
          options={statusOptions}
          value={isActive}
          onChange={onStatusChange}
        />
      </div>
    </Flex>
  </Card>
);

export default PointRuleToolbar;
