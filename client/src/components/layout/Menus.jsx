import {
  ApartmentOutlined,
  AreaChartOutlined,
  AuditOutlined,
  BranchesOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  DotChartOutlined,
  FolderAddOutlined,
  FolderOutlined,
  HomeOutlined,
  IdcardOutlined,
  LogoutOutlined,
  RiseOutlined,
  SettingOutlined,
  UserOutlined,
  WindowsOutlined,
} from "@ant-design/icons";
import { UsersRound } from "lucide-react";

export const CenterMenus = [
  {
    label: "Dashboard",
    key: "/center-dashboard",
    icon: <WindowsOutlined />,
  },
  { label: "Satuan", key: "/center-homebase", icon: <HomeOutlined /> },
  { label: "Admin", key: "/center-admin", icon: <IdcardOutlined /> },
  { label: "Guru", key: "/center-teacher", icon: <UsersRound size={14} /> },
  // { label: "Market", key: "/center-market", icon: <DotChartOutlined /> },
  { label: "Pengaturan", key: "/center-config", icon: <SettingOutlined /> },
];

export const AdminMenus = [
  {
    label: "Dashboard",
    key: "/admin-dashboard",
    icon: <WindowsOutlined />,
  },
  {
    label: "Data Pokok",
    key: "/admin-data-pokok",
    icon: <FolderOutlined />,
  },
  {
    label: "Data Akademik",
    key: "/admin-data-akademik",
    icon: <AuditOutlined />,
  },

  // {
  //   label: "Database",
  //   key: "/database",
  //   icon: <DatabaseOutlined />,
  // },
  {
    label: "LMS",
    key: "/manajemen-lms",
    icon: <BranchesOutlined />,
    children: [
      {
        label: "Mata Pelajaran",
        key: "/manajemen-lms",
      },
      {
        label: "Orang Tua",
        key: "/manajemen-lms/data-orang-tua",
      },
    ],
  },

  {
    label: "CBT",
    key: "/computer-based-test",
    icon: <DesktopOutlined />,
    children: [
      {
        label: "Bank Soal",
        key: "/computer-based-test/bank",
      },
      {
        label: "Jadwal Ujian",
        key: "/computer-based-test/jadwal-ujian",
      },
    ],
  },
];

export const TeacherMenus = [
  {
    label: "Dashboard",
    key: "/guru-dashboard",
    icon: <WindowsOutlined />,
  },
  {
    label: "LMS",
    key: "/manajemen-lms",
    icon: <BranchesOutlined />,
  },
  {
    label: "CBT",
    key: "/computer-based-test",
    icon: <DesktopOutlined />,
    children: [
      {
        label: "Bank Soal",
        key: "/computer-based-test/bank",
      },
      {
        label: "Jadwal Ujian",
        key: "/computer-based-test/jadwal-ujian",
      },
    ],
  },
  // {
  //   label: "Database",
  //   key: "/database",
  //   icon: <DatabaseOutlined />,
  // },
];

export const StudentMenus = [
  {
    label: "Dashboard",
    key: "/siswa-dashboard",
    icon: <WindowsOutlined />,
  },
  {
    label: "CBT",
    key: "/siswa/jadwal-ujian",
    icon: <DesktopOutlined />,
  },
  {
    label: "LMS",
    key: "/siswa/mata-pelajaran",
    icon: <BranchesOutlined />,
  },
  // {
  //   label: "Laporan Akademik",
  //   key: "/siswa-laporan-akademik",
  //   icon: <AreaChartOutlined />,
  // },
  // {
  //   label: "Laporan Tahfiz",
  //   key: "/siswa-laporan-tahfiz",
  //   icon: <AuditOutlined />,
  // },
];

export const ParentMenus = [
  {
    label: "Dashboard",
    key: "/orangtua-dashboard",
    icon: <WindowsOutlined />,
  },
  {
    label: "Data Siswa",
    key: "/orangtua-database-siswa",
    icon: <DatabaseOutlined />,
  },
  {
    label: "Laporan Akademik",
    key: "/orangtua-laporan-akademik",
    icon: <AreaChartOutlined />,
  },
  {
    label: "Laporan Tahfiz",
    key: "/orangtua-laporan-tahfiz",
    icon: <AuditOutlined />,
  },
  { label: "Logout", key: "logout", icon: <LogoutOutlined />, danger: true },
];

export const TahfizMenus = [
  {
    label: "Dashboard",
    key: "/tahfiz-dashboard",
    icon: <WindowsOutlined />,
  },
  {
    label: "Alqur'an",
    key: "/tahfiz-alquran",
    icon: <FolderAddOutlined />,
  },
  {
    label: "Penilaian",
    key: "/tahfiz-penilaian",
    icon: <RiseOutlined />,
  },
  {
    label: "Hafalan",
    key: "/tahfiz-hafalan",
    icon: <AuditOutlined />,
  },
];
