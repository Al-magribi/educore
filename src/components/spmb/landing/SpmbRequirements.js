"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/cms/SectionHeading.js";
import { FadeIn } from "@/components/motion/FadeIn.js";
import { spmbLandingDefaults } from "@/data/spmb-landing-defaults.js";

export function SpmbRequirements({ requirements = [], fees, heading }) {
  const h = { ...spmbLandingDefaults.page.sections.requirements, ...heading };

  return (
    <section className="bg-slate-50 py-16 sm:py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <SectionHeading
              eyebrow={h.eyebrow}
              title={h.title}
              description={h.description}
              align="left"
            />
            {requirements.length > 0 ? (
              <ul className="space-y-2.5 sm:space-y-3">
                {requirements.map((text, i) => (
                  <FadeIn key={i} delay={i * 0.05}>
                    <li className="flex gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 sm:px-4">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 leading-relaxed">{text}</span>
                    </li>
                  </FadeIn>
                ))}
              </ul>
            ) : null}
          </div>

          {fees ? (
            <FadeIn delay={0.15}>
              <motion.div
                whileHover={{ y: -4 }}
                className="h-full rounded-2xl border border-primary/20 bg-white p-6 shadow-lg shadow-primary/5 sm:p-8"
              >
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl">Biaya Pendaftaran</h3>
                <p className="mt-3 text-3xl font-bold text-primary sm:mt-4 sm:text-4xl">
                  {fees.registration}
                </p>
                {fees.note ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:mt-4">{fees.note}</p>
                ) : null}

                {fees.paymentMethods?.length > 0 ? (
                  <div className="mt-6 sm:mt-8">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Metode Pembayaran
                    </p>
                    <ul className="mt-3 space-y-2">
                      {fees.paymentMethods.map((method) => (
                        <li key={method} className="flex items-start gap-2 text-sm text-slate-700">
                          <svg
                            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
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
                ) : null}
              </motion.div>
            </FadeIn>
          ) : null}
        </div>
      </div>
    </section>
  );
}
