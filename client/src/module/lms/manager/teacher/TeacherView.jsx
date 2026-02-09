import React from "react";
import { Tabs } from "antd";
import { BookOpen, ChartBar, CheckCircle } from "lucide-react";
import Learning from "./learnig/Learning";
import Attendance from "./attendance/Attendance";
import Grading from "./garding/Grading";

const TeacherView = ({ subjectId, subject }) => {
  const items = [
    {
      label: "Pembelajaran",
      icon: <BookOpen size={16} />,
      key: "1",
      children: <Learning subjectId={subjectId} subject={subject} />,
    },
    {
      label: "Absen",
      icon: <CheckCircle size={16} />,
      key: "2",
      children: <Attendance subjectId={subjectId} subject={subject} />,
    },
    {
      label: "Penilaian",
      icon: <ChartBar size={16} />,
      key: "3",
      children: <Grading subject={subject} subjectId={subjectId} />,
    },
  ];

  return (
    <Tabs items={items} defaultActiveKey="1" />
  );
};

export default TeacherView;

