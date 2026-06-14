"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/cms/SectionHeading.js";
import { FadeIn } from "@/components/motion/FadeIn.js";
import { StaggerChildren, StaggerItem } from "@/components/motion/StaggerChildren.js";

export function SchoolProfile({ title, paragraphs = [], highlights = [] }) {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Profil"
              title={title}
              align="left"
            />
            <div className="space-y-4 text-slate-600">
              {paragraphs.map((text, i) => (
                <FadeIn key={i} delay={i * 0.08}>
                  <p className="leading-relaxed">{text}</p>
                </FadeIn>
              ))}
            </div>
          </div>

          <StaggerChildren className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {highlights.map((item) => (
              <StaggerItem key={item.label}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center lg:text-left"
                >
                  <p className="text-3xl font-bold text-primary">{item.value}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{item.label}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </div>
    </section>
  );
}
