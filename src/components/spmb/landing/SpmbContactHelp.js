"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/motion/FadeIn.js";

export function SpmbContactHelp({ contact }) {
  if (!contact) return null;

  return (
    <section className="bg-slate-900 py-16 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold md:text-3xl">{contact.title}</h2>
              <p className="mt-3 text-slate-400">{contact.description}</p>
              <div className="mt-6 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-6">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="hover:text-white hover:underline">
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:underline">
                    {contact.phone}
                  </a>
                )}
                {contact.whatsapp && (
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline"
                  >
                    WhatsApp: {contact.whatsapp}
                  </a>
                )}
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/daftar"
                className="inline-flex rounded-xl bg-primary px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/30"
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
