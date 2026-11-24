// Daftar file shell yang hanya boleh diubah di `main`.
//
// Pemakaian:
//   node scripts/ci/shared-paths.js --list
//       Cetak path milik main (dipakai compose untuk memulihkan dari origin/main).
//   node scripts/ci/shared-paths.js --check [--base origin/main]
//       Gagal jika branch ini mengubah path milik main sejak merge-base dengan
//       base. Dipakai workflow guard-shared-paths.yml di feature/*.
//
// Kenapa: sync main -> feature/* konflik setiap kali main dan feature mengedit
// file yang sama. Feature menambah menu/route/preload di file domainnya sendiri
// (lihat CLAUDE.md §0), jadi file di bawah ini tidak perlu disentuh dari feature.

import { execFileSync } from "node:child_process";

// Diubah hanya lewat main. Path yang diakhiri "/" berarti satu folder.
export const MAIN_OWNED_PATHS = [
  "CLAUDE.md",
  "GIT-WORKFLOW.md",
  "scripts/ci/",
  "client/src/App.jsx",
  "client/src/main.jsx",
  "client/src/index.css",
  "client/src/config/theme.js",
  "client/src/config/productFeatures.js",
  "client/src/components/index.js",
  "client/src/components/editor/",
  "client/src/components/scroll/",
  "client/src/components/ui/",
  "client/src/components/layout/AppLayout.jsx",
  "client/src/components/layout/sidebar.css",
  "client/src/components/layout/menus/index.js",
  "client/src/components/layout/menus/menuAccess.js",
  "client/src/components/layout/menus/coreMenus.jsx",
  "client/src/components/layout/preloads/index.js",
  "client/src/components/layout/preloads/core.js",
  "client/src/module/auth/",
  "client/src/routes/modules/publicRoutes.jsx",
  "client/src/routes/modules/centerRoutes.jsx",
  "client/src/routes/modules/adminRoutes.jsx",
  "client/src/routes/modules/roleRoutes.jsx",
  "client/src/utils/RouteProtection.jsx",
  "client/src/utils/resolveUserHomePath.js",
  "client/src/utils/staffAssignment.js",
];

// Boleh diubah dari feature, tetapi main juga merapikan UI-nya. Diberi
// peringatan agar feature segera merge main sebelum mengubahnya.
export const SHARED_MODULE_PATHS = [
  "client/src/module/admin/",
  "client/src/module/center/",
];

const matches = (file, paths) =>
  paths.some((path) =>
    path.endsWith("/") ? file.startsWith(path) : file === path,
  );

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

const runCheck = (base) => {
  const mergeBase = git("merge-base", base, "HEAD");
  const changed = git("diff", "--name-only", mergeBase, "HEAD")
    .split("\n")
    .filter(Boolean);

  const blocked = changed.filter((file) => matches(file, MAIN_OWNED_PATHS));
  const shared = changed.filter((file) => matches(file, SHARED_MODULE_PATHS));

  shared.forEach((file) => {
    console.log(
      `::warning file=${file}::File modul bersama diubah dari feature. Merge main dulu sebelum mengubahnya agar tidak konflik dengan perapian UI di main.`,
    );
  });

  if (blocked.length === 0) {
    console.log(`OK: tidak ada file milik main yang diubah sejak ${base}.`);
    return 0;
  }

  blocked.forEach((file) => {
    console.log(
      `::error file=${file}::File ini milik main. Pindahkan perubahan ke file domain (menus/<domain>Menus.jsx, preloads/<domain>.js, routes/modules/<domain>Routes.jsx) atau ajukan lewat main.`,
    );
  });
  console.log(
    `\n${blocked.length} file milik main diubah di branch ini:\n${blocked
      .map((file) => `  - ${file}`)
      .join("\n")}\nLihat CLAUDE.md §0 dan GIT-WORKFLOW.md "Kepemilikan file".`,
  );
  return 1;
};

const args = process.argv.slice(2);

if (args.includes("--list")) {
  console.log(MAIN_OWNED_PATHS.join("\n"));
} else if (args.includes("--check")) {
  const baseIndex = args.indexOf("--base");
  const base = baseIndex >= 0 ? args[baseIndex + 1] : "origin/main";
  process.exit(runCheck(base));
} else {
  console.error("Usage: shared-paths.js --list | --check [--base <ref>]");
  process.exit(2);
}
