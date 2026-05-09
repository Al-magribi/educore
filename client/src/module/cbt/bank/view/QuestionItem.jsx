import React from "react";
import { motion } from "framer-motion";
import { Card, Flex, Tag, Typography, theme, Divider } from "antd";
import { GitMerge, Type, CheckCircle2 } from "lucide-react";
import RichContentViewer from "../../components/RichContentViewer";

const { Text } = Typography;
const MotionDiv = motion.div;

const QuestionItem = ({ question }) => {
  const { token } = theme.useToken();
  const isMatching = question.q_type === 6;

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 20,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        boxShadow: "0 12px 24px rgba(15,23,42,.05)",
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div style={{ maxWidth: "100%", overflow: "hidden" }}>
        <div
          style={{
            fontSize: 16,
            lineHeight: "1.7",
            marginBottom: 24,
            color: token.colorText,
          }}
        >
          <RichContentViewer value={question.content} />
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
              <MotionDiv
                key={idx}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.18 }}
              >
                <Flex
                  align="center"
                  gap={16}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 14,
                    background: isCorrect ? "#f6ffed" : token.colorFillAlter,
                    border: `1px solid ${isCorrect ? "#b7eb8f" : token.colorBorderSecondary}`,
                    maxWidth: "100%",
                    overflow: "hidden",
                  }}
                >
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      background: isCorrect ? token.colorSuccess : "#fff",
                      border: isCorrect ? "none" : `1px solid ${token.colorBorder}`,
                      color: isCorrect ? "#fff" : token.colorTextSecondary,
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {question.q_type === 4 ? <Type size={14} /> : String.fromCharCode(65 + idx)}
                  </Flex>

                  <div style={{ flex: 1, fontSize: 14, overflow: "hidden" }}>
                    <RichContentViewer value={opt.content} />
                  </div>

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
                        <RichContentViewer value={opt.label} />
                      </div>
                    </>
                  )}

                  {isCorrect && (
                    <Tag
                      color="success"
                      icon={<CheckCircle2 size={12} style={{ marginRight: 4 }} />}
                      style={{ borderRadius: 999, border: "none", flexShrink: 0 }}
                    >
                      Kunci
                    </Tag>
                  )}
                </Flex>
              </MotionDiv>
            );
          })}
        </Flex>
      </div>
    </Card>
  );
};

export default QuestionItem;
