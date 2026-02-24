import React from "react";
import { Button, Flex, Input, Select } from "antd";
import { Plus, Search } from "lucide-react";

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
}) => {
  return (
    <Flex
      justify="space-between"
      align={screens.xs ? "stretch" : "center"}
      vertical={screens.xs}
      gap={12}
      style={{ marginBottom: 16 }}
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
      <Button
        type="primary"
        icon={<Plus size={16} />}
        onClick={onCreate}
        style={{ width: screens.xs ? "100%" : "auto" }}
      >
        Tambah Orang Tua
      </Button>
    </Flex>
  );
};

export default ParentFilterBar;
