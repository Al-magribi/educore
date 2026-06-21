import { Suspense } from "react";
import SpmbSettings from "@/components/spmb-admin/pengaturan/SpmbSettings.jsx";

export const metadata = {
  title: "Pengaturan",
};

function SettingsFallback() {
  return <div className="py-12 text-center text-sm text-slate-500">Memuat pengaturan...</div>;
}

export default function SpmbAdminPengaturanPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SpmbSettings />
    </Suspense>
  );
}
