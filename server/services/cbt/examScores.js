/**
 * Shared CBT exam score computation.
 * Must stay aligned with /exam-attendance/:exam_id/scores (Nilai Akhir).
 */

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const extractScalarAnswerId = (value) => {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    const firstId = value
      .map((item) => extractScalarAnswerId(item))
      .find((item) => Number.isInteger(item));
    return Number.isInteger(firstId) ? firstId : null;
  }

  if (typeof value === "object") {
    const candidateKeys = [
      "selectedOptionId",
      "selected_option_id",
      "optionId",
      "option_id",
      "selected",
      "value",
      "answer",
      "id",
    ];

    for (const key of candidateKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const parsed = extractScalarAnswerId(value[key]);
        if (Number.isInteger(parsed)) return parsed;
      }
    }

    return null;
  }

  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const extractAnswerIdList = (value) => {
  if (value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const nestedId = extractScalarAnswerId(item);
          return Number.isInteger(nestedId) ? [nestedId] : [];
        }
        const parsed = parseInt(item, 10);
        return Number.isInteger(parsed) ? [parsed] : [];
      })
      .filter((id, index, array) => array.indexOf(id) === index);
  }

  if (typeof value === "object") {
    const candidateKeys = [
      "selectedOptionIds",
      "selected_option_ids",
      "selected",
      "values",
      "answers",
      "answer",
      "ids",
      "options",
    ];

    for (const key of candidateKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const parsed = extractAnswerIdList(value[key]);
        if (parsed.length > 0) return parsed;
      }
    }

    const scalar = extractScalarAnswerId(value);
    return Number.isInteger(scalar) ? [scalar] : [];
  }

  if (typeof value === "string" && value.includes(",")) {
    return value
      .split(",")
      .map((item) => parseInt(item.trim(), 10))
      .filter(
        (item, index, array) =>
          Number.isInteger(item) && array.indexOf(item) === index,
      );
  }

  const scalar = extractScalarAnswerId(value);
  return Number.isInteger(scalar) ? [scalar] : [];
};

const parseMatchPairId = (pair, key) => {
  const rawValue = pair?.[`${key}Id`] ?? pair?.[`${key}_id`] ?? pair?.[key];
  const parsed = parseInt(rawValue, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const extractMatchPairs = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((pair) => {
        const leftId = parseMatchPairId(pair, "left");
        const rightId = parseMatchPairId(pair, "right");
        if (!Number.isInteger(leftId) || !Number.isInteger(rightId)) {
          return null;
        }
        return { leftId, rightId };
      })
      .filter(Boolean);
  }

  if (typeof value === "object") {
    const candidateKeys = ["pairs", "matches", "answer", "answers", "selected"];
    for (const key of candidateKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const parsed = extractMatchPairs(value[key]);
        if (parsed.length > 0) return parsed;
      }
    }

    return Object.entries(value)
      .map(([leftId, rightId]) => {
        const parsedLeft = parseInt(leftId, 10);
        const parsedRight = parseInt(rightId, 10);
        if (!Number.isInteger(parsedLeft) || !Number.isInteger(parsedRight)) {
          return null;
        }
        return { leftId: parsedLeft, rightId: parsedRight };
      })
      .filter(Boolean);
  }

  return [];
};

const normalizeAnswerText = (value) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const getOptionComparisonValues = (option) => {
  const baseValues = [
    option?.id,
    option?.label,
    option?.content,
    option?.marker,
    option?.label_text,
    option?.text,
    option?.full,
  ]
    .map((value) => normalizeAnswerText(value))
    .filter(Boolean);

  const contentValue = normalizeAnswerText(option?.content ?? option?.text);
  if (contentValue === "benar") {
    baseValues.push("true");
  }
  if (contentValue === "salah") {
    baseValues.push("false");
  }

  return [...new Set(baseValues)];
};

const findOptionByAnswerValue = (questionOptions = [], answerValue) => {
  const selectedId = extractScalarAnswerId(answerValue);
  if (Number.isInteger(selectedId)) {
    const byId = questionOptions.find((option) => option.id === selectedId);
    if (byId) return byId;
  }

  const normalizedAnswer = normalizeAnswerText(answerValue);
  if (!normalizedAnswer) return null;

  return (
    questionOptions.find((option) =>
      getOptionComparisonValues(option).includes(normalizedAnswer),
    ) || null
  );
};

