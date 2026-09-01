import React from 'react';
import { motion } from 'framer-motion';
import { Flex, Tag, Typography, theme, Divider, Grid } from 'antd';
import { GitMerge, Type, CheckCircle2 } from 'lucide-react';
import RichContentViewer from '../../components/RichContentViewer';

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const QuestionItem = ({ question }) => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isMatching = question.q_type === 6;

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <div
        style={{
          fontSize: isMobile ? 15 : 16,
          lineHeight: '1.7',
          marginBottom: isMobile ? 18 : 24,
          color: token.colorText,
          wordBreak: 'break-word',
        }}>
        <RichContentViewer value={question.content} />
      </div>

      <Divider orientation="left" plain style={{ margin: isMobile ? '12px 0' : undefined }}>
        <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
          {isMatching ? 'PASANGAN PERNYATAAN' : 'OPSI JAWABAN'}
        </Text>
      </Divider>

      <Flex vertical gap={isMobile ? 10 : 12} style={{ width: '100%' }}>
        {question.options?.map((opt, idx) => {
          const isCorrect = opt.is_correct && !isMatching;
          return (
            <MotionDiv key={idx} whileHover={isMobile ? undefined : { y: -2 }} transition={{ duration: 0.18 }}>
              <Flex
                align={isMatching && isMobile ? 'flex-start' : 'center'}
                vertical={isMatching && isMobile}
                gap={isMobile ? 10 : 16}
                style={{
                  padding: isMobile ? '12px' : '14px 16px',
                  borderRadius: isMobile ? 12 : 14,
                  background: isCorrect ? '#f6ffed' : token.colorFillAlter,
                  border: `1px solid ${isCorrect ? '#b7eb8f' : token.colorBorderSecondary}`,
                  maxWidth: '100%',
                  overflow: 'hidden',
                }}>
                <Flex align="center" gap={isMobile ? 10 : 16} style={{ width: isMatching && isMobile ? '100%' : undefined }}>
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: isMobile ? 28 : 30,
                      height: isMobile ? 28 : 30,
                      borderRadius: 10,
                      background: isCorrect ? token.colorSuccess : '#fff',
                      border: isCorrect ? 'none' : `1px solid ${token.colorBorder}`,
                      color: isCorrect ? '#fff' : token.colorTextSecondary,
                      fontSize: isMobile ? 12 : 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                    {question.q_type === 4 ? <Type size={14} /> : String.fromCharCode(65 + idx)}
                  </Flex>

                  <div style={{ flex: 1, fontSize: isMobile ? 13 : 14, overflow: 'hidden', minWidth: 0 }}>
                    <RichContentViewer value={opt.content} />
                  </div>

                  {isCorrect && !isMatching && (
                    <Tag
                      color="success"
                      icon={<CheckCircle2 size={12} style={{ marginRight: 4 }} />}
                      style={{ borderRadius: 999, border: 'none', flexShrink: 0, margin: 0 }}>
                      Kunci
                    </Tag>
                  )}
                </Flex>

                {isMatching && (
                  <Flex
                    align="center"
                    gap={10}
                    style={{
                      width: '100%',
                      paddingTop: isMobile ? 4 : 0,
                      paddingLeft: isMobile ? 38 : 46,
                    }}>
                    <GitMerge size={16} style={{ color: token.colorPrimary, flexShrink: 0 }} />
                    <div
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        color: token.colorPrimary,
                        overflow: 'hidden',
                        minWidth: 0,
                        fontSize: isMobile ? 13 : 14,
                      }}>
                      <RichContentViewer value={opt.label} />
                    </div>
                  </Flex>
                )}
              </Flex>
            </MotionDiv>
          );
        })}
      </Flex>
    </div>
  );
};

export default QuestionItem;
