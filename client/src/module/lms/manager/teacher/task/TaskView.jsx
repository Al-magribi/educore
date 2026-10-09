import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Grid,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import {
  CalendarRange,
  FolderKanban,
  GraduationCap,
  ListTodo,
  Plus,
} from "lucide-react";
import {
  useAddTeacherTaskMutation,
  useDeleteTeacherTaskMutation,
  useGetTeacherTaskSubmissionsQuery,
  useGetTeacherTasksQuery,
  useUpdateTeacherTaskMutation,
} from "../../../../../service/lms/ApiTask";
import {
  useGetChaptersQuery,
  useGetClassesQuery,
} from "../../../../../service/lms/ApiLms";
import TaskFilters from "./components/TaskFilters";
import TaskStats from "./components/TaskStats";
import TaskList from "./components/TaskList";
import TaskModal from "./components/TaskModal";
import TaskSubmissionDrawer from "./components/TaskSubmissionDrawer";

const MotionDiv = motion.div;
const { useBreakpoint } = Grid;
const EMPTY_LIST = [];
const { Text, Title } = Typography;

const TaskView = ({ subjectId }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [filterChapterId, setFilterChapterId] = useState(null);
  const [filterClassId, setFilterClassId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submissionDrawerOpen, setSubmissionDrawerOpen] = useState(false);
  const [form] = Form.useForm();

  const {
    data: chaptersRes,
    isLoading: isChapterLoading,
    isError: isChapterError,
    error: chapterError,
  } = useGetChaptersQuery({
    subjectId,
    gradeId: null,
    classId: null,
  });
  const { data: classesRes } = useGetClassesQuery({
    subjectId,
    gradeId: null,
  });
  const {
    data: tasksRes,
    isLoading: isTaskLoading,
    isError: isTaskError,
    error: taskError,
  } = useGetTeacherTasksQuery({
    subjectId,
    chapterId: filterChapterId,
    classId: filterClassId,
  });
  const {
    data: submissionsRes,
    isLoading: isSubmissionLoading,
  } = useGetTeacherTaskSubmissionsQuery(selectedTask?.id, {
    skip: !selectedTask?.id || !submissionDrawerOpen,
  });

  const [addTeacherTask, { isLoading: isAdding }] = useAddTeacherTaskMutation();
  const [updateTeacherTask, { isLoading: isUpdating }] =
    useUpdateTeacherTaskMutation();
  const [deleteTeacherTask, { isLoading: isDeleting }] =
    useDeleteTeacherTaskMutation();

  const chapters = useMemo(
    () => chaptersRes?.data || EMPTY_LIST,
    [chaptersRes],
  );
  const classes = useMemo(() => classesRes?.data || EMPTY_LIST, [classesRes]);
  const tasks = useMemo(() => tasksRes?.data || EMPTY_LIST, [tasksRes]);

  const chapterOptions = useMemo(
    () =>
      [...chapters]
        .sort((a, b) => {
          const orderA = a.order_number ?? 9999;
          const orderB = b.order_number ?? 9999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.title || "").localeCompare(b.title || "");
        })
        .map((item) => ({
          label: item.title,
          value: item.id,
        })),
    [chapters],
  );

  const classOptions = useMemo(
    () =>
      [...classes]
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map((item) => ({
          label: item.name,
          value: item.id,
        })),
    [classes],
  );

  const nearestDeadline = useMemo(() => {
    if (!tasks.length) return "-";
    return dayjs(tasks[0].deadline_at).format("DD MMM YYYY, HH:mm");
  }, [tasks]);

  const totalTargetClasses = useMemo(
    () => tasks.reduce((sum, task) => sum + (task.class_ids?.length || 0), 0),
    [tasks],
  );

  const statItems = [
    {
      key: "task",
      label: "Total Penugasan",
      value: tasks.length,
      caption: "Tugas aktif pada filter yang dipilih",
      icon: <FolderKanban size={18} />,
      background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
      color: "#1d4ed8",
    },
    {
      key: "class",
      label: "Target Kelas",
      value: totalTargetClasses,
      caption: "Akumulasi kelas target dari semua tugas",
      icon: <GraduationCap size={18} />,
      background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)",
      color: "#15803d",
    },
    {
      key: "deadline",
      label: "Deadline Terdekat",
      value: nearestDeadline,
      caption: "Urutan daftar mengikuti deadline paling dekat",
      icon: <CalendarRange size={18} />,
      background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
      color: "#b45309",
    },
  ];

  const openCreateModal = () => {
    setEditingTask(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    form.setFieldsValue({
      chapter_id: task.chapter_id,
      title: task.title,
      class_ids: task.class_ids || [],
      instruction: task.instruction,
      deadline_at: task.deadline_at ? dayjs(task.deadline_at) : null,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
    form.resetFields();
  };

  const openSubmissionDrawer = (task) => {
    setSelectedTask(task);
    setSubmissionDrawerOpen(true);
  };

  const closeSubmissionDrawer = () => {
    setSubmissionDrawerOpen(false);
    setSelectedTask(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        chapter_id: values.chapter_id,
        title: values.title,
        instruction: values.instruction,
        class_ids: values.class_ids || [],
        deadline_at: values.deadline_at.format("YYYY-MM-DD HH:mm:ss"),
      };

      if (editingTask?.id) {
        await updateTeacherTask({ id: editingTask.id, ...payload }).unwrap();
        message.success("Penugasan berhasil diperbarui.");
      } else {
        await addTeacherTask({ subjectId, ...payload }).unwrap();
        message.success("Penugasan berhasil ditambahkan.");
      }

      closeModal();
    } catch (error) {
      if (error?.data?.message) {
        message.error(error.data.message);
      }
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await deleteTeacherTask(taskId).unwrap();
      message.success("Penugasan berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus penugasan.");
    }
  };

  const isMutating = isAdding || isUpdating || isDeleting;

  if (isChapterError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat referensi chapter'
        description={
          chapterError?.data?.message ||
          "Data chapter tidak dapat dimuat untuk modul penugasan."
        }
        style={{ borderRadius: 18 }}
      />
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <Card
        variant='borderless'
        style={{
          borderRadius: 24,
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
          border: "1px solid rgba(148, 163, 184, 0.14)",
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
                width: 48,
                height: 48,
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
                color: "#1d4ed8",
                flexShrink: 0,
              }}
            >
              <ListTodo size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <Text type='secondary'>Penugasan Guru</Text>
              <Title level={isMobile ? 5 : 4} style={{ margin: "2px 0 6px" }}>
                Kelola Penugasan
              </Title>
              <Text type='secondary'>
                Tugas ditampilkan berdasarkan chapter, kelas tujuan, dan
                deadline.
              </Text>
            </div>
          </Space>

          <Flex
            align={isMobile ? "stretch" : "center"}
            gap={12}
            wrap='wrap'
            style={{ width: isMobile ? "100%" : "auto" }}
          >
            <Tag
              color='blue'
              style={{
                marginRight: 0,
                borderRadius: 999,
                paddingInline: 12,
                height: 34,
                lineHeight: "32px",
              }}
            >
              Total Tugas: {tasks.length}
            </Tag>
            <Button
              type='primary'
              icon={<Plus size={16} />}
              onClick={openCreateModal}
              size='large'
              style={{
                borderRadius: 14,
                minWidth: isMobile ? "100%" : 190,
                boxShadow: "0 14px 28px rgba(37, 99, 235, 0.18)",
              }}
            >
              Tambah Penugasan
            </Button>
          </Flex>
        </Flex>
      </Card>

      <TaskStats items={statItems} isMobile={isMobile} />

      <TaskFilters
        chapterOptions={chapterOptions}
        classOptions={classOptions}
        filterChapterId={filterChapterId}
        filterClassId={filterClassId}
        onChapterChange={(value) => setFilterChapterId(value || null)}
        onClassChange={(value) => setFilterClassId(value || null)}
      />

      {isTaskError ? (
        <Alert
          type='error'
          showIcon
          message='Gagal memuat daftar penugasan'
          description={
            taskError?.data?.message ||
            "Terjadi kendala saat mengambil data penugasan."
          }
          style={{ borderRadius: 18 }}
        />
      ) : null}

      <TaskList
        tasks={tasks}
        isLoading={isTaskLoading || isChapterLoading}
        onEditTask={openEditModal}
        onDeleteTask={handleDelete}
        onViewSubmissions={openSubmissionDrawer}
        isMobile={isMobile}
      />

      <TaskModal
        open={modalOpen}
        editingTask={editingTask}
        onCancel={closeModal}
        onSubmit={handleSubmit}
        form={form}
        chapterOptions={chapterOptions}
        classOptions={classOptions}
        confirmLoading={isMutating}
      />

      <TaskSubmissionDrawer
        open={submissionDrawerOpen}
        onClose={closeSubmissionDrawer}
        data={submissionsRes?.data}
        isLoading={isSubmissionLoading}
      />
    </MotionDiv>
  );
};

export default TaskView;