const findOptionsByAnswerValues = (questionOptions = [], answerValue) => {
  const selectedIds = extractAnswerIdList(answerValue);
  if (selectedIds.length > 0) {
    const byIds = questionOptions.filter((option) =>
      selectedIds.includes(option.id),
    );
    if (byIds.length > 0) return byIds;
  }

  const rawValues = Array.isArray(answerValue)
    ? answerValue
    : typeof answerValue === "object" && answerValue !== null
      ? (answerValue.selected ??
        answerValue.values ??
        answerValue.answers ??
        answerValue.answer ??
        answerValue.options ??
        [])
      : typeof answerValue === "string" && answerValue.includes(",")
        ? answerValue.split(",")
        : [answerValue];

  const normalizedValues = rawValues
    .map((value) => normalizeAnswerText(value))
    .filter(Boolean);

  if (normalizedValues.length === 0) return [];

  return questionOptions.filter((option) => {
    const comparable = getOptionComparisonValues(option);
    return normalizedValues.some((value) => comparable.includes(value));
  });
};

const normalizeAnswerValueWithOptionAliases = (value, optionIdAliasMap) => {
  if (!optionIdAliasMap || optionIdAliasMap.size === 0) return value;
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) =>
      normalizeAnswerValueWithOptionAliases(item, optionIdAliasMap),
    );
  }

  if (typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, itemValue]) => {
      acc[key] = normalizeAnswerValueWithOptionAliases(
        itemValue,
        optionIdAliasMap,
      );
      return acc;
    }, {});
  }

  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed)) return value;
  return optionIdAliasMap.get(parsed) ?? value;
};

const buildOptionAliasesByQuestion = ({
  questions = [],
  optionsByQuestion = {},
  answerRows = [],
}) => {
  const answersByQuestion = answerRows.reduce((acc, row) => {
    if (!row?.question_id) return acc;
    if (!acc.has(row.question_id)) acc.set(row.question_id, []);
    acc.get(row.question_id).push(row.answer_json);
    return acc;
  }, new Map());

  const questionMeta = questions.map((question) => {
    const questionOptions = optionsByQuestion[question.id] || [];
    const currentIds = questionOptions.map((option) => option.id);
    const currentIdSet = new Set(currentIds);
    const answerValues = answersByQuestion.get(question.id) || [];
    const legacyIds = new Set();

    answerValues.forEach((answerValue) => {
      if (question.q_type === 6) {
        extractMatchPairs(answerValue).forEach((pair) => {
          if (Number.isInteger(pair.leftId)) legacyIds.add(pair.leftId);
          if (Number.isInteger(pair.rightId)) legacyIds.add(pair.rightId);
        });
        return;
      }

      if ([1, 2, 5].includes(question.q_type)) {
        extractAnswerIdList(answerValue).forEach((id) => legacyIds.add(id));
      }
    });

    return {
      question,
      currentIds,
      legacyIds: [...legacyIds]
        .filter((id) => !currentIdSet.has(id))
        .sort((a, b) => a - b),
    };
  });

  const startsByQuestion = new Map();
  questionMeta.forEach((meta) => {
    if (
      meta.currentIds.length > 0 &&
      meta.legacyIds.length === meta.currentIds.length
    ) {
      startsByQuestion.set(meta.question.id, meta.legacyIds[0]);
    }
  });

  questionMeta.forEach((meta, index) => {
    if (startsByQuestion.has(meta.question.id) || meta.currentIds.length === 0) {
      return;
    }

    const previous = [...questionMeta]
      .slice(0, index)
      .reverse()
      .find((item) => startsByQuestion.has(item.question.id));
    const next = questionMeta
      .slice(index + 1)
      .find((item) => startsByQuestion.has(item.question.id));

    const startFromPrevious =
      previous &&
      startsByQuestion.get(previous.question.id) +
        questionMeta
          .slice(
            questionMeta.findIndex(
              (item) => item.question.id === previous.question.id,
            ),
            index,
          )
          .reduce((sum, item) => sum + item.currentIds.length, 0);

    const startFromNext =
      next &&
      startsByQuestion.get(next.question.id) -
        questionMeta
          .slice(
            index,
            questionMeta.findIndex(
              (item) => item.question.id === next.question.id,
            ),
          )
          .reduce((sum, item) => sum + item.currentIds.length, 0);

    const candidateStart = startFromPrevious || startFromNext;
    if (!Number.isInteger(candidateStart)) return;

    const candidateEnd = candidateStart + meta.currentIds.length - 1;
    const idsFitRange =
      meta.legacyIds.length > 0 &&
      meta.legacyIds.every((id) => id >= candidateStart && id <= candidateEnd);
    if (idsFitRange) {
      startsByQuestion.set(meta.question.id, candidateStart);
    }
  });

  return questionMeta.reduce((acc, meta) => {
    const legacyStart = startsByQuestion.get(meta.question.id);
    if (!Number.isInteger(legacyStart) || meta.currentIds.length === 0) {
      return acc;
    }

    acc[meta.question.id] = new Map(
      meta.currentIds.map((currentId, index) => [
        legacyStart + index,
        currentId,
      ]),
    );
    return acc;
  }, {});
};

