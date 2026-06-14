"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/cms/SectionHeading.js";
import { FadeIn } from "@/components/motion/FadeIn.js";

export function SpmbRequirements({ requirements = [], fees }) {
  return (
    <section className="bg-slate-50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Persyaratan"
              title="Dokumen yang Diperlukan"
              description="Siapkan berkas berikut sebelum mengunggah ke portal."
              align="left"
            />
            <ul className="space-y-3">
              {requirements.map((text, i) => (
                <FadeIn key={i} delay={i * 0.05}>
                  <li className="flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    {text}
                  </li>
                </FadeIn>
              ))}
            </ul>
          </div>

          {fees && (
            <FadeIn delay={0.15}>
              <motion.div
                whileHover={{ y: -4 }}
                className="h-full rounded-2xl border border-primary/20 bg-white p-8 shadow-lg shadow-primary/5"
              >
                <h3 className="text-xl font-bold text-slate-900">Biaya Pendaftaran</h3>
                <p className="mt-4 text-4xl font-bold text-primary">{fees.registration}</p>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{fees.note}</p>

                <div className="mt-8">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Metode Pembayaran
                  </p>
                  <ul className="mt-3 space-y-2">
                    {fees.paymentMethods.map((method) => (
                      <li
                        key={method}
                        className="flex items-center gap-2 text-sm text-slate-700"
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
                        {method}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </FadeIn>
          )}
        </div>
      </div>
    </section>
  );
}
