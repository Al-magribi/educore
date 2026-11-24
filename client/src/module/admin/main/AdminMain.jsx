import React, { lazy } from "react";
import { Calendar, Folders, GitBranch, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { Grid } from "antd";
import { useSelector } from "react-redux";
import { PageTabs } from "../../../components/ui/muse";

const { useBreakpoint } = Grid;
const Periode = lazy(() => import("./periode/Periode"));
const Major = lazy(() => import("./major/Major"));
const Grade = lazy(() => import("./grade/Grade"));
const Classes = lazy(() => import("./classes/Classes"));
const MotionDiv = motion.div;

const AdminMain = () => {
  const { user } = useSelector((state) => state.auth);
  const screens = useBreakpoint();

  const items = [
    {
      key: "periode",
      label: "Periode",
      icon: <Calendar size={16} />,
      description: "Tahun ajaran dan semester yang berlaku di satuan ini.",
      render: () => <Periode screens={screens} />,
    },
    user?.unit_level === "SMA / SMK / MA" && {
      key: "major",
      label: "Jurusan",
      icon: <GitBranch size={16} />,
      description: "Program studi atau peminatan.",
      render: () => <Major screens={screens} />,
    },
    {
      key: "grade",
      label: "Tingkat",
      icon: <GraduationCap size={16} />,
      description: "Level jenjang seperti kelas 7, 8, dan 9.",
      render: () => <Grade screens={screens} />,
    },
    {
      key: "class",
      label: "Kelas",
      icon: <Folders size={16} />,
      description: "Rombongan belajar beserta wali kelas dan siswanya.",
      render: () => <Classes screens={screens} />,
    },
  ].filter(Boolean);

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <PageTabs
        title='Data Pokok'
        description='Pengaturan inti satuan: periode, jurusan, tingkat, dan kelas.'
        items={items}
      />
    </MotionDiv>
  );
};

export default AdminMain;
