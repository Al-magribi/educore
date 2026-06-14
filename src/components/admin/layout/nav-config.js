import { IconAbout, IconDashboard, IconHome, IconNews, IconPalette, IconSettings, IconUsers } from './icons.js';

export const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: IconDashboard, exact: true },
  { href: '/admin/beranda', label: 'Beranda', icon: IconHome },
  { href: '/admin/tentang', label: 'Tentang', icon: IconAbout },
  { href: '/admin/berita', label: 'Berita', icon: IconNews },
  { href: '/admin/galeri', label: 'Galeri', icon: IconPalette },
  { href: '/admin/akun-spmb', label: 'Akun SPMB', icon: IconUsers },
  { href: '/admin/pengaturan', label: 'Pengaturan', icon: IconSettings },
];

export const adminNavSections = [{ title: 'Menu', items: adminNavItems }];
