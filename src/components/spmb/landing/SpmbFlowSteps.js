"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/cms/SectionHeading.js";
import { StaggerChildren, StaggerItem } from "@/components/motion/StaggerChildren.js";

export function SpmbFlowSteps({ flow = [] }) {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Alur Pendaftaran"
          title="Langkah demi Langkah"
          description="Ikuti urutan berikut setelah membuat akun calon siswa."
        />

        <StaggerChildren className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {flow.map((item) => (
            <StaggerItem key={item.step}>
              <motion.div
                whileHover={{ y: -4 }}
                className="relative h-full rounded-2xl border border-slate-200 bg-slate-50/50 p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
                  {item.step}
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
