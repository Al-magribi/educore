import React, { use } from "react";
import { AppLayout } from "../../../components";
import { BookOpen, SquareUser, Users } from "lucide-react";
import { Grid, Tabs } from "antd";
import Subject from "./subject/Subject";
import Teacher from "./teacher/Teacher";
import StudentPage from "./student/StudentPage";

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
    <AppLayout title='Manajemen Pendidikan'>
      <Tabs items={items} defaultActiveKey='subject' />
    </AppLayout>
  );
};

export default AdminAcademinc;
