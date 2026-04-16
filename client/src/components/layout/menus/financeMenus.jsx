import {
  BookOutlined,
  CreditCardOutlined,
  MoneyCollectOutlined,
  ReadOutlined,
  SettingFilled,
  WalletOutlined,
} from "@ant-design/icons";
import { Landmark } from "lucide-react";

const buildFinanceMenus = (user = {}) => {
  const financeMenus = [
    {
      label: "Pembayaran SPP",
      key: "/finance/pembayaran-spp",
      icon: <CreditCardOutlined />,
    },
    {
      label: "Pembayaran Lainnya",
      key: "/finance/pembayaran-lainnya",
      icon: <MoneyCollectOutlined />,
    },
    {
      label: "Transaksi Keuangan",
      key: "/finance/transaksi",
      icon: <WalletOutlined />,
    },
    {
      label: "Tabungan Siswa",
      key: "/finance/laporan-tabungan",
      icon: <BookOutlined />,
    },
    {
      label: "Pengaturan",
      key: "/finance/pengaturan",
      icon: <SettingFilled />,
    },
  ];

  const teacherFinanceNode = {
    label: "Keuangan Kelas",
    key: "/guru/keuangan-kelas",
    icon: <WalletOutlined />,
    requiresHomeroom: true,
    children: [
      {
        label: "Kas Kelas",
        key: "/guru/keuangan-kelas",
        icon: <WalletOutlined />,
      },
      {
        label: "Tabungan",
        key: "/guru/tabungan",
        icon: <Landmark size={14} />,
      },
    ],
  };

  const studentFinanceNode = {
    label: "Keuangan",
    key: "/siswa/keuangan",
    icon: <WalletOutlined />,
    children: [
      {
        label: "Laporan Tabungan",
        key: "/siswa/laporan-tabungan",
        icon: <BookOutlined />,
      },
      {
        label: "Laporan Uang Kas",
        key: "/siswa/laporan-uang-kas",
        icon: <ReadOutlined />,
      },
    ],
  };

  const parentFinanceNode = {
    label: "Keuangan",
    key: "/orangtua/keuangan",
    icon: <WalletOutlined />,
    children: [
      {
        label: "Pembayaran",
        key: "/orangtua/pembayaran",
        icon: <CreditCardOutlined />,
      },
      {
        label: "Laporan Tabungan",
        key: "/orangtua/laporan-tabungan",
        icon: <BookOutlined />,
      },
    ],
  };

  return {
    center: [],
    admin: [],
    finance: financeMenus,
    teacher: user?.is_homeroom ? [teacherFinanceNode] : [],
    student: [studentFinanceNode],
    parent: [parentFinanceNode],
    tahfiz: [],
  };
};

export default buildFinanceMenus;
