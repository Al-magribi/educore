import { BranchesOutlined } from "@ant-design/icons";
import {
  BookOpenText,
  CalendarCheck2,
  ClipboardClock,
  ShieldAlert,
} from "lucide-react";

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
    {
      label: "Manajemen Poin",
      key: "/manajemen-poin",
      icon: <ShieldAlert size={14} />,
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

    includeDuty
      ? {
          label: "Manajemen Poin",
          key: "/manajemen-poin-guru",
          icon: <ShieldAlert size={14} />,
          requiresHomeroom: true,
        }
      : null,
  ].filter(Boolean),
});

const StudentLmsMenu = () => ({
  label: "Mata Pelajaran",
  key: "/mata-pelajaran",
  icon: <BookOpenText size={14} />,
});

const ParentLmsMenu = () => ({
  label: "Laporan Akademik",
  key: "/laporan-akademik",
  icon: <BranchesOutlined />,
});

const buildLmsMenus = () => ({
  center: [],
  admin: [AdminLmsMenu()],
  teacher: [TeacherLmsMenu({ includeDuty: true })],
  student: [StudentLmsMenu()],
  parent: [ParentLmsMenu()],
  tahfiz: [],
});

export default buildLmsMenus;
