import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Divider,
  Flex,
  InputNumber,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  useGetExamStudentAnswersQuery,
  useSaveExamStudentScoreMutation,
} from "../../../../../service/cbt/ApiExam";

const { Text, Title } = Typography;

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
  <Tag color='blue'>{TYPE_LABELS[type] || type}</Tag>
);

const AnswerCard = ({ item, onPointChange, maxAllow, saveState }) => {
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
        style={{ maxWidth: "100%", whiteSpace: "normal" }}
      >
        <span dangerouslySetInnerHTML={createMarkup(rawValue)} />
      </Tag>
    );
  };

  return (
    <Card size='small' style={{ borderRadius: 12 }}>
      <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
        <Space size={8} align='center' wrap>
          <Text type='secondary'>Soal #{item.no}</Text>
        </Space>
        <Space size={6} wrap style={{ rowGap: 4 }}>
          <Tag color='gold'>Poin: {item.maxPoints}</Tag>
          {typeof item.correct === "boolean" ? (
            <Tag color={isCorrect ? "green" : "red"}>
              {isCorrect ? "Benar" : "Salah"}
            </Tag>
          ) : null}
        </Space>
      </Flex>

      {renderHtmlBlock(item.question, {
        margin: "8px 0",
        fontSize: 16,
        fontWeight: 600,
        color: "rgba(0, 0, 0, 0.88)",
      })}

      {normalizedType === "single" && (
        <Space orientation='vertical' size={8} style={{ width: "100%" }}>
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
              {correctValues.length ? (
                correctValues.map((opt) => renderOptionTag(opt, "blue"))
              ) : (
                <Tag color='default'>-</Tag>
              )}
            </Space>
          </div>
        </Space>
      )}

      {normalizedType === "true_false" && (
        <Space orientation='vertical' size={8} style={{ width: "100%" }}>
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
              {correctValues.length ? (
                correctValues.map((opt) => renderOptionTag(opt, "blue"))
              ) : (
                <Tag color='default'>-</Tag>
              )}
            </Space>
          </div>
        </Space>
      )}

      {normalizedType === "multi" && (
        <Space orientation='vertical' size={8} style={{ width: "100%" }}>
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
              {correctValues.length ? (
                correctValues.map((opt) => renderOptionTag(opt, "blue"))
              ) : (
                <Tag color='default'>-</Tag>
              )}
            </Space>
          </div>
        </Space>
      )}

      {normalizedType === "short" && (
        <Space orientation='vertical' size={8} style={{ width: "100%" }}>
          <div>
            <Text>Jawaban Siswa:</Text>
            {renderHtmlBlock(item.answer || "-")}
          </div>
          <Flex align='center' gap={8} wrap='wrap'>
            <Text type='secondary'>Poin:</Text>
            <InputNumber
              min={0}
              max={maxAllow}
              value={item.points}
              onChange={(value) => onPointChange(item.id, value)}
              style={{ width: 120 }}
            />
            <Tag color='gold'>Maks {item.maxPoints}</Tag>
            {saveState === "saving" && <Tag color='gold'>Menyimpan...</Tag>}
            {saveState === "saved" && <Tag color='green'>Tersimpan</Tag>}
            {saveState === "error" && <Tag color='red'>Gagal menyimpan</Tag>}
          </Flex>
        </Space>
      )}

      {normalizedType === "essay" && (
        <Space orientation='vertical' size={8} style={{ width: "100%" }}>
          <Text>Jawaban Siswa:</Text>
          <Card size='small' style={{ background: "#fafafa" }}>
            {renderHtmlBlock(item.answer || "-")}
          </Card>
          <Flex align='center' gap={8} wrap='wrap'>
            <Text type='secondary'>Poin:</Text>
            <InputNumber
              min={0}
              max={maxAllow}
              value={item.points}
              onChange={(value) => onPointChange(item.id, value)}
              style={{ width: 120 }}
            />
            <Tag color='gold'>Maks {item.maxPoints}</Tag>
            {saveState === "saving" && <Tag color='gold'>Menyimpan...</Tag>}
            {saveState === "saved" && <Tag color='green'>Tersimpan</Tag>}
            {saveState === "error" && <Tag color='red'>Gagal menyimpan</Tag>}
          </Flex>
        </Space>
      )}

      {normalizedType === "match" && (
        <Space orientation='vertical' size={12} style={{ width: "100%" }}>
          <div style={{ width: "100%" }}>
            <Text type='secondary'>Jawaban Siswa</Text>
            <Space
              orientation='vertical'
              size={6}
              style={{ marginTop: 6, width: "100%" }}
            >
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
            <Space
              orientation='vertical'
              size={6}
              style={{ marginTop: 6, width: "100%" }}
            >
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
          <Flex align='center' gap={8} wrap='wrap'>
            <Text type='secondary'>Poin:</Text>
            <InputNumber
              min={0}
              max={maxAllow}
              value={item.points}
              onChange={(value) => onPointChange(item.id, value)}
              style={{ width: 120 }}
            />
            <Tag color='gold'>Maks {item.maxPoints}</Tag>
            {saveState === "saving" && <Tag color='gold'>Menyimpan...</Tag>}
            {saveState === "saved" && <Tag color='green'>Tersimpan</Tag>}
            {saveState === "error" && <Tag color='red'>Gagal menyimpan</Tag>}
          </Flex>
        </Space>
      )}
    </Card>
  );
};

