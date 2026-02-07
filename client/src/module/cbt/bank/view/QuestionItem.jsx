import React from "react";
import { Flex, Tag, Typography, theme, Divider } from "antd";
import { GitMerge, Type, CheckCircle2 } from "lucide-react";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

const { Text } = Typography;

/**
 * MathRenderer yang diperbarui untuk menangani luapan konten (overflow)
 * dan kompatibilitas dengan format Quill Editor.
 */
const MathRenderer = ({ value }) => {
  if (!value) return null;

  // Render logic untuk rumus Matematika
  const renderContent = () => {
    if (typeof value === "string" && value.includes("$")) {
      const segments = value.split(/(\$.*?\$)/g);
      return (
        <>
          {segments.map((segment, i) => {
            if (segment.startsWith("$") && segment.endsWith("$")) {
              const formula = segment.replaceAll("$", "");
              return <InlineMath key={i} math={formula} />;
            }
            return (
              <span key={i} dangerouslySetInnerHTML={{ __html: segment }} />
            );
          })}
        </>
      );
    }
    return <div dangerouslySetInnerHTML={{ __html: value }} />;
  };

  return (
    <div className="ql-editor-viewer">
      {/* CSS internal untuk memastikan konten tidak keluar container */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .ql-editor-viewer {
          word-break: break-word;
          overflow-wrap: break-word;
          width: 100%;
        }
        .ql-editor-viewer img {
          max-width: 100%;
          height: auto !important;
          object-fit: contain;
          display: block;
          margin: 10px 0;
        }
        .ql-editor-viewer p {
          margin-bottom: 8px;
          line-height: 1.6;
        }
        .ql-editor-viewer iframe {
          max-width: 100%;
        }
        /* Style untuk list agar tidak keluar margin */
        .ql-editor-viewer ul, .ql-editor-viewer ol {
          padding-left: 25px;
        }
      `,
        }}
      />
      {renderContent()}
    </div>
  );
};

const QuestionItem = ({ question }) => {
  const { token } = theme.useToken();
  const isMatching = question.q_type === 6;

  return (
    <div style={{ padding: "8px 0", maxWidth: "100%", overflow: "hidden" }}>
      {/* Konten Utama Soal */}
      <div
        style={{
          fontSize: 16,
          lineHeight: "1.7",
          marginBottom: 24,
          color: token.colorText,
        }}
      >
        <MathRenderer value={question.content} />
      </div>

      <Divider orientation="left" plain>
        <Text
          type="secondary"
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}
        >
          {isMatching ? "PASANGAN PERNYATAAN" : "OPSI JAWABAN"}
        </Text>
      </Divider>

      <Flex vertical gap={12} style={{ width: "100%" }}>
        {question.options?.map((opt, idx) => {
          const isCorrect = opt.is_correct && !isMatching;
          return (
            <Flex
              key={idx}
              align="center"
              gap={16}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: isCorrect ? "#f6ffed" : token.colorFillAlter,
                border: `1px solid ${isCorrect ? "#b7eb8f" : "transparent"}`,
                transition: "all 0.2s",
                maxWidth: "100%",
                overflow: "hidden",
              }}
            >
              {/* Indikator Huruf */}
              <Flex
                align="center"
                justify="center"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: isCorrect ? token.colorSuccess : "#fff",
                  border: isCorrect ? "none" : `1px solid ${token.colorBorder}`,
                  color: isCorrect ? "#fff" : token.colorTextSecondary,
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {question.q_type === 4 ? (
                  <Type size={14} />
                ) : (
                  String.fromCharCode(65 + idx)
                )}
              </Flex>

              {/* Konten Opsi */}
              <div style={{ flex: 1, fontSize: 14, overflow: "hidden" }}>
                <MathRenderer value={opt.content} />
              </div>

              {/* Tampilan Mencocokkan */}
              {isMatching && (
                <>
                  <GitMerge
                    size={16}
                    style={{ color: token.colorPrimary, flexShrink: 0 }}
                  />
                  <div
                    style={{
                      flex: 1,
                      fontWeight: 600,
                      color: token.colorPrimary,
                      overflow: "hidden",
                    }}
                  >
                    <MathRenderer value={opt.label} />
                  </div>
                </>
              )}

              {isCorrect && (
                <Tag
                  color="success"
                  icon={<CheckCircle2 size={12} style={{ marginRight: 4 }} />}
                  style={{ borderRadius: 4, border: "none", flexShrink: 0 }}
                >
                  Kunci
                </Tag>
              )}
            </Flex>
          );
        })}
      </Flex>
    </div>
  );
};

export default QuestionItem;
