import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Divider,
  Empty,
  Flex,
  Grid,
  Input,
  InputNumber,
  message,
  Space,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  FileText,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  useGetExamStudentAnswersQuery,
  useFinalizeExamStudentAnswerReviewMutation,
  useSaveExamStudentRubricScoreMutation,
  useSaveExamStudentScoreMutation,
} from "../../../../../../service/cbt/ApiExam";
import StudentAnswersHero from "./StudentAnswersHero";
import StudentAnswersManualAction from "./StudentAnswersManualAction";
import StudentAnswersMetrics from "./StudentAnswersMetrics";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const TYPE_LABELS = {
  single: "PG Jawaban Tunggal",
  multi: "PG Multi Jawaban",
  short: "Jawaban Singkat",
  essay: "Uraian",
  true_false: "Benar / Salah",
  match: "Mencocokkan",
};

const MANUAL_REVIEW_TYPES = new Set(["essay", "short", "match"]);

const createMarkup = (value) => ({
  __html: typeof value === "string" ? value : "",
});

const normalizeTagValue = (value) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const isTrueFalseOptionSet = (options = []) => {
  const normalized = options
    .map((option) =>
      normalizeTagValue(
        typeof option === "string"
          ? option
          : (option?.content ?? option?.label ?? option?.value),
      ).toLowerCase(),
    )
    .filter(Boolean);

  return (
    normalized.length === 2 &&
    normalized.includes("benar") &&
    normalized.includes("salah")
  );
};

const normalizeAnswerType = (item) => {
  const rawType =
    item?.type ?? item?.questionType ?? item?.question_type ?? item?.q_type;

  switch (rawType) {
    case 1:
    case "1":
    case "single":
      return isTrueFalseOptionSet(item?.options) ? "true_false" : "single";
    case 2:
    case "2":
    case "multi":
      return "multi";
    case 3:
    case "3":
    case "essay":
      return "essay";
    case 4:
    case "4":
    case "short":
      return "short";
    case 5:
    case "5":
    case "true_false":
    case "truefalse":
    case "boolean":
      return "true_false";
    case 6:
    case "6":
    case "match":
      return "match";
    default:
      return rawType || "single";
  }
};

const TypeTag = ({ type }) => (
  <Tag color='blue' style={{ borderRadius: 999, margin: 0 }}>
    {TYPE_LABELS[type] || type}
  </Tag>
);

const normalizeDisplayValue = (value) =>
  normalizeTagValue(typeof value === "string" ? value : String(value ?? ""));

const getMatchAutoScore = (item) => {
  if (!item || normalizeAnswerType(item) !== "match") return null;
  const matches = Array.isArray(item.matches) ? item.matches : [];
  const totalPairs = Array.isArray(item.correctMatches)
    ? item.correctMatches.length
    : matches.length;
  const maxPoints = Number(item.maxPoints || 0);
  if (totalPairs < 1 || maxPoints <= 0) return 0;
  const correctCount = matches.filter((pair) => pair?.correct).length;
  const rawScore = (correctCount / totalPairs) * maxPoints;
  return Number(rawScore.toFixed(2));
};

