import { isValidElement, useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Flex,
  Grid,
  Pagination,
  Radio,
  Spin,
  Table,
  Typography,
} from "antd";
import { ChevronDown, ChevronUp } from "lucide-react";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ACTION_KEYS = new Set(["action", "actions", "aksi", "operation", "operations"]);
const INDEX_TITLES = new Set(["no", "no.", "#"]);
const DEFAULT_PAGE_SIZE = 10;

const cardStyle = {
  borderRadius: 14,
  border: "1px solid #e8eef6",
  background: "#ffffff",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.04)",
  width: "100%",
  height: "100%",
  minWidth: 0,
};

const tileStyle = {
  borderRadius: 10,
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  padding: "8px 10px",
  minWidth: 0,
};

const resolveTitle = (title) => (typeof title === "function" ? title({}) : title);

const joinLabel = (parent, child) => {
  if (!parent) return child;
  if (!child) return parent;
  if (typeof parent === "string" && typeof child === "string") return `${parent} · ${child}`;
  return (
    <>
      {parent} · {child}
    </>
  );
};

const plainText = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const resolveRole = (column) => {
  if (column.mobile === false) return "hidden";
  if (typeof column.mobile === "string") return column.mobile;
  const key = String(column.key ?? column.dataIndex ?? "").toLowerCase();
  const title = plainText(resolveTitle(column.title));
  if (ACTION_KEYS.has(key) || ACTION_KEYS.has(title)) return "actions";
  if ((column.title === "" || column.title == null) && column.dataIndex == null && column.render) {
    return "actions";
  }
  if (INDEX_TITLES.has(title) || key === "no" || key === "index") return "hidden";
  return "field";
};

const flattenColumns = (columns = [], parentLabel) =>
  columns.flatMap((column) => {
    if (!column || column.hidden) return [];
    const label = joinLabel(parentLabel, column.mobileLabel ?? resolveTitle(column.title));
    if (Array.isArray(column.children) && column.children.length) {
      return flattenColumns(column.children, label);
    }
    return [{ ...column, label, role: resolveRole(column) }];
  });

const stripMobileProps = (columns = []) =>
  columns.map((column) => {
    const next = { ...column };
    delete next.mobile;
    delete next.mobileLabel;
    if (Array.isArray(next.children)) next.children = stripMobileProps(next.children);
    return next;
  });

const readValue = (record, dataIndex) => {
  if (dataIndex === undefined || dataIndex === null || dataIndex === "") return undefined;
  if (Array.isArray(dataIndex)) return dataIndex.reduce((acc, key) => acc?.[key], record);
  return record?.[dataIndex];
};

const renderCell = (column, record, index) => {
  const value = readValue(record, column.dataIndex);
  const output = column.render ? column.render(value, record, index) : value;
  if (
    output &&
    typeof output === "object" &&
    !Array.isArray(output) &&
    !isValidElement(output) &&
    "children" in output
  ) {
    return output.children;
  }
  return output;
};

const isBlank = (value) =>
  value === null || value === undefined || value === "" || value === false;

const resolveKey = (record, rowKey, index) => {
  if (typeof rowKey === "function") return rowKey(record, index);
  return record?.[rowKey] ?? index;
};

const isWideColumn = (column) =>
  column.role === "full" || !column.width || Number(column.width) >= 160;

const FieldGrid = ({ fields }) => {
  if (!fields.length) return null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 8,
      }}
    >
      {fields.map((field) => (
        <div
          key={field.key}
          style={{ ...tileStyle, gridColumn: field.wide ? "1 / -1" : undefined }}
        >
          <Text type="secondary" style={{ fontSize: 11, display: "block", lineHeight: 1.3 }}>
            {field.label}
          </Text>
          <div
            style={{
              marginTop: 3,
              fontSize: 13,
              fontWeight: 600,
              color: "#0f172a",
              lineHeight: 1.35,
              wordBreak: "break-word",
              minWidth: 0,
            }}
          >
            {isBlank(field.value) ? "-" : field.value}
          </div>
        </div>
      ))}
    </div>
  );
};

