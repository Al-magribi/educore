import Link from "next/link";

const navItems = [
  { href: "/user", label: "Dashboard" },
  { href: "/spmb/pembayaran", label: "Pembayaran" },
  { href: "/spmb/formulir", label: "Formulir" },
  { href: "/spmb/upload", label: "Upload" },
  { href: "/spmb/kuesioner", label: "Kuesioner" },
];

export default function UserLayout({ children }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-200 px-6 py-4">
        <nav className="mx-auto flex max-w-4xl gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 p-8">{children}</main>
    </div>
  );
}
