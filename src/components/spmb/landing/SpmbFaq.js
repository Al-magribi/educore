"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeading } from "@/components/cms/SectionHeading.js";
import { spmbLandingDefaults } from "@/data/spmb-landing-defaults.js";

export function SpmbFaq({ faq = [], heading }) {
  const h = { ...spmbLandingDefaults.page.sections.faq, ...heading };
  const [openId, setOpenId] = useState(faq[0]?.id ?? null);

  return (
    <section className="bg-white py-16 sm:py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow={h.eyebrow} title={h.title} description={h.description} />

        <div className="mt-8 space-y-2.5 sm:mt-10 sm:space-y-3">
          {faq.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left sm:gap-4 sm:px-6 sm:py-4"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold text-slate-900 sm:text-base">
                    {item.question}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className="mt-0.5 shrink-0 text-primary"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="border-t border-slate-200 px-4 pb-4 pt-2 text-sm leading-relaxed text-slate-600 sm:px-6">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
