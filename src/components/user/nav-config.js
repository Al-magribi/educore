import {
  IconDashboard,
  IconForm,
  IconPayment,
  IconQuestionnaire,
  IconUpload,
} from "./icons.js";

export const userNavItems = [
  {
    href: "/user",
    label: "Dashboard",
    icon: IconDashboard,
    exact: true,
    description: "Ringkasan status dan langkah pendaftaran Anda.",
  },
  {
    href: "/spmb/pembayaran",
    label: "Pembayaran",
    icon: IconPayment,
    description: "Bayar biaya formulir pendaftaran (manual atau online).",
  },
  {
    href: "/spmb/formulir",
    label: "Formulir",
    icon: IconForm,
    description: "Lengkapi data calon siswa sesuai formulir sekolah.",
  },

  {
    href: "/spmb/kuesioner",
    label: "Kuesioner",
    icon: IconQuestionnaire,
    description: "Jawab kuesioner kepribadian dan gaya belajar.",
  },
];

export const userMenuItems = userNavItems.filter((item) => !item.exact);

export const userNavActions = [
  {
    id: "spmb-info",
    label: "Info SPMB",
    href: "/spmb",
    icon: IconDashboard,
    external: false,
  },
  {
    id: "logout",
    label: "Keluar",
    icon: null,
    redirectTo: "/masuk",
  },
];
