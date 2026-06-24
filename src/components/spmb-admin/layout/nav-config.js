import { IconDashboard, IconForm, IconLogout, IconPayment, IconSettings, IconTest, IconUsers } from './icons.js';

export const spmbNavItems = [
  { href: '/spmb-admin', label: 'Dashboard', icon: IconDashboard, exact: true },
  { href: '/spmb-admin/pembayaran', label: 'Pembayaran', icon: IconPayment },
  { href: '/spmb-admin/formulir', label: 'Formulir', icon: IconForm },
  { href: '/spmb-admin/pendaftaran', label: 'Pendaftaran', icon: IconUsers },
  { href: '/spmb-admin/kuesioner', label: 'Kuesioner', icon: IconTest },
  { href: '/spmb-admin/pengaturan', label: 'Pengaturan', icon: IconSettings },
];

export const spmbNavSections = [{ title: 'Menu SPMB', items: spmbNavItems }];

export const spmbNavActions = [
  {
    id: 'logout',
    label: 'Keluar',
    icon: IconLogout,
    redirectTo: '/masuk',
  },
];
