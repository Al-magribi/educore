import { Card, Checkbox, Empty, Flex, Grid, List, Typography } from 'antd';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const recordCardStyle = {
  borderRadius: 14,
  border: '1px solid #e8eef6',
  background: '#ffffff',
  boxShadow: '0 6px 16px rgba(15, 23, 42, 0.04)',
  width: '100%',
  height: '100%',
  minWidth: 0,
};

const tileStyle = {
  borderRadius: 10,
  border: '1px solid #eef2f7',
  background: '#f8fafc',
  padding: '8px 10px',
  minWidth: 0,
};

const DEFAULT_GRID = { gutter: 12, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 };

const resolveRowKey = (row, rowKey) =>
  typeof rowKey === 'function' ? rowKey(row) : row?.[rowKey];

/** Card header for one record: identity, status, optional select + actions. */
export const ReportRecordCard = ({
  title,
  subtitle,
  extra,
  actions,
  selectable = false,
  selected = false,
  onSelect,
  children,
}) => (
  <Card style={recordCardStyle} styles={{ body: { padding: 14 } }}>
    <Flex vertical gap={12} style={{ minWidth: 0 }}>
      <Flex justify="space-between" align="flex-start" gap={10}>
        <Flex gap={10} align="flex-start" style={{ minWidth: 0, flex: 1 }}>
          {selectable ? (
            <Checkbox
              checked={selected}
              onChange={(event) => onSelect?.(event.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
          ) : null}
          <Flex vertical gap={2} style={{ minWidth: 0, flex: 1 }}>
            <Text
              strong
              ellipsis={{ tooltip: typeof title === 'string' ? title : undefined }}
              style={{ fontSize: 14, maxWidth: '100%' }}>
              {title || '-'}
            </Text>
            {subtitle ? (
              <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
                {subtitle}
              </Text>
            ) : null}
          </Flex>
        </Flex>
        {(extra || actions) && (
          <Flex gap={4} align="center" style={{ flexShrink: 0 }}>
            {extra}
            {actions}
          </Flex>
        )}
      </Flex>
      {children}
    </Flex>
  </Card>
);

const TileValue = ({ children }) => (
  <div
    style={{
      marginTop: 3,
      fontSize: 13,
      fontWeight: 600,
      color: '#0f172a',
      lineHeight: 1.3,
      wordBreak: 'break-word',
    }}>
    {children ?? '-'}
  </div>
);

/** Compact label/value tiles used inside record cards. */
export const ReportMetricGrid = ({ items = [], columns = 2 }) => {
  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 8,
      }}>
      {visibleItems.map((item) => (
        <div key={item.key} style={tileStyle}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.3 }}>
            {item.label}
          </Text>
          <TileValue>{item.value}</TileValue>
        </div>
      ))}
    </div>
  );
};

/** Detail modal body: label/value tiles, 1 column on phones and 2 on wider screens (`span: 2` = full row). */
export const ReportDetailGrid = ({ items = [] }) => {
  const screens = useBreakpoint();
  const columns = screens.md ? 2 : 1;
  const visibleItems = items.filter(Boolean);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 8,
      }}>
      {visibleItems.map((item) => (
        <div
          key={item.key}
          style={{ ...tileStyle, gridColumn: item.span === 2 ? '1 / -1' : undefined }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.3 }}>
            {item.label}
          </Text>
          <TileValue>{item.children}</TileValue>
        </div>
      ))}
    </div>
  );
};

/**
 * Pengganti Table: grid kartu responsif (1 kolom di HP, 2–3 kolom di layar lebar)
 * dengan pagination dan pilih-semua untuk aksi bulk.
 */
export const CardGridView = ({
  dataSource = [],
  loading = false,
  rowKey = 'id',
  rowSelection,
  renderCard,
  pagination,
  emptyText = 'Belum ada data.',
  grid = DEFAULT_GRID,
}) => {
  const selectedKeys = rowSelection?.selectedRowKeys || [];
  const selectable = Boolean(rowSelection);
  const allKeys = dataSource.map((row) => resolveRowKey(row, rowKey));
  const isSelected = (key) => selectedKeys.some((item) => String(item) === String(key));
  const selectedCount = allKeys.filter(isSelected).length;

  const handleSelect = (key, checked) => {
    const nextKeys = checked
      ? [...selectedKeys, key]
      : selectedKeys.filter((item) => String(item) !== String(key));
    rowSelection.onChange(nextKeys);
  };

  return (
    <Flex vertical gap={10} style={{ width: '100%', minWidth: 0 }}>
      {selectable && dataSource.length > 0 ? (
        <Checkbox
          checked={selectedCount > 0 && selectedCount === allKeys.length}
          indeterminate={selectedCount > 0 && selectedCount < allKeys.length}
          onChange={(event) => rowSelection.onChange(event.target.checked ? allKeys : [])}>
          <Text type="secondary">Pilih semua ({allKeys.length})</Text>
        </Checkbox>
      ) : null}
      <List
        grid={grid}
        dataSource={dataSource}
        loading={loading}
        rowKey={rowKey}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />,
        }}
        pagination={
          pagination
            ? { size: 'small', align: 'center', hideOnSinglePage: true, ...pagination }
            : false
        }
        renderItem={(row) => {
          const key = resolveRowKey(row, rowKey);
          return (
            <List.Item style={{ marginBottom: 12, height: '100%' }}>
              {renderCard(row, {
                selectable,
                selected: isSelected(key),
                onSelect: (checked) => handleSelect(key, checked),
              })}
            </List.Item>
          );
        }}
      />
    </Flex>
  );
};
