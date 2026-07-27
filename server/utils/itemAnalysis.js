const QUESTION_TYPE_LABELS = {
  1: "PG Jawaban Tunggal",
  2: "PG Multi Jawaban",
  3: "Uraian",
  4: "Isian Singkat",
  5: "Benar / Salah",
  6: "Menjodohkan",
};

const ESSAY_LIKE_TYPES = new Set([3, 4]);

const round2 = (value) => Number(Number(value || 0).toFixed(2));
const round3 = (value) => Number(Number(value || 0).toFixed(3));

const mean = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const variance = (values, sample = true) => {
  if (!values.length) return 0;
  if (sample && values.length < 2) return 0;
  const avg = mean(values);
  const denominator = sample ? values.length - 1 : values.length;
  const sumSquares = values.reduce((sum, value) => {
    const diff = value - avg;
    return sum + diff * diff;
  }, 0);
  return sumSquares / denominator;
};

const stdDev = (values, sample = true) => Math.sqrt(variance(values, sample));

const pearsonCorrelation = (xs, ys) => {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;

  for (let i = 0; i < n; i += 1) {
    const x = xs[i];
    const y = ys[i];
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumYY += y * y;
    sumXY += x * y;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY),
  );

  if (!denominator) return null;
  return numerator / denominator;
};

const classifyDifficulty = (p) => {
  if (p > 0.7) return { key: "easy", label: "Mudah" };
  if (p < 0.3) return { key: "hard", label: "Sukar" };
  return { key: "moderate", label: "Sedang" };
};

const classifyDiscrimination = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { key: "unknown", label: "Tidak dihitung" };
  }
  if (value < 0) return { key: "problematic", label: "Bermasalah" };
  if (value < 0.2) return { key: "weak", label: "Lemah" };
  if (value < 0.4) return { key: "fair", label: "Cukup" };
  return { key: "good", label: "Baik" };
};

const classifyAlpha = (alpha) => {
  if (alpha === null || alpha === undefined || Number.isNaN(alpha)) {
    return { key: "unknown", label: "Tidak dihitung" };
  }
  if (alpha >= 0.7) return { key: "good", label: "Baik" };
  if (alpha >= 0.6) return { key: "fair", label: "Cukup" };
  return { key: "low", label: "Rendah" };
};

const buildRecommendation = ({ p, pointBiserial, discriminationIndex }) => {
  const reasons = [];
  const hasNegative =
    (pointBiserial !== null && pointBiserial < 0) ||
    (discriminationIndex !== null && discriminationIndex < 0);
  const bothWeak =
    pointBiserial !== null &&
    discriminationIndex !== null &&
    pointBiserial < 0.2 &&
    discriminationIndex < 0.2;
  const extremeDifficulty = p < 0.1 || p > 0.9;

  if (hasNegative) {
    reasons.push("Daya beda negatif (siswa lemah cenderung lebih sering benar)");
  }
  if (bothWeak) {
    reasons.push("Point-biserial dan indeks D sama-sama di bawah 0.20");
  }
  if (extremeDifficulty) {
    reasons.push(
      p > 0.9
        ? "Soal terlalu mudah (P > 0.90), hampir tidak membedakan"
        : "Soal terlalu sukar (P < 0.10), hampir tidak membedakan",
    );
  }

  if (hasNegative) {
    return {
      key: "discard",
      label: "Buang / revisi total",
      actionable: true,
      reasons,
    };
  }

  if (bothWeak || extremeDifficulty) {
    return {
      key: "retire",
      label: "Tidak disarankan dipakai ulang",
      actionable: true,
      reasons,
    };
  }

  return {
    key: "keep",
    label: "Pertahankan",
    actionable: false,
    reasons: ["Metrik butir masih dalam rentang layak digunakan"],
  };
};

/**
 * Build dichotomous score matrix and item statistics.
 * score: 1 correct, 0 incorrect/unanswered; null = excluded (pending essay).
 */
