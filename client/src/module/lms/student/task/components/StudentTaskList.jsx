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
  Upload,
} from "antd";
import { motion } from "framer-motion";
import {
  BookMarked,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  Download,
  Trash2,
  FileText,
  UploadCloud,
} from "lucide-react";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const StudentTaskList = ({
  tasks,
  isLoading,
  isMobile,
  onUploadSubmission,
  uploadingTaskId,
  onDeleteSubmission,
  deletingTaskId,
  acceptedFileTypes,
}) => {
  if (isLoading) {
    return (
      <Card
        variant='borderless'
        style={{ borderRadius: 24, boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)" }}
        styles={{ body: { padding: isMobile ? 18 : 22 } }}
      >
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (!tasks.length) {
    return (
      <Card
        variant='borderless'
        style={{ borderRadius: 24, boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)" }}
        styles={{ body: { padding: isMobile ? 24 : 32 } }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description='Belum ada tugas untuk mata pelajaran ini.'
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
        const isSubmitted = Boolean(task.submission_id);
        const isOverdue =
          !isSubmitted && dayjs(task.deadline_at).isBefore(dayjs());

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
                borderRadius: 24,
                height: "100%",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
                border: "1px solid rgba(148, 163, 184, 0.14)",
              }}
              styles={{ body: { padding: 20 } }}
            >
              <Flex vertical gap={16} style={{ height: "100%" }}>
                <Flex justify='space-between' align='start' gap={12}>
                  <Space align='start' size={12}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
                        color: "#1d4ed8",
                        flexShrink: 0,
                      }}
                    >
                      <ClipboardList size={20} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Title level={5} style={{ margin: 0, overflowWrap: "anywhere" }}>
                        {task.title}
                      </Title>
                      <Text type='secondary'>{task.chapter_title || "Tanpa chapter"}</Text>
                    </div>
                  </Space>
                  <Tag
                    color={
                      isSubmitted ? "success" : isOverdue ? "error" : "processing"
                    }
                    style={{ marginRight: 0, borderRadius: 999 }}
                  >
                    {isSubmitted
                      ? "Sudah dikumpulkan"
                      : isOverdue
                        ? "Terlambat"
                        : "Belum dikumpulkan"}
                  </Tag>
                </Flex>

                <Space size={[8, 8]} wrap>
                  <Tag
                    icon={<CalendarClock size={12} />}
                    color='blue'
                    style={{ marginRight: 0, borderRadius: 999 }}
                  >
                    {dayjs(task.deadline_at).format("DD MMM YYYY, HH:mm")}
                  </Tag>
                  <Tag
                    icon={<BookMarked size={12} />}
                    color='cyan'
                    style={{ marginRight: 0, borderRadius: 999 }}
                  >
                    {task.active_class_name || "-"}
                  </Tag>
                  {isSubmitted ? (
                    <Tag
                      icon={<CheckCheck size={12} />}
                      color='green'
                      style={{ marginRight: 0, borderRadius: 999 }}
                    >
                      {task.submitted_at
                        ? `Masuk ${dayjs(task.submitted_at).format("DD MMM YYYY")}`
                        : "Terkumpul"}
                    </Tag>
                  ) : null}
                </Space>

                <div
                  style={{
                    color: "rgba(0, 0, 0, 0.68)",
                    lineHeight: 1.72,
                    minHeight: 94,
                    wordBreak: "break-word",
                  }}
                >
                  {task.instruction ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: task.instruction,
                      }}
                    />
                  ) : (
                    <Text type='secondary'>Belum ada instruksi tugas.</Text>
                  )}
                </div>

                <Flex justify='space-between' align='end' gap={16} style={{ marginTop: "auto" }}>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    Dibuat {dayjs(task.created_at).format("DD MMM YYYY")}
                  </Text>
                  <Space size={[8, 8]} wrap>
                    {task.submission_file_name ? (
                      <Tag
                        icon={<FileText size={12} />}
                        color='green'
                        style={{ marginRight: 0, borderRadius: 999 }}
                      >
                        {task.submission_file_name}
                      </Tag>
                    ) : null}
                    {task.submission_file_url ? (
                      <Button
                        type='link'
                        icon={<Download size={14} />}
                        href={task.submission_file_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        style={{ paddingInline: 0 }}
                      >
                        Download
                      </Button>
                    ) : null}
                    <Upload
                      accept={acceptedFileTypes}
                      showUploadList={false}
                      beforeUpload={(file) => onUploadSubmission(task, file)}
                      disabled={uploadingTaskId === task.id || deletingTaskId === task.id}
                    >
                      <Button
                        type={isSubmitted ? "default" : "primary"}
                        icon={<UploadCloud size={14} />}
                        loading={uploadingTaskId === task.id}
                        style={{ borderRadius: 12 }}
                      >
                        {isSubmitted ? "Ganti File" : "Upload Tugas"}
                      </Button>
                    </Upload>
                    {isSubmitted ? (
                      <Popconfirm
                        title='Hapus file tugas?'
                        description='File yang sudah diunggah akan dihapus dari sistem.'
                        onConfirm={() => onDeleteSubmission(task)}
                        okText='Hapus'
                        cancelText='Batal'
                      >
                        <Button
                          danger
                          icon={<Trash2 size={14} />}
                          loading={deletingTaskId === task.id}
                          disabled={uploadingTaskId === task.id}
                          style={{ borderRadius: 12 }}
                        >
                          Hapus File
                        </Button>
                      </Popconfirm>
                    ) : null}
                  </Space>
                </Flex>
              </Flex>
            </Card>
          </MotionDiv>
        );
      })}
    </div>
  );
};

export default StudentTaskList;