const AnswerCard = ({ item, onPointChange, maxAllow, saveState, isMobile }) => {
  const isCorrect = item.correct === true;
  const normalizedType = normalizeAnswerType(item);
  const selectedOptionIds = Array.isArray(item.selectedOptionIds)
    ? item.selectedOptionIds.map(String)
    : item.selectedOptionIds !== undefined && item.selectedOptionIds !== null
      ? [String(item.selectedOptionIds)]
      : [];
  const selectedMarkerValues = Array.isArray(item.selectedMarkers)
    ? item.selectedMarkers
    : item.selectedMarkers !== undefined && item.selectedMarkers !== null
      ? [item.selectedMarkers]
      : [];
  const selectedValues = Array.isArray(item.selected)
    ? item.selected.map(String)
    : item.selected !== undefined && item.selected !== null
      ? [String(item.selected)]
      : [];
  const optionValues = Array.isArray(item.options) ? item.options : [];
  const correctValues = Array.isArray(item.correctAnswers)
    ? item.correctAnswers
    : item.correctAnswers !== undefined && item.correctAnswers !== null
      ? [item.correctAnswers]
      : [];
  const normalizedSelectedValues = selectedValues.map(normalizeDisplayValue);
  const normalizedSelectedMarkers = selectedMarkerValues.map((value) =>
    normalizeDisplayValue(value),
  );

  const renderHtmlBlock = (value, style = {}) => (
    <div
      style={{
        width: "100%",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        ...style,
      }}
      dangerouslySetInnerHTML={createMarkup(value)}
    />
  );

  const renderOptionTag = (option, color = "default", icon = null) => {
    const rawValue =
      typeof option === "string"
        ? option
        : (option?.content ?? option?.label ?? option?.value ?? option?.id);
    const key = String(
      typeof option === "object" && option !== null
        ? (option.id ?? rawValue)
        : rawValue,
    );

    return (
      <Tag
        key={key}
        color={color}
        icon={icon}
        style={{ maxWidth: "100%", whiteSpace: "normal", borderRadius: 12 }}
      >
        <span dangerouslySetInnerHTML={createMarkup(rawValue)} />
      </Tag>
    );
  };

  const isOptionSelected = (option) => {
    if (typeof option === "object" && option !== null) {
      if (
        option.id !== undefined &&
        option.id !== null &&
        selectedOptionIds.includes(String(option.id))
      ) {
        return true;
      }

      const comparableValues = [
        option.label,
        option.content,
        option.label && option.content
          ? `${option.label}. ${option.content}`
          : null,
      ]
        .map(normalizeDisplayValue)
        .filter(Boolean);

      return comparableValues.some(
        (value) =>
          normalizedSelectedValues.includes(value) ||
          normalizedSelectedMarkers.includes(value),
      );
    }

    return normalizedSelectedValues.includes(normalizeDisplayValue(option));
  };

  const renderAnswerSummary = (title, values, color) => (
    <div style={{ width: "100%" }}>
      <Text type='secondary'>{title}</Text>
      <Space wrap size={6} style={{ marginTop: 6, width: "100%" }}>
        {values.length ? (
          values.map((value) => renderOptionTag(value, color))
        ) : (
          <Tag color='default'>-</Tag>
        )}
      </Space>
    </div>
  );

  const renderStudentTextAnswer = (value) => (
    <Space wrap size={6} style={{ marginTop: 6, width: "100%" }}>
      <Tag
        color='green'
        icon={<CheckCircle2 size={12} />}
        style={{ maxWidth: "100%", whiteSpace: "normal", borderRadius: 12 }}
      >
        <span dangerouslySetInnerHTML={createMarkup(value || "-")} />
      </Tag>
    </Space>
  );

  const renderStudentOptions = () => (
    <Space wrap size={6} style={{ marginTop: 6, width: "100%" }}>
      {optionValues.length ? (
        optionValues.map((opt) => {
          const selected = isOptionSelected(opt);
          return renderOptionTag(
            selected && typeof opt === "object"
              ? {
                  ...opt,
                  content: `${opt.content}`,
                }
              : opt,
            selected ? "green" : "default",
            selected ? <CheckCircle2 size={12} /> : null,
          );
        })
      ) : (
        <Tag color='default'>-</Tag>
      )}
    </Space>
  );

  const rubricSaveState = item.rubricSavingState;
  const rubricRows = Array.isArray(item.rubric) ? item.rubric : [];
  const useRubricScoring = normalizedType === "essay" && rubricRows.length > 0;
  const reviewStatus = item.reviewStatus || "pending";
  const isFinalized = reviewStatus === "finalized";

  const scoreControls =
    normalizedType === "short" ||
    normalizedType === "match" ||
    (normalizedType === "essay" && !useRubricScoring) ? (
      <Flex
        align={isMobile ? "stretch" : "center"}
        gap={8}
        wrap='wrap'
        style={{ flexDirection: isMobile ? "column" : "row" }}
      >
        <Text type='secondary'>Poin:</Text>
        <InputNumber
          min={0}
          max={maxAllow}
          value={item.points}
          onChange={(value) => onPointChange(item.id, value)}
          disabled={isFinalized}
          style={{ width: isMobile ? "100%" : 120 }}
        />
        <Tag color='gold' style={{ borderRadius: 999, margin: 0 }}>
          Maks {item.maxPoints}
        </Tag>
        {saveState === "saving" && <Tag color='gold'>Menyimpan...</Tag>}
        {saveState === "saved" && <Tag color='green'>Tersimpan</Tag>}
        {saveState === "error" && <Tag color='red'>Gagal menyimpan</Tag>}
      </Flex>
    ) : null;

  return (
    <Card
      size='small'
      variant='borderless'
      style={{
        borderRadius: 18,
        boxShadow: "0 14px 28px rgba(15, 23, 42, 0.05)",
        background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
      }}
    >
      <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
        <Space size={8} align='center' wrap>
          <Text type='secondary'>Soal #{item.no}</Text>
          <TypeTag type={normalizedType} />
        </Space>
        <Space size={6} wrap style={{ rowGap: 4 }}>
          <Tag color='gold' style={{ borderRadius: 999, margin: 0 }}>
            Poin: {item.maxPoints}
          </Tag>
          {(normalizedType === "match" ||
            normalizedType === "short" ||
            normalizedType === "essay") && (
            <Tag color='blue' style={{ borderRadius: 999, margin: 0 }}>
              Nilai saat ini: {Number(item.points || 0)}/{item.maxPoints}
            </Tag>
          )}
          {item.status === "pending_review" && (
            <Tag color='gold' style={{ borderRadius: 999, margin: 0 }}>
              Pending Review
            </Tag>
          )}
          {typeof item.correct === "boolean" ? (
            <Tag
              color={isCorrect ? "green" : "red"}
              style={{ borderRadius: 999, margin: 0 }}
            >
              {isCorrect ? "Benar" : "Salah"}
            </Tag>
          ) : null}
        </Space>
      </Flex>

      {renderHtmlBlock(item.question, {
        margin: "10px 0 14px",
        fontSize: 16,
        fontWeight: 600,
        color: "rgba(0, 0, 0, 0.88)",
      })}

      {normalizedType === "single" && (
        <Space vertical size={8} style={{ width: "100%" }}>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Siswa</Text>
            {renderStudentOptions()}
          </div>
          {renderAnswerSummary("Jawaban Benar", correctValues, "blue")}
        </Space>
      )}

      {normalizedType === "true_false" && (
        <Space vertical size={8} style={{ width: "100%" }}>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Siswa</Text>
            {renderStudentOptions()}
          </div>
          {renderAnswerSummary("Jawaban Benar", correctValues, "blue")}
        </Space>
      )}

      {normalizedType === "multi" && (
        <Space vertical size={8} style={{ width: "100%" }}>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Siswa</Text>
            {renderStudentOptions()}
          </div>
          {renderAnswerSummary("Jawaban Benar", correctValues, "blue")}
        </Space>
      )}

      {normalizedType === "short" && (
        <Space vertical size={10} style={{ width: "100%" }}>
          <div>
            <Text type='secondary'>Jawaban Siswa</Text>
            {renderStudentTextAnswer(item.answer || "-")}
          </div>
          {renderAnswerSummary("Jawaban Benar", correctValues, "blue")}
          {scoreControls}
        </Space>
      )}

      {normalizedType === "essay" && (
        <Space vertical size={10} style={{ width: "100%" }}>
          <Text>Jawaban Siswa:</Text>
          <Card size='small' style={{ background: "#fafafa" }}>
            {renderHtmlBlock(item.answer || "-")}
          </Card>
          {rubricRows.length > 0 ? (
            <Card
              size='small'
              style={{ background: "#f8fafc", borderRadius: 14 }}
            >
              <Space vertical size={10} style={{ width: "100%" }}>
                <Flex
                  justify='space-between'
                  align='center'
                  wrap='wrap'
                  gap={8}
                >
                  <Text strong>Rubric Penilaian</Text>
                  <Space size={6} wrap>
                    <Tag color='blue' style={{ borderRadius: 999, margin: 0 }}>
                      Total:{" "}
                      {rubricRows.reduce(
                        (sum, rubricItem) =>
                          sum + Number(rubricItem.score || 0),
                        0,
                      )}
                      /{item.maxPoints}
                    </Tag>
                    <Tag
                      color={
                        reviewStatus === "finalized"
                          ? "green"
                          : reviewStatus === "reviewed"
                            ? "gold"
                            : "default"
                      }
                      style={{ borderRadius: 999, margin: 0 }}
                    >
                      {reviewStatus === "finalized"
                        ? "Finalized"
                        : reviewStatus === "reviewed"
                          ? "Reviewed"
                          : "Pending"}
                    </Tag>
                  </Space>
                </Flex>
                {rubricRows.map((rubricItem) => (
                  <div key={rubricItem.id}>
                    <Flex
                      justify='space-between'
                      align={isMobile ? "stretch" : "center"}
                      gap={10}
                      wrap='wrap'
                      style={{ flexDirection: isMobile ? "column" : "row" }}
                    >
                      <Space
                        direction='vertical'
                        size={2}
                        style={{ minWidth: 0, flex: 1 }}
                      >
                        <Text strong>{rubricItem.criteriaName || "-"}</Text>
                        {rubricItem.criteriaDescription ? (
                          <Text type='secondary' style={{ fontSize: 12 }}>
                            {rubricItem.criteriaDescription}
                          </Text>
                        ) : null}
                      </Space>
                      <Space align='center' size={8}>
                        <InputNumber
                          min={0}
                          max={Number(rubricItem.maxScore || 0)}
                          value={rubricItem.score}
                          disabled={isFinalized}
                          onChange={(value) =>
                            item.onRubricPointChange?.(
                              item.id,
                              rubricItem.id,
                              value,
                            )
                          }
                          style={{ width: isMobile ? "100%" : 120 }}
                        />
                        <Tag
                          color='blue'
                          style={{ borderRadius: 999, margin: 0 }}
                        >
                          Maks {rubricItem.maxScore}
                        </Tag>
                      </Space>
                    </Flex>
                    <Input.TextArea
                      rows={2}
                      value={rubricItem.feedback || ""}
                      placeholder='Feedback per aspek rubric'
                      disabled={isFinalized}
                      onChange={(event) =>
                        item.onRubricFeedbackChange?.(
                          item.id,
                          rubricItem.id,
                          event.target.value,
                        )
                      }
                      onBlur={() =>
                        item.onRubricFeedbackBlur?.(item.id, rubricItem.id)
                      }
                      style={{ marginTop: 8 }}
                    />
                  </div>
                ))}
                {rubricSaveState === "saving" && (
                  <Tag color='gold'>Menyimpan rubric...</Tag>
                )}
                {rubricSaveState === "saved" && (
                  <Tag color='green'>Rubric tersimpan</Tag>
                )}
                {rubricSaveState === "error" && (
                  <Tag color='red'>Gagal simpan rubric</Tag>
                )}
                <Flex justify='flex-end'>
                  <Button
                    type='primary'
                    disabled={isFinalized}
                    loading={item.finalizeState === "saving"}
                    onClick={() => item.onFinalizeReview?.(item.id)}
                  >
                    {isFinalized ? "Sudah Final" : "Finalisasi Koreksi"}
                  </Button>
                </Flex>
              </Space>
            </Card>
          ) : null}
          {scoreControls}
        </Space>
      )}

      {normalizedType === "match" && (
        <Space vertical size={12} style={{ width: "100%" }}>
          <Space wrap size={6}>
            <Tag color='cyan' style={{ borderRadius: 999, margin: 0 }}>
              Auto: {item.matchAutoCorrectCount || 0}/{item.matchAutoTotalCount || 0} benar
            </Tag>
            <Tag color='blue' style={{ borderRadius: 999, margin: 0 }}>
              Saran poin: {item.matchAutoScore ?? 0}
            </Tag>
          </Space>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Siswa</Text>
            <Space vertical size={6} style={{ marginTop: 6, width: "100%" }}>
              {item.matches.map((pair, idx) => (
                <Flex
                  key={`${pair.left}-${pair.right}-${idx}`}
                  align='center'
                  gap={8}
                  wrap='wrap'
                >
                  <Tag style={{ maxWidth: "100%", whiteSpace: "normal" }}>
                    <span dangerouslySetInnerHTML={createMarkup(pair.left)} />
                  </Tag>
                  <Text type='secondary'>→</Text>
                  <Tag
                    color={pair.correct ? "green" : "red"}
                    style={{ maxWidth: "100%", whiteSpace: "normal" }}
                  >
                    <span dangerouslySetInnerHTML={createMarkup(pair.right)} />
                  </Tag>
                  {pair.correct ? (
                    <CheckCircle2 size={14} color='#16a34a' />
                  ) : (
                    <XCircle size={14} color='#ef4444' />
                  )}
                </Flex>
              ))}
            </Space>
          </div>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Pasangan Benar</Text>
            <Space vertical size={6} style={{ marginTop: 6, width: "100%" }}>
              {item.correctMatches?.length ? (
                item.correctMatches.map((pair, idx) => (
                  <Flex
                    key={`${pair.left}-${pair.right}-${idx}`}
                    align='center'
                    gap={8}
                    wrap='wrap'
                  >
                    <Tag style={{ maxWidth: "100%", whiteSpace: "normal" }}>
                      <span dangerouslySetInnerHTML={createMarkup(pair.left)} />
                    </Tag>
                    <Text type='secondary'>→</Text>
                    <Tag
                      color='blue'
                      style={{ maxWidth: "100%", whiteSpace: "normal" }}
                    >
                      <span
                        dangerouslySetInnerHTML={createMarkup(pair.right)}
                      />
                    </Tag>
                  </Flex>
                ))
              ) : (
                <Tag color='default'>-</Tag>
              )}
            </Space>
          </div>
          {scoreControls}
        </Space>
      )}
    </Card>
  );
};