const StudentAnswers = () => {
  const [isMobile, setIsMobile] = useState(false);
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

  const { data: fetchedAnswers = [] } = useGetExamStudentAnswersQuery(
    { exam_id: examId, student_id: studentId },
    { skip: !examId || !studentId },
  );
  const [saveScore] = useSaveExamStudentScoreMutation();
  const scoreTimersRef = useRef({});

  const [localAnswers, setLocalAnswers] = useState([]);
  const [saveStates, setSaveStates] = useState({});

  useEffect(() => {
    setLocalAnswers(
      (fetchedAnswers || []).map((item) => ({
        ...item,
        type: normalizeAnswerType(item),
      })),
    );
    setSaveStates({});
  }, [fetchedAnswers]);

  const totalScore = useMemo(() => {
    const total = localAnswers.reduce((acc, item) => {
      if (item.type === "short" || item.type === "essay") {
        return acc + (Number(item.points) || 0);
      }
      if (
        item.type === "single" ||
        item.type === "multi" ||
        item.type === "true_false"
      ) {
        return acc + (item.correct ? item.maxPoints || 0 : 0);
      }
      if (item.type === "match") {
        return acc + (Number(item.points) || 0);
      }
      return acc;
    }, 0);
    return Math.min(total, 100);
  }, [localAnswers]);

  const updatePoints = (id, value) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const currentMax =
      localAnswers.find((item) => item.id === id)?.maxPoints ?? safeValue;
    const cappedValue = Math.max(0, Math.min(safeValue, currentMax));

    setLocalAnswers((prev) => {
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, points: cappedValue };
      });
      return next;
    });

    if (!examId || !studentId) return;
    if (scoreTimersRef.current[id]) {
      clearTimeout(scoreTimersRef.current[id]);
    }
    scoreTimersRef.current[id] = setTimeout(() => {
      setSaveStates((prev) => ({ ...prev, [id]: "saving" }));
      saveScore({
        exam_id: examId,
        student_id: studentId,
        question_id: id,
        score: cappedValue,
      })
        .unwrap()
        .then(() => {
          setSaveStates((prev) => ({ ...prev, [id]: "saved" }));
        })
        .catch(() => {
          setSaveStates((prev) => ({ ...prev, [id]: "error" }));
        });
    }, 400);
  };

  const getRemainingCap = (targetId, maxPoints) => {
    const totalWithout = localAnswers.reduce((acc, item) => {
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
    localAnswers.forEach((item) => {
      if (!map[item.type]) map[item.type] = [];
      map[item.type].push(item);
    });
    return map;
  }, [localAnswers]);

  const sections = Object.entries(grouped).map(([type, items]) => ({
    type,
    items,
  }));

  useEffect(
    () => () => {
      Object.values(scoreTimersRef.current).forEach((timerId) =>
        clearTimeout(timerId),
      );
    },
    [],
  );

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth <= 480);
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

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
          <h1>Jawaban Siswa | ${examName.replaceAll("-", " ")}</h1>
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Card size='small'>
        <Space vertical size={16} style={{ width: "100%" }}>
          <Flex
            align={isMobile ? "stretch" : "center"}
            justify='space-between'
            wrap='wrap'
            gap={12}
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space
              size={10}
              align='center'
              wrap
              style={{ width: isMobile ? "100%" : "auto" }}
            >
              <Button icon={<ArrowLeft size={16} />} onClick={handleBack}>
                Kembali
              </Button>
              <Space size={8} align='center'>
                <ClipboardList size={18} />
                <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                  Jawaban Siswa
                </Title>
              </Space>
            </Space>
            <Button
              icon={<Download size={14} />}
              onClick={handleExportPdf}
              block={isMobile}
            >
              Export PDF
            </Button>
          </Flex>

          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            wrap='wrap'
            gap={8}
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <div style={{ width: isMobile ? "100%" : "auto" }}>
              <Text strong>{studentName}</Text>
              <div style={{ color: "#667085", fontSize: 12 }}>
                NIS {studentNis} • {studentClass}
              </div>
            </div>
            <Space
              size={8}
              align='center'
              wrap
              style={{
                width: isMobile ? "100%" : "auto",
                justifyContent: isMobile ? "space-between" : "flex-start",
              }}
            >
              <Tag color='blue'>Total Soal: {localAnswers.length}</Tag>
              <Tag color={totalScore >= 75 ? "green" : "gold"}>
                Total Skor: {totalScore}/100
              </Tag>
            </Space>
          </Flex>
        </Space>
      </Card>

      {sections.length === 0 ? (
        <Card size='small' style={{ borderRadius: 12 }}>
          <Text type='secondary'>Belum ada jawaban.</Text>
        </Card>
      ) : (
        <Space orientation='vertical' size={16} style={{ width: "100%" }}>
          {sections.map((section) => (
            <Card key={section.type} style={{ borderRadius: 12 }}>
              <Flex align='center' gap={8} style={{ marginBottom: 8 }}>
                <TypeTag type={section.type} />
                <Text type='secondary'>{section.items.length} soal</Text>
              </Flex>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {section.items.map((item) => (
                  <AnswerCard
                    key={item.id}
                    item={item}
                    onPointChange={updatePoints}
                    maxAllow={getRemainingCap(item.id, item.maxPoints || 0)}
                    saveState={saveStates[item.id]}
                  />
                ))}
              </div>
              <Divider style={{ margin: "16px 0 0" }} />
            </Card>
          ))}
        </Space>
      )}
    </div>
  );
};

export default StudentAnswers;
