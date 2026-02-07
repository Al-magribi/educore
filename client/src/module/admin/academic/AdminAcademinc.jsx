import React from "react";
import { AppLayout } from "../../../components";
import { BookOpen, SquareUser, Users } from "lucide-react";
import { Tabs } from "antd";
import Subject from "./subject/Subject";
import Teacher from "./teacher/Teacher";
import StudentPage from "./student/StudentPage";

const AdminAcademinc = () => {
  const items = [
    {
      label: "Mata Pelajaran",
      key: "subject",
      icon: <BookOpen size={14} />,
      children: <Subject />,
    },
    {
      label: "Guru",
      key: "teacher",
      icon: <SquareUser size={14} />,
      children: <Teacher />,
    },
    {
      label: "Siswa",
      key: "student",
      icon: <Users size={14} />,
      children: <StudentPage />,
    },
  ];

  return (
    <AppLayout title="Manajemen Pendidikan">
      <Tabs items={items} defaultActiveKey="subject" />
    </AppLayout>
  );
};

export default AdminAcademinc;
