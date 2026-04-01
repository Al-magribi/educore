import { BranchesOutlined } from "@ant-design/icons";
import { BookOpenText, CalendarCheck2, ClipboardClock } from "lucide-react";

const AdminLmsMenu = () => ({
  label: "LMS",
  key: "/manajemen-lms",
  icon: <BranchesOutlined />,
  children: [
    {
      label: "Mata Pelajaran",
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
  ].filter(Boolean),
});

const TeacherLmsMenu = ({ includeDuty = false } = {}) => ({
  label: "LMS",
  key: "/manajemen-lms",
  icon: <BranchesOutlined />,
  children: [
    {
      label: "Mata Pelajaran",
      key: "/manajemen-mata-pelajaran",
      icon: <BookOpenText size={14} />,
    },
    {
      label: "Jadwal",
      key: "/jadwal-guru",
      icon: <ClipboardClock size={14} />,
    },
    includeDuty
      ? {
          label: "Manajemen Piket",
          key: "/manajemen-piket",
          icon: <CalendarCheck2 size={14} />,
        }
      : null,
  ].filter(Boolean),
});

const StudentLmsMenu = () => ({
  label: "Mata Pelajaran",
  key: "/mata-pelajaran",
});

const buildLmsMenus = () => ({
  center: [],
  admin: [AdminLmsMenu()],
  teacher: [TeacherLmsMenu({ includeDuty: true })],
  student: [StudentLmsMenu()],
  parent: [],
  tahfiz: [],
});

export default buildLmsMenus;
