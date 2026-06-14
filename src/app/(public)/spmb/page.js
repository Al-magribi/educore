import { spmbLandingData } from "@/data/spmb-dummy.js";
import { SpmbLandingView } from "@/components/spmb/landing/SpmbLandingView.js";

export const metadata = {
  title: "SPMB",
  description: spmbLandingData.page.subtitle,
};

export default function SpmbLandingPage() {
  return <SpmbLandingView data={spmbLandingData} />;
}
