"use client";

import { FadeIn } from "@/components/motion/FadeIn.js";

export function SectionHeading({ eyebrow, title, description, align = "center", variant = "light" }) {
  const alignClass =
    align === "center" ? "text-center mx-auto" : "text-left max-w-2xl";
  const isDark = variant === "dark";

  return (
    <FadeIn className={`mb-12 md:mb-16 ${alignClass}`}>
      {eyebrow && (
        <span
          className={`inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${
            isDark
              ? "bg-white/10 text-blue-200"
              : "bg-primary/10 text-primary"
          }`}
        >
          {eyebrow}
        </span>
      )}
      {title && (
        <h2
          className={`mt-4 text-3xl font-bold tracking-tight md:text-4xl ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          {title}
        </h2>
      )}
      {description && (
        <p
          className={`mt-4 text-base leading-relaxed md:text-lg ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {description}
        </p>
      )}
    </FadeIn>
  );
}
