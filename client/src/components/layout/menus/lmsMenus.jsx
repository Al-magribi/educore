import { BranchesOutlined } from '@ant-design/icons';
import { BookOpenText, CalendarCheck2, ClipboardClock, ClipboardList, ListCheck, ShieldAlert } from 'lucide-react';

const centerLmsMenu = () => [
  {
    label: 'Laporan Presensi',
    key: '/laporan-presensi',
    icon: <ClipboardList size={14} />,
  },
];

const adminLmsMenu = () => [
  {
    label: 'LMS',
    key: '/manajemen-lms',
    icon: <BranchesOutlined />,
    children: [
      {
        label: 'Mata Pelajaran',
        key: '/manajemen-mata-pelajaran',
        icon: <BookOpenText size={14} />,
      },
      {
        label: 'Manajemen Jadwal',
        key: '/manajemen-jadwal',
        icon: <ClipboardClock size={14} />,
      },
      {
        label: 'Manajemen Piket',
        key: '/manajemen-piket',
        icon: <CalendarCheck2 size={14} />,
      },
      {
        label: 'Manajemen Poin',
        key: '/manajemen-poin',
        icon: <ShieldAlert size={14} />,
      },
      {
        label: 'Manajemen Presensi',
        key: '/manajemen-presensi',
        icon: <ListCheck size={14} />,
      },
    ].filter(Boolean),
  },
  {
    label: 'Laporan Presensi',
    key: '/laporan-presensi',
    icon: <ClipboardList size={14} />,
  },
];

const teacherLmsMenu = ({ includeDuty = false } = {}) => ({
  label: 'LMS',
  key: '/manajemen-lms',
  icon: <BranchesOutlined />,
  children: [
    {
      label: 'Mata Pelajaran',
      key: '/manajemen-mata-pelajaran',
      icon: <BookOpenText size={14} />,
    },
    {
      label: 'Jadwal',
      key: '/jadwal-guru',
      icon: <ClipboardClock size={14} />,
    },
    includeDuty
      ? {
          label: 'Manajemen Piket',
          key: '/manajemen-piket',
          icon: <CalendarCheck2 size={14} />,
        }
      : null,

    includeDuty
      ? {
          label: 'Manajemen Poin',
          key: '/manajemen-poin-guru',
          icon: <ShieldAlert size={14} />,
          requiresHomeroom: true,
        }
      : null,
  ].filter(Boolean),
});

const studentLmsMenu = () => ({
  label: 'Mata Pelajaran',
  key: '/mata-pelajaran',
  icon: <BookOpenText size={14} />,
});

const parentLmsMenu = () => ({
  label: 'Laporan Akademik',
  key: '/laporan-akademik',
  icon: <BranchesOutlined />,
});

const buildLmsMenus = () => ({
  center: centerLmsMenu(),
  admin: adminLmsMenu(),
  teacher: [teacherLmsMenu({ includeDuty: true })],
  student: [studentLmsMenu()],
  parent: [parentLmsMenu()],
  tahfiz: [],
});

export default buildLmsMenus;
