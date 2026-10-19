const stripStimulusText = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const hasStimulusContent = (value) => {
  if (stripStimulusText(value)) return true;
  return /<(img|table|video|audio|iframe)\b/i.test(String(value || ""));
};

export const parseSavedQuestionOrder = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

export const groupQuestionsIntoBlocks = (questions) => {
  const blocks = [];
  const indexByGroup = new Map();

  questions.forEach((question) => {
    if (!question.group_id) {
      blocks.push([question]);
      return;
    }

    const existingIndex = indexByGroup.get(question.group_id);
    if (existingIndex === undefined) {
      indexByGroup.set(question.group_id, blocks.length);
      blocks.push([question]);
      return;
    }

    blocks[existingIndex].push(question);
  });

  return blocks;
};

export const orderPreservesGroups = (questions) => {
  const closedGroups = new Set();
  let currentGroupId = null;

  for (const question of questions) {
    const groupId = question.group_id || null;
    if (currentGroupId && currentGroupId !== groupId) {
      closedGroups.add(currentGroupId);
    }
    if (groupId && closedGroups.has(groupId)) return false;
    currentGroupId = groupId;
  }

  return true;
};

export const restoreQuestionOrder = (questions, savedIds) => {
  const normalized = parseSavedQuestionOrder(savedIds);
  if (!normalized || normalized.length !== questions.length) return null;

  const byId = new Map(questions.map((question) => [Number(question.id), question]));
  const ids = normalized.map((id) => Number(id));
  if (new Set(ids).size !== ids.length) return null;
  if (!ids.every((id) => byId.has(id))) return null;

  const ordered = ids.map((id) => byId.get(id));
  if (!orderPreservesGroups(ordered)) return null;
  return ordered;
};

export const annotateQuestionGroups = (questions) => {
  const spans = new Map();

  questions.forEach((question, index) => {
    if (!question.group_id) return;
    const span = spans.get(question.group_id) || {
      from: index + 1,
      to: index + 1,
      count: 0,
    };
    span.to = index + 1;
    span.count += 1;
    spans.set(question.group_id, span);
  });

  const positionByGroup = new Map();

  return questions.map((question) => {
    if (!question.group_id) {
      return {
        ...question,
        group_id: null,
        group_title: null,
        group_stimulus: null,
        group_order: null,
        group_from: null,
        group_to: null,
        group_position: null,
        group_count: null,
      };
    }

    const span = spans.get(question.group_id);
    const position = (positionByGroup.get(question.group_id) || 0) + 1;
    positionByGroup.set(question.group_id, position);

    return {
      ...question,
      group_title: question.group_title || "Grup soal",
      group_stimulus: question.group_stimulus || "",
      group_from: span.from,
      group_to: span.to,
      group_position: position,
      group_count: span.count,
    };
  });
};

export const dissolveUndersizedGroups = async (client, groupIds) => {
  const ids = [
    ...new Set(
      (groupIds || [])
        .map((id) => parseInt(id, 10))
        .filter((id) => Number.isInteger(id)),
    ),
  ];
  if (ids.length === 0) return;

  const countResult = await client.query(
    `
      SELECT group_id, COUNT(*)::int AS total
      FROM cbt.c_question
      WHERE group_id = ANY($1::int[])
      GROUP BY group_id
    `,
    [ids],
  );

  const stillValid = new Set(
    countResult.rows.filter((row) => row.total >= 2).map((row) => row.group_id),
  );
  const dissolveIds = ids.filter((id) => !stillValid.has(id));
  if (dissolveIds.length === 0) return;

  await client.query(
    `
      UPDATE cbt.c_question
      SET group_id = NULL, group_order = NULL
      WHERE group_id = ANY($1::int[])
    `,
    [dissolveIds],
  );
  await client.query(`DELETE FROM cbt.c_question_group WHERE id = ANY($1::int[])`, [
    dissolveIds,
  ]);
};
