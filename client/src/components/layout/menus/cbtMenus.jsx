import { DesktopOutlined, LaptopOutlined } from "@ant-design/icons";
import { ClipboardClock } from "lucide-react";

const cbtNode = {
  label: "CBT",
  key: "/computer-based-test",
  icon: <DesktopOutlined />,
  children: [
    {
      label: "Bank Soal",
      key: "/computer-based-test/bank",
      icon: <LaptopOutlined />,
    },
    {
      label: "Jadwal Ujian",
      key: "/computer-based-test/jadwal-ujian",
      icon: <ClipboardClock size={14} />,
    },
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
