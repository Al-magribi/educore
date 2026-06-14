"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/motion/FadeIn.js";

export function SpmbCtaCard({
  title,
  description,
  href = "/spmb",
  deadline,
  highlights = [],
}) {
  return (
    <section className="bg-slate-50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <motion.div
            whileHover={{ scale: 1.005 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-3xl border border-primary/20 bg-white shadow-xl shadow-primary/10"
          >
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/10" />

            <div className="relative grid gap-10 p-8 md:grid-cols-2 md:items-center md:p-12 lg:p-16">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  SPMB {deadline && `• Tutup ${deadline}`}
                </span>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  {title ?? "Penerimaan Siswa Baru"}
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-slate-600">
                  {description ??
                    "Daftar sekarang untuk tahun ajaran berikutnya."}
                </p>

                {highlights.length > 0 && (
                  <ul className="mt-6 flex flex-wrap gap-3">
                    {highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        <svg
                          className="h-4 w-4 shrink-0 text-primary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col items-stretch gap-4 sm:flex-row md:flex-col lg:items-end">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href={href}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-center text-base font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-[#1d4ed8] md:w-auto"
                  >
                    Daftar Sekarang
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </Link>
                </motion.div>
                <Link
                  href="/masuk"
                  className="flex w-full items-center justify-center rounded-xl border-2 border-slate-200 px-8 py-4 text-center text-base font-semibold text-slate-700 transition hover:border-primary hover:text-primary md:w-auto"
                >
                  Sudah Punya Akun? Masuk
                </Link>
              </div>
            </div>
          </motion.div>
        </FadeIn>
      </div>
    </section>
  );
}
