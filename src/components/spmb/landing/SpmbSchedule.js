"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/cms/SectionHeading.js";
import { FadeIn } from "@/components/motion/FadeIn.js";
import { spmbLandingDefaults } from "@/data/spmb-landing-defaults.js";

export function SpmbSchedule({ schedule = [], heading }) {
  const h = { ...spmbLandingDefaults.page.sections.schedule, ...heading };

  return (
    <section className="bg-slate-50 py-16 sm:py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={h.eyebrow}
          title={h.title}
          description={h.description}
        />

        <div className="relative">
          <div className="absolute left-[15px] top-0 h-full w-0.5 bg-primary/20 sm:left-5 md:left-1/2 md:-translate-x-px" />

          <ol className="space-y-6 sm:space-y-8">
            {schedule.map((item, i) => (
              <FadeIn key={item.id ?? i} delay={i * 0.08}>
                <li
                  className={`relative flex flex-col md:w-[calc(50%-1.5rem)] ${
                    i % 2 === 0 ? "md:mr-auto md:pr-8 md:text-right" : "md:ml-auto md:pl-8"
                  }`}
                >
                  <span className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-md shadow-primary/30 sm:left-0.5 md:left-1/2 md:-translate-x-1/2">
                    {i + 1}
                  </span>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="ml-11 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:ml-12 sm:p-6 md:ml-0"
                  >
                    <time className="text-xs font-semibold text-primary sm:text-sm">{item.date}</time>
                    <h3 className="mt-2 text-base font-bold text-slate-900 sm:text-lg">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                  </motion.div>
                </li>
              </FadeIn>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
