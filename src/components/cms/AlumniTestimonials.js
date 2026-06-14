"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "./SectionHeading.js";
import { StaggerChildren, StaggerItem } from "@/components/motion/StaggerChildren.js";
import { PersonAvatar } from "@/components/ui/PersonAvatar.js";

function QuoteIcon() {
  return (
    <svg className="h-8 w-8 text-primary/30" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.328-.922-.49-2.07-.883-3.529-.883-2.791 0-5.02 2.239-5.02 5.02 0 2.207 1.79 4 4 4 1.55 0 2.88-.89 3.55-2.186h.001zm9.834 0C13.387 16.227 12.834 15 12.834 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.328-.922-.49-2.07-.883-3.529-.883-2.791 0-5.02 2.239-5.02 5.02 0 2.207 1.79 4 4 4 1.55 0 2.88-.89 3.55-2.186h.001z" />
    </svg>
  );
}

export function AlumniTestimonials({ items = [], heading }) {
  if (!items.length) return null;

  return (
    <section className="relative overflow-hidden bg-slate-900 py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        {(heading?.eyebrow || heading?.title || heading?.description) && (
          <SectionHeading
            eyebrow={heading.eyebrow}
            title={heading.title}
            description={heading.description}
            align="center"
            variant="dark"
          />
        )}

        <StaggerChildren className="grid gap-8 md:grid-cols-3">
          {items.map((item) => (
            <StaggerItem key={item.id}>
              <motion.blockquote
                whileHover={{ y: -4 }}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
              >
                <QuoteIcon />
                <p className="mt-4 flex-1 text-base leading-relaxed text-slate-300">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <footer className="mt-6 flex items-center gap-4 border-t border-white/10 pt-6">
                  <PersonAvatar
                    imageUrl={item.imageUrl}
                    name={item.author}
                    alt={item.imageAlt || item.author}
                    size={56}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{item.author}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{item.role}</p>
                    {item.year && (
                      <span className="mt-2 inline-block rounded-md bg-primary/20 px-2 py-0.5 text-xs font-medium text-blue-200">
                        Angkatan {item.year}
                      </span>
                    )}
                  </div>
                </footer>
              </motion.blockquote>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