const MobileCardList = ({
  columns,
  dataSource,
  rowKey,
  loading,
  pagination,
  rowSelection,
  onRow,
  expandable,
  locale,
  onChange,
  title,
  footer,
  renderMobileCard,
}) => {
  const [innerPage, setInnerPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState([]);

  const rows = useMemo(() => dataSource || [], [dataSource]);
  const flatColumns = useMemo(() => flattenColumns(columns), [columns]);

  const spinning = typeof loading === "object" && loading !== null ? Boolean(loading.spinning) : Boolean(loading);

  const paginationConfig =
    pagination === false ? null : { pageSize: DEFAULT_PAGE_SIZE, ...(pagination || {}) };
  const pageSize = Number(paginationConfig?.pageSize) || DEFAULT_PAGE_SIZE;
  const total = Number(paginationConfig?.total ?? rows.length);
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Number(paginationConfig?.current ?? innerPage) || 1, maxPage);
  const isClientPaged = paginationConfig && rows.length > (currentPage - 1) * pageSize;
  const pageRows = isClientPaged
    ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : rows;

  const handlePageChange = (page, size) => {
    setInnerPage(page);
    paginationConfig?.onChange?.(page, size);
    onChange?.({ ...paginationConfig, current: page, pageSize: size }, {}, {}, { action: "paginate" });
  };

  const titleColumn =
    flatColumns.find((column) => column.role === "title") ||
    flatColumns.find((column) => column.role === "field");
  const subtitleColumn = flatColumns.find((column) => column.role === "subtitle");
  const actionColumns = flatColumns.filter((column) => column.role === "actions");
  const fieldColumns = flatColumns.filter(
    (column) =>
      column !== titleColumn &&
      column !== subtitleColumn &&
      (column.role === "field" || column.role === "full"),
  );

  const selectionType = rowSelection?.type || "checkbox";
  const selectedKeys = rowSelection?.selectedRowKeys || [];
  const isSelected = (key) => selectedKeys.some((item) => String(item) === String(key));
  const selectableRows = rowSelection
    ? rows.filter((record) => !rowSelection?.getCheckboxProps?.(record)?.disabled)
    : [];
  const selectableKeys = selectableRows.map((record) => resolveKey(record, rowKey, rows.indexOf(record)));
  const selectedCount = selectableKeys.filter(isSelected).length;

  const emitSelection = (nextKeys) => {
    const keySet = new Set(nextKeys.map(String));
    const nextRows = rows.filter((record, index) => keySet.has(String(resolveKey(record, rowKey, index))));
    rowSelection?.onChange?.(nextKeys, nextRows, { type: "multiple" });
  };

  const toggleSelect = (key, checked) => {
    if (selectionType === "radio") {
      emitSelection([key]);
      return;
    }
    emitSelection(
      checked
        ? [...selectedKeys, key]
        : selectedKeys.filter((item) => String(item) !== String(key)),
    );
  };

  const toggleExpanded = (key, record) => {
    const willExpand = !expandedKeys.some((item) => String(item) === String(key));
    setExpandedKeys((prev) =>
      willExpand ? [...prev, key] : prev.filter((item) => String(item) !== String(key)),
    );
    expandable?.onExpand?.(willExpand, record);
  };

  const renderDefaultCard = (record, index) => {
    const key = resolveKey(record, rowKey, index);
    const rowProps = onRow?.(record, index) || {};
    const selected = isSelected(key);
    const canExpand =
      Boolean(expandable?.expandedRowRender) &&
      (expandable?.rowExpandable?.(record) ?? true);
    const expanded = expandedKeys.some((item) => String(item) === String(key));
    const disabled = Boolean(rowSelection?.getCheckboxProps?.(record)?.disabled);

    const fields = fieldColumns.map((column, columnIndex) => ({
      key: column.key ?? (Array.isArray(column.dataIndex) ? column.dataIndex.join(".") : column.dataIndex) ?? columnIndex,
      label: column.label,
      value: renderCell(column, record, index),
      wide: isWideColumn(column),
    }));
    const actions = actionColumns
      .map((column) => renderCell(column, record, index))
      .filter((node) => !isBlank(node));

    const selector = rowSelection ? (
      selectionType === "radio" ? (
        <Radio
          checked={selected}
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleSelect(key, true)}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
      ) : (
        <Checkbox
          checked={selected}
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggleSelect(key, event.target.checked)}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
      )
    ) : null;

    return (
      <Card
        style={{
          ...cardStyle,
          cursor: rowProps.onClick ? "pointer" : undefined,
          background: rowProps.style?.background || cardStyle.background,
          borderColor: selected ? "#91caff" : "#e8eef6",
        }}
        styles={{ body: { padding: 14 } }}
        onClick={rowProps.onClick}
      >
        <Flex vertical gap={12} style={{ minWidth: 0 }}>
          <Flex gap={10} align="flex-start" style={{ minWidth: 0 }}>
            {selector}
            <Flex vertical gap={2} style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", minWidth: 0, wordBreak: "break-word" }}>
                {titleColumn ? renderCell(titleColumn, record, index) ?? "-" : "-"}
              </div>
              {subtitleColumn ? (
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                  {renderCell(subtitleColumn, record, index)}
                </div>
              ) : null}
            </Flex>
          </Flex>

          <FieldGrid fields={fields} />

          {canExpand ? (
            <Flex vertical gap={8}>
              <Button
                size="small"
                type="link"
                style={{ padding: 0, alignSelf: "flex-start" }}
                icon={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpanded(key, record);
                }}
              >
                {expanded ? "Sembunyikan detail" : "Lihat detail"}
              </Button>
              {expanded ? (
                <div style={{ minWidth: 0 }}>
                  {expandable?.expandedRowRender?.(record, index, 0, expanded)}
                </div>
              ) : null}
            </Flex>
          ) : null}

          {actions.length ? (
            <Flex
              justify="flex-end"
              align="center"
              gap={6}
              wrap="wrap"
              style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}
              onClick={(event) => event.stopPropagation()}
            >
              {actions.map((node, actionIndex) => (
                <span key={actionIndex}>{node}</span>
              ))}
            </Flex>
          ) : null}
        </Flex>
      </Card>
    );
  };

  const emptyText = locale?.emptyText ?? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Belum ada data." />
  );

  return (
    <Spin spinning={spinning}>
      <Flex vertical gap={12} style={{ width: "100%", minWidth: 0 }}>
        {title ? <div>{title(pageRows)}</div> : null}

        {rowSelection && selectionType !== "radio" && !rowSelection?.hideSelectAll && selectableKeys.length > 0 ? (
          <Checkbox
            checked={selectedCount > 0 && selectedCount === selectableKeys.length}
            indeterminate={selectedCount > 0 && selectedCount < selectableKeys.length}
            onChange={(event) => emitSelection(event.target.checked ? selectableKeys : [])}
          >
            <Text type="secondary">Pilih semua ({selectableKeys.length})</Text>
          </Checkbox>
        ) : null}

        {pageRows.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
              gap: 12,
              width: "100%",
              minWidth: 0,
            }}
          >
            {pageRows.map((record, index) => {
              const key = resolveKey(record, rowKey, index);
              return (
                <div key={key} style={{ minWidth: 0 }}>
                  {renderMobileCard
                    ? renderMobileCard(record, index, {
                        selected: isSelected(key),
                        onSelect: (checked) => toggleSelect(key, checked),
                      })
                    : renderDefaultCard(record, index)}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "24px 0", minHeight: spinning ? 120 : undefined }}>
            {spinning ? null : emptyText}
          </div>
        )}

        {paginationConfig && total > pageSize ? (
          <Flex justify="center">
            <Pagination
              simple
              size="small"
              current={currentPage}
              pageSize={pageSize}
              total={total}
              showSizeChanger={false}
              onChange={handlePageChange}
            />
          </Flex>
        ) : null}

        {footer ? <div>{footer(pageRows)}</div> : null}
      </Flex>
    </Spin>
  );
};

/**
 * Drop-in pengganti antd `Table`: tetap tabel di layar lebar, otomatis jadi kartu di HP.
 * Opsi per kolom: `mobile: false | "title" | "subtitle" | "full" | "actions"`, `mobileLabel`.
 */
const ResponsiveTable = ({
  columns = [],
  dataSource = [],
  rowKey = "key",
  mobileBreakpoint = "md",
  renderMobileCard,
  ...tableProps
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens[mobileBreakpoint];
  const tableColumns = useMemo(() => stripMobileProps(columns), [columns]);

  if (isMobile) {
    return (
      <MobileCardList
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={tableProps.loading}
        pagination={tableProps.pagination}
        rowSelection={tableProps.rowSelection}
        onRow={tableProps.onRow}
        expandable={tableProps.expandable}
        locale={tableProps.locale}
        onChange={tableProps.onChange}
        title={tableProps.title}
        footer={tableProps.footer}
        renderMobileCard={renderMobileCard}
      />
    );
  }

  return (
    <Table columns={tableColumns} dataSource={dataSource} rowKey={rowKey} {...tableProps} />
  );
};

export default ResponsiveTable;
