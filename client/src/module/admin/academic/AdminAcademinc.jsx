import React, { lazy } from "react";
import { motion } from "framer-motion";
import { BookOpen, Briefcase, SquareUser, Users } from "lucide-react";
import { Grid } from "antd";
import { PageTabs } from "../../../components/ui/muse";

const Subject = lazy(() => import("./subject/Subject"));
const Teacher = lazy(() => import("./teacher/Teacher"));
const Staff = lazy(() => import("./staff/Staff"));
const StudentPage = lazy(() => import("./student/StudentPage"));

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const AdminAcademinc = () => {
  const screens = useBreakpoint();

  const items = [
    {
      key: "subject",
      label: "Mata Pelajaran",
      icon: <BookOpen size={16} />,
      description: "Kurikulum, kategori, dan cabang mata pelajaran.",
      render: () => <Subject screens={screens} />,
    },
    {
      key: "teacher",
      label: "Guru",
      icon: <SquareUser size={16} />,
      description: "Tenaga pengajar beserta alokasi mengajar dan wali kelas.",
      render: () => <Teacher screens={screens} />,
    },
    {
      key: "staff",
      label: "Tendik",
      icon: <Briefcase size={16} />,
      description: "Tenaga kependidikan non-pengajar.",
      render: () => <Staff />,
    },
    {
      key: "student",
      label: "Siswa",
      icon: <Users size={16} />,
      description: "Peserta didik, data pribadi, dan impor massal.",
      render: () => <StudentPage screens={screens} />,
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <PageTabs
        title='Manajemen Pendidikan'
        description='Atur mata pelajaran, data guru, data tendik, dan data siswa.'
        items={items}
      />
    </MotionDiv>
  );
};

export default AdminAcademinc;
