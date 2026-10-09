import { BranchesOutlined } from "@ant-design/icons";
import {
  Award,
  BookOpenText,
  CalendarCheck2,
  ClipboardClock,
  ClipboardList,
  FileText,
  GraduationCap,
  Landmark,
  LibraryBig,
  ListCheck,
  Mail,
  NotebookText,
  ArrowLeftRight,
  ShieldAlert,
  Warehouse,
} from "lucide-react";
import {
  canManageKesiswaan,
  canManageKurikulum,
  canManageTu,
} from "../../../utils/staffAssignment";

const tuMenu = () => ({
  label: "Tata Usaha",
  key: "/tata-usaha",
  icon: <Landmark size={14} />,
  children: [
    {
      label: "Buku Induk",
      key: "/tata-usaha/buku-induk",
      icon: <LibraryBig size={14} />,
    },
    {
      label: "Mutasi Siswa",
      key: "/tata-usaha/mutasi",
      icon: <ArrowLeftRight size={14} />,
    },
    {
      label: "Data Alumni",
      key: "/tata-usaha/alumni",
      icon: <GraduationCap size={14} />,
    },
    {
      label: "Ijazah",
      key: "/tata-usaha/ijazah",
      icon: <Award size={14} />,
    },
    {
      label: "Surat",
      key: "/tata-usaha/surat",
      icon: <Mail size={14} />,
    },
    {
      label: "Sarana Prasarana",
      key: "/tata-usaha/sarana",
      icon: <Warehouse size={14} />,
    },
  ],
});

const centerLmsMenu = () => [
  {
    label: "Laporan Presensi",
    key: "/laporan-presensi",
    icon: <ClipboardList size={14} />,
  },
];

const adminLmsMenu = () => [
  {
    label: "Penugasan",
    key: "/manajemen-penugasan",
    icon: <FileText size={14} />,
  },
  tuMenu(),
  {
    label: "LMS",
    key: "/manajemen-lms",
    icon: <BranchesOutlined />,
    children: [
      {
        label: "Mata Pelajaran",
        key: "/manajemen-mata-pelajaran",
        icon: <BookOpenText size={14} />,
      },
      {
        label: "Monitoring Modul Ajar",
        key: "/monitoring-modul-ajar",
        icon: <NotebookText size={14} />,
      },
      {
        label: "Manajemen Jadwal",
        key: "/manajemen-jadwal",
        icon: <ClipboardClock size={14} />,
      },
      {
        label: "Manajemen Piket",
        key: "/manajemen-piket",
        icon: <CalendarCheck2 size={14} />,
      },
      {
        label: "Manajemen Poin",
        key: "/manajemen-poin",
        icon: <ShieldAlert size={14} />,
      },
      {
        label: "Manajemen Presensi",
        key: "/manajemen-presensi",
        icon: <ListCheck size={14} />,
      },
    ].filter(Boolean),
  },
  {
    label: "Laporan Presensi",
    key: "/laporan-presensi",
    icon: <ClipboardList size={14} />,
  },
];

const teacherLmsMenu = ({
  includeDuty = false,
  canKurikulum = false,
  canKesiswaan = false,
  canTu = false,
} = {}) => {
  const lmsNode = {
    label: "LMS",
    key: "/manajemen-lms",
    icon: <BranchesOutlined />,
    children: [
      {
        label: "Mata Pelajaran",
        key: "/manajemen-mata-pelajaran",
        icon: <BookOpenText size={14} />,
      },
      canKurikulum
        ? {
            label: "Monitoring Modul Ajar",
            key: "/monitoring-modul-ajar",
            icon: <NotebookText size={14} />,
          }
        : null,
      canKurikulum
        ? {
            label: "Manajemen Jadwal",
            key: "/manajemen-jadwal",
            icon: <ClipboardClock size={14} />,
          }
        : null,
      {
        label: "Jadwal",
        key: "/jadwal-guru",
        icon: <ClipboardClock size={14} />,
      },
      includeDuty || canKurikulum
        ? {
            label: "Manajemen Piket",
            key: "/manajemen-piket",
            icon: <CalendarCheck2 size={14} />,
          }
        : null,
      canKesiswaan
        ? {
            label: "Manajemen Poin",
            key: "/manajemen-poin",
            icon: <ShieldAlert size={14} />,
          }
        : null,
      includeDuty
        ? {
            label: "Poin Siswa",
            key: "/manajemen-poin-guru",
            icon: <ShieldAlert size={14} />,
            requiresHomeroom: true,
          }
        : null,
      canKurikulum
        ? {
            label: "Manajemen Presensi",
            key: "/manajemen-presensi",
            icon: <ListCheck size={14} />,
          }
        : null,
    ].filter(Boolean),
  };

  const nodes = [lmsNode];
  if (canTu) nodes.unshift(tuMenu());
  if (canKurikulum) {
    nodes.push({
      label: "Laporan Presensi",
      key: "/laporan-presensi",
      icon: <ClipboardList size={14} />,
    });
  }

  return nodes;
};

const studentLmsMenu = () => [
  {
    label: "Mata Pelajaran",
    key: "/mata-pelajaran",
    icon: <BookOpenText size={14} />,
  },
  {
    label: "Poin Siswa",
    key: "/poin-siswa",
    icon: <ShieldAlert size={14} />,
  },
];

const parentLmsMenu = () => [
  {
    label: "Laporan Akademik",
    key: "/laporan-akademik",
    icon: <BranchesOutlined />,
  },
  {
    label: "Poin Siswa",
    key: "/poin-anak",
    icon: <ShieldAlert size={14} />,
  },
];

const buildLmsMenus = (user = {}) => ({
  center: centerLmsMenu(),
  admin: adminLmsMenu(),
  teacher: teacherLmsMenu({
    includeDuty: true,
    canKurikulum: canManageKurikulum(user),
    canKesiswaan: canManageKesiswaan(user),
    canTu: canManageTu(user),
  }),
  student: studentLmsMenu(),
  parent: parentLmsMenu(),
  tahfiz: [],
});

export default buildLmsMenus;
