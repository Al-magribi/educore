"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/cms/SectionHeading.js";
import { StaggerChildren, StaggerItem } from "@/components/motion/StaggerChildren.js";
import { spmbLandingDefaults } from "@/data/spmb-landing-defaults.js";

export function SpmbFlowSteps({ flow = [], heading }) {
  const h = { ...spmbLandingDefaults.page.sections.flow, ...heading };

  return (
    <section className="bg-white py-16 sm:py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={h.eyebrow} title={h.title} description={h.description} />

        <StaggerChildren className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {flow.map((item) => (
            <StaggerItem key={item.step}>
              <motion.div
                whileHover={{ y: -4 }}
                className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-5 shadow-sm sm:p-6"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-base font-bold text-white shadow-md shadow-primary/25 sm:h-10 sm:w-10 sm:text-lg">
                  {item.step}
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900 sm:text-lg">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
