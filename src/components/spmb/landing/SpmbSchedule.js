"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/cms/SectionHeading.js";
import { FadeIn } from "@/components/motion/FadeIn.js";

export function SpmbSchedule({ schedule = [] }) {
  return (
    <section className="bg-slate-50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Jadwal"
          title="Timeline Penerimaan"
          description="Catat tanggal penting agar tidak terlewat dalam proses pendaftaran."
        />

        <div className="relative">
          <div className="absolute left-4 top-0 hidden h-full w-0.5 bg-primary/20 md:left-1/2 md:block md:-translate-x-px" />

          <ol className="space-y-8">
            {schedule.map((item, i) => (
              <FadeIn key={item.id} delay={i * 0.08}>
                <li
                  className={`relative flex flex-col md:w-1/2 ${
                    i % 2 === 0 ? "md:mr-auto md:pr-12 md:text-right" : "md:ml-auto md:pl-12"
                  }`}
                >
                  <span className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white md:left-1/2 md:-translate-x-1/2">
                    {i + 1}
                  </span>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className={`ml-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:ml-0 ${
                      i % 2 === 0 ? "md:mr-0" : ""
                    }`}
                  >
                    <time className="text-sm font-semibold text-primary">{item.date}</time>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {item.description}
                    </p>
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
