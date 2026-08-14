import { BranchesOutlined } from "@ant-design/icons";
import {
  BookOpenText,
  CalendarCheck2,
  ClipboardClock,
  ClipboardList,
  FileText,
  ListCheck,
  ShieldAlert,
} from "lucide-react";
import {
  canManageKesiswaan,
  canManageKurikulum,
} from "../../../utils/staffAssignment";

const centerLmsMenu = () => [
  {
    label: "Laporan Presensi",
    key: "/laporan-presensi",
    icon: <ClipboardList size={14} />,
  },
];

const adminLmsMenu = () => [
  {
    label: "Penugasan",
    key: "/manajemen-penugasan",
    icon: <FileText size={14} />,
  },
  {
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
      {
        label: "Manajemen Presensi",
        key: "/manajemen-presensi",
        icon: <ListCheck size={14} />,
      },
    ].filter(Boolean),
  },
  {
    label: "Laporan Presensi",
    key: "/laporan-presensi",
    icon: <ClipboardList size={14} />,
  },
];

const teacherLmsMenu = ({
  includeDuty = false,
  canKurikulum = false,
  canKesiswaan = false,
} = {}) => {
  const lmsNode = {
    label: "LMS",
    key: "/manajemen-lms",
    icon: <BranchesOutlined />,
    children: [
      {
        label: "Mata Pelajaran",
        key: "/manajemen-mata-pelajaran",
        icon: <BookOpenText size={14} />,
      },
      canKurikulum
        ? {
            label: "Manajemen Jadwal",
            key: "/manajemen-jadwal",
            icon: <ClipboardClock size={14} />,
          }
        : null,
      {
        label: "Jadwal",
        key: "/jadwal-guru",
        icon: <ClipboardClock size={14} />,
      },
      includeDuty || canKurikulum
        ? {
            label: "Manajemen Piket",
            key: "/manajemen-piket",
            icon: <CalendarCheck2 size={14} />,
          }
        : null,
      canKesiswaan
        ? {
            label: "Manajemen Poin",
            key: "/manajemen-poin",
            icon: <ShieldAlert size={14} />,
          }
        : null,
      includeDuty || canKesiswaan
        ? {
            label: "Manajemen Poin Guru",
            key: "/manajemen-poin-guru",
            icon: <ShieldAlert size={14} />,
            requiresHomeroom: !canKesiswaan,
          }
        : null,
      canKurikulum
        ? {
            label: "Manajemen Presensi",
            key: "/manajemen-presensi",
            icon: <ListCheck size={14} />,
          }
        : null,
    ].filter(Boolean),
  };

  if (canKurikulum) {
    return [
      lmsNode,
      {
        label: "Laporan Presensi",
        key: "/laporan-presensi",
        icon: <ClipboardList size={14} />,
      },
    ];
  }

  return [lmsNode];
};

const studentLmsMenu = () => ({
  label: "Mata Pelajaran",
  key: "/mata-pelajaran",
  icon: <BookOpenText size={14} />,
});

const parentLmsMenu = () => ({
  label: "Laporan Akademik",
  key: "/laporan-akademik",
  icon: <BranchesOutlined />,
});

const buildLmsMenus = (user = {}) => ({
  center: centerLmsMenu(),
  admin: adminLmsMenu(),
  teacher: teacherLmsMenu({
    includeDuty: true,
    canKurikulum: canManageKurikulum(user),
    canKesiswaan: canManageKesiswaan(user),
  }),
  student: [studentLmsMenu()],
  parent: [parentLmsMenu()],
  tahfiz: [],
});

export default buildLmsMenus;