const isShortAnswerCorrect = (questionOptions = [], answerValue) => {
  const normalizedAnswer = normalizeAnswerText(answerValue);
  if (!normalizedAnswer) return false;

  const correctOptions = questionOptions.filter((option) => option.is_correct);
  if (correctOptions.length === 0) return false;

  return correctOptions.some((option) =>
    getOptionComparisonValues(option).includes(normalizedAnswer),
  );
};

const getMatchAutoScore = ({ answerValue, maxPoints }) => {
  const pairs = extractMatchPairs(answerValue);
  const totalPairs = pairs.length;
  if (totalPairs < 1) {
    return {
      totalPairs: 0,
      correctCount: 0,
      score: 0,
    };
  }

  const correctCount = pairs.filter((pair) => {
    if (!Number.isInteger(pair?.leftId) || !Number.isInteger(pair?.rightId)) {
      return false;
    }
    return String(pair.leftId) === String(pair.rightId);
  }).length;

  const rawScore = (correctCount / totalPairs) * toNumber(maxPoints);
  return {
    totalPairs,
    correctCount,
    score: Number(rawScore.toFixed(2)),
  };
};

export const getQuestionScore = ({
  question,
  answerRow,
  questionOptions = [],
  optionIdAliasMap,
}) => {
  const answerValue = normalizeAnswerValueWithOptionAliases(
    answerRow?.answer_json,
    optionIdAliasMap,
  );
  const maxPoints = toNumber(question.score_point);

  if (question.q_type === 1) {
    const selectedOption = findOptionByAnswerValue(questionOptions, answerValue);
    const correctOptions = questionOptions.filter((opt) => opt.is_correct);
    const isCorrect = correctOptions.some((opt) => opt.id === selectedOption?.id);
    return isCorrect ? maxPoints : 0;
  }

  if (question.q_type === 2) {
    const selectedIds = findOptionsByAnswerValues(
      questionOptions,
      answerValue,
    ).map((option) => option.id);
    const correctIds = questionOptions
      .filter((opt) => opt.is_correct)
      .map((opt) => opt.id);
    const correctSet = new Set(correctIds);
    const isCorrect =
      selectedIds.length > 0 &&
      selectedIds.every((id) => correctSet.has(id)) &&
      selectedIds.length === correctSet.size;
    return isCorrect ? maxPoints : 0;
  }

  if (question.q_type === 5) {
    const selectedOption = findOptionByAnswerValue(questionOptions, answerValue);
    const correctOptions = questionOptions.filter((opt) => opt.is_correct);
    const isCorrect = correctOptions.some((opt) => opt.id === selectedOption?.id);
    return isCorrect ? maxPoints : 0;
  }

  if (question.q_type === 4) {
    if (
      answerRow?.score_obtained !== null &&
      answerRow?.score_obtained !== undefined
    ) {
      return toNumber(answerRow.score_obtained);
    }
    return isShortAnswerCorrect(questionOptions, answerValue) ? maxPoints : 0;
  }

  if (question.q_type === 3) {
    return toNumber(answerRow?.score_obtained);
  }

  if (question.q_type === 6) {
    if (
      answerRow?.score_obtained !== null &&
      answerRow?.score_obtained !== undefined
    ) {
      return toNumber(answerRow.score_obtained);
    }
    return getMatchAutoScore({
      answerValue,
      maxPoints,
    }).score;
  }

  return 0;
};

