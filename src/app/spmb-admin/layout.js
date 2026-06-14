import Link from "next/link";

const navItems = [
  { href: "/spmb-admin/formulir", label: "Formulir" },
  { href: "/spmb-admin/pembayaran", label: "Pembayaran" },
  { href: "/spmb-admin/smtp", label: "SMTP" },
  { href: "/spmb-admin/kuesioner", label: "Kuesioner" },
  { href: "/spmb-admin/pendaftar", label: "Pendaftar" },
];

export default function SpmbAdminLayout({ children }) {
  return (
    <div className="flex min-h-full">
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 p-4">
        <p className="mb-6 text-sm font-semibold text-primary">Admin SPMB</p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-3 py-2 text-sm hover:bg-zinc-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
