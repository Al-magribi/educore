import { WindowsOutlined } from "@ant-design/icons";
import {
  ChartNoAxesColumn,
  Folders,
  LibraryBig,
  NotebookPen,
  Scan,
} from "lucide-react";

const adminTahfiz = [
  {
    label: "Dashboard",
    key: "/tahfiz-dashboard",
    icon: <WindowsOutlined size={14} />,
  },
  { label: "Alqur'an", key: "/tahfiz-alquran", icon: <LibraryBig size={14} /> },
  { label: "Halaqoh", key: "/tahfiz-halaqoh", icon: <Folders size={14} /> },
  { label: "Target", key: "/tahfiz-target", icon: <Scan size={14} /> },
  {
    label: "Setoran",
    key: "/tahfiz-daily-report",
    icon: <NotebookPen size={14} />,
  },
  {
    label: "Laporan",
    key: "/tahfiz-report",
    icon: <ChartNoAxesColumn size={14} />,
  },
];

const teacherTahfiz = [
  {
    label: "Tahfiz",
    icon: <LibraryBig size={14} />,
    children: [
      {
        label: "Setoran Hafalan",
        key: "/tahfiz-teacher-daily-report",
        icon: <NotebookPen size={14} />,
      },
      {
        label: "Laporan Tahfiz",
        key: "/tahfiz-teacher-report",
        icon: <ChartNoAxesColumn size={14} />,
      },
    ],
  },
];

const musyrifTahfiz = [
  {
    label: "Dashboard",
    key: "/tahfiz-musyrif-dashboard",
    icon: <WindowsOutlined size={14} />,
  },
  {
    label: "Halaqoh",
    key: "/tahfiz-musyrif-halaqoh",
    icon: <Folders size={14} />,
  },
  {
    label: "Setoran",
    key: "/tahfiz-daily-report",
    icon: <NotebookPen size={14} />,
  },
  {
    label: "Laporan",
    key: "/tahfiz-musyrif-report",
    icon: <ChartNoAxesColumn size={14} />,
  },
];

const studentReport = [
  {
    label: "Laporan Tahfiz",
    key: "/tahfiz-student-report",
    icon: <ChartNoAxesColumn size={14} />,
  },
];

const parentReport = [
  {
    label: "Laporan Tahfiz",
    key: "/tahfiz-parent-report",
    icon: <ChartNoAxesColumn size={14} />,
  },
];

const buildTahfizMenus = (user = {}) => ({
  center: [],
  admin: [],
  teacher: user?.is_homeroom ? teacherTahfiz : [],
  student: studentReport,
  parent: parentReport,
  tahfiz: user?.is_musyrif ? musyrifTahfiz : adminTahfiz,
});

export default buildTahfizMenus;
