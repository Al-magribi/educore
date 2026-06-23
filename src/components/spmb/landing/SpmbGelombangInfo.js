"use client";

import { motion } from "framer-motion";
import { StaggerChildren, StaggerItem } from "@/components/motion/StaggerChildren.js";

export function SpmbGelombangInfo({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="relative z-10 -mt-6 pb-2 sm:-mt-8 md:-mt-10 md:pb-4">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <StaggerChildren
          className={`grid items-stretch gap-3 sm:gap-4 ${
            items.length === 1
              ? "mx-auto max-w-md"
              : items.length === 2
                ? "sm:grid-cols-2"
                : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {items.map((item) => (
            <StaggerItem key={item.id} className="h-full">
              <motion.div
                whileHover={{ y: -4 }}
                className={`flex h-full min-h-[148px] flex-col items-center justify-center rounded-2xl border bg-white p-5 text-center shadow-lg sm:min-h-[160px] sm:p-6 ${
                  item.isActive
                    ? "border-emerald-300 shadow-emerald-100/80 ring-2 ring-emerald-200/60"
                    : "border-red-200 shadow-red-100/60 ring-1 ring-red-100"
                }`}
              >
                <div className="flex w-full flex-col items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      item.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.isActive ? "Gelombang Aktif" : "Tidak Aktif"}
                  </span>
                  <p
                    className={`text-lg font-bold sm:text-xl ${
                      item.isActive ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {item.name}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">{item.dateRange}</p>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
