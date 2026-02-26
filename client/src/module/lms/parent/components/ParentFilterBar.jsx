import React from "react";
import { Button, Checkbox, Flex, Input, Select, Space, Typography } from "antd";
import { Plus, Search, Trash2 } from "lucide-react";

const { Text } = Typography;

const ParentFilterBar = ({
  screens,
  searchText,
  onSearchChange,
  gradeFilter,
  classFilter,
  gradeOptions,
  classOptions,
  onChangeGradeFilter,
  onChangeClassFilter,
  onCreate,
  selectedCount = 0,
  onBulkDelete,
  isBulkDeleting = false,
  visibleCount = 0,
  allVisibleSelected = false,
  onToggleSelectAllVisible,
  onClearSelection,
}) => {
  return (
    <Flex vertical gap={10} style={{ marginBottom: 16 }}>
      <Flex
        justify="space-between"
        align={screens.xs ? "stretch" : "center"}
        vertical={screens.xs}
        gap={12}
      >
        <Flex gap={8} wrap="wrap" style={{ width: screens.xs ? "100%" : "auto" }}>
          <Input
            allowClear
            value={searchText}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari nama orang tua, username, email, atau NIS siswa"
            prefix={<Search size={16} />}
            style={{ width: screens.xs ? "100%" : 420 }}
          />
          <Select
            allowClear
            placeholder="Filter tingkat"
            value={gradeFilter}
            options={gradeOptions}
            onChange={onChangeGradeFilter}
            style={{ width: screens.xs ? "100%" : 190 }}
          />
          <Select
            allowClear
            placeholder="Filter kelas"
            value={classFilter}
            options={classOptions}
            onChange={onChangeClassFilter}
            disabled={!!gradeFilter && classOptions.length === 0}
            style={{ width: screens.xs ? "100%" : 220 }}
          />
        </Flex>
        <Flex gap={8} wrap="wrap" style={{ width: screens.xs ? "100%" : "auto" }}>
          <Button
            danger
            icon={<Trash2 size={16} />}
            onClick={onBulkDelete}
            disabled={selectedCount === 0}
            loading={isBulkDeleting}
            style={{ width: screens.xs ? "100%" : "auto" }}
          >
            Hapus Terpilih {selectedCount > 0 ? `(${selectedCount})` : ""}
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={onCreate}
            style={{ width: screens.xs ? "100%" : "auto" }}
          >
            Tambah Orang Tua
          </Button>
        </Flex>
      </Flex>

      <Flex
        justify="space-between"
        align={screens.xs ? "stretch" : "center"}
        vertical={screens.xs}
        gap={8}
      >
        <Space size={12} wrap>
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={!allVisibleSelected && selectedCount > 0}
            disabled={visibleCount === 0}
            onChange={(event) => onToggleSelectAllVisible?.(event.target.checked)}
          >
            Pilih semua data terlihat
          </Checkbox>
          <Text type="secondary">{selectedCount} dipilih</Text>
        </Space>
        <Button type="text" onClick={onClearSelection} disabled={selectedCount === 0}>
          Reset Pilihan
        </Button>
      </Flex>

      <Text type="secondary">
        Tips: gunakan checkbox untuk seleksi massal lalu klik <strong>Hapus Terpilih</strong>.
      </Text>
    </Flex>
  );
};

export default ParentFilterBar;
