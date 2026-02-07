import React from "react";
import { Calendar, Folders, GitBranch, GraduationCap } from "lucide-react";

import { AppLayout } from "../../../components";
import Periode from "./periode/Periode";
import Major from "./major/Major";
import Grade from "./grade/Grade";
import Classes from "./classes/Classes";
import { Tabs } from "antd";
import { useSelector } from "react-redux";

const AdminMain = () => {
  const { user } = useSelector((state) => state.auth);

  const items = [
    {
      key: "periode",
      label: "Periode",
      icon: <Calendar size={14} />,
      children: <Periode />,
    },
    user?.unit_level === "SMA / SMK / MA" && {
      key: "major",
      label: "Jurusan",
      icon: <GitBranch size={14} />,
      children: <Major />,
    },
    {
      key: "grade",
      label: "Tingkat",
      icon: <GraduationCap size={14} />,
      children: <Grade />,
    },
    {
      key: "class",
      label: "Kelas",
      icon: <Folders size={14} />,
      children: <Classes />,
    },
  ].filter(Boolean);

  return (
    <AppLayout title={"Data Pokok"}>
      <Tabs items={items} defaultActiveKey="periode" />
    </AppLayout>
  );
};

export default AdminMain;
