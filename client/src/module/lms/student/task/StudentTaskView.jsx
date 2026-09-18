import React, { useMemo, useState } from "react";
import { Alert, Grid, message } from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import {
  CalendarRange,
  CheckCheck,
  Clock3,
} from "lucide-react";
import {
  useDeleteStudentTaskSubmissionMutation,
  useGetStudentTasksQuery,
  useUploadStudentTaskSubmissionMutation,
} from "../../../../service/lms/ApiTask";
import StudentTaskIntro from "./components/StudentTaskIntro";
import StudentTaskStats from "./components/StudentTaskStats";
import StudentTaskList from "./components/StudentTaskList";

const MotionDiv = motion.div;
const { useBreakpoint } = Grid;
const EMPTY_LIST = [];
const ACCEPTED_FILE_TYPES = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
];

const StudentTaskView = ({ subjectId, classId }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [uploadingTaskId, setUploadingTaskId] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  const {
    data: tasksRes,
    isLoading,
    isError,
    error,
  } = useGetStudentTasksQuery(
    { subjectId, classId },
    { skip: !subjectId },
  );
  const [uploadStudentTaskSubmission] = useUploadStudentTaskSubmissionMutation();
  const [deleteStudentTaskSubmission] = useDeleteStudentTaskSubmissionMutation();

  const tasks = useMemo(() => tasksRes?.data || EMPTY_LIST, [tasksRes]);

  const submittedCount = useMemo(
    () => tasks.filter((item) => Boolean(item.submission_id)).length,
    [tasks],
  );
  const pendingCount = tasks.length - submittedCount;
  const nearestDeadline = useMemo(() => {
    if (!tasks.length) return "-";
    return dayjs(tasks[0].deadline_at).format("DD MMM YYYY, HH:mm");
  }, [tasks]);

  const statItems = [
    {
      key: "pending",
      label: "Menunggu Dikerjakan",
      value: pendingCount,
      caption: "Tugas yang belum memiliki pengumpulan",
      icon: <Clock3 size={18} />,
      background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
      color: "#b45309",
    },
    {
      key: "submitted",
      label: "Sudah Dikumpulkan",
      value: submittedCount,
      caption: "Tugas yang sudah masuk ke sistem",
      icon: <CheckCheck size={18} />,
      background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)",
      color: "#15803d",
    },
    {
      key: "deadline",
      label: "Deadline Terdekat",
      value: nearestDeadline,
      caption: "Daftar tugas diurutkan dari tenggat paling dekat",
      icon: <CalendarRange size={18} />,
      background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
      color: "#1d4ed8",
    },
  ];

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat daftar tugas'
        description={
          error?.data?.message ||
          "Terjadi kendala saat mengambil data tugas siswa."
        }
        style={{ borderRadius: 18 }}
      />
    );
  }

  const handleUploadSubmission = async (task, file) => {
    if (!file) return false;

    const lowerName = String(file.name || "").toLowerCase();
    const hasAllowedExtension = ACCEPTED_FILE_TYPES.some((extension) =>
      lowerName.endsWith(extension),
    );
    if (!hasAllowedExtension) {
      message.error(
        "Format file tidak didukung. Gunakan PDF, Word, Excel, PowerPoint, atau gambar.",
      );
      return false;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingTaskId(task.id);
      await uploadStudentTaskSubmission({
        taskId: task.id,
        formData,
      }).unwrap();
      message.success("File tugas berhasil diunggah.");
    } catch (uploadError) {
      message.error(
        uploadError?.data?.message || "Gagal mengunggah file tugas.",
      );
    } finally {
      setUploadingTaskId(null);
    }

    return false;
  };

  const handleDeleteSubmission = async (task) => {
    try {
      setDeletingTaskId(task.id);
      await deleteStudentTaskSubmission(task.id).unwrap();
      message.success("File tugas berhasil dihapus.");
    } catch (deleteError) {
      message.error(
        deleteError?.data?.message || "Gagal menghapus file tugas.",
      );
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <StudentTaskIntro
        totalTasks={tasks.length}
        nearestDeadline={nearestDeadline}
        isMobile={isMobile}
      />
      <StudentTaskStats items={statItems} isMobile={isMobile} />
      <StudentTaskList
        tasks={tasks}
        isLoading={isLoading}
        isMobile={isMobile}
        onUploadSubmission={handleUploadSubmission}
        uploadingTaskId={uploadingTaskId}
        onDeleteSubmission={handleDeleteSubmission}
        deletingTaskId={deletingTaskId}
        acceptedFileTypes={ACCEPTED_FILE_TYPES.join(",")}
      />
    </MotionDiv>
  );
};

export default StudentTaskView;
