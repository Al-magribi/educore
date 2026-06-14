import Image from "next/image";
import { AvatarPlaceholder } from "./AvatarPlaceholder.js";

/**
 * Foto profil jika `imageUrl` ada; jika tidak, placeholder inisial nama.
 */
export function PersonAvatar({
  imageUrl,
  name,
  alt,
  size = 56,
  className = "",
}) {
  const hasImage = Boolean(imageUrl?.trim());

  if (hasImage) {
    return (
      <Image
        src={imageUrl}
        alt={alt || name || "Foto profil"}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ring-2 ring-white/20 ${className}`}
      />
    );
  }

  const sizeClass =
    size >= 64 ? "h-16 w-16 text-xl" : size >= 56 ? "h-14 w-14 text-lg" : "h-12 w-12 text-base";

  return <AvatarPlaceholder name={name} className={`${sizeClass} ${className}`} />;
}
