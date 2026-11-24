import React from "react";
import { Button, Card, Flex, Input, Segmented, Select, Space, Typography } from "antd";
import { Plus, Search, SlidersHorizontal } from "lucide-react";

import { museColors, museRadius, museShadow } from "../../../../config/theme";
const { Text } = Typography;

const toolbarCardStyle = {
  borderRadius: museRadius.card,
  background: "#ffffff",
  boxShadow: museShadow.card,
};

const typeOptions = [
  { label: "Semua Tipe", value: "" },
  { label: "Penghargaan", value: "reward" },
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
  categoryId,
  categories = [],
  onSearchChange,
  onPointTypeChange,
  onStatusChange,
  onCategoryChange,
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
              borderRadius: museRadius.card,
              background: museColors.primarySoft,
              color: museColors.primary,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SlidersHorizontal size={18} />
          </span>
          <div>
            <Text strong style={{ color: museColors.text, display: "block" }}>
              Filter Rule Poin
            </Text>
            <Text style={{ color: museColors.muted }}>
              Cari rule, batasi berdasarkan tipe, kategori, dan status aktif.
            </Text>
          </div>
        </Space>

        <Button
          type='primary'
          icon={<Plus size={16} />}
          onClick={onCreate}
          style={{
            borderRadius: museRadius.card,
            height: 42,
            background: museColors.text,
            borderColor: museColors.text,
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
            : "minmax(240px, 1.2fr) auto auto minmax(180px, 0.8fr)",
          gap: 12,
        }}
      >
        <Input
          allowClear
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          prefix={<Search size={16} color={museColors.muted} />}
          placeholder='Cari nama rule atau deskripsi'
          style={{ borderRadius: museRadius.card, height: 42 }}
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
        <Select
          allowClear
          virtual={false}
          value={categoryId || undefined}
          placeholder='Semua kategori'
          onChange={(value) => onCategoryChange(value || "")}
          options={[
            { value: "uncategorized", label: "Tanpa kategori" },
            ...categories
              .filter((item) => !pointType || item.point_type === pointType)
              .map((item) => ({
                value: String(item.id),
                label: `${item.point_type === "reward" ? "Penghargaan" : "Pelanggaran"} · ${item.name}`,
              })),
          ]}
        />
      </div>
    </Flex>
  </Card>
);

export default PointRuleToolbar;
