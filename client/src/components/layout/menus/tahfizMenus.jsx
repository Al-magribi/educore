import { AuditOutlined } from "@ant-design/icons";

const buildTahfizMenus = () => ({
  center: [],
  admin: [],
  teacher: [],
  student: [],
  parent: [
    {
      label: "Laporan Tahfiz",
      key: "/orangtua-laporan-tahfiz",
      icon: <AuditOutlined />,
    },
  ],
  tahfiz: [],
});

export default buildTahfizMenus;