const StudentAnswersPage = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const examId = searchParams.get("exam_id");
  const examName = searchParams.get("exam_name");
  const studentId = searchParams.get("student_id");
  const studentName = (searchParams.get("student_name") || "-").replaceAll(
    "-",
    " ",
  );
  const studentClass = (searchParams.get("student_class") || "-").replaceAll(
    "-",
    " ",
  );
  const studentNis = searchParams.get("student_nis") || "-";
  const manualOnly = searchParams.get("manual_only") === "1";
  const returnTab = searchParams.get("return_tab") || "manual-review";

  const { data: answerResponse = {} } = useGetExamStudentAnswersQuery(
    { exam_id: examId, student_id: studentId },
    { skip: !examId || !studentId },
  );
  const [saveScore] = useSaveExamStudentScoreMutation();
  const [saveRubricScore] = useSaveExamStudentRubricScoreMutation();
  const [finalizeReview] = useFinalizeExamStudentAnswerReviewMutation();
  const scoreTimersRef = useRef({});
  const rubricTimersRef = useRef({});
  const autoMatchScoredRef = useRef({});

  const [manualPoints, setManualPoints] = useState({});
  const [saveStates, setSaveStates] = useState({});
  const [rubricPoints, setRubricPoints] = useState({});
  const [rubricFeedbacks, setRubricFeedbacks] = useState({});
  const [rubricSaveStates, setRubricSaveStates] = useState({});
  const [finalizeStates, setFinalizeStates] = useState({});
  const [isFinalizingAll, setIsFinalizingAll] = useState(false);
  const fetchedAnswers = useMemo(
    () => answerResponse?.data || [],
    [answerResponse],
  );
  const paginationMeta = useMemo(
    () => answerResponse?.meta || {},
    [answerResponse],
  );

  const localAnswers = useMemo(
    () =>
      (fetchedAnswers || []).map((item) => {
        const rubricKeyPrefix = `${item.id}:`;
        const rubricDraft = Array.isArray(item.rubric)
          ? item.rubric.map((rubricItem) => {
              const localKey = `${rubricKeyPrefix}${rubricItem.id}`;
              const localScore = Object.prototype.hasOwnProperty.call(
                rubricPoints,
                localKey,
              )
                ? rubricPoints[localKey]
                : rubricItem.score;
              const localFeedback = Object.prototype.hasOwnProperty.call(
                rubricFeedbacks,
                localKey,
              )
                ? rubricFeedbacks[localKey]
                : rubricItem.feedback;

              return {
                ...rubricItem,
                score: Number(localScore || 0),
                feedback: String(localFeedback || ""),
              };
            })
          : [];

        const normalized = {
          ...item,
          type: normalizeAnswerType(item),
          rubric: rubricDraft,
          rubricSavingState: rubricSaveStates[item.id],
          finalizeState: finalizeStates[item.id],
        };
        if (normalized.type === "match") {
          const matches = Array.isArray(normalized.matches) ? normalized.matches : [];
          normalized.matchAutoCorrectCount = matches.filter((pair) => pair?.correct).length;
          normalized.matchAutoTotalCount = Array.isArray(normalized.correctMatches)
            ? normalized.correctMatches.length
            : matches.length;
          normalized.matchAutoScore = getMatchAutoScore(normalized);
        }
        if (Object.prototype.hasOwnProperty.call(manualPoints, item.id)) {
          return { ...normalized, points: manualPoints[item.id] };
        }
        return normalized;
      }),
    [
      fetchedAnswers,
      manualPoints,
      rubricPoints,
      rubricFeedbacks,
      rubricSaveStates,
      finalizeStates,
    ],
  );

  const visibleAnswers = useMemo(() => {
    if (!manualOnly) return localAnswers;

    return localAnswers.filter(
      (item) =>
        MANUAL_REVIEW_TYPES.has(item.type) &&
        (item.status === "pending_review" ||
          item.type === "essay" ||
          item.type === "match"),
    );
  }, [localAnswers, manualOnly]);

  const totalScore = useMemo(() => {
    const total = visibleAnswers.reduce((acc, item) => {
      if (
        item.type === "short" ||
        item.type === "essay" ||
        item.type === "match"
      ) {
        return acc + (Number(item.points) || 0);
      }
      if (
        item.type === "single" ||
        item.type === "multi" ||
        item.type === "true_false"
      ) {
        return acc + (item.correct ? item.maxPoints || 0 : 0);
      }
      return acc;
    }, 0);
    return Math.min(total, 100);
  }, [visibleAnswers]);

  const updatePoints = (id, value) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const currentMax =
      localAnswers.find((item) => item.id === id)?.maxPoints ?? safeValue;
    const cappedValue = Math.max(0, Math.min(safeValue, currentMax));

    setManualPoints((prev) => ({ ...prev, [id]: cappedValue }));

    if (!examId || !studentId) return;
    if (scoreTimersRef.current[id]) clearTimeout(scoreTimersRef.current[id]);
    scoreTimersRef.current[id] = setTimeout(() => {
      setSaveStates((prev) => ({ ...prev, [id]: "saving" }));
      saveScore({
        exam_id: examId,
        student_id: studentId,
        question_id: id,
        score: cappedValue,
      })
        .unwrap()
        .then(() => setSaveStates((prev) => ({ ...prev, [id]: "saved" })))
        .catch(() => setSaveStates((prev) => ({ ...prev, [id]: "error" })));
    }, 400);
  };

  const updateRubricPoint = (questionId, rubricId, value) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const question = localAnswers.find((item) => item.id === questionId);
    if (question?.reviewStatus === "finalized") return;
    const rubricItem = (question?.rubric || []).find(
      (item) => item.id === rubricId,
    );
    const cappedValue = Math.max(
      0,
      Math.min(safeValue, Number(rubricItem?.maxScore || safeValue)),
    );

    const localKey = `${questionId}:${rubricId}`;
    setRubricPoints((prev) => ({ ...prev, [localKey]: cappedValue }));

    if (!examId || !studentId) return;
    if (rubricTimersRef.current[localKey])
      clearTimeout(rubricTimersRef.current[localKey]);

    rubricTimersRef.current[localKey] = setTimeout(() => {
      setRubricSaveStates((prev) => ({ ...prev, [questionId]: "saving" }));
      saveRubricScore({
        exam_id: examId,
        student_id: studentId,
        question_id: questionId,
        rubric_id: rubricId,
        score: cappedValue,
        feedback: rubricFeedbacks[localKey] || "",
        source: "manual",
      })
        .unwrap()
        .then((response) => {
          setRubricSaveStates((prev) => ({ ...prev, [questionId]: "saved" }));
          const savedTotal = Number(response?.data?.total_score);
          if (Number.isFinite(savedTotal)) {
            setManualPoints((prev) => ({ ...prev, [questionId]: savedTotal }));
          }
        })
        .catch(() =>
          setRubricSaveStates((prev) => ({ ...prev, [questionId]: "error" })),
        );
    }, 450);
  };

  const updateRubricFeedback = (questionId, rubricId, value) => {
    const localKey = `${questionId}:${rubricId}`;
    setRubricFeedbacks((prev) => ({ ...prev, [localKey]: value }));
  };

  const saveRubricFeedbackOnBlur = (questionId, rubricId) => {
    const localKey = `${questionId}:${rubricId}`;
    const question = localAnswers.find((item) => item.id === questionId);
    if (!question) return;
    if (question.reviewStatus === "finalized") return;

    const rubricItem = (question.rubric || []).find(
      (item) => item.id === rubricId,
    );
    if (!rubricItem) return;
    const score = Number(rubricItem.score || 0);
    const feedback = rubricFeedbacks[localKey] || "";

    setRubricSaveStates((prev) => ({ ...prev, [questionId]: "saving" }));
    saveRubricScore({
      exam_id: examId,
      student_id: studentId,
      question_id: questionId,
      rubric_id: rubricId,
      score,
      feedback,
      source: "manual",
    })
      .unwrap()
      .then((response) => {
        setRubricSaveStates((prev) => ({ ...prev, [questionId]: "saved" }));
        const savedTotal = Number(response?.data?.total_score);
        if (Number.isFinite(savedTotal)) {
          setManualPoints((prev) => ({ ...prev, [questionId]: savedTotal }));
        }
      })
      .catch(() =>
        setRubricSaveStates((prev) => ({ ...prev, [questionId]: "error" })),
      );
  };

  const handleFinalizeReview = (questionId) => {
    if (!examId || !studentId) return;

    setFinalizeStates((prev) => ({ ...prev, [questionId]: "saving" }));
    finalizeReview({
      exam_id: examId,
      student_id: studentId,
      question_id: questionId,
    })
      .unwrap()
      .then((response) => {
        setFinalizeStates((prev) => ({ ...prev, [questionId]: "saved" }));
        const savedTotal = Number(response?.data?.total_score);
        if (Number.isFinite(savedTotal)) {
          setManualPoints((prev) => ({ ...prev, [questionId]: savedTotal }));
        }
        message.success("Koreksi berhasil difinalisasi");
      })
      .catch((error) => {
        setFinalizeStates((prev) => ({ ...prev, [questionId]: "error" }));
        message.error(error?.data?.message || "Gagal finalisasi koreksi");
      });
  };

  const getRemainingCap = (targetId, maxPoints) => {
    const totalWithout = visibleAnswers.reduce((acc, item) => {
      if (item.id === targetId) return acc;
      if (
        item.type === "short" ||
        item.type === "essay" ||
        item.type === "match"
      ) {
        return acc + (Number(item.points) || 0);
      }
      return acc;
    }, 0);
    return Math.min(maxPoints, Math.max(0, 100 - totalWithout));
  };

  const grouped = useMemo(() => {
    const map = {};
    visibleAnswers.forEach((item) => {
      if (!map[item.type]) map[item.type] = [];
      map[item.type].push(item);
    });
    return map;
  }, [visibleAnswers]);

  const sections = Object.entries(grouped).map(([type, items]) => ({
    type,
    items,
  }));
  const essayAnswers = useMemo(
    () => visibleAnswers.filter((item) => item.type === "essay"),
    [visibleAnswers],
  );
  const reviewSummary = useMemo(
    () =>
      essayAnswers.reduce(
        (acc, item) => {
          const status = item.reviewStatus || "pending";
          if (status === "finalized") acc.finalized += 1;
          else if (status === "reviewed") acc.reviewed += 1;
          else acc.pending += 1;
          return acc;
        },
        { pending: 0, reviewed: 0, finalized: 0 },
      ),
    [essayAnswers],
  );
  const finalizeableEssayIds = useMemo(
    () =>
      essayAnswers
        .filter(
          (item) =>
            (item.reviewStatus || "pending") !== "finalized" &&
            item.finalizeState !== "saving",
        )
        .map((item) => item.id),
    [essayAnswers],
  );
  const totalQuestions = visibleAnswers.length;
  const displayedScore = useMemo(() => {
    if (
      paginationMeta.totalScore === undefined ||
      paginationMeta.totalScore === null
    ) {
      return totalScore;
    }

    const pageScoreDelta = localAnswers.reduce((acc, item) => {
      if (
        item.type !== "short" &&
        item.type !== "essay" &&
        item.type !== "match"
      ) {
        return acc;
      }

      const originalItem = fetchedAnswers.find(
        (answer) => answer.id === item.id,
      );
      const originalPoints = Number(originalItem?.points) || 0;
      const currentPoints = Number(item.points) || 0;
      return acc + (currentPoints - originalPoints);
    }, 0);

    return Math.min(
      100,
      Math.max(0, Number(paginationMeta.totalScore) + pageScoreDelta),
    );
  }, [fetchedAnswers, localAnswers, paginationMeta.totalScore, totalScore]);

  useEffect(() => {
    const matchAnswers = localAnswers.filter((item) => item.type === "match");
    if (matchAnswers.length < 1 || !examId || !studentId) return;

    matchAnswers.forEach((item) => {
      if (autoMatchScoredRef.current[item.id]) return;
      if (Object.prototype.hasOwnProperty.call(manualPoints, item.id)) {
        autoMatchScoredRef.current[item.id] = true;
        return;
      }

      const suggestedScore = Number(item.matchAutoScore || 0);
      const currentScore = Number(item.points || 0);
      const hasAnswer = (item.matchAutoTotalCount || 0) > 0;
      if (!hasAnswer) return;

      autoMatchScoredRef.current[item.id] = true;
      if (Math.abs(currentScore - suggestedScore) < 0.01) return;

      setManualPoints((prev) => ({ ...prev, [item.id]: suggestedScore }));
      setSaveStates((prev) => ({ ...prev, [item.id]: "saving" }));
      saveScore({
        exam_id: examId,
        student_id: studentId,
        question_id: item.id,
        score: suggestedScore,
      })
        .unwrap()
        .then(() => setSaveStates((prev) => ({ ...prev, [item.id]: "saved" })))
        .catch(() => setSaveStates((prev) => ({ ...prev, [item.id]: "error" })));
    });
  }, [examId, studentId, localAnswers, manualPoints, saveScore]);

  useEffect(
    () => () => {
      Object.values(scoreTimersRef.current).forEach((timerId) =>
        clearTimeout(timerId),
      );
      Object.values(rubricTimersRef.current).forEach((timerId) =>
        clearTimeout(timerId),
      );
    },
    [],
  );

  const handleBack = () => {
    setSearchParams({
      view: "report",
      exam_id: examId,
      exam_name: examName,
      active_tab: returnTab,
    });
  };

  const handleExportPdf = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const html = `
      <html>
        <head>
          <title>Jawaban Siswa</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin: 0 0 4px; font-size: 14px; }
            .meta { color: #667085; margin-bottom: 10px; font-size: 12px; }
            .section { margin-bottom: 10px; }
            .question { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee; font-size: 12px;}
            .label { font-weight: 600; font-size: 12px;}
          </style>
        </head>
        <body>
          <h1>Jawaban Siswa | ${String(examName || "").replaceAll("-", " ")}</h1>
          <div class="meta">${studentName} • NIS ${studentNis} • ${studentClass}</div>
          <div class="meta">Total Skor: ${displayedScore} / 100</div>
          ${sections
            .map(
              (section) => `
            <div class="section">
              <div class="label">${TYPE_LABELS[section.type] || section.type}</div>
              ${section.items
                .map(
                  (item) => `
                <div class="question">
                  <div class="label">Soal #${item.no}</div>
                  <div>${item.question}</div>
                  ${item.answer ? `<div>Jawaban: ${item.answer}</div>` : ""}
                  ${
                    item.type === "short" ||
                    item.type === "essay" ||
                    item.type === "match"
                      ? `<div>Poin: ${item.points || 0}/${item.maxPoints}</div>`
                      : ""
                  }
                </div>
              `,
                )
                .join("")}
            </div>
          `,
            )
            .join("")}
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleFinalizeAllEssay = async () => {
    if (!examId || !studentId || finalizeableEssayIds.length < 1) return;

    setIsFinalizingAll(true);
    setFinalizeStates((prev) =>
      finalizeableEssayIds.reduce((acc, id) => ({ ...acc, [id]: "saving" }), {
        ...prev,
      }),
    );

    const results = await Promise.allSettled(
      finalizeableEssayIds.map((questionId) =>
        finalizeReview({
          exam_id: examId,
          student_id: studentId,
          question_id: questionId,
        }).unwrap(),
      ),
    );

    const successCount = results.filter(
      (result) => result.status === "fulfilled",
    ).length;
    const errorCount = results.length - successCount;

    const updates = {};
    results.forEach((result, index) => {
      const questionId = finalizeableEssayIds[index];
      updates[questionId] = result.status === "fulfilled" ? "saved" : "error";
      if (result.status === "fulfilled") {
        const savedTotal = Number(result.value?.data?.total_score);
        if (Number.isFinite(savedTotal)) {
          setManualPoints((prev) => ({ ...prev, [questionId]: savedTotal }));
        }
      }
    });
    setFinalizeStates((prev) => ({ ...prev, ...updates }));
    setIsFinalizingAll(false);

    if (successCount > 0) {
      message.success(`${successCount} soal uraian berhasil difinalisasi`);
    }
    if (errorCount > 0) {
      message.error(`${errorCount} soal uraian gagal difinalisasi`);
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >

      <StudentAnswersHero
        isMobile={isMobile}
        studentName={studentName}
        studentNis={studentNis}
        studentClass={studentClass}
        onBack={handleBack}
        onExportPdf={handleExportPdf}
      />


      <StudentAnswersMetrics
        manualOnly={manualOnly}
        totalQuestions={totalQuestions}
        sectionsLength={sections.length}
        displayedScore={displayedScore}
        reviewSummary={reviewSummary}
        essayCount={essayAnswers.length}
      />

      {sections.length === 0 ? (
        <Card
          variant='borderless'
          style={{
            borderRadius: 24,
            boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: isMobile ? 24 : 32 } }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              manualOnly
                ? "Tidak ada jawaban yang perlu koreksi manual."
                : "Belum ada jawaban."
            }
          />
        </Card>
      ) : (
        <Space vertical size={16} style={{ width: "100%" }}>
          {manualOnly && essayAnswers.length > 0 ? (
            <StudentAnswersManualAction
              isMobile={isMobile}
              reviewSummary={reviewSummary}
              finalizeableEssayIds={finalizeableEssayIds}
              isFinalizingAll={isFinalizingAll}
              onFinalizeAllEssay={handleFinalizeAllEssay}
            />
          ) : null}
          {sections.map((section, index) => (
            <MotionDiv
              key={section.type}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card
                variant='borderless'
                style={{
                  borderRadius: 24,
                  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
                }}
              >
                <Flex
                  align='center'
                  justify='space-between'
                  wrap='wrap'
                  gap={8}
                  style={{ marginBottom: 12 }}
                >
                  <Space align='center' size={8} wrap>
                    <TypeTag type={section.type} />
                    <Text type='secondary'>{section.items.length} soal</Text>
                  </Space>
                  <Tag color='default' style={{ borderRadius: 999, margin: 0 }}>
                    <FileText
                      size={12}
                      style={{ marginRight: 6, verticalAlign: "text-bottom" }}
                    />
                    Review manual tersedia
                  </Tag>
                </Flex>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {section.items.map((item) => (
                    <AnswerCard
                      key={item.id}
                      item={{
                        ...item,
                        onRubricPointChange: updateRubricPoint,
                        onRubricFeedbackChange: updateRubricFeedback,
                        onRubricFeedbackBlur: saveRubricFeedbackOnBlur,
                        onFinalizeReview: handleFinalizeReview,
                      }}
                      onPointChange={updatePoints}
                      maxAllow={getRemainingCap(item.id, item.maxPoints || 0)}
                      saveState={saveStates[item.id]}
                      isMobile={isMobile}
                    />
                  ))}
                </div>
                <Divider style={{ margin: "16px 0 0" }} />
              </Card>
            </MotionDiv>
          ))}
        </Space>
      )}
    </MotionDiv>
  );
};

export default StudentAnswersPage;
