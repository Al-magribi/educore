"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/cms/SectionHeading.js";
import { FadeIn } from "@/components/motion/FadeIn.js";
import { parseMapEmbedUrl } from "@/lib/map-embed.js";

function ContactRow({ icon, label, children }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <div className="mt-1 text-slate-800">{children}</div>
      </div>
    </div>
  );
}

export function AddressContact({ address }) {
  const mapEmbedSrc = parseMapEmbedUrl(address.mapEmbedUrl);

  const fullAddress = [
    address.street,
    [address.district, address.city].filter(Boolean).join(", "),
    [address.province, address.postalCode].filter(Boolean).join(" "),
    address.country,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <section id="kontak" className="scroll-mt-24 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {(address.eyebrow || address.title || address.description) && (
          <SectionHeading
            eyebrow={address.eyebrow}
            title={address.title}
            description={address.description}
          />
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <FadeIn>
            <motion.div
              whileHover={{ y: -2 }}
              className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-8"
            >
              <h3 className="text-lg font-bold text-slate-900">{address.schoolName}</h3>
              <address className="mt-4 whitespace-pre-line not-italic leading-relaxed text-slate-600">
                {fullAddress}
              </address>

              <div className="mt-8 space-y-6">
                {address.phone && (
                  <ContactRow
                    label="Telepon"
                    icon={
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                        />
                      </svg>
                    }
                  >
                    <a href={`tel:${address.phone.replace(/\s/g, "")}`} className="hover:text-primary">
                      {address.phone}
                    </a>
                  </ContactRow>
                )}

                {address.email && (
                  <ContactRow
                    label="Email"
                    icon={
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                        />
                      </svg>
                    }
                  >
                    <a href={`mailto:${address.email}`} className="hover:text-primary">
                      {address.email}
                    </a>
                  </ContactRow>
                )}

                {address.whatsapp && (
                  <ContactRow
                    label="WhatsApp"
                    icon={
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                        />
                      </svg>
                    }
                  >
                    <a
                      href={`https://wa.me/${address.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                    >
                      {address.whatsapp}
                    </a>
                  </ContactRow>
                )}
              </div>

              {address.officeHours?.length > 0 && (
                <div className="mt-8 border-t border-slate-200 pt-8">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Jam Operasional
                  </p>
                  <ul className="mt-3 space-y-2">
                    {address.officeHours.map((row) => (
                      <li
                        key={row.day}
                        className="flex justify-between gap-4 text-sm text-slate-600"
                      >
                        <span>{row.day}</span>
                        <span className="font-medium text-slate-800">{row.time}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              {mapEmbedSrc ? (
                <iframe
                  title="Peta lokasi sekolah"
                  src={mapEmbedSrc}
                  className="min-h-[360px] flex-1 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="relative flex min-h-[360px] flex-1 flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                  </div>
                  <p className="mt-4 font-semibold text-slate-800">Peta Lokasi</p>
                  <p className="mt-2 max-w-xs text-sm text-slate-600">
                    Embed Google Maps dapat diatur dari panel admin CMS.
                  </p>
                  {address.mapsUrl && (
                    <Link
                      href={address.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 transition hover:bg-[#1d4ed8]"
                    >
                      Buka di Google Maps
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
