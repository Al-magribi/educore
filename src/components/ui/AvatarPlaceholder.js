function getInitials(name) {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Placeholder avatar saat foto testimoni tidak tersedia */
export function AvatarPlaceholder({ name, className = "h-14 w-14 text-lg" }) {
  const initials = getInitials(name);

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 font-semibold text-primary ring-2 ring-white/10 ${className}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
