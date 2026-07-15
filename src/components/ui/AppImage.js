import Image from "next/image";
import { isAppUploadUrl } from "@/lib/storage/urls.js";

/**
 * Wrapper `next/image` untuk aset CMS.
 * Upload lokal sudah dioptimasi Sharp (WebP), jadi lewati `/_next/image`
 * agar URL tetap `/uploads/...` dan tidak gagal saat optimizer tidak
 * bisa membaca sumber.
 */
export function AppImage({ src, unoptimized, ...props }) {
  const skipOptimizer = unoptimized ?? isAppUploadUrl(src);
  return <Image src={src} unoptimized={skipOptimizer} {...props} />;
}
