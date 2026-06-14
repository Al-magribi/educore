"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/cms/SectionHeading.js";
import { FadeIn } from "@/components/motion/FadeIn.js";
import { StaggerChildren, StaggerItem } from "@/components/motion/StaggerChildren.js";

function VisionCard({ vision }) {
  return (
    <FadeIn className="lg:col-span-1">
      <motion.div
        whileHover={{ y: -4 }}
        className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary p-8 text-white shadow-lg shadow-primary/20 md:p-10"
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <h3 className="mt-6 text-2xl font-bold">{vision.title}</h3>
          <p className="mt-4 text-base leading-relaxed text-blue-50/95">{vision.content}</p>
        </div>
      </motion.div>
    </FadeIn>
  );
}

function MissionCard({ mission }) {
  return (
    <div className="lg:col-span-2">
      <FadeIn>
        <motion.div
          whileHover={{ y: -4 }}
          className="h-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </span>
          <h3 className="mt-6 text-2xl font-bold text-slate-900">{mission.title}</h3>
          <ul className="mt-6 space-y-4">
            {mission.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-slate-600">
                <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </FadeIn>
    </div>
  );
}

export function VisionMission({ vision, mission, values }) {
  return (
    <section className="bg-slate-50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Visi & Misi"
          title="Arah dan Komitmen Pendidikan Kami"
          description="Landasan yang memandu setiap kebijakan, program, dan interaksi belajar di sekolah."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <VisionCard vision={vision} />
          <MissionCard mission={mission} />
        </div>

        {values?.items?.length > 0 && (
          <div className="mt-16">
            <FadeIn>
              <h3 className="text-center text-xl font-bold text-slate-900 md:text-2xl">
                {values.title}
              </h3>
            </FadeIn>
            <StaggerChildren className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {values.items.map((item) => (
                <StaggerItem key={item.id}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <h4 className="font-semibold text-primary">{item.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        )}
      </div>
    </section>
  );
}
