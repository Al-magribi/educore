export const extractSubIdFromType = (typeValue) => {
  const rawType = String(typeValue || "");
  const match = rawType.match(/-S(\d+)/);
  if (match) return Number(match[1]);
  if (/^M\d{2}-B\d+$/.test(rawType)) return 1;
  return null;
};

export const buildFormatifSubchapters = ({
  students = [],
  isFormativeFilterActive,
  activeChapterId,
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
