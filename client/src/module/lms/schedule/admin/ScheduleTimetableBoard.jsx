import React, { useMemo } from "react";
import { Button, Table, Tooltip } from "antd";
import {
  BORDER_COLOR,
  HEADER_BG,
  HEADER_SUB_BG,
  SLOT_BG,
  STRONG_BORDER,
  SURFACE_BG,
  getSubjectColor,
} from "./scheduleTimetableUtils";

const ScheduleTimetableBoard = ({
  canManage,
  flatClasses,
  gradeGroups,
  loading,
  onEditEntry,
  rows,
}) => {
  const mergedRows = useMemo(() => {
    const nextRows = (rows || []).map((row) => ({
      ...row,
      cells: row.cells
        ? Object.entries(row.cells).reduce((acc, [classId, cell]) => {
            const activityNames = (cell?.activities || [])
              .map((item) => item?.name)
              .filter(Boolean)
              .sort();
            acc[classId] = {
              ...cell,
              _activity_signature: JSON.stringify(activityNames),
              _row_span: 1,
              _hidden: false,
            };
            return acc;
          }, {})
        : row.cells,
    }));

    nextRows.forEach((row) => {
      if (row?.is_break || !row?.cells) return;

      const cellList = flatClasses.map(
        (classItem) => row.cells[String(classItem.id)] || row.cells[classItem.id],
      );
      const allActivityOnly =
        cellList.length > 0 &&
        cellList.every(
          (cell) =>
            !cell?.entry &&
            Array.isArray(cell?.activities) &&
            cell.activities.length > 0,
        );

      if (!allActivityOnly) return;

      const sharedActivityNames = Array.from(
        new Set(
          cellList.flatMap((cell) =>
            (cell?.activities || []).map((activity) => activity?.name).filter(Boolean),
          ),
        ),
      ).sort();
      if (!sharedActivityNames.length) return;

      row._shared_activity_signature = JSON.stringify(sharedActivityNames);
      row._shared_activity_label = sharedActivityNames.join(" / ");
      row._shared_activity_row_span = 1;
      row._shared_activity_hidden = false;
    });

    let sharedStartIndex = null;
    let previousSharedSignature = null;

    const flushSharedGroup = (endIndex) => {
      if (sharedStartIndex === null || previousSharedSignature === null) return;
      const span = endIndex - sharedStartIndex;
      if (span > 1 && nextRows[sharedStartIndex]) {
        nextRows[sharedStartIndex]._shared_activity_row_span = span;
        for (let index = sharedStartIndex + 1; index < endIndex; index += 1) {
          nextRows[index]._shared_activity_hidden = true;
          nextRows[index]._shared_activity_row_span = 0;
        }
      }
      sharedStartIndex = null;
      previousSharedSignature = null;
    };

    nextRows.forEach((row, index) => {
      const currentSignature = row?._shared_activity_signature
        ? `${row.day_of_week}:${row._shared_activity_signature}`
        : null;

      if (!currentSignature) {
        flushSharedGroup(index);
        return;
      }

      if (sharedStartIndex === null) {
        sharedStartIndex = index;
        previousSharedSignature = currentSignature;
        return;
      }

      if (previousSharedSignature !== currentSignature) {
        flushSharedGroup(index);
        sharedStartIndex = index;
        previousSharedSignature = currentSignature;
      }
    });

    flushSharedGroup(nextRows.length);

    flatClasses.forEach((classItem) => {
      const classId = String(classItem.id);
      let startIndex = null;
      let previousSignature = null;

      const flushGroup = (endIndex) => {
        if (startIndex === null || previousSignature === null) return;
        const span = endIndex - startIndex;
        if (span <= 1) {
          startIndex = null;
          previousSignature = null;
          return;
        }

        const firstCell = nextRows[startIndex]?.cells?.[classId];
        if (firstCell) {
          firstCell._row_span = span;
        }

        for (let index = startIndex + 1; index < endIndex; index += 1) {
          const cell = nextRows[index]?.cells?.[classId];
          if (cell) {
            cell._hidden = true;
            cell._row_span = 0;
          }
        }

        startIndex = null;
        previousSignature = null;
      };

      nextRows.forEach((row, index) => {
        const cell = row?.cells?.[classId];
        const hasLesson = Boolean(cell?.entry);
        const hasActivityOnly =
          !row?.is_break &&
          !hasLesson &&
          Boolean(cell?._activity_signature) &&
          cell?._activity_signature !== "[]";

        if (!hasActivityOnly) {
          flushGroup(index);
          return;
        }

        const currentSignature = `${row.day_of_week}:${cell._activity_signature}`;

        if (row?._shared_activity_signature) {
          flushGroup(index);
          return;
        }

        if (startIndex === null) {
          startIndex = index;
          previousSignature = currentSignature;
          return;
        }

        if (previousSignature !== currentSignature) {
          flushGroup(index);
          startIndex = index;
          previousSignature = currentSignature;
        }
      });

      flushGroup(nextRows.length);
    });

    return nextRows;
  }, [flatClasses, rows]);

  const columns = useMemo(() => {
    const totalClassCount = flatClasses.length;
    const classMetaMap = new Map(flatClasses.map((item) => [item.id, item]));

    const renderEntryCell = (cell) => {
      const activitiesInCell = cell?.activities || [];
      const lessonEntry = cell?.entry || null;

      if (!lessonEntry && activitiesInCell.length === 0) {
        return <span style={{ color: "#bfbfbf" }}>-</span>;
      }

      const activityLabel = activitiesInCell
        .map((item) => item.name)
        .filter(Boolean)
        .filter(
          (value, index, array) =>
            array.findIndex((candidate) => candidate === value) === index,
        )
        .join(" / ");

      const lessonContent = lessonEntry
        ? (() => {
            const code =
              lessonEntry.subject_code || lessonEntry.subject_name || "-";
            const color = getSubjectColor(code);
            return (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 36,
                  minHeight: 22,
                  padding: "2px 6px",
                  borderRadius: 999,
                  border: `1px solid ${color.border}`,
                  background: color.bg,
                  color: color.text,
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: 0.2,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                }}
              >
                {code}
              </span>
            );
          })()
        : null;

      const cellContent = (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            width: "100%",
          }}
        >
          {activityLabel ? (
            <span
              style={{
                display: "inline-block",
                width: "100%",
                padding: "2px 4px",
                borderRadius: 6,
                background: "#fff2a8",
                border: "1px solid #eab308",
                color: "#8a4b08",
                fontWeight: 800,
                fontSize: 10,
                lineHeight: 1.2,
                textTransform: "uppercase",
              }}
            >
              {activityLabel}
            </span>
          ) : null}
          {lessonContent}
        </div>
      );

      const tooltipParts = [];
      if (activityLabel) tooltipParts.push(activityLabel);
      if (lessonEntry) {
        tooltipParts.push(`${lessonEntry.subject_name} | ${lessonEntry.teacher_name}`);
      }
      const tooltipTitle = tooltipParts.join(" | ");

      if (!lessonEntry || !canManage) {
        return <Tooltip title={tooltipTitle || "-"}>{cellContent}</Tooltip>;
      }

      return (
        <Tooltip title={tooltipTitle || "-"}>
          <Button
            type="text"
            style={{
              width: "100%",
              height: "auto",
              padding: 2,
              textAlign: "center",
              justifyContent: "center",
              fontWeight: 700,
              borderRadius: 8,
            }}
            onClick={() => onEditEntry(lessonEntry)}
          >
            {cellContent}
          </Button>
        </Tooltip>
      );
    };

    const fixedColumns = [
      {
        title: "Hari",
        dataIndex: "day_name",
        key: "day_name",
        width: 58,
        align: "center",
        onCell: (record) => ({
          rowSpan: record.show_day ? record.day_rowspan : 0,
          style: {
            background: SLOT_BG,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            borderTop: record.show_day ? "3px solid #8f6a4f" : undefined,
            borderBottom: record.is_day_end ? "3px solid #8f6a4f" : undefined,
            borderRight: "3px solid #8f6a4f",
          },
        }),
        onHeaderCell: () => ({
          style: {
            background: HEADER_BG,
            textAlign: "center",
            fontWeight: 700,
            borderColor: BORDER_COLOR,
          },
        }),
      },
      {
        title: "Alokasi Waktu",
        children: [
          {
            title: "Jam ke",
            dataIndex: "slot_no",
            key: "slot_no",
            width: 52,
            align: "center",
            render: (value, record) => (record.is_break ? "-" : value),
            onCell: (record) => ({
              style: {
                background: SLOT_BG,
                fontWeight: 700,
                borderColor: BORDER_COLOR,
                borderTop: record.show_day ? "3px solid #8f6a4f" : STRONG_BORDER,
                borderRight: "3px solid #8f6a4f",
                borderBottom: record.is_day_end ? "3px solid #8f6a4f" : undefined,
              },
            }),
            onHeaderCell: () => ({
              style: {
                background: HEADER_SUB_BG,
                textAlign: "center",
                fontWeight: 700,
                borderColor: BORDER_COLOR,
                borderRight: STRONG_BORDER,
              },
            }),
          },
          {
            title: "Waktu",
            dataIndex: "time_label",
            key: "time_label",
            width: 92,
            align: "center",
            onCell: (record) => ({
              style: {
                background: SLOT_BG,
                fontWeight: 700,
                borderColor: BORDER_COLOR,
                borderTop: record.show_day ? "3px solid #8f6a4f" : STRONG_BORDER,
                borderRight: "3px solid #8f6a4f",
                borderBottom: record.is_day_end ? "3px solid #8f6a4f" : undefined,
              },
            }),
            onHeaderCell: () => ({
              style: {
                background: HEADER_SUB_BG,
                textAlign: "center",
                fontWeight: 700,
                borderColor: BORDER_COLOR,
                borderRight: STRONG_BORDER,
              },
            }),
          },
        ],
        onHeaderCell: () => ({
          style: {
            background: HEADER_BG,
            textAlign: "center",
            fontWeight: 800,
            borderColor: BORDER_COLOR,
          },
        }),
      },
    ];

    const classColumns = gradeGroups.map((group) => ({
      title: `Kelas ${group.grade_name}`,
      children: group.classes.map((item) => {
        const classMeta = classMetaMap.get(item.id);
        const absoluteClassIndex = classMeta?.absolute_index || 0;

        return {
          title: item.name,
          key: `class_${item.id}`,
          width: 62,
          align: "center",
          render: (_, record) => {
            if (record.is_break) {
              if (absoluteClassIndex === 0) {
                return (
                  <span
                    style={{
                      display: "inline-block",
                      width: "100%",
                      fontWeight: 800,
                      color: "#8a4b08",
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
                    {record.break_label}
                  </span>
                );
              }
              return null;
            }

            if (record._shared_activity_signature) {
              if (absoluteClassIndex === 0) {
                return (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      minHeight: 24,
                      padding: "6px 8px",
                      borderRadius: 8,
                      background: "#fff2a8",
                      border: "1px solid #eab308",
                      color: "#8a4b08",
                      fontWeight: 800,
                      fontSize: 12,
                      lineHeight: 1.2,
                    }}
                  >
                    {record._shared_activity_label}
                  </span>
                );
              }
              return null;
            }

            return renderEntryCell(record.cells[item.id]);
          },
          onCell: (record) => ({
            colSpan: record.is_break
              ? absoluteClassIndex === 0
                ? totalClassCount
                : 0
              : record._shared_activity_signature
                ? absoluteClassIndex === 0
                  ? totalClassCount
                  : 0
                : 1,
            rowSpan: record.is_break
              ? 1
              : record._shared_activity_signature
                ? record._shared_activity_hidden
                  ? 0
                  : absoluteClassIndex === 0
                    ? record._shared_activity_row_span || 1
                    : 0
                : record.cells?.[item.id]?._hidden
                  ? 0
                  : record.cells?.[item.id]?._row_span > 1
                    ? record.cells[item.id]._row_span
                    : 1,
              style: {
              textAlign: "center",
              padding: 4,
              background: record.is_break
                ? "#fff1bf"
                : record._shared_activity_signature
                    ? "#fff7cc"
                    : SURFACE_BG,
                borderColor: BORDER_COLOR,
                borderTop: record.show_day ? "3px solid #8f6a4f" : undefined,
                borderBottom: record.is_day_end ? "3px solid #8f6a4f" : undefined,
              borderLeft: classMeta?.is_group_first
                ? "3px solid #8f6a4f"
                : undefined,
              borderRight: classMeta?.is_group_last
                ? "3px solid #8f6a4f"
                : undefined,
            },
          }),
          onHeaderCell: () => ({
            style: {
              background: HEADER_SUB_BG,
              textAlign: "center",
              fontWeight: 800,
              borderColor: BORDER_COLOR,
              borderLeft: classMeta?.is_group_first ? STRONG_BORDER : undefined,
              borderRight: classMeta?.is_group_last ? STRONG_BORDER : undefined,
            },
          }),
        };
      }),
      onHeaderCell: () => ({
        style: {
          background: HEADER_BG,
          textAlign: "center",
          fontWeight: 800,
          borderColor: BORDER_COLOR,
          borderLeft: STRONG_BORDER,
          borderRight: STRONG_BORDER,
        },
      }),
    }));

    return [...fixedColumns, ...classColumns];
  }, [canManage, flatClasses, gradeGroups, onEditEntry]);

  return (
    <Table
      rowKey="key"
      bordered
      size="small"
      loading={loading}
      columns={columns}
      dataSource={mergedRows}
      pagination={false}
      scroll={{ x: "max-content", y: 760 }}
      locale={{ emptyText: "Belum ada data jadwal." }}
      sticky
    />
  );
};

export default ScheduleTimetableBoard;
