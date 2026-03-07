import { DatabaseOutlined, SettingOutlined } from "@ant-design/icons";

const buildDbMenus = () => ({
  center: [
    {
      label: "Pengaturan",
      key: "/center-config",
      icon: <SettingOutlined />,
    },
  ],
  admin: [],
  teacher: [],
  student: [],
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
