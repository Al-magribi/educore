import React, { lazy } from "react";
import {
  BookOpen,
  ChartBar,
  ChartScatter,
  CheckCircle,
  ListTodo,
  NotebookPen,
} from "lucide-react";
import { PageTabs } from "../../../../components/ui/muse";

const Learning = lazy(() => import("./learnig/Learning"));
const Attendance = lazy(() => import("./attendance/Attendance"));
const Grading = lazy(() => import("./grading/Grading"));
const Recap = lazy(() => import("../recap/Recap"));
const TaskView = lazy(() => import("./task/TaskView"));
const TeacherJournal = lazy(() => import("./journal/TeacherJournal"));

/**
 * Detail mapel untuk guru pengampu. Bagian aktif disimpan di `?tab=` (lihat PageTabs).
 * title/description/extra diteruskan dari LmsManagement agar header tidak dobel.
 */
const TeacherView = ({ subjectId, subject, title, description, extra }) => {
  const props = { subjectId, subject };

  const items = [
    {
      key: "materi",
      label: "Pembelajaran",
      icon: <BookOpen />,
      render: () => <Learning {...props} />,
    },
    {
      key: "jurnal",
      label: "Jurnal",
      icon: <NotebookPen />,
      render: () => <TeacherJournal {...props} />,
    },
    {
      key: "tugas",
      label: "Penugasan",
      icon: <ListTodo />,
      render: () => <TaskView {...props} />,
    },
    {
      key: "absen",
      label: "Absen",
      icon: <CheckCircle />,
      render: () => <Attendance {...props} />,
    },
    {
      key: "nilai",
      label: "Penilaian",
      icon: <ChartBar />,
      render: () => <Grading {...props} />,
    },
    {
      key: "rekap",
      label: "Rekapitulasi",
      icon: <ChartScatter />,
      render: () => <Recap {...props} />,
    },
  ];

  return (
    <PageTabs
      title={title || subject?.name || "Detail Pelajaran"}
      description={description}
      extra={extra}
      items={items}
    />
  );
};

export default TeacherView;