export const computeItemAnalysis = ({
  questions,
  students,
  getStatus,
  includeEssay = false,
}) => {
  const analyzableQuestions = questions
    .map((question, index) => ({ ...question, no: question.no || index + 1 }))
    .filter((question) => {
      if (!ESSAY_LIKE_TYPES.has(Number(question.q_type))) return true;
      return Boolean(includeEssay);
    });

  const excludedEssayCount = questions.length - analyzableQuestions.length;

  const studentIds = students.map((student) => student.id);
  const questionIds = analyzableQuestions.map((question) => question.id);

  /** @type {Map<number, Map<number, number|null>>} studentId -> questionId -> score */
  const matrix = new Map();

  studentIds.forEach((studentId) => {
    const row = new Map();
    analyzableQuestions.forEach((question) => {
      const status = getStatus(studentId, question);
      if (status === "pending_review") {
        row.set(question.id, null);
      } else if (status === "correct") {
        row.set(question.id, 1);
      } else {
        // incorrect + unanswered count as 0 for classical dichotomous scoring
        row.set(question.id, 0);
      }
    });
    matrix.set(studentId, row);
  });

  // Keep students who participated (caller should pass participants) and have at least
  // one scored (non-pending) response on included items.
  const analyzedStudents = students.filter((student) => {
    const row = matrix.get(student.id);
    if (!row) return false;
    return [...row.values()].some((value) => value !== null);
  });

  const nStudents = analyzedStudents.length;
  const sampleWarning = nStudents > 0 && nStudents < 20;

  const totalScoresByStudent = new Map();
  analyzedStudents.forEach((student) => {
    const row = matrix.get(student.id);
    let total = 0;
    let counted = 0;
    questionIds.forEach((questionId) => {
      const value = row.get(questionId);
      if (value === null || value === undefined) return;
      total += value;
      counted += 1;
    });
    totalScoresByStudent.set(student.id, { total, counted });
  });

  const perQuestion = analyzableQuestions.map((question) => {
    const scores = [];
    analyzedStudents.forEach((student) => {
      const value = matrix.get(student.id)?.get(question.id);
      if (value === null || value === undefined) return;
      scores.push({
        studentId: student.id,
        item: value,
        total: totalScoresByStudent.get(student.id)?.total || 0,
      });
    });

    const n = scores.length;
    const correctCount = scores.filter((item) => item.item === 1).length;
    const incorrectCount = scores.filter((item) => item.item === 0).length;
    const pendingCount = analyzedStudents.length - n;
    const p = n > 0 ? correctCount / n : 0;

    // Corrected item-total (exclude this item)
    const itemScores = [];
    const restScores = [];
    scores.forEach((entry) => {
      itemScores.push(entry.item);
      restScores.push(entry.total - entry.item);
    });

    const pointBiserialRaw = pearsonCorrelation(itemScores, restScores);
    const pointBiserial =
      pointBiserialRaw === null ? null : round3(pointBiserialRaw);

    // Discrimination index D using 27% groups on total score
    let discriminationIndex = null;
    if (n >= 4) {
      const sorted = [...scores].sort((a, b) => b.total - a.total);
      const groupSize = Math.max(1, Math.round(n * 0.27));
      const upper = sorted.slice(0, groupSize);
      const lower = sorted.slice(-groupSize);
      const pUpper = mean(upper.map((item) => item.item));
      const pLower = mean(lower.map((item) => item.item));
      discriminationIndex = round3(pUpper - pLower);
    }

    const difficulty = classifyDifficulty(p);
    const recommendation = buildRecommendation({
      p,
      pointBiserial,
      discriminationIndex,
    });

    return {
      id: question.id,
      no: question.no,
      q_type: question.q_type,
      type_label: QUESTION_TYPE_LABELS[question.q_type] || "Unknown",
      is_essay_like: ESSAY_LIKE_TYPES.has(Number(question.q_type)),
      bloom_level: question.bloom_level,
      question: question.question,
      score_point: question.score_point || 0,
      analyzed_students: n,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      pending_review_count: pendingCount,
      difficulty_index: round3(p),
      difficulty_percent: round2(p * 100),
      difficulty_key: difficulty.key,
      difficulty_label: difficulty.label,
      point_biserial: pointBiserial,
      point_biserial_label: classifyDiscrimination(pointBiserial).label,
      point_biserial_key: classifyDiscrimination(pointBiserial).key,
      discrimination_index: discriminationIndex,
      discrimination_label: classifyDiscrimination(discriminationIndex).label,
      discrimination_key: classifyDiscrimination(discriminationIndex).key,
      recommendation_key: recommendation.key,
      recommendation_label: recommendation.label,
      recommendation_actionable: recommendation.actionable,
      recommendation_reasons: recommendation.reasons,
    };
  });

  // Cronbach's Alpha on dichotomous matrix (treat null as missing → use 0 only if student in analyzed set and value non-null; for alpha use complete cases per item mean fill? Standard: use 0 for missing among analyzed students who have mostly complete data)
  // Practical approach: for alpha, among analyzed students, treat null as 0 (pending essay counted wrong) only when includeEssay — better: drop items with >50% pending, and for remaining use pairwise or fill null as excluded students from alpha.
  // Simple robust approach: build score vectors with null → skip student for that item variance using available; for total score use sum of non-null. Classic KR-20 needs complete matrix.
  // Use complete matrix with null coerced to 0 for alpha only when pending rate < 30%, else compute alpha on objective items only subset that has no nulls.

  const alphaQuestions = perQuestion.filter(
    (item) => item.pending_review_count / Math.max(item.analyzed_students, 1) < 0.3,
  );
  const alphaQuestionIds = new Set(alphaQuestions.map((item) => item.id));

  let cronbachAlpha = null;
  if (analyzedStudents.length >= 2 && alphaQuestions.length >= 2) {
    const itemVectors = alphaQuestions.map((question) =>
      analyzedStudents.map((student) => {
        const value = matrix.get(student.id)?.get(question.id);
        return value === null || value === undefined ? 0 : value;
      }),
    );

    const totalVector = analyzedStudents.map((_, studentIndex) =>
      itemVectors.reduce((sum, vector) => sum + vector[studentIndex], 0),
    );

    const itemVariances = itemVectors.map((vector) => variance(vector, true));
    const totalVar = variance(totalVector, true);
    const k = alphaQuestions.length;

    if (totalVar > 0 && k > 1) {
      const sumItemVar = itemVariances.reduce((sum, value) => sum + value, 0);
      cronbachAlpha = round3((k / (k - 1)) * (1 - sumItemVar / totalVar));
      // Clamp rare numerical drift outside [-1, 1] display range for alpha typically [0,1] but can be negative
      if (cronbachAlpha > 1) cronbachAlpha = 1;
    }
  }

  const actionableItems = perQuestion.filter((item) => item.recommendation_actionable);
  const avgDifficulty =
    perQuestion.length > 0
      ? round3(mean(perQuestion.map((item) => item.difficulty_index)))
      : 0;
  const pointBiserialValues = perQuestion
    .map((item) => item.point_biserial)
    .filter((value) => value !== null && value !== undefined);
  const discriminationValues = perQuestion
    .map((item) => item.discrimination_index)
    .filter((value) => value !== null && value !== undefined);
  const avgPointBiserial =
    pointBiserialValues.length > 0 ? round3(mean(pointBiserialValues)) : null;
  const avgDiscrimination =
    discriminationValues.length > 0 ? round3(mean(discriminationValues)) : null;

  const alphaMeta = classifyAlpha(cronbachAlpha);

  return {
    include_essay: Boolean(includeEssay),
    total_questions: questions.length,
    analyzed_questions: perQuestion.length,
    excluded_essay_questions: excludedEssayCount,
    total_students: students.length,
    analyzed_students: nStudents,
    sample_warning: sampleWarning,
    sample_warning_message: sampleWarning
      ? "Jumlah peserta dianalisis kurang dari 20. Hasil bersifat indikatif."
      : null,
    summary: {
      cronbach_alpha: cronbachAlpha,
      cronbach_alpha_key: alphaMeta.key,
      cronbach_alpha_label: alphaMeta.label,
      average_difficulty: avgDifficulty,
      average_point_biserial: avgPointBiserial,
      average_discrimination_index: avgDiscrimination,
      reject_count: actionableItems.length,
      discard_count: actionableItems.filter((item) => item.recommendation_key === "discard")
        .length,
      retire_count: actionableItems.filter((item) => item.recommendation_key === "retire")
        .length,
      keep_count: perQuestion.filter((item) => item.recommendation_key === "keep").length,
      alpha_item_count: alphaQuestionIds.size,
    },
    per_question: perQuestion,
    rejected_questions: actionableItems,
  };
};

export { QUESTION_TYPE_LABELS, ESSAY_LIKE_TYPES };
