"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function AuthShell({ children, title, subtitle }) {
  return (
    <div className="flex min-h-dvh w-full flex-col lg:flex-row">
      {/* Panel kiri — selalu setinggi viewport di desktop */}
      <div className="relative hidden min-h-dvh w-full shrink-0 overflow-hidden bg-gradient-to-br from-primary via-[#1d4ed8] to-secondary lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <Link href="/" className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-bold text-white backdrop-blur-sm">
            E
          </span>
          <span className="text-lg font-bold text-white">EduCore SPMB</span>
        </Link>
        <div className="relative my-8 lg:my-0">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Portal Penerimaan Siswa Baru
          </h2>
          <p className="mt-4 max-w-sm leading-relaxed text-blue-100/90">
            Daftar, verifikasi email, dan kelola pendaftaran Anda dalam satu platform
            yang aman dan mudah.
          </p>
        </div>
        <p className="relative text-sm text-blue-200/80">
          &copy; {new Date().getFullYear()} SMA EduCore Nusantara
        </p>
      </div>

      {/* Panel kanan — minimal setinggi viewport, scroll jika form panjang */}
      <div className="flex min-h-dvh flex-1 flex-col overflow-y-auto bg-slate-50">
        <div className="flex flex-1 flex-col justify-center px-6 py-10 lg:min-h-dvh lg:px-12 lg:py-12">
          <div className="mb-6 flex items-center justify-between lg:mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                E
              </span>
              <span className="font-bold text-slate-900">EduCore</span>
            </Link>
            <Link href="/" className="text-sm text-slate-500 hover:text-primary">
              Beranda
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-md"
          >
            {(title || subtitle) && (
              <div className="mb-6 md:mb-8">
                {title && (
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p>
                )}
              </div>
            )}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50 md:p-8">
              {children}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
