import { Drawer, Flex, Grid, Tag, Typography, Upload } from "antd";
import { FileSpreadsheet } from "lucide-react";

import { museColors, museRadius } from "../../../config/theme";
import { CardTitle, IconBox } from "./index.jsx";

const { Text } = Typography;
const { Dragger } = Upload;
const { useBreakpoint } = Grid;

/**
 * Drawer impor Excel standar Muse.
 * actions: tombol di kanan header (Template, Upload, dst). Tombol tutup bawaan Drawer dipakai.
 */
export const ImportDrawer = ({
  open,
  onClose,
  icon,
  title,
  description,
  status,
  statusColor,
  actions,
  width = 1100,
  children,
  ...props
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={isMobile ? "100%" : width}
      destroyOnHidden
      title={
        <Flex align='center' gap={10} wrap style={{ minWidth: 0 }}>
          <CardTitle icon={icon} title={title} description={isMobile ? undefined : description} />
          {status ? (
            <Tag color={statusColor} style={{ margin: 0 }}>
              {status}
            </Tag>
          ) : null}
        </Flex>
      }
      extra={
        <Flex gap={8} wrap justify='flex-end'>
          {actions}
        </Flex>
      }
      styles={{
        header: { flexWrap: isMobile ? "wrap" : undefined, gap: 8 },
        body: { background: museColors.bgLayout, padding: isMobile ? 12 : 24 },
      }}
      {...props}
    >
      <Flex vertical gap={isMobile ? 16 : 24} style={{ minHeight: "100%" }}>
        {children}
      </Flex>
    </Drawer>
  );
};

/** Area unggah file Excel bergaya Muse. */
export const UploadDropzone = ({ title = "Klik atau tarik file Excel ke sini", hint, note, ...props }) => (
  <Dragger
    accept='.xlsx, .xls'
    showUploadList={false}
    style={{
      padding: 32,
      borderRadius: museRadius.card,
      background: "#fff",
      borderColor: museColors.border,
    }}
    {...props}
  >
    <Flex vertical align='center' gap={12}>
      <IconBox icon={<FileSpreadsheet size={28} />} size={56} />
      <Text strong style={{ fontSize: 18, color: museColors.navy }}>
        {title}
      </Text>
      {hint ? (
        <Text type='secondary' style={{ maxWidth: 520 }}>
          {hint}
        </Text>
      ) : null}
      {note ? <Tag style={{ margin: 0 }}>{note}</Tag> : null}
    </Flex>
  </Dragger>
);

/** Ringkasan hasil baca file: total / valid / perlu cek. */
export const ImportStats = ({ items }) => (
  <div
    style={{
      display: "grid",
      gap: 12,
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    }}
  >
    {items.map((item) => (
      <div
        key={item.label}
        style={{
          background: "#fff",
          borderRadius: museRadius.card,
          padding: "12px 16px",
          border: `1px solid ${museColors.divider}`,
        }}
      >
        <Text type='secondary' style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
          {item.label}
        </Text>
        <Text strong style={{ fontSize: 24, fontWeight: 700, color: item.color || museColors.navy }}>
          {Number(item.value || 0).toLocaleString("id-ID")}
        </Text>
      </div>
    ))}
  </div>
);
