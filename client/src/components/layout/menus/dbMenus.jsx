import { DatabaseOutlined, SettingOutlined } from "@ant-design/icons";

const buildDbMenus = () => ({
  center: [
    {
      label: "Pengaturan",
      key: "/center-config",
      icon: <SettingOutlined />,
    },
  ],
  admin: [
    {
      label: "Database",
      key: "/admin-database",
      icon: <DatabaseOutlined />,
    },
  ],
  teacher: [
    {
      label: "Database",
      key: "/guru-database-kelas",
      icon: <DatabaseOutlined />,
      requiresHomeroom: true,
    },
  ],
  student: [
    {
      label: "Database",
      key: "/siswa-database",
      icon: <DatabaseOutlined />,
    },
  ],
  parent: [
    {
      label: "Data Siswa",
      key: "/orangtua-database-siswa",
      icon: <DatabaseOutlined />,
    },
  ],
  tahfiz: [],
});

export default buildDbMenus;
