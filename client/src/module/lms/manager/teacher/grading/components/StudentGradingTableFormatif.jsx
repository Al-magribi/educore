import React, { useMemo } from "react";
import { Card, InputNumber, Space, Table, Typography } from "antd";

const { Text } = Typography;

export const extractSubIdFromType = (typeValue) => {
  const match = String(typeValue || "").match(/-S(\d+)/);
  return match ? Number(match[1]) : null;
};

export const buildFormatifSubchapters = ({
  students = [],
  isFormativeFilterActive,
  activeChapterId,
  activeChapter,
  chaptersWithContents = [],
}) => {
  if (isFormativeFilterActive) {
    if (!activeChapterId) return [];
    const subIds = new Set();
    students.forEach((student) => {
      (student.scores || []).forEach((score) => {
        const subId = extractSubIdFromType(score?.type);
        if (subId == null) return;
        subIds.add(subId);
      });
    });
    const sorted = Array.from(subIds).sort((a, b) => Number(a) - Number(b));
    return sorted.map((subId, index) => ({
      id: subId,
      title: `Nilai ${index + 1}`,
      labelIndex: index + 1,
      scoreKey: subId,
    }));
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
  students.forEach((student) => {
    (student.scores || []).forEach((score) => {
      if (!score) return;
      const chapterId = score.chapter_id ?? "0";
      const monthValue = score.month || "M00";
      const groupKey = `${monthValue}::${chapterId}`;
      const subId = extractSubIdFromType(score.type);
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
        score.type ||
        `${score.month || "M00"}-B${score.chapter_id ?? "0"}-S${
          extractSubIdFromType(score.type) ?? "0"
        }`;
      if (columns.has(scoreKey)) return;
      const chapterTitle =
        chapterTitleMap.get(String(score.chapter_id)) ||
        `Bab ${score.chapter_id ?? "-"}`;
      const monthLabel = score.month || "-";
      const groupKey = `${score.month || "M00"}::${score.chapter_id ?? "0"}`;
      const subId = extractSubIdFromType(score.type);
      const derivedIndex =
        subId != null ? groupIndexMap.get(groupKey)?.get(subId) : null;
      const baseIndex =
        subId != null
          ? subIndexMap.get(`${score.chapter_id}:${subId}`)
          : null;
      const labelIndex = derivedIndex || baseIndex || 1;
      columns.set(scoreKey, {
        id: subId ?? scoreKey,
        scoreKey,
        title: `${monthLabel} - ${chapterTitle} - Nilai ${labelIndex}`,
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
  onFormativeChange,
  subchapters = [],
}) => {
  const normalizedSubchapters = useMemo(() => {
    const base = Array.isArray(subchapters) ? subchapters : [];
    const derivedKeys = new Set();
    (students || []).forEach((student) => {
      const scores = student?.formatifScores || {};
      Object.keys(scores).forEach((key) => {
        if (key === "__new") return;
        const numericKey = Number(key);
        if (Number.isFinite(numericKey) && numericKey > 0) {
          derivedKeys.add(numericKey);
        }
      });
    });
    const derived = Array.from(derivedKeys)
      .sort((a, b) => a - b)
      .map((key) => ({
        id: key,
        scoreKey: key,
        labelIndex: key,
        title: `Nilai ${key}`,
      }));
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
    return merged;
  }, [subchapters, students]);

  const getScoreKey = (sub) =>
    sub?.scoreKey ?? sub?.id ?? sub?.key ?? sub?.value;

  const getSubTitle = (sub) =>
    sub?.title || `Nilai ${sub?.labelIndex ?? sub?.id ?? "-"}`;

  const renderScoreInput = (record, index, subchapter) => {
    const scoreKey = getScoreKey(subchapter);
    return (
    <InputNumber
      min={0}
      max={100}
      step={1}
      precision={0}
      size={isMobile ? "small" : "middle"}
      style={{ width: "100%" }}
      value={record.formatifScores?.[scoreKey] ?? 0}
      disabled={!isFilterReady}
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
        title: getSubTitle(sub),
        key: `sub_${scoreKey}`,
        width: "16%",
        render: (_, record, index) => renderScoreInput(record, index, sub),
      };
    }),
  ];

  if (isFilterReady) {
    columns.push({
      title: "Input Nilai",
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
              <Text type="secondary">{getSubTitle(sub)}</Text>
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
