import { cache } from "react";
import { getPublicHomeData } from "@/modules/cms/home/index.js";
import { getHomeNews } from "@/lib/news.js";
import { HomeView } from "@/components/home/HomeView.js";

export const dynamic = "force-dynamic";

const loadHomeData = cache(getPublicHomeData);

export async function generateMetadata() {
  const data = await loadHomeData();
  return {
    title: "Beranda",
    description: data.school.tagline || data.hero.subtitle,
  };
}

export default async function HomePage() {
  const [data, newsPosts] = await Promise.all([loadHomeData(), getHomeNews()]);
  return <HomeView data={data} newsPosts={newsPosts} />;
}
