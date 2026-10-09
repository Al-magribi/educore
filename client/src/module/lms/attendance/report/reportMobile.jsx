import { Card, Checkbox, Empty, Flex, List, Table, Typography } from 'antd';
import { buildTableProps, tableShellStyle } from './reportShared';

const { Text } = Typography;

const recordCardStyle = {
  borderRadius: 14,
  border: '1px solid #e8eef6',
  background: '#ffffff',
  boxShadow: '0 6px 16px rgba(15, 23, 42, 0.04)',
  width: '100%',
  minWidth: 0,
};

const resolveRowKey = (row, rowKey) =>
  typeof rowKey === 'function' ? rowKey(row) : row?.[rowKey];

/** Card header for one report record: identity, status, optional select + actions. */
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
        <div
          key={item.key}
          style={{
            borderRadius: 10,
            border: '1px solid #eef2f7',
            background: '#f8fafc',
            padding: '8px 10px',
            minWidth: 0,
          }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.3 }}>
            {item.label}
          </Text>
          <div
            style={{
              marginTop: 3,
              fontSize: 13,
              fontWeight: 600,
              color: '#0f172a',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}>
            {item.value ?? '-'}
          </div>
        </div>
      ))}
    </div>
  );
};

const ReportMobileList = ({
  dataSource = [],
  loading = false,
  pagination,
  rowKey = 'id',
  rowSelection,
  renderCard,
  emptyText = 'Belum ada data.',
}) => {
  const selectedRowKeys = rowSelection?.selectedRowKeys || [];
  const selectable = Boolean(rowSelection);

  const isSelected = (key) => selectedRowKeys.some((item) => String(item) === String(key));

  const handleSelect = (key, checked) => {
    if (!rowSelection?.onChange) return;
    const nextKeys = checked
      ? [...selectedRowKeys, key]
      : selectedRowKeys.filter((item) => String(item) !== String(key));
    rowSelection.onChange(nextKeys);
  };

  return (
    <List
      dataSource={dataSource}
      loading={loading}
      rowKey={rowKey}
      split={false}
      locale={{
        emptyText: (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
        ),
      }}
      pagination={
        pagination
          ? {
              ...pagination,
              size: 'small',
              align: 'center',
              style: { marginTop: 8, marginBottom: 0, ...(pagination.style || {}) },
            }
          : false
      }
      renderItem={(row) => {
        const key = resolveRowKey(row, rowKey);
        return (
          <List.Item style={{ padding: 0, marginBottom: 10, borderBlockEnd: 'none' }}>
            {renderCard(row, {
              selectable,
              selected: isSelected(key),
              onSelect: (checked) => handleSelect(key, checked),
            })}
          </List.Item>
        );
      }}
    />
  );
};

/** Table on desktop, stacked cards on small screens. */
export const ReportDataView = ({
  isMobile,
  loading = false,
  dataSource = [],
  columns,
  emptyText = 'Belum ada data.',
  minWidth = 860,
  pagination,
  rowSelection,
  renderCard,
  rowKey = 'id',
}) => {
  if (!loading && (!dataSource || dataSource.length === 0)) {
    return <Empty description={emptyText} />;
  }

  if (isMobile) {
    return (
      <ReportMobileList
        dataSource={dataSource}
        loading={loading}
        pagination={pagination}
        rowKey={rowKey}
        rowSelection={rowSelection}
        renderCard={renderCard}
        emptyText={emptyText}
      />
    );
  }

  return (
    <div style={tableShellStyle}>
      <Table
        rowKey={rowKey}
        loading={loading}
        dataSource={dataSource}
        columns={columns}
        {...buildTableProps({ isMobile: false, minWidth })}
        pagination={pagination}
        rowSelection={rowSelection}
      />
    </div>
  );
};
