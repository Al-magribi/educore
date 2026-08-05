import {
  BookOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  FundOutlined,
  MoneyCollectOutlined,
  ReadOutlined,
  SettingFilled,
  WalletOutlined,
} from "@ant-design/icons";
import { HandCoins, Landmark, BanknoteArrowDown } from "lucide-react";

const centerFinanceMenus = {
  label: "Keuangan",
  key: "/keuangan",
  icon: <HandCoins size={14} />,
};

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
      label: "Beasiswa",
      key: "/finance/beasiswa",
      icon: <FundOutlined />,
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
      label: "Pengeluaran",
      key: "/finance/pengeluaran",
      icon: <BanknoteArrowDown size={18} />,
    },
    {
      label: "Laporan",
      key: "/finance/laporan",
      icon: <FileTextOutlined />,
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
    center: [centerFinanceMenus],
    admin: [],
    finance: financeMenus,
    teacher: user?.is_homeroom ? [teacherFinanceNode] : [],
    student: [studentFinanceNode],
    parent: [parentFinanceNode],
    tahfiz: [],
  };
};

export default buildFinanceMenus;
