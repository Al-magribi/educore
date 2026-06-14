'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicSchoolBrand } from '@/components/branding/SchoolBrandMark.js';

const navLinks = [
  { href: '/', label: 'Beranda' },
  { href: '/tentang', label: 'Tentang' },
  { href: '/berita', label: 'Berita' },
  { href: '/galeri', label: 'Galeri' },
  { href: '/spmb', label: 'SPMB' },
];

export function PublicNavbar({
  schoolName = 'EduCore',
  logoUrl = '',
  hasLogo = false,
  dashboardHref = null,
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-lg'
          : 'border-b border-transparent bg-white'
      }`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <motion.span whileHover={{ scale: 1.02 }} className="flex min-w-0 items-center gap-2.5">
            <PublicSchoolBrand logoUrl={logoUrl} schoolName={schoolName} hasLogo={hasLogo} context="navbar" />
          </motion.span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    active ? 'text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}>
                  {link.label}
                  {active ? (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          {dashboardHref ? (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href={dashboardHref}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition hover:bg-[#1d4ed8]">
                Dashboard
              </Link>
            </motion.div>
          ) : (
            <>
              <Link
                href="/masuk"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-primary">
                Masuk
              </Link>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/daftar"
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition hover:bg-[#1d4ed8]">
                  Daftar
                </Link>
              </motion.div>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Buka menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 md:hidden"
          onClick={() => setMobileOpen((o) => !o)}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-slate-100 bg-white md:hidden">
            <ul className="flex flex-col gap-1 px-6 py-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === link.href ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50'
                    }`}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-4">
                {dashboardHref ? (
                  <Link
                    href={dashboardHref}
                    className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white">
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/masuk" className="rounded-lg px-4 py-3 text-center text-sm font-medium text-slate-600">
                      Masuk
                    </Link>
                    <Link
                      href="/daftar"
                      className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white">
                      Daftar
                    </Link>
                  </>
                )}
              </li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
