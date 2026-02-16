import React, { Suspense, lazy } from "react";
import { Calendar, Folders, GitBranch, GraduationCap } from "lucide-react";

import { Grid, Tabs } from "antd";
import { useSelector } from "react-redux";

const { useBreakpoint } = Grid;
const Periode = lazy(() => import("./periode/Periode"));
const Major = lazy(() => import("./major/Major"));
const Grade = lazy(() => import("./grade/Grade"));
const Classes = lazy(() => import("./classes/Classes"));

const AdminMain = () => {
  const { user } = useSelector((state) => state.auth);

  const screens = useBreakpoint();

  const items = [
    {
      key: "periode",
      label: "Periode",
      icon: <Calendar size={14} />,
      children: <Periode screens={screens} />,
    },
    user?.unit_level === "SMA / SMK / MA" && {
      key: "major",
      label: "Jurusan",
      icon: <GitBranch size={14} />,
      children: <Major screens={screens} />,
    },
    {
      key: "grade",
      label: "Tingkat",
      icon: <GraduationCap size={14} />,
      children: <Grade screens={screens} />,
    },
    {
      key: "class",
      label: "Kelas",
      icon: <Folders size={14} />,
      children: <Classes screens={screens} />,
    },
  ].filter(Boolean);

  return (
    <Suspense fallback={<div>Memuat data...</div>}>
      <Tabs items={items} defaultActiveKey='periode' />
    </Suspense>
  );
};

export default AdminMain;

