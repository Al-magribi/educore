import { Roboto } from "next/font/google";
import { sanitizePublicImageUrl } from "@/lib/images.js";
import { getPublicSeoMetadata } from "@/modules/cms/school-settings.js";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const seo = await getPublicSeoMetadata();
  const title = seo?.title ?? "EduCore CMS";
  const description =
    seo?.description || "CMS sekolah dan sistem penerimaan siswa baru (SPMB)";
  const faviconUrl = sanitizePublicImageUrl(seo?.faviconUrl);

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    ...(seo?.keywords
      ? { keywords: seo.keywords.split(",").map((k) => k.trim()).filter(Boolean) }
      : {}),
    ...(seo?.robots ? { robots: seo.robots } : {}),
    ...(seo?.siteUrl ? { metadataBase: new URL(seo.siteUrl) } : {}),
    openGraph: {
      title,
      description,
      ...(seo?.siteUrl ? { url: seo.siteUrl } : {}),
      ...(seo?.ogImageUrl ? { images: [{ url: seo.ogImageUrl }] } : {}),
    },
    ...(faviconUrl
      ? {
          icons: {
            icon: faviconUrl,
            shortcut: faviconUrl,
            apple: faviconUrl,
          },
        }
      : {}),
  };
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${roboto.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col font-sans">{children}</body>
    </html>
  );
}
