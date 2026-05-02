import { WindowsOutlined } from "@ant-design/icons";
import { Folders, LibraryBig, Scan, ShieldUser } from "lucide-react";

const adminTahfiz = [
  { label: "Dashboard", key: "/tahfiz-dashboard", icon: <WindowsOutlined /> },
  { label: "Alqur'an", key: "/tahfiz-alquran", icon: <LibraryBig /> },
  { label: "Musyrif", key: "/tahfiz-musyrif", icon: <ShieldUser /> },
  { label: "Halaqoh", key: "/tahfiz-halaqoh", icon: <Folders /> },
  { label: "Target", key: "/tahfiz-target", icon: <Scan /> },
];

const buildTahfizMenus = () => ({
  center: [],
  admin: [],
  teacher: [],
  student: [],
  parent: [],
  tahfiz: adminTahfiz,
});

export default buildTahfizMenus;
