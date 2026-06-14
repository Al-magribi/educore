import Link from 'next/link';
import { PublicSchoolBrand } from '@/components/branding/SchoolBrandMark.js';

const footerLinks = {
  Sekolah: [
    { href: '/tentang', label: 'Tentang Kami' },
    { href: '/berita', label: 'Berita' },
    { href: '/#kontak', label: 'Alamat & Kontak' },
  ],
  SPMB: [
    { href: '/spmb', label: 'Info Pendaftaran' },
    { href: '/daftar', label: 'Daftar Online' },
    { href: '/masuk', label: 'Login Pendaftar' },
  ],
};

export function PublicFooter({ schoolName = 'SMA EduCore Nusantara', tagline, logoUrl = '', hasLogo = false }) {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <PublicSchoolBrand logoUrl={logoUrl} schoolName={schoolName} hasLogo={hasLogo} context="footer" />
            </div>
            {tagline ? <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">{tagline}</p> : null}
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{title}</h3>
              <ul className="mt-4 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-slate-400 transition hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-sm text-slate-500 md:flex-row">
          <p suppressHydrationWarning>
            &copy; {new Date().getFullYear()} {schoolName}. Hak cipta dilindungi.
          </p>
          <p>Developed by almadev</p>
        </div>
      </div>
    </footer>
  );
}
