import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Divider,
  Empty,
  Flex,
  Grid,
  InputNumber,
  Space,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  useGetExamStudentAnswersQuery,
  useSaveExamStudentScoreMutation,
} from "../../../../../service/cbt/ApiExam";

const { Text, Title, Paragraph } = Typography;
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
          : option?.content ?? option?.label ?? option?.value,
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

const AnswerCard = ({ item, onPointChange, maxAllow, saveState, isMobile }) => {
  const isCorrect = item.correct === true;
  const normalizedType = normalizeAnswerType(item);
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
        : option?.content ?? option?.label ?? option?.value ?? option?.id;
    const key = String(
      typeof option === "object" && option !== null
        ? option.id ?? rawValue
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

  const scoreControls =
    normalizedType === "short" ||
    normalizedType === "essay" ||
    normalizedType === "match" ? (
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
      bordered={false}
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
        <Space direction='vertical' size={8} style={{ width: "100%" }}>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Siswa</Text>
            <Space wrap size={6} style={{ marginTop: 6, width: "100%" }}>
              {optionValues.map((opt) =>
                renderOptionTag(
                  opt,
                  selectedValues.includes(
                    String(
                      typeof opt === "object" && opt !== null
                        ? opt.id ?? opt.content ?? opt.label ?? opt.value
                        : opt,
                    ),
                  )
                    ? "green"
                    : "default",
                  selectedValues.includes(
                    String(
                      typeof opt === "object" && opt !== null
                        ? opt.id ?? opt.content ?? opt.label ?? opt.value
                        : opt,
                    ),
                  )
                    ? <CheckCircle2 size={12} />
                    : null,
                ),
              )}
            </Space>
          </div>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Benar</Text>
            <Space wrap size={6} style={{ marginTop: 6, width: "100%" }}>
              {correctValues.length
                ? correctValues.map((opt) => renderOptionTag(opt, "blue"))
                : <Tag color='default'>-</Tag>}
            </Space>
          </div>
        </Space>
      )}

      {normalizedType === "true_false" && (
        <Space direction='vertical' size={8} style={{ width: "100%" }}>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Siswa</Text>
            <Space wrap size={6} style={{ marginTop: 6, width: "100%" }}>
              {optionValues.map((opt) => {
                const optionValue = String(
                  typeof opt === "object" && opt !== null
                    ? opt.id ?? opt.content ?? opt.label ?? opt.value
                    : opt,
                );
                const isSelected =
                  selectedValues.includes(optionValue) ||
                  selectedValues.includes(normalizeTagValue(optionValue));

                return renderOptionTag(
                  opt,
                  isSelected ? "green" : "default",
                  isSelected ? <CheckCircle2 size={12} /> : null,
                );
              })}
            </Space>
          </div>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Benar</Text>
            <Space wrap size={6} style={{ marginTop: 6, width: "100%" }}>
              {correctValues.length
                ? correctValues.map((opt) => renderOptionTag(opt, "blue"))
                : <Tag color='default'>-</Tag>}
            </Space>
          </div>
        </Space>
      )}

      {normalizedType === "multi" && (
        <Space direction='vertical' size={8} style={{ width: "100%" }}>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Siswa</Text>
            <Space wrap size={6} style={{ marginTop: 6, width: "100%" }}>
              {optionValues.map((opt) => {
                const optionValue = String(
                  typeof opt === "object" && opt !== null
                    ? opt.id ?? opt.content ?? opt.label ?? opt.value
                    : opt,
                );
                const selected =
                  selectedValues.includes(optionValue) ||
                  selectedValues.includes(normalizeTagValue(optionValue));

                return renderOptionTag(
                  opt,
                  selected ? "green" : "default",
                  selected ? <CheckCircle2 size={12} /> : null,
                );
              })}
            </Space>
          </div>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Benar</Text>
            <Space wrap size={6} style={{ marginTop: 6, width: "100%" }}>
              {correctValues.length
                ? correctValues.map((opt) => renderOptionTag(opt, "blue"))
                : <Tag color='default'>-</Tag>}
            </Space>
          </div>
        </Space>
      )}

      {normalizedType === "short" && (
        <Space direction='vertical' size={10} style={{ width: "100%" }}>
          <div>
            <Text>Jawaban Siswa:</Text>
            {renderHtmlBlock(item.answer || "-")}
          </div>
          {scoreControls}
        </Space>
      )}

      {normalizedType === "essay" && (
        <Space direction='vertical' size={10} style={{ width: "100%" }}>
          <Text>Jawaban Siswa:</Text>
          <Card size='small' style={{ background: "#fafafa" }}>
            {renderHtmlBlock(item.answer || "-")}
          </Card>
          {scoreControls}
        </Space>
      )}

      {normalizedType === "match" && (
        <Space direction='vertical' size={12} style={{ width: "100%" }}>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Siswa</Text>
            <Space direction='vertical' size={6} style={{ marginTop: 6, width: "100%" }}>
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
            <Space direction='vertical' size={6} style={{ marginTop: 6, width: "100%" }}>
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
                    <Tag color='blue' style={{ maxWidth: "100%", whiteSpace: "normal" }}>
                      <span dangerouslySetInnerHTML={createMarkup(pair.right)} />
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

const StudentAnswers = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const examId = searchParams.get("exam_id");
  const examName = searchParams.get("exam_name");
  const studentId = searchParams.get("student_id");
  const studentName = (searchParams.get("student_name") || "-").replaceAll("-", " ");
  const studentClass = (searchParams.get("student_class") || "-").replaceAll("-", " ");
  const studentNis = searchParams.get("student_nis") || "-";

  const { data: fetchedAnswers = [] } = useGetExamStudentAnswersQuery(
    { exam_id: examId, student_id: studentId },
    { skip: !examId || !studentId },
  );
  const [saveScore] = useSaveExamStudentScoreMutation();
  const scoreTimersRef = useRef({});

  const [manualPoints, setManualPoints] = useState({});
  const [saveStates, setSaveStates] = useState({});

  const localAnswers = useMemo(
    () =>
      (fetchedAnswers || []).map((item) => {
        const normalized = {
          ...item,
          type: normalizeAnswerType(item),
        };
        if (Object.prototype.hasOwnProperty.call(manualPoints, item.id)) {
          return { ...normalized, points: manualPoints[item.id] };
        }
        return normalized;
      }),
    [fetchedAnswers, manualPoints],
  );

  const totalScore = useMemo(() => {
    const total = localAnswers.reduce((acc, item) => {
      if (item.type === "short" || item.type === "essay" || item.type === "match") {
        return acc + (Number(item.points) || 0);
      }
      if (item.type === "single" || item.type === "multi" || item.type === "true_false") {
        return acc + (item.correct ? item.maxPoints || 0 : 0);
      }
      return acc;
    }, 0);
    return Math.min(total, 100);
  }, [localAnswers]);

  const updatePoints = (id, value) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const currentMax = localAnswers.find((item) => item.id === id)?.maxPoints ?? safeValue;
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

  const getRemainingCap = (targetId, maxPoints) => {
    const totalWithout = localAnswers.reduce((acc, item) => {
      if (item.id === targetId) return acc;
      if (item.type === "short" || item.type === "essay" || item.type === "match") {
        return acc + (Number(item.points) || 0);
      }
      return acc;
    }, 0);
    return Math.min(maxPoints, Math.max(0, 100 - totalWithout));
  };

  const grouped = useMemo(() => {
    const map = {};
    localAnswers.forEach((item) => {
      if (!map[item.type]) map[item.type] = [];
      map[item.type].push(item);
    });
    return map;
  }, [localAnswers]);

  const sections = Object.entries(grouped).map(([type, items]) => ({ type, items }));

  useEffect(
    () => () => {
      Object.values(scoreTimersRef.current).forEach((timerId) => clearTimeout(timerId));
    },
    [],
  );

  const handleBack = () => {
    setSearchParams({
      view: "report",
      exam_id: examId,
      exam_name: examName,
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
          <div class="meta">Total Skor: ${totalScore} / 100</div>
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
                    item.type === "short" || item.type === "essay" || item.type === "match"
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

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 28,
          overflow: "hidden",
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 26%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f766e 100%)",
          boxShadow: "0 24px 52px rgba(15, 23, 42, 0.18)",
        }}
        styles={{ body: { padding: isMobile ? 20 : 28 } }}
      >
        <Flex
          align={isMobile ? "stretch" : "flex-start"}
          justify='space-between'
          gap={18}
          wrap='wrap'
          style={{ flexDirection: isMobile ? "column" : "row" }}
        >
          <Space direction='vertical' size={12} style={{ maxWidth: 760 }}>
            <Space wrap size={10}>
              <Button
                icon={<ArrowLeft size={16} />}
                onClick={handleBack}
                style={{
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.12)",
                  borderColor: "rgba(255,255,255,0.16)",
                  color: "#fff",
                }}
              >
                Kembali
              </Button>
              <Tag
                style={{
                  margin: 0,
                  borderRadius: 999,
                  paddingInline: 12,
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.16)",
                }}
                icon={<Sparkles size={12} />}
              >
                Review Jawaban Siswa
              </Tag>
            </Space>

            <Space align='center' size={8}>
              <ClipboardList size={20} color='#fff' />
              <Title level={isMobile ? 4 : 2} style={{ margin: 0, color: "#fff" }}>
                Jawaban Siswa
              </Title>
            </Space>

            <Paragraph style={{ marginBottom: 0, color: "rgba(255,255,255,0.82)" }}>
              Tinjau jawaban peserta, lakukan penilaian manual untuk soal uraian,
              dan ekspor ringkasan jawaban ke PDF bila diperlukan.
            </Paragraph>
          </Space>

          <Card
            bordered={false}
            style={{
              width: 340,
              maxWidth: "100%",
              borderRadius: 24,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(10px)",
            }}
            styles={{ body: { padding: 22 } }}
          >
            <Space direction='vertical' size={10} style={{ width: "100%" }}>
              <Text style={{ color: "rgba(255,255,255,0.72)" }}>Peserta aktif</Text>
              <Title level={4} style={{ margin: 0, color: "#fff" }}>
                {studentName}
              </Title>
              <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                NIS {studentNis} • {studentClass}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                Total Skor: {totalScore}/100
              </Text>
              <Button icon={<Download size={14} />} onClick={handleExportPdf} block={isMobile}>
                Export PDF
              </Button>
            </Space>
          </Card>
        </Flex>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        {[
          {
            key: "questions",
            label: "Total Soal",
            value: localAnswers.length,
            color: "#1d4ed8",
          },
          {
            key: "sections",
            label: "Kelompok Soal",
            value: sections.length,
            color: "#15803d",
          },
          {
            key: "score",
            label: "Total Skor",
            value: `${totalScore}/100`,
            color: totalScore >= 75 ? "#16a34a" : "#d97706",
          },
        ].map((item) => (
          <Card
            key={item.key}
            bordered={false}
            style={{
              borderRadius: 22,
              boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
            }}
            styles={{ body: { padding: 18 } }}
          >
            <Text type='secondary'>{item.label}</Text>
            <Title level={isMobile ? 4 : 3} style={{ margin: "4px 0 0", color: item.color }}>
              {item.value}
            </Title>
          </Card>
        ))}
      </div>

      {sections.length === 0 ? (
        <Card
          bordered={false}
          style={{ borderRadius: 24, boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)" }}
          styles={{ body: { padding: isMobile ? 24 : 32 } }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description='Belum ada jawaban.'
          />
        </Card>
      ) : (
        <Space direction='vertical' size={16} style={{ width: "100%" }}>
          {sections.map((section, index) => (
            <MotionDiv
              key={section.type}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card
                bordered={false}
                style={{
                  borderRadius: 24,
                  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
                }}
              >
                <Flex align='center' justify='space-between' wrap='wrap' gap={8} style={{ marginBottom: 12 }}>
                  <Space align='center' size={8} wrap>
                    <TypeTag type={section.type} />
                    <Text type='secondary'>{section.items.length} soal</Text>
                  </Space>
                  <Tag color='default' style={{ borderRadius: 999, margin: 0 }}>
                    <FileText size={12} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
                    Review manual tersedia
                  </Tag>
                </Flex>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {section.items.map((item) => (
                    <AnswerCard
                      key={item.id}
                      item={item}
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

export default StudentAnswers;
