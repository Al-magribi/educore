import React from "react";
import { Avatar, Card, Flex, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { CalendarRange, School, User } from "lucide-react";
import { heroStyle, heroTagStyle } from "./studentDashStyles";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const compactTagStyle = {
  ...heroTagStyle,
  padding: "3px 8px",
  fontSize: 11,
  lineHeight: "18px",
};

const StudentDashHero = ({
  studentName,
  studentInitial,
  nis,
  classSummary,
  periodeName,
  isMobile,
  isXs,
  isCompact,
}) => {
  const bodyPadding = isXs ? 12 : isMobile ? 14 : 28;
  const periodeLabel = periodeName || "Periode belum aktif";

  return (
    <Card
      variant='borderless'
      style={{
        ...heroStyle,
        borderRadius: isXs ? 16 : isMobile ? 18 : 28,
        boxShadow: isMobile
          ? "0 12px 28px rgba(15, 23, 42, 0.14)"
          : heroStyle.boxShadow,
      }}
      styles={{ body: { padding: bodyPadding } }}
    >
      <Flex
        vertical={isCompact}
        justify='space-between'
        align={isCompact ? "stretch" : "center"}
        gap={isCompact ? 10 : 24}
        style={{ width: "100%", minWidth: 0 }}
      >
        <Flex
          gap={isMobile ? 10 : 16}
          align='center'
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            maxWidth: "100%",
            width: isCompact ? "100%" : undefined,
          }}
        >
          <MotionDiv
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            style={{ flexShrink: 0 }}
          >
            <Avatar
              size={isXs ? 40 : isMobile ? 48 : 76}
              style={{
                background: "rgba(255,255,255,0.18)",
                color: "#fff",
                fontSize: isXs ? 16 : isMobile ? 18 : 28,
                fontWeight: 800,
                border: "1px solid rgba(255,255,255,0.22)",
              }}
            >
              {studentInitial}
            </Avatar>
          </MotionDiv>

          <Space
            direction='vertical'
            size={isMobile ? 4 : 6}
            style={{
              flex: 1,
              minWidth: 0,
              maxWidth: "100%",
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.72)",
                fontSize: isMobile ? 11 : 14,
                lineHeight: 1.2,
              }}
            >
              Dashboard Siswa
            </Text>
            <Title
              level={isMobile ? 5 : 3}
              style={{
                color: "#fff",
                margin: 0,
                lineHeight: 1.2,
                wordBreak: "break-word",
                fontSize: isXs ? 16 : isMobile ? 18 : undefined,
                fontWeight: 800,
              }}
            >
              {studentName}
            </Title>

            <Flex wrap='wrap' gap={6} style={{ maxWidth: "100%" }}>
              <Tag
                bordered={false}
                style={isMobile ? compactTagStyle : heroTagStyle}
              >
                <Flex align='center' gap={4} style={{ maxWidth: "100%" }}>
                  <User
                    size={isMobile ? 11 : 14}
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    NIS {nis || "-"}
                  </span>
                </Flex>
              </Tag>
              <Tag
                bordered={false}
                style={{
                  ...(isMobile ? compactTagStyle : heroTagStyle),
                  maxWidth: isXs ? "100%" : 280,
                }}
                title={classSummary}
              >
                <Flex align='center' gap={4} style={{ maxWidth: "100%" }}>
                  <School
                    size={isMobile ? 11 : 14}
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {classSummary}
                  </span>
                </Flex>
              </Tag>
            </Flex>
          </Space>
        </Flex>

        {isCompact ? (
          <Flex
            align='center'
            gap={8}
            style={{
              width: "100%",
              minWidth: 0,
              padding: isXs ? "8px 10px" : "9px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <CalendarRange
              size={14}
              style={{ color: "rgba(255,255,255,0.8)", flexShrink: 0 }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.68)",
                  fontSize: 10,
                  display: "block",
                  lineHeight: 1.2,
                }}
              >
                Periode Aktif
              </Text>
              <Text
                strong
                title={periodeLabel}
                style={{
                  color: "#fff",
                  fontSize: isXs ? 12 : 13,
                  display: "block",
                  wordBreak: "break-word",
                  lineHeight: 1.25,
                }}
              >
                {periodeLabel}
              </Text>
            </div>
          </Flex>
        ) : (
          <Card
            variant='borderless'
            style={{
              background: "rgba(255,255,255,0.12)",
              borderRadius: 20,
              backdropFilter: "blur(10px)",
              flex: "0 1 280px",
              minWidth: 0,
              maxWidth: "100%",
            }}
            styles={{ body: { padding: 20 } }}
          >
            <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 14 }}>
              Periode Aktif
            </Text>
            <Title
              level={4}
              style={{
                color: "#fff",
                margin: "4px 0 0",
                wordBreak: "break-word",
                lineHeight: 1.3,
              }}
            >
              {periodeLabel}
            </Title>
          </Card>
        )}
      </Flex>
    </Card>
  );
};

export default StudentDashHero;
