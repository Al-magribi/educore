/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    // Upload CMS dilayani lewat /uploads/* (AppImage biasanya unoptimized).
    // localPatterns tetap diizinkan jika ada komponen yang memakai optimizer.
    localPatterns: [
      {
        pathname: "/uploads/**",
        search: "",
      },
    ],
    remotePatterns: [],
  },
};

export default nextConfig;
