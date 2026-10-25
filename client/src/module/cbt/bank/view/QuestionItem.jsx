import React from 'react';
import { motion } from 'framer-motion';
import { Flex, Tag, Typography, theme, Divider, Grid } from 'antd';
import { GitMerge, Type, CheckCircle2 } from 'lucide-react';
import RichContentViewer from '../../components/RichContentViewer';

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const QuestionItem = ({ question, groupSize = 0 }) => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isMatching = question.q_type === 6;
  const hasGroup = Boolean(question.group_id && question.group_stimulus);

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      {hasGroup && (
        <div
          style={{
            marginBottom: isMobile ? 14 : 18,
            padding: isMobile ? 12 : 16,
            borderRadius: 14,
            background: 'rgba(245, 243, 255, 0.95)',
            border: '1px solid rgba(167, 139, 250, 0.45)',
          }}>
          <Text
            style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              color: '#6d28d9',
            }}>
            {question.group_title || 'GRUP SOAL'}
            {question.group_order
              ? ` · SOAL ${question.group_order}${groupSize ? ` DARI ${groupSize}` : ''}`
              : ''}
          </Text>
          <div style={{ fontSize: isMobile ? 14 : 15, lineHeight: 1.7 }}>
            <RichContentViewer value={question.group_stimulus} />
          </div>
        </div>
      )}

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

      {isMatching ? (
        <div className="cbt-pair-list">
          <style>{`
            .cbt-pair-list { container-type: inline-size; width: 100%; }
            .cbt-pair-row {
              display: grid;
              grid-template-columns: 36px minmax(0, 1fr);
              gap: 12px;
              align-items: start;
              padding: 12px;
              border-radius: 14px;
              background: ${token.colorFillAlter};
              border: 1px solid ${token.colorBorderSecondary};
            }
            .cbt-pair-row + .cbt-pair-row { margin-top: 10px; }
            .cbt-pair-badge {
              width: 32px;
              height: 32px;
              margin-top: 2px;
              border-radius: 10px;
              display: grid;
              place-items: center;
              background: #fff;
              border: 1px solid ${token.colorBorder};
              color: ${token.colorTextSecondary};
              font-size: 13px;
              font-weight: 700;
            }
            .cbt-pair-main {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: 8px;
              min-width: 0;
            }
            .cbt-pair-side { min-width: 0; }
            .cbt-pair-kicker {
              display: block;
              margin-bottom: 2px;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.6px;
              text-transform: uppercase;
              color: ${token.colorTextSecondary};
            }
            .cbt-pair-text {
              min-width: 0;
              font-size: 14px;
              line-height: 1.5;
              overflow-wrap: break-word;
              word-break: normal;
            }
            .cbt-pair-link {
              display: flex;
              align-items: center;
              justify-content: flex-start;
              color: ${token.colorPrimary};
            }
            .cbt-pair-link svg { transform: rotate(90deg); }
            @container (min-width: 340px) {
              .cbt-pair-row { align-items: center; padding: 14px 16px; }
              .cbt-pair-badge { margin-top: 0; }
              .cbt-pair-main {
                grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr);
                gap: 12px;
                align-items: center;
              }
              .cbt-pair-kicker { display: none; }
              .cbt-pair-link { justify-content: center; }
              .cbt-pair-link svg { transform: none; }
            }
          `}</style>
          {question.options?.map((opt, idx) => (
            <div className="cbt-pair-row" key={opt.id || idx}>
              <div className="cbt-pair-badge">{String.fromCharCode(65 + idx)}</div>
              <div className="cbt-pair-main">
                <div className="cbt-pair-side">
                  <span className="cbt-pair-kicker">Premis</span>
                  <div className="cbt-pair-text">
                    <RichContentViewer value={opt.label} />
                  </div>
                </div>
                <div className="cbt-pair-link" aria-hidden="true">
                  <GitMerge size={16} />
                </div>
                <div className="cbt-pair-side">
                  <span className="cbt-pair-kicker">Pasangan</span>
                  <div className="cbt-pair-text" style={{ fontWeight: 600, color: token.colorPrimary }}>
                    <RichContentViewer value={opt.content} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
      <Flex vertical gap={isMobile ? 10 : 12} style={{ width: '100%' }}>
        {question.options?.map((opt, idx) => {
          const isCorrect = opt.is_correct;
          return (
            <MotionDiv key={idx} whileHover={isMobile ? undefined : { y: -2 }} transition={{ duration: 0.18 }}>
              <Flex
                align="center"
                gap={isMobile ? 10 : 16}
                style={{
                  padding: isMobile ? '12px' : '14px 16px',
                  borderRadius: isMobile ? 12 : 14,
                  background: isCorrect ? '#f6ffed' : token.colorFillAlter,
                  border: `1px solid ${isCorrect ? '#b7eb8f' : token.colorBorderSecondary}`,
                  maxWidth: '100%',
                  overflow: 'hidden',
                }}>
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

                {isCorrect && (
                  <Tag
                    color="success"
                    icon={<CheckCircle2 size={12} style={{ marginRight: 4 }} />}
                    style={{ borderRadius: 999, border: 'none', flexShrink: 0, margin: 0 }}>
                    Kunci
                  </Tag>
                )}
              </Flex>
            </MotionDiv>
          );
        })}
      </Flex>
      )}
    </div>
  );
};

export default QuestionItem;
