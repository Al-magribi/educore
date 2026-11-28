import React from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Pencil,
  Users,
  Trash2,
} from "lucide-react";
import dayjs from "dayjs";

import { museRadius, museShadow } from "../../../../../../config/theme";
import { IconBox } from "../../../../../../components/ui/muse";
const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const TaskList = ({
  tasks,
  isLoading,
  onEditTask,
  onDeleteTask,
  onViewSubmissions,
  isMobile,
}) => {
  if (isLoading) {
    return (
      <Card
        variant='borderless'
        style={{
          borderRadius: museRadius.card,
          boxShadow: museShadow.card,
        }}
        styles={{ body: { padding: isMobile ? 18 : 22 } }}
      >
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card
        variant='borderless'
        style={{
          borderRadius: museRadius.card,
          boxShadow: museShadow.card,
        }}
        styles={{ body: { padding: isMobile ? 28 : 36 } }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description='Belum ada penugasan pada filter ini.'
        />
      </Card>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
        gap: 16,
      }}
    >
      {tasks.map((task, index) => {
        const instructionPreview = stripHtml(task.instruction);
        return (
          <MotionDiv
            key={task.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * index }}
          >
            <Card
              variant='borderless'
              style={{
                borderRadius: museRadius.card,
                height: "100%",
                boxShadow: museShadow.card,
              }}
              styles={{ body: { padding: 20 } }}
            >
              <Flex vertical gap={16} style={{ height: "100%" }}>
                <Flex
                  justify='space-between'
                  align='start'
                  gap={12}
                  wrap='wrap'
                  vertical={isMobile}
                >
                  <Space align='start' size={12} style={{ minWidth: 0, flex: 1 }}>
                    <IconBox icon={<ClipboardList size={20} />} size={40} tone="primarySoft" />
                    <div style={{ minWidth: 0 }}>
                      <Title
                        level={5}
                        style={{ margin: 0, overflowWrap: "anywhere" }}
                      >
                        {task.title}
                      </Title>
                      <Text type='secondary'>
                        {task.chapter_title || "Tanpa chapter"}
                      </Text>
                    </div>
                  </Space>
                  <Tag
                    color={
                      dayjs(task.deadline_at).isBefore(dayjs())
                        ? "error"
                        : "processing"
                    }
                    style={{ marginRight: 0, }}
                  >
                    {dayjs(task.deadline_at).format("DD MMM YYYY, HH:mm")}
                  </Tag>
                </Flex>

                <Space size={[8, 8]} wrap>
                  <Tag
                    icon={<CalendarClock size={12} />}
                    color='blue'
                    style={{ marginRight: 0, }}
                  >
                    Deadline
                  </Tag>
                  {(task.class_names || []).map((className) => (
                    <Tag
                      key={`${task.id}-${className}`}
                      icon={<GraduationCap size={12} />}
                      color='green'
                      style={{ marginRight: 0, }}
                    >
                      {className}
                    </Tag>
                  ))}
                </Space>

                <Paragraph
                  type='secondary'
                  ellipsis={{ rows: 4, expandable: false }}
                  style={{ margin: 0, minHeight: 88 }}
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html: instructionPreview || "-",
                    }}
                  />
                </Paragraph>

                <Flex
                  justify='space-between'
                  align={isMobile ? "stretch" : "end"}
                  gap={12}
                  wrap='wrap'
                  vertical={isMobile}
                  style={{ marginTop: "auto" }}
                >
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    Dibuat {dayjs(task.created_at).format("DD MMM YYYY")}
                  </Text>
                  <Flex
                    wrap='wrap'
                    gap={8}
                    style={{ width: isMobile ? "100%" : "auto" }}
                  >
                    <Button
                      icon={<Users size={14} />}
                      onClick={() => onViewSubmissions(task)}
                      style={isMobile ? { flex: "1 1 140px" } : undefined}
                    >
                      Pengumpulan
                    </Button>
                    <Button
                      icon={<Pencil size={14} />}
                      onClick={() => onEditTask(task)}
                      style={isMobile ? { flex: "1 1 100px" } : undefined}
                    >
                      Edit
                    </Button>
                    <Popconfirm
                      title='Hapus penugasan ini?'
                      description='Data kelas target pada tugas ini juga akan dihapus.'
                      onConfirm={() => onDeleteTask(task.id)}
                    >
                      <Button
                        danger
                        icon={<Trash2 size={14} />}
                        style={isMobile ? { flex: "1 1 100px" } : undefined}
                      >
                        Hapus
                      </Button>
                    </Popconfirm>
                  </Flex>
                </Flex>
              </Flex>
            </Card>
          </MotionDiv>
        );
      })}
    </div>
  );
};

export default TaskList;
