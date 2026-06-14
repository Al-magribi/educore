/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    // Gambar CMS disimpan lokal di /uploads/* (lihat docs/UPLOADS.md)
    remotePatterns: [],
  },
};

export default nextConfig;
