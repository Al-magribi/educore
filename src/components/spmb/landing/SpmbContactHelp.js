"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/motion/FadeIn.js";

export function SpmbContactHelp({ contact }) {
  if (!contact) return null;

  return (
    <section className="bg-slate-900 py-14 text-white sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 className="text-xl font-bold sm:text-2xl md:text-3xl">{contact.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:mt-3 sm:text-base">
                {contact.description}
              </p>
              <div className="mt-5 flex flex-col gap-2 text-sm sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-2 break-all text-slate-300 transition hover:text-white hover:underline"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {contact.email}
                  </a>
                ) : null}
                {contact.phone ? (
                  <a
                    href={`tel:${contact.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-2 text-slate-300 transition hover:text-white hover:underline"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {contact.phone}
                  </a>
                ) : null}
                {contact.whatsapp ? (
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-emerald-400 transition hover:text-emerald-300 hover:underline"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.11.548 4.09 1.507 5.81L0 24l6.335-1.662A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.78 9.78 0 01-4.99-1.37l-.357-.214-3.76.987 1.004-3.666-.233-.375A9.818 9.818 0 1121.818 12 9.832 9.832 0 0112 21.818z" />
                    </svg>
                    {contact.whatsapp}
                  </a>
                ) : null}
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
              <Link
                href="/daftar"
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 sm:w-auto sm:px-8 sm:py-4"
              >
                Mulai Pendaftaran
              </Link>
            </motion.div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
