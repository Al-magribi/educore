import { requireAuth } from "@/lib/auth.js";
import { ProfilePageView } from "@/components/profile/index.js";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireAuth();

  return <ProfilePageView initialName={session.user.name} />;
}
