import React, { useMemo } from "react";
import { Card, Flex, Grid, Typography } from "antd";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const QUESTION_TYPE_META = {
  1: { short: "PG", label: "PG Tunggal", color: "#2563eb" },
  2: { short: "PM", label: "PG Multi", color: "#0891b2" },
  3: { short: "EU", label: "Essay Uraian", color: "#9333ea" },
  4: { short: "ES", label: "Essay Singkat", color: "#4f46e5" },
  5: { short: "BS", label: "Benar / Salah", color: "#ea580c" },
  6: { short: "MC", label: "Mencocokkan", color: "#db2777" },
};

const getQuestionTypeMeta = (type) =>
  QUESTION_TYPE_META[type] || {
    short: "?",
    label: "Unknown",
    color: "#64748b",
  };

const QuestionNavigator = ({ questions, activeIndex, onSelect }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.sm;

  const gridMinSize = isCompact ? 44 : 40;

  const typeLegend = useMemo(() => {
    const presentTypes = [
      ...new Set(questions.map((q) => Number(q.q_type))),
    ].sort((a, b) => a - b);

    return presentTypes.map((type) => ({
      type,
      ...getQuestionTypeMeta(type),
    }));
  }, [questions]);

  return (
    <Card
      variant="borderless"
      style={{
        width: "100%",
        maxWidth: isMobile ? "100%" : 280,
        flexShrink: 0,
        borderRadius: isMobile ? 16 : 18,
        border: "1px solid rgba(226, 232, 240, 0.92)",
        background: "linear-gradient(180deg, #ffffff, #f8fafc)",
      }}
      styles={{ body: { padding: isMobile ? 14 : 16 } }}
    >
      <Text
        strong
        style={{
          display: "block",
          marginBottom: isMobile ? 12 : 14,
          fontSize: isMobile ? 13 : 14,
        }}
      >
        Navigasi Soal
      </Text>

      {typeLegend.length > 0 && (
        <div style={{ marginBottom: isMobile ? 12 : 16 }}>
          <Text
            type="secondary"
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.6,
              marginBottom: 8,
            }}
          >
            LEGENDA JENIS SOAL
          </Text>
          <Flex gap={isCompact ? 8 : 10} wrap="wrap">
            {typeLegend.map(({ type, short, label, color }) => (
              <Flex key={type} align="center" gap={6} style={{ minWidth: 0 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <Text
                  type="secondary"
                  style={{ fontSize: isCompact ? 11 : 12 }}
                  ellipsis={isCompact}
                >
                  {isCompact ? short : `${short} · ${label}`}
                </Text>
              </Flex>
            ))}
          </Flex>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinSize}px, 1fr))`,
          gap: isCompact ? 5 : 6,
        }}
      >
        {questions.map((question, index) => {
          const isActive = index === activeIndex;
          const typeMeta = getQuestionTypeMeta(Number(question.q_type));

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`Soal ${index + 1}, ${typeMeta.label}`}
              aria-current={isActive ? "true" : undefined}
              style={{
                minHeight: gridMinSize,
                minWidth: 0,
                aspectRatio: "1",
                border: isActive
                  ? "2px solid #fff"
                  : "1px solid rgba(255,255,255,0.15)",
                outline: isActive ? "2px solid #0f172a" : "none",
                borderRadius: 8,
                background: typeMeta.color,
                color: "#fff",
                cursor: "pointer",
                padding: isCompact ? 2 : 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                fontSize: isCompact ? 10 : 11,
                fontWeight: 700,
                lineHeight: 1.1,
                boxShadow: isActive ? "0 0 0 2px #0f172a" : "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span>{index + 1}</span>
              <span
                style={{
                  fontSize: isCompact ? 7 : 8,
                  fontWeight: 600,
                  opacity: 0.9,
                }}
              >
                {typeMeta.short}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default QuestionNavigator;
