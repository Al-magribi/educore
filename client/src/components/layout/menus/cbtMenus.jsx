import { DesktopOutlined } from "@ant-design/icons";

const cbtNode = {
  label: "CBT",
  key: "/computer-based-test",
  icon: <DesktopOutlined />,
  children: [
    { label: "Bank Soal", key: "/computer-based-test/bank" },
    { label: "Jadwal Ujian", key: "/computer-based-test/jadwal-ujian" },
  ],
};

const buildCbtMenus = () => ({
  center: [],
  admin: [cbtNode],
  teacher: [cbtNode],
  student: [
    {
      label: "CBT",
      key: "/siswa/jadwal-ujian",
      icon: <DesktopOutlined />,
    },
  ],
  parent: [],
  tahfiz: [],
});

export default buildCbtMenus;
