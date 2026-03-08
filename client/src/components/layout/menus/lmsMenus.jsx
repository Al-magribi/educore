import { BranchesOutlined } from "@ant-design/icons";
import { BookOpenText, CalendarCheck2, ClipboardClock } from "lucide-react";

const lmsMenuNode = {
  label: "LMS",
  key: "/manajemen-lms",
  icon: <BranchesOutlined />,
  children: [
    {
      label: "Manajemen Mata Pelajaran",
      key: "/manajemen-mata-pelajaran",
      icon: <BookOpenText size={14} />,
    },
    {
      label: "Manajemen Jadwal",
      key: "/manajemen-jadwal",
      icon: <ClipboardClock size={14} />,
    },
    {
      label: "Manajemen Piket",
      key: "/manajemen-piket",
      icon: <CalendarCheck2 size={14} />,
    },
  ],
};

const buildLmsMenus = () => ({
  center: [],
  admin: [lmsMenuNode],
  teacher: [lmsMenuNode],
  student: [lmsMenuNode],
  parent: [],
  tahfiz: [],
});

export default buildLmsMenus;
