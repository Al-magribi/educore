import { Button, Flex, Grid, Input, Modal, Popconfirm, Tooltip, Typography } from "antd";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { museColors } from "../../../config/theme";
import { CardTitle, IconBox, MuseCard } from "./index.jsx";

const { Text } = Typography;
const { useBreakpoint } = Grid;

/**
 * Card daftar data master: judul + jumlah, pencarian, tombol tambah, lalu isi (biasanya DataRow).
 * searchProps diteruskan ke Input.Search (onSearch / onChange / placeholder).
 */
export const DataListCard = ({
  title,
  description,
  icon,
  count,
  unit = "data",
  searchProps,
  onAdd,
  addLabel = "Tambah",
  extra,
  children,
  flush = true,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const countText = typeof count === "number" ? `${count.toLocaleString("id-ID")} ${unit}` : null;

  return (
    <MuseCard
      flush={flush}
      title={
        <CardTitle
          icon={icon}
          title={title}
          description={[countText, description].filter(Boolean).join(" · ") || undefined}
        />
      }
      extra={
        <Flex gap={8} wrap style={{ padding: "8px 0", justifyContent: "flex-end" }}>
          {searchProps ? (
            <Input.Search
              allowClear
              aria-label={searchProps.placeholder || "Cari"}
              style={{ width: isMobile ? "100%" : 260 }}
              {...searchProps}
            />
          ) : null}
          {extra}
          {onAdd ? (
            <Button type='primary' icon={<Plus size={16} />} onClick={onAdd}>
              {addLabel}
            </Button>
          ) : null}
        </Flex>
      }
      styles={isMobile ? { header: { flexWrap: "wrap", paddingBlock: 8 } } : undefined}
    >
      {children}
    </MuseCard>
  );
};

/** Satu baris data: ikon, judul, subjudul, tag, aksi di kanan. */
export const DataRow = ({ icon, tone = "primarySoft", title, subtitle, tags, actions, onClick, last }) => (
  <Flex
    align='center'
    gap={16}
    onClick={onClick}
    style={{
      padding: "14px 24px",
      borderBottom: last ? 0 : `1px solid ${museColors.divider}`,
      cursor: onClick ? "pointer" : undefined,
      minWidth: 0,
    }}
  >
    {icon ? <IconBox icon={icon} tone={tone} size={40} /> : null}
    <div style={{ flex: 1, minWidth: 0 }}>
      <Text strong ellipsis={{ tooltip: title }} style={{ display: "block", fontSize: 15 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text type='secondary' style={{ fontSize: 12 }} ellipsis>
          {subtitle}
        </Text>
      ) : null}
    </div>
    {tags ? (
      <Flex gap={6} wrap style={{ flexShrink: 0 }}>
        {tags}
      </Flex>
    ) : null}
    {actions ? (
      <Flex gap={4} style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        {actions}
      </Flex>
    ) : null}
  </Flex>
);

/** Tombol edit + hapus standar untuk DataRow. */
export const EditDeleteActions = ({
  onEdit,
  onDelete,
  deleteTitle = "Hapus data ini?",
  deleteDescription = "Data tidak dapat dikembalikan.",
  deleteDisabled = false,
  deleteDisabledReason,
  deleting = false,
}) => (
  <>
    {onEdit ? (
      <Tooltip title='Edit'>
        <Button type='text' aria-label='Edit' icon={<Pencil size={16} />} onClick={onEdit} />
      </Tooltip>
    ) : null}
    {onDelete ? (
      <Popconfirm
        title={deleteTitle}
        description={deleteDescription}
        onConfirm={onDelete}
        okText='Ya, Hapus'
        cancelText='Batal'
        okButtonProps={{ danger: true, loading: deleting }}
        disabled={deleteDisabled}
      >
        <Tooltip title={deleteDisabled ? deleteDisabledReason : "Hapus"}>
          <Button
            type='text'
            danger
            aria-label='Hapus'
            icon={<Trash2 size={16} />}
            disabled={deleteDisabled}
          />
        </Tooltip>
      </Popconfirm>
    ) : null}
  </>
);

/** Modal form standar Muse: judul CardTitle, isi form, footer Batal/Simpan bawaan antd. */
export const FormModal = ({
  open,
  onCancel,
  onOk,
  title,
  description,
  icon,
  okText = "Simpan",
  confirmLoading,
  width = 560,
  children,
  ...props
}) => (
  <Modal
    open={open}
    onCancel={onCancel}
    onOk={onOk}
    okText={okText}
    cancelText='Batal'
    confirmLoading={confirmLoading}
    destroyOnHidden
    centered
    width={width}
    title={<CardTitle icon={icon} title={title} description={description} />}
    {...props}
  >
    <div style={{ marginTop: 16 }}>{children}</div>
  </Modal>
);
