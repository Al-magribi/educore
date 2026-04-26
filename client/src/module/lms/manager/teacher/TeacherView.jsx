import React, { Suspense, lazy } from "react";
import { Card, Skeleton, Tabs } from "antd";
import {
  BookOpen,
  ChartBar,
  ChartScatter,
  CheckCircle,
  ListTodo,
} from "lucide-react";
import LoadApp from "../../../../components/loader/LoadApp";

const Learning = lazy(() => import("./learnig/Learning"));
const Attendance = lazy(() => import("./attendance/Attendance"));
const Grading = lazy(() => import("./grading/Grading"));
const Recap = lazy(() => import("../recap/Recap"));
const TaskView = lazy(() => import("./task/TaskView"));

const TeacherView = ({ subjectId, subject }) => {
  const items = [
    {
      label: "Pembelajaran",
      icon: <BookOpen size={16} />,
      key: "1",
      children: (
        <Suspense fallback={<LoadApp />}>
          <Learning subjectId={subjectId} subject={subject} />
        </Suspense>
      ),
    },
    {
      label: "Penugasan",
      icon: <ListTodo size={16} />,
      key: "5",
      children: (
        <Suspense fallback={<LoadApp />}>
          <TaskView subjectId={subjectId} subject={subject} />
        </Suspense>
      ),
    },
    {
      label: "Absen",
      icon: <CheckCircle size={16} />,
      key: "2",
      children: (
        <Suspense fallback={<LoadApp />}>
          <Attendance subjectId={subjectId} subject={subject} />
        </Suspense>
      ),
    },
    {
      label: "Penilaian",
      icon: <ChartBar size={16} />,
      key: "3",
      children: (
        <Suspense fallback={<LoadApp />}>
          <Grading subject={subject} subjectId={subjectId} />
        </Suspense>
      ),
    },
    {
      label: "Rekapitulasi",
      icon: <ChartScatter size={16} />,
      key: "4",
      children: (
        <Suspense fallback={<LoadApp />}>
          <Recap subject={subject} subjectId={subjectId} />
        </Suspense>
      ),
    },
  ];

  return <Tabs items={items} defaultActiveKey='1' />;
};

export default TeacherView;
