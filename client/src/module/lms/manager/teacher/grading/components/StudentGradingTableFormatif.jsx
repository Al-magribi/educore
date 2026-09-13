import React, { useMemo } from "react";
import {
  Button,
  Card,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import { Trash2 } from "lucide-react";
import LoadApp from "../../../../../../components/loader/LoadApp";

const { Text } = Typography;

export const extractSubIdFromType = (typeValue) => {
  const rawType = String(typeValue || "");
  const match = rawType.match(/-S(\d+)/);
  if (match) return Number(match[1]);
  if (/^M\d{2}-B\d+$/.test(rawType)) return 1;
  return null;
};

export const buildScoreColumnLabel = (labelIndex) =>
  `Nilai ${Number(labelIndex) > 0 ? Number(labelIndex) : 1}`;

export const buildScoreColumnTooltip = ({
  month,
  chapterTitle,
  examName,
  createdAt,
}) => {
  const formatDateLabel = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const day = String(date.getDate()).padStart(2, "0");
    const monthNum = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${monthNum}/${year}`;
  };

  const lines = [];
  const dateLabel = formatDateLabel(createdAt);
  if (dateLabel) {
    lines.push(`Tanggal: ${dateLabel}`);
  }
  if (month) {
    lines.push(`Bulan: ${month}`);
  }
  if (chapterTitle && chapterTitle !== "Tanpa bab") {
    lines.push(`Bab: ${chapterTitle}`);
  }
  if (examName) {
    lines.push(`Jadwal ujian: ${examName}`);
  }
  return lines.length ? lines.join("\n") : null;
};

export const buildFormatifSubchapters = ({
  students = [],
  isFormativeFilterActive,
  activeChapterId,
  activeChapter,
  chaptersWithContents = [],
  slots = [],
}) => {
  const resolveTitle = ({ labelIndex }) => buildScoreColumnLabel(labelIndex);

  if (isFormativeFilterActive) {
    if (!activeChapterId) return [];
    const slotMap = new Map();
    (slots || []).forEach((slot, index) => {
      const slotKey = String(slot?.slot_key ?? slot?.type ?? "");
      if (!slotKey) return;
      const labelIndex = Number(slot?.label_index) || index + 1;
      slotMap.set(slotKey, {
        id: slotKey,
        scoreKey: slotKey,
        slotKey,
        type: slot?.type || slotKey,
        subchapterId: Number(slot?.subchapter_id) || null,
        labelIndex,
        month: slot?.month || null,
        chapterTitle: slot?.chapter_title || null,
        examId: slot?.exam_id || null,
        examName: slot?.exam_name || null,
        createdAt: slot?.created_at || null,
        title: resolveTitle({ labelIndex }),
      });
    });
    students.forEach((student) => {
      (student.scores || []).forEach((score) => {
        const slotKey = String(score?.slot_key ?? score?.type ?? "");
        if (!slotKey || slotMap.has(slotKey)) return;
        const labelIndex = slotMap.size + 1;
        slotMap.set(slotKey, {
          id: slotKey,
          scoreKey: slotKey,
          slotKey,
          type: score?.type || slotKey,
          subchapterId: Number(score?.subchapter_id) || null,
          labelIndex,
          month: score?.month || null,
          chapterTitle: score?.chapter_title || null,
          examId: score?.exam_id || null,
          examName: score?.exam_name || null,
          createdAt: score?.created_at || null,
          title: resolveTitle({ labelIndex }),
        });
      });
    });
    return Array.from(slotMap.values()).map((slot, index) => {
      const labelIndex = slot.labelIndex || index + 1;
      return {
        ...slot,
        labelIndex,
        title: resolveTitle({ labelIndex }),
        scoreKey: slot.scoreKey || slot.slotKey || slot.id,
      };
    });
  }

  const chapterTitleMap = new Map(
    (chaptersWithContents || []).map((chapter) => [
      String(chapter.id),
      chapter.title,
    ]),
  );
  const subIndexMap = new Map();
  (chaptersWithContents || []).forEach((chapter) => {
    (chapter.contents || []).forEach((sub, index) => {
      subIndexMap.set(`${chapter.id}:${sub.id}`, index + 1);
    });
  });

  const columns = new Map();
  const groupSubIds = new Map();

  (slots || []).forEach((slot, index) => {
    const scoreKey = String(slot?.slot_key ?? slot?.type ?? "");
    if (!scoreKey || columns.has(scoreKey)) return;
    const labelIndex = Number(slot?.label_index) || index + 1;
    columns.set(scoreKey, {
      id: scoreKey,
      scoreKey,
      type: slot?.type || scoreKey,
      subchapterId: Number(slot?.subchapter_id) || null,
      labelIndex,
      month: slot?.month || null,
      chapterTitle: slot?.chapter_title || null,
      examId: slot?.exam_id || null,
      examName: slot?.exam_name || null,
      createdAt: slot?.created_at || null,
      title: resolveTitle({
        labelIndex,
      }),
    });
  });

  students.forEach((student) => {
    (student.scores || []).forEach((score) => {
      if (!score) return;
      const chapterId = score.chapter_id ?? "0";
      const monthValue = score.month || "M00";
      const groupKey = `${monthValue}::${chapterId}`;
      const explicitSubId = Number(score?.subchapter_id);
      const subId =
        Number.isFinite(explicitSubId) && explicitSubId > 0
          ? explicitSubId
          : extractSubIdFromType(score.type);
      if (!groupSubIds.has(groupKey)) {
        groupSubIds.set(groupKey, new Set());
      }
      if (subId != null) {
        groupSubIds.get(groupKey).add(subId);
      }
    });
  });
  const groupIndexMap = new Map();
  groupSubIds.forEach((subSet, groupKey) => {
    const subList = Array.from(subSet).sort((a, b) => Number(a) - Number(b));
    const indexMap = new Map();
    subList.forEach((subId, idx) => {
      indexMap.set(subId, idx + 1);
    });
    groupIndexMap.set(groupKey, indexMap);
  });

  students.forEach((student) => {
    (student.scores || []).forEach((score) => {
      if (!score) return;
      const scoreKey =
        score.slot_key ||
        score.type ||
        `${score.month || "M00"}-B${score.chapter_id ?? "0"}-S${
          extractSubIdFromType(score.type) ?? "0"
        }`;
      if (columns.has(scoreKey)) {
        const existing = columns.get(scoreKey);
        if (!existing.examName && score.exam_name) {
          existing.examName = score.exam_name;
          existing.examId = score.exam_id || null;
        }
        if (!existing.createdAt && score.created_at) {
          existing.createdAt = score.created_at;
        }
        if (!existing.month && score.month) {
          existing.month = score.month;
        }
        if (!existing.chapterTitle && score.chapter_title) {
          existing.chapterTitle = score.chapter_title;
        }
        existing.title = resolveTitle({ labelIndex: existing.labelIndex });
        return;
      }
      const chapterTitle =
        score.chapter_title ||
        chapterTitleMap.get(String(score.chapter_id)) ||
        `Bab ${score.chapter_id ?? "-"}`;
      const monthLabel = score.month || "-";
      const groupKey = `${score.month || "M00"}::${score.chapter_id ?? "0"}`;
      const explicitSubId = Number(score?.subchapter_id);
      const subId =
        Number.isFinite(explicitSubId) && explicitSubId > 0
          ? explicitSubId
          : extractSubIdFromType(score.type);
      const derivedIndex =
        subId != null ? groupIndexMap.get(groupKey)?.get(subId) : null;
      const baseIndex =
        subId != null
          ? subIndexMap.get(`${score.chapter_id}:${subId}`)
          : null;
      const labelIndex = derivedIndex || baseIndex || columns.size + 1;
      columns.set(scoreKey, {
        id: subId ?? scoreKey,
        scoreKey,
        type: score.type || scoreKey,
        subchapterId: subId,
        month: monthLabel,
        chapterTitle,
        examId: score.exam_id || null,
        examName: score.exam_name || null,
        createdAt: score.created_at || null,
        title: resolveTitle({ labelIndex }),
        labelIndex,
      });
    });
  });
  return Array.from(columns.values());
};

const StudentGradingTableFormatif = ({
  students,
  isMobile,
  isFilterReady,
  isLoading,
  onFormativeChange,
  onDeleteColumn,
  subchapters = [],
  newColumnMeta = null,
}) => {
  const normalizedSubchapters = useMemo(() => {
    const base = Array.isArray(subchapters) ? subchapters : [];
    const derivedKeys = new Set();
    (students || []).forEach((student) => {
      const scores = student?.formatifScores || {};
      Object.keys(scores).forEach((key) => {
        if (key === "__new") return;
        derivedKeys.add(String(key));
      });
    });
    const derived = Array.from(derivedKeys)
      .sort((a, b) => {
        const aNum = Number(a);
        const bNum = Number(b);
        const aValid = Number.isFinite(aNum) && aNum > 0;
        const bValid = Number.isFinite(bNum) && bNum > 0;
        if (aValid && bValid) return aNum - bNum;
        if (aValid) return -1;
        if (bValid) return 1;
        return a.localeCompare(b);
      })
      .map((key, index) => {
        const numericKey = Number(key);
        const labelIndex =
          Number.isFinite(numericKey) && numericKey > 0
            ? numericKey
            : index + 1;
        return {
          id: key,
          scoreKey: key,
          labelIndex,
          title: buildScoreColumnLabel(labelIndex),
        };
      });
    const merged = [...base];
    const existingKeys = new Set(
      base.map((item) =>
        String(item?.scoreKey ?? item?.id ?? item?.key ?? item?.value),
      ),
    );
    derived.forEach((item) => {
      const itemKey = String(item.scoreKey);
      if (!existingKeys.has(itemKey)) {
        merged.push(item);
        existingKeys.add(itemKey);
      }
    });
    return merged.map((item, index) => ({
      ...item,
      labelIndex:
        Number(item?.labelIndex) > 0 ? Number(item.labelIndex) : index + 1,
      title: buildScoreColumnLabel(
        Number(item?.labelIndex) > 0 ? item.labelIndex : index + 1,
      ),
    }));
  }, [subchapters, students]);

  const getScoreKey = (sub) =>
    sub?.scoreKey ?? sub?.id ?? sub?.key ?? sub?.value;

  const getSubTitle = (sub) =>
    buildScoreColumnLabel(sub?.labelIndex ?? sub?.id ?? 1);

  const renderSubHeader = (sub) => {
    const scoreKey = getScoreKey(sub);
    const title = getSubTitle(sub);
    const canDelete = Boolean(onDeleteColumn) && scoreKey && scoreKey !== "__new";
    const tooltipText = buildScoreColumnTooltip({
      month: sub?.month,
      chapterTitle: sub?.chapterTitle,
      examName: sub?.examName,
      createdAt: sub?.createdAt,
    });
    const labelNode = tooltipText ? (
      <Tooltip
        title={
          <div style={{ whiteSpace: "pre-line" }}>{tooltipText}</div>
        }
      >
        <Text style={{ cursor: "help" }}>{title}</Text>
      </Tooltip>
    ) : (
      <Text>{title}</Text>
    );
    return (
      <Space align='center' size={6} wrap>
        {labelNode}
        {canDelete && (
          <Popconfirm
            title={`Hapus ${title}?`}
            description='Semua nilai siswa pada kolom ini akan dihapus secara bulk.'
            okText='Hapus'
            cancelText='Batal'
            onConfirm={() => onDeleteColumn?.(scoreKey)}
          >
            <Button
              type='text'
              size='small'
              danger
              icon={<Trash2 size={14} />}
            />
          </Popconfirm>
        )}
      </Space>
    );
  };

  const renderScoreInput = (record, index, subchapter) => {
    const scoreKey = getScoreKey(subchapter);
    const isNewColumn = scoreKey === "__new";
    return (
    <InputNumber
      min={0}
      max={100}
      step={1}
      precision={0}
      size={isMobile ? "small" : "middle"}
      style={{ width: "100%" }}
      value={record.formatifScores?.[scoreKey] ?? (isNewColumn ? null : 0)}
      disabled={isNewColumn ? !isFilterReady : false}
      onChange={(val) => onFormativeChange(index, scoreKey, val)}
    />
    );
  };

  const columns = [
    {
      title: "NIS",
      dataIndex: "nis",
      key: "nis",
      width: "14%",
      render: (value) => <Text>{value || "-"}</Text>,
      responsive: ["md"],
    },
    {
      title: "Nama Siswa",
      dataIndex: "name",
      key: "name",
      width: "22%",
      render: (value) => <Text strong>{value}</Text>,
      responsive: ["md"],
    },
    {
      title: "Siswa",
      key: "student",
      responsive: ["xs"],
      render: (_, record) => (
        <Space orientation="vertical" size={2}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.nis || "-"}
          </Text>
        </Space>
      ),
    },
    ...normalizedSubchapters.map((sub) => {
      const scoreKey = getScoreKey(sub);
      return {
        title: renderSubHeader(sub),
        key: `sub_${scoreKey}`,
        width: "16%",
        render: (_, record, index) => renderScoreInput(record, index, sub),
      };
    }),
  ];

  if (isFilterReady) {
    const newColumnTooltip = buildScoreColumnTooltip({
      month: newColumnMeta?.month,
      chapterTitle: newColumnMeta?.chapterTitle,
      createdAt: newColumnMeta?.createdAt,
    });
    columns.push({
      title: newColumnTooltip ? (
        <Tooltip
          title={
            <div style={{ whiteSpace: "pre-line" }}>{newColumnTooltip}</div>
          }
        >
          <Text style={{ cursor: "help" }}>Input Nilai</Text>
        </Tooltip>
      ) : (
        "Input Nilai"
      ),
      key: "sub_new",
      width: "16%",
      render: (_, record, index) =>
        renderScoreInput(record, index, {
          scoreKey: "__new",
          title: "Input Nilai",
        }),
    });
  }

  const renderMobileCard = (student, index) => (
    <Card
      key={student.id}
      size="small"
      style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}
      styles={{ body: { padding: 12 } }}
    >
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        <div>
          <Text strong>{student.name}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              NIS: {student.nis || "-"}
            </Text>
          </div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {normalizedSubchapters.map((sub) => (
            <div key={`sub_mobile_${getScoreKey(sub)}`}>
              <div style={{ marginBottom: 4 }}>{renderSubHeader(sub)}</div>
              {renderScoreInput(student, index, sub)}
            </div>
          ))}
          {isFilterReady && (
            <div key="sub_mobile_new">
              <Text type="secondary">Input Nilai</Text>
              {renderScoreInput(student, index, { scoreKey: "__new" })}
            </div>
          )}
        </div>
      </Space>
    </Card>
  );

  if (isLoading) {
    return <LoadApp />;
  }

  return isMobile ? (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      {(students || []).map((student, index) =>
        renderMobileCard(student, index),
      )}
    </Space>
  ) : (
    <Table
      dataSource={students}
      columns={columns}
      rowKey={(record) => record.id}
      pagination={false}
      size="middle"
      tableLayout="fixed"
      scroll={normalizedSubchapters.length > 3 ? { x: 900 } : undefined}
      locale={{ emptyText: "Belum ada siswa di kelas ini." }}
    />
  );
};

export default StudentGradingTableFormatif;
