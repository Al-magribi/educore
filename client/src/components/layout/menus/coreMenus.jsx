import {
  AreaChartOutlined,
  AuditOutlined,
  FolderAddOutlined,
  FolderOutlined,
  HomeOutlined,
  IdcardOutlined,
  LogoutOutlined,
  RiseOutlined,
  WindowsOutlined,
} from "@ant-design/icons";
import { UsersRound } from "lucide-react";

const buildCoreMenus = () => ({
  center: [
    { label: "Dashboard", key: "/center-dashboard", icon: <WindowsOutlined /> },
    { label: "Satuan", key: "/center-homebase", icon: <HomeOutlined /> },
    { label: "Admin", key: "/center-admin", icon: <IdcardOutlined /> },
    { label: "Guru", key: "/center-teacher", icon: <UsersRound size={14} /> },
  ],
  admin: [
    { label: "Dashboard", key: "/admin-dashboard", icon: <WindowsOutlined /> },
    { label: "Data Pokok", key: "/admin-data-pokok", icon: <FolderOutlined /> },
    {
      label: "Data Akademik",
      key: "/admin-data-akademik",
      icon: <AuditOutlined />,
    },
  ],
  teacher: [{ label: "Dashboard", key: "/guru-dashboard", icon: <WindowsOutlined /> }],
  student: [{ label: "Dashboard", key: "/siswa-dashboard", icon: <WindowsOutlined /> }],
  parent: [
    {
      label: "Dashboard",
      key: "/orangtua-dashboard",
      icon: <WindowsOutlined />,
    },
    {
      label: "Laporan Akademik",
      key: "/orangtua-laporan-akademik",
      icon: <AreaChartOutlined />,
    },
    { label: "Logout", key: "logout", icon: <LogoutOutlined />, danger: true },
  ],
  tahfiz: [
    { label: "Dashboard", key: "/tahfiz-dashboard", icon: <WindowsOutlined /> },
    { label: "Alqur'an", key: "/tahfiz-alquran", icon: <FolderAddOutlined /> },
    { label: "Penilaian", key: "/tahfiz-penilaian", icon: <RiseOutlined /> },
    { label: "Hafalan", key: "/tahfiz-hafalan", icon: <AuditOutlined /> },
  ],
});

export default buildCoreMenus;
