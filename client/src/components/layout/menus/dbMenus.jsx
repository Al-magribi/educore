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
  parent: [],
  tahfiz: [],
});

export default buildDbMenus;