/**
 * Compute CBT Nilai Akhir for students in an exam.
 * Same formula as CBT report Score tab.
 */
export const computeExamScoresForStudents = async (
  pool,
  { examId, studentIds = [] },
) => {
  const normalizedStudentIds = [
    ...new Set(
      (studentIds || [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];

  const scoreByStudent = new Map();
  if (!examId || normalizedStudentIds.length === 0) {
    return scoreByStudent;
  }

  const questionResult = await pool.query(
    `SELECT q.id, q.q_type, q.bloom_level, q.score_point
     FROM cbt.c_question q
     JOIN cbt.c_exam e ON e.bank_id = q.bank_id
     WHERE e.id = $1
     ORDER BY q.id ASC`,
    [examId],
  );
  const questions = questionResult.rows;
  const questionIds = questions.map((q) => q.id);

  let options = [];
  if (questionIds.length > 0) {
    const optionResult = await pool.query(
      `SELECT id, question_id, label, content, is_correct
       FROM cbt.c_question_options
       WHERE question_id = ANY($1::int[])
       ORDER BY id ASC`,
      [questionIds],
    );
    options = optionResult.rows;
  }

  const optionsByQuestion = options.reduce((acc, item) => {
    if (!acc[item.question_id]) acc[item.question_id] = [];
    acc[item.question_id].push(item);
    return acc;
  }, {});

  const answerResult = await pool.query(
    `SELECT student_id, question_id, answer_json, score_obtained
     FROM cbt.c_student_answer
     WHERE exam_id = $1 AND student_id = ANY($2::int[])`,
    [examId, normalizedStudentIds],
  );

  const answersByStudent = new Map();
  answerResult.rows.forEach((row) => {
    const studentId = Number(row.student_id);
    if (!answersByStudent.has(studentId)) {
      answersByStudent.set(studentId, new Map());
    }
    answersByStudent.get(studentId).set(row.question_id, row);
  });

  const optionAliasesByQuestion = buildOptionAliasesByQuestion({
    questions,
    optionsByQuestion,
    answerRows: answerResult.rows,
  });

  normalizedStudentIds.forEach((studentId) => {
    const answersByQuestion = answersByStudent.get(studentId) || new Map();
    const hasAnswers = answersByQuestion.size > 0;
    const typeScores = {
      single: 0,
      multi: 0,
      match: 0,
      true_false: 0,
      short: 0,
      essay: 0,
    };

    questions.forEach((question) => {
      const answerRow = answersByQuestion.get(question.id);
      const questionOptions = optionsByQuestion[question.id] || [];
      const points = getQuestionScore({
        question,
        answerRow,
        questionOptions,
        optionIdAliasMap: optionAliasesByQuestion[question.id],
      });

      if (question.q_type === 1) typeScores.single += points;
      if (question.q_type === 2) typeScores.multi += points;
      if (question.q_type === 6) typeScores.match += points;
      if (question.q_type === 5) typeScores.true_false += points;
      if (question.q_type === 4) typeScores.short += points;
      if (question.q_type === 3) typeScores.essay += points;
    });

    const rawScore = Math.min(
      100,
      typeScores.single +
        typeScores.multi +
        typeScores.match +
        typeScores.true_false +
        typeScores.short +
        typeScores.essay,
    );
    // Keep 2-decimal CBT precision, then round for integer grading storage.
    const scorePrecise = Number(rawScore.toFixed(2));
    const score = Math.round(scorePrecise);

    scoreByStudent.set(studentId, {
      score,
      score_precise: scorePrecise,
      has_score: hasAnswers,
      answer_count: answersByQuestion.size,
      score_single: Number(typeScores.single.toFixed(2)),
      score_multi: Number(typeScores.multi.toFixed(2)),
      score_match: Number(typeScores.match.toFixed(2)),
      score_true_false: Number(typeScores.true_false.toFixed(2)),
      score_short: Number(typeScores.short.toFixed(2)),
      score_essay: Number(typeScores.essay.toFixed(2)),
    });
  });

  return scoreByStudent;
};
