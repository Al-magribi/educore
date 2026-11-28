import dayjs from 'dayjs';
import { Button, Col, Dropdown, Flex, Grid, Row, Tag, Tooltip, Typography } from 'antd';
import { MoreVertical } from 'lucide-react';

import { museColors, museRadius, museShadow } from "../../../../config/theme";
import { StatCard } from "../../../../components/ui/muse";
const { Text } = Typography;
const { useBreakpoint } = Grid;

export const PAGE_SIZE_OPTIONS = ['12', '24', '48', '96'];

export const surfaceCardStyle = {
  borderRadius: museRadius.card,
  background: "#ffffff",
  boxShadow: museShadow.card,
  width: '100%',
  minWidth: 0,
};

export const statCardStyle = {
  borderRadius: museRadius.card,
  background: '#ffffff',
  boxShadow: museShadow.card,
  height: '100%',
  minWidth: 0,
};

/** Tighter card padding on phones so cards keep more usable width. */
export const surfaceCardBodyStyles = (isMobile) => ({
  body: { padding: isMobile ? 12 : 16 },
});

export const useResponsiveFlags = () => {
  const screens = useBreakpoint();
  return { screens, isMobile: !screens.md, isCompact: !screens.lg };
};

export const parseReportDateTime = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (match) {
    const parsed = dayjs(`${match[1]}T${match[2]}`);
    return parsed.isValid() ? parsed : null;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

export const formatDateTimeCell = (value, compact = false) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;
  return compact ? parsed.format('DD/MM HH:mm') : parsed.format('DD MMM YY HH:mm');
};

export const formatDateCell = (value, compact = false) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;
  return compact ? parsed.format('DD/MM/YY') : parsed.format('DD MMM YYYY');
};

export const formatDateTimeDetail = (value) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YYYY HH:mm:ss') : value;
};

export const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return value;
};

export const formatMinutesToHours = (value) => `${(Number(value || 0) / 60).toFixed(2)} jam`;

export const sortByLatestTap = (rows) =>
  [...(rows || [])].sort((a, b) => {
    const aTap = Math.max(
      parseReportDateTime(a.checkin_at)?.valueOf() || 0,
      parseReportDateTime(a.checkout_at)?.valueOf() || 0,
    );
    const bTap = Math.max(
      parseReportDateTime(b.checkin_at)?.valueOf() || 0,
      parseReportDateTime(b.checkout_at)?.valueOf() || 0,
    );
    return bTap - aTap;
  });

export const buildPagination = ({ pageSize, setPageSize, isMobile, unit = 'data' }) => ({
  pageSize,
  simple: isMobile,
  size: isMobile ? 'small' : 'default',
  showSizeChanger: !isMobile,
  pageSizeOptions: PAGE_SIZE_OPTIONS,
  showTotal: isMobile ? undefined : (total, range) => `${range[0]}-${range[1]} dari ${total} ${unit}`,
  onChange: (_page, size) => setPageSize(size),
});

export const filterControlStyle = (isMobile, basis = 200) => ({
  flex: isMobile ? '1 1 100%' : `1 1 ${basis}px`,
  minWidth: 0,
  maxWidth: '100%',
});

/** Lets header/toolbar buttons share a row and wrap only when they no longer fit. */
export const toolbarButtonStyle = (isMobile) => (isMobile ? { flex: '1 1 auto' } : undefined);

export const FilterBar = ({ children, isMobile }) => (
  <Flex
    gap={10}
    wrap="wrap"
    align={isMobile ? 'stretch' : 'center'}
    style={{ width: '100%', minWidth: 0 }}>
    {children}
  </Flex>
);

export const ReportHeader = ({ title, description, isMobile, extra }) => (
  <Flex
    justify="space-between"
    align={isMobile ? 'stretch' : 'flex-start'}
    vertical={isMobile}
    gap={12}
    style={{ width: '100%', minWidth: 0 }}>
    <Flex vertical gap={isMobile ? 8 : 10} style={{ minWidth: 0, flex: 1 }}>
      <Text strong style={{ color: museColors.text, fontSize: isMobile ? 15 : 16 }}>
        {title}
      </Text>
      {description ? (
        <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13 }}>
          {description}
        </Text>
      ) : null}
    </Flex>
    {extra ? (
      <Flex
        gap={8}
        wrap="wrap"
        style={{ flexShrink: 0, minWidth: 0, width: isMobile ? '100%' : undefined }}>
        {extra}
      </Flex>
    ) : null}
  </Flex>
);

export const SummaryStatCard = ({ item, isMobile }) => (
  <StatCard
    title={item.title}
    value={item.value}
    suffix={item.suffix}
    note={item.note}
    icon={item.icon}
    tone={item.tone}
    compact={isMobile}
  />
);

export const StatCardGrid = ({ items, isMobile }) => {
  if (!items?.length) return null;
  const mdSpan =
    items.length === 5 ? { flex: '20%' } : items.length >= 4 ? 6 : items.length === 3 ? 8 : 12;

  return (
    <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]} style={{ width: '100%' }}>
      {items.map((item) => (
        <Col key={item.key} xs={12} sm={12} md={mdSpan} style={{ minWidth: 0 }}>
          <SummaryStatCard item={item} isMobile={isMobile} />
        </Col>
      ))}
    </Row>
  );
};

export const StatusTag = ({ value, colorMap = {} }) => {
  if (!value) return <Text type="secondary">-</Text>;
  return (
    <Tooltip title={value}>
      <Tag
        color={colorMap[value] || 'default'}
        style={{
          margin: 0,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
        {value}
      </Tag>
    </Tooltip>
  );
};

export const DETAIL_ACTIONS = [
  { key: 'detail', label: 'Detail' },
  { type: 'divider' },
  { key: 'delete', label: 'Hapus', danger: true },
];

export const FULL_ROW_ACTIONS = [
  { key: 'detail', label: 'Detail' },
  { key: 'edit', label: 'Edit' },
  { type: 'divider' },
  { key: 'delete', label: 'Hapus', danger: true },
];

/** Compact action menu for record cards. */
export const RowActionMenu = ({ actions, onSelect }) => (
  <Dropdown
    trigger={['click']}
    placement="bottomRight"
    menu={{ items: actions, onClick: ({ key }) => onSelect(key) }}>
    <Button type="text" size="small" aria-label="Aksi baris" icon={<MoreVertical size={16} />} />
  </Dropdown>
);

export const BulkDeleteBar = ({ selectedCount, loading, onDelete, label, isMobile, icon }) => (
  <Flex
    justify="space-between"
    align={isMobile ? 'stretch' : 'center'}
    vertical={isMobile}
    gap={10}
    style={{ marginBottom: 14, width: '100%', minWidth: 0 }}>
    <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13 }}>
      {selectedCount > 0 ? `${selectedCount} ${label} terpilih` : 'Centang kartu untuk hapus bulk'}
    </Text>
    <Button
      danger
      icon={icon}
      disabled={selectedCount === 0}
      loading={loading}
      onClick={onDelete}
      block={isMobile}>
      Hapus Terpilih
    </Button>
  </Flex>
);

export const modalWidth = (isMobile, desktopWidth = 720) => (isMobile ? '95vw' : desktopWidth);
