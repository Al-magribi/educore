"use client";

import { motion } from "framer-motion";
import { StaggerChildren, StaggerItem } from "@/components/motion/StaggerChildren.js";

export function SpmbQuickInfo({ items = [] }) {
  return (
    <section className="relative z-10 -mt-8 pb-4 md:-mt-10">
      <div className="mx-auto max-w-6xl px-6">
        <StaggerChildren className="grid gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <StaggerItem key={item.label}>
              <motion.div
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg shadow-slate-200/50"
              >
                <p className="text-2xl font-bold text-primary md:text-3xl">{item.value}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{item.label}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
