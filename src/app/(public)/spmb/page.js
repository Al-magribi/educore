import { cache } from "react";
import { getSpmbLandingContent } from "@/modules/spmb/landing-content.js";
import { SpmbLandingView } from "@/components/spmb/landing/SpmbLandingView.js";

export const dynamic = "force-dynamic";

const loadLandingData = cache(getSpmbLandingContent);

export async function generateMetadata() {
  const data = await loadLandingData();
  return {
    title: data.page.title || "SPMB",
    description: data.page.subtitle,
  };
}

export default async function SpmbLandingPage() {
  const data = await loadLandingData();
  return <SpmbLandingView data={data} />;
}
