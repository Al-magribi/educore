import React from "react";
import { Card, Col, Row, Space, Statistic, Typography } from "antd";
import { motion } from "framer-motion";
import { iconWrapStyle, sectionWrapStyle, statCardStyle } from "./studentDashStyles";

const { Text } = Typography;
const MotionDiv = motion.div;

const StudentDashStats = ({ stats, isMobile, isXs }) => (
  <div style={sectionWrapStyle}>
    <Row gutter={[isXs ? 12 : 16, isXs ? 12 : 16]}>
      {stats.map((item) => (
        <Col key={item.key} xs={24} sm={12} lg={8}>
          <MotionDiv
            whileHover={isMobile ? undefined : { y: -4 }}
            transition={{ duration: 0.2 }}
            style={{ height: "100%", width: "100%" }}
          >
            <Card
              variant='borderless'
              style={statCardStyle}
              styles={{
                body: {
                  padding: isXs ? 12 : isMobile ? 14 : 20,
                },
              }}
            >
              <Space direction='vertical' size={10} style={{ width: "100%" }}>
                <div style={iconWrapStyle(item.bg, item.color)}>{item.icon}</div>
                <Text type='secondary' style={{ fontSize: isXs ? 12 : 14 }}>
                  {item.title}
                </Text>
                {item.isText ? (
                  <Text
                    strong
                    title={String(item.value)}
                    style={{
                      fontSize: isXs ? 16 : isMobile ? 18 : 22,
                      fontWeight: 800,
                      color: "#0f172a",
                      wordBreak: "break-word",
                      display: "block",
                      lineHeight: 1.25,
                    }}
                  >
                    {item.value}
                  </Text>
                ) : (
                  <Statistic
                    value={item.value}
                    suffix={item.suffix}
                    valueStyle={{
                      fontSize: isXs ? 22 : isMobile ? 24 : 28,
                      fontWeight: 800,
                      color: "#0f172a",
                      wordBreak: "break-word",
                    }}
                  />
                )}
              </Space>
            </Card>
          </MotionDiv>
        </Col>
      ))}
    </Row>
  </div>
);

export default StudentDashStats;
