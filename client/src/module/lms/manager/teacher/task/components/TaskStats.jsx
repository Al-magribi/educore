import React from "react";
import { Card, Flex, Typography } from "antd";
import { motion } from "framer-motion";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const statCardStyle = {
  borderRadius: 20,
  height: "100%",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
};

const TaskStats = ({ items, isMobile }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
        gap: 16,
      }}
    >
      {items.map((item, index) => (
        <MotionDiv
          key={item.key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * index }}
        >
          <Card variant='borderless' style={statCardStyle} styles={{ body: { padding: 18 } }}>
            <Flex align='center' justify='space-between' gap={16}>
              <div style={{ minWidth: 0 }}>
                <Text type='secondary'>{item.label}</Text>
                <Title
                  level={isMobile ? 5 : 4}
                  style={{ margin: "4px 0", overflowWrap: "anywhere" }}
                >
                  {item.value}
                </Title>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {item.caption}
                </Text>
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: item.background,
                  color: item.color,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
            </Flex>
          </Card>
        </MotionDiv>
      ))}
    </div>
  );
};

export default TaskStats;
