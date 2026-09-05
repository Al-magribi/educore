import React from "react";
import { Card, Flex, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { CalendarRange, FileClock, ListTodo } from "lucide-react";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const StudentTaskIntro = ({ totalTasks, nearestDeadline, isMobile }) => {
  return (
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        variant='borderless'
        style={{
          borderRadius: 24,
          background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%)",
          border: "1px solid #dbeafe",
        }}
        styles={{ body: { padding: isMobile ? 18 : 22 } }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "flex-start" : "center"}
          gap={16}
          wrap='wrap'
        >
          <Space align='start' size={14}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)",
                color: "#fff",
                flexShrink: 0,
                boxShadow: "0 14px 30px rgba(29, 78, 216, 0.18)",
              }}
            >
              <ListTodo size={24} />
            </div>
            <Space direction='vertical' size={4} style={{ minWidth: 0 }}>
              <Text type='secondary'>Workspace Tugas</Text>
              <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                Penugasan Mata Pelajaran
              </Title>
              <Text type='secondary'>
                Tinjau deadline, chapter terkait, dan status pengumpulan tugas
                Anda dalam satu panel yang rapi.
              </Text>
            </Space>
          </Space>

          <Space size={[8, 8]} wrap>
            <Tag
              color='blue'
              icon={<FileClock size={12} />}
              style={{ marginRight: 0, borderRadius: 999, paddingInline: 12 }}
            >
              Total Tugas: {totalTasks}
            </Tag>
            <Tag
              color='gold'
              icon={<CalendarRange size={12} />}
              style={{ marginRight: 0, borderRadius: 999, paddingInline: 12 }}
            >
              Deadline Terdekat: {nearestDeadline}
            </Tag>
          </Space>
        </Flex>
      </Card>
    </MotionDiv>
  );
};

export default StudentTaskIntro;
