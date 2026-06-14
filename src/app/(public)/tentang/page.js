import { getPublicAboutData } from "@/modules/cms/about/index.js";
import { AboutView } from "@/components/about/AboutView.js";

export async function generateMetadata() {
  const data = await getPublicAboutData();
  return {
    title: "Tentang",
    description: data.page.subtitle,
  };
}

export default async function TentangPage() {
  const data = await getPublicAboutData();
  return <AboutView data={data} />;
}
