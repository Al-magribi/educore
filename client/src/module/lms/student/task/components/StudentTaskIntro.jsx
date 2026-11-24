import React from "react";
import { Card, Flex, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { CalendarRange, FileClock, ListTodo } from "lucide-react";

import { museCardStyle } from "../../../../../config/theme";
import { IconBox } from "../../../../../components/ui/muse";
const { Text, Title } = Typography;
const MotionDiv = motion.div;

const StudentTaskIntro = ({ totalTasks, nearestDeadline, isMobile }) => {
  return (
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        variant='borderless'
        style={museCardStyle}
        styles={{ body: { padding: 16 } }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "flex-start" : "center"}
          gap={16}
          wrap='wrap'
        >
          <Space align='start' size={14}>
            <IconBox icon={<ListTodo size={24} />} size={48} />
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
              style={{ marginRight: 0, paddingInline: 12 }}
            >
              Total Tugas: {totalTasks}
            </Tag>
            <Tag
              color='gold'
              icon={<CalendarRange size={12} />}
              style={{ marginRight: 0, paddingInline: 12 }}
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
