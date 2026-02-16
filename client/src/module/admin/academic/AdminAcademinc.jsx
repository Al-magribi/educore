import React, { Suspense, lazy } from "react";
import { BookOpen, SquareUser, Users } from "lucide-react";
import { Grid, Tabs } from "antd";
import { LoadApp } from "../../../components";
const Subject = lazy(() => import("./subject/Subject"));
const Teacher = lazy(() => import("./teacher/Teacher"));
const StudentPage = lazy(() => import("./student/StudentPage"));

const { useBreakpoint } = Grid;

const AdminAcademinc = () => {
  const screens = useBreakpoint();

  const items = [
    {
      label: "Mata Pelajaran",
      key: "subject",
      icon: <BookOpen size={14} />,
      children: <Subject screens={screens} />,
    },
    {
      label: "Guru",
      key: "teacher",
      icon: <SquareUser size={14} />,
      children: <Teacher screens={screens} />,
    },
    {
      label: "Siswa",
      key: "student",
      icon: <Users size={14} />,
      children: <StudentPage screens={screens} />,
    },
  ];

  return (
    <Suspense fallback={<LoadApp />}>
      <Tabs items={items} defaultActiveKey="subject" />
    </Suspense>
  );
};

export default AdminAcademinc;
