// Peta kepemilikan file antar branch.
//
// Pemakaian:
//   node scripts/ci/shared-paths.js --list
//       Cetak path milik main (dipakai compose untuk memulihkan dari origin/main).
//   node scripts/ci/shared-paths.js --check [--base origin/main] [--feature <domain>]
//       Dipakai guard-shared-paths.yml di feature/*. Gagal jika branch ini mengubah
//       path milik main sejak merge-base dengan base. Memberi peringatan jika branch
//       mengubah path milik feature lain (compose akan menimpanya).
//   node scripts/ci/shared-paths.js --check-main --base <sha>
//       Dipakai guard-shared-paths.yml di main. Gagal jika commit sejak <sha>
//       mengubah path milik feature/*: sync main -> feature/* pasti konflik.
//
// Kenapa: sync main -> feature/* konflik setiap kali main dan feature mengedit
// file yang sama, dan compose release menimpa file milik satu feature dengan
// versi feature lain. Setiap file harus punya satu pemilik. Lihat CLAUDE.md §0.

import { execFileSync } from "node:child_process";

// Diubah hanya lewat main. Path yang diakhiri "/" berarti satu folder.
export const MAIN_OWNED_PATHS = [
  ".gitignore",
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
  "client/src/components/profile/",
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
  // Login inti. Data login per domain: server/router/<domain>/authProfile.js.
  "server/router/auth/",
  // Server inti. Middleware domain dimuat opsional dari app.js.
  "server/app.js",
  "server/utils/wrapper.js",
];

// Milik satu feature. main tidak boleh mengubahnya (sync pasti konflik), dan
// feature lain sebaiknya tidak mengubahnya (compose memulihkan versi pemilik,
// jadi perubahan dari feature lain hilang di produk). Daftar ini harus sama
// dengan fungsi restore_<domain>_owned_paths di .github/workflows/publish-*.yml.
export const FEATURE_OWNED_PATHS = {
  db: [
    "client/src/components/layout/menus/dbMenus.jsx",
    "client/src/components/layout/preloads/db.js",
    "client/src/module/database/",
    "client/src/routes/modules/dbRoutes.jsx",
    "client/src/service/database/",
    "server/router/database/",
  ],
  lms: [
    "client/src/components/layout/menus/lmsMenus.jsx",
    "client/src/components/layout/preloads/lms.js",
    "client/src/module/lms/",
    "client/src/module/parent/",
    "client/src/module/student/dashboard/",
    "client/src/module/teacher/dashboard/",
    "client/src/routes/modules/lmsRoutes.jsx",
    "client/src/service/lms/",
    "database/attendance_schema.sql",
    "database/lms_schema.sql",
    "server/middleware/authorize.js",
    "server/router/lms/",
    "server/services/telegram/",
    "server/utils/staffAssignment.js",
  ],
  tahfiz: [
    "client/src/components/layout/menus/tahfizMenus.jsx",
    "client/src/components/layout/preloads/tahfiz.js",
    "client/src/module/tahfiz/",
    "client/src/routes/modules/tahfizRoutes.jsx",
    "client/src/service/tahfiz/",
    "database/tahfiz_schema.sql",
    "server/router/tahfiz/",
  ],
  finance: [
    "client/src/components/layout/menus/financeMenus.jsx",
    "client/src/components/layout/preloads/finance.js",
    "client/src/module/finance/",
    "client/src/routes/modules/financeRoutes.jsx",
    "client/src/service/finance/",
    "server/router/finance/",
  ],
};

// Stub fallback: file milik feature A yang sengaja disediakan feature B agar
// produk tanpa feature A tetap bisa di-build. Compose memulihkan versi asli
// dari pemiliknya di produk yang membawa feature A. Tidak diberi peringatan.
export const FALLBACK_STUB_PATHS = {
  // StaffForm / StaffAssignment (lms) memakai slot meja keuangan.
  "client/src/module/finance/assignment/FinanceStaffSlot.jsx": ["lms"],
};

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

const ownerOf = (file) =>
  Object.keys(FEATURE_OWNED_PATHS).find((domain) =>
    matches(file, FEATURE_OWNED_PATHS[domain]),
  );

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

const changedFiles = (from, to = "HEAD") =>
  git("diff", "--name-only", from, to).split("\n").filter(Boolean);

const runCheck = (base, feature) => {
  const mergeBase = git("merge-base", base, "HEAD");
  const changed = changedFiles(mergeBase);

  const blocked = changed.filter((file) => matches(file, MAIN_OWNED_PATHS));
  const shared = changed.filter((file) => matches(file, SHARED_MODULE_PATHS));
  const foreign = feature
    ? changed.filter((file) => {
        const owner = ownerOf(file);
        const isAllowedStub = (FALLBACK_STUB_PATHS[file] || []).includes(feature);
        return owner && owner !== feature && !isAllowedStub;
      })
    : [];

  shared.forEach((file) => {
    console.log(
      `::warning file=${file}::File modul bersama diubah dari feature. Merge main dulu sebelum mengubahnya agar tidak konflik dengan perapian UI di main.`,
    );
  });

  foreign.forEach((file) => {
    console.log(
      `::warning file=${file}::File ini milik feature/${ownerOf(file)}. Compose release memakai versi feature/${ownerOf(file)}, jadi perubahan dari feature/${feature} tidak akan sampai ke produk. Kerjakan di feature/${ownerOf(file)}.`,
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

const runCheckMain = (base) => {
  const changed = changedFiles(base);
  const blocked = changed.filter((file) => ownerOf(file));

  if (blocked.length === 0) {
    console.log(`OK: main tidak mengubah file milik feature sejak ${base}.`);
    return 0;
  }

  blocked.forEach((file) => {
    console.log(
      `::error file=${file}::File ini milik feature/${ownerOf(file)}. Mengubahnya di main membuat sync main -> feature/${ownerOf(file)} konflik. Pindahkan perubahan ke feature/${ownerOf(file)}, atau merge main ke feature/${ownerOf(file)} secara manual sekarang juga.`,
    );
  });
  console.log(
    `\n${blocked.length} file milik feature diubah di main:\n${blocked
      .map((file) => `  - ${file} (feature/${ownerOf(file)})`)
      .join("\n")}\nLihat CLAUDE.md §0 "Kepemilikan file".`,
  );
  return 1;
};

const args = process.argv.slice(2);
const argValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

if (args.includes("--list")) {
  console.log(MAIN_OWNED_PATHS.join("\n"));
} else if (args.includes("--check-main")) {
  const base = argValue("--base");
  if (!base) {
    console.error("--check-main butuh --base <sha>");
    process.exit(2);
  }
  process.exit(runCheckMain(base));
} else if (args.includes("--check")) {
  process.exit(runCheck(argValue("--base") || "origin/main", argValue("--feature")));
} else {
  console.error(
    "Usage: shared-paths.js --list | --check [--base <ref>] [--feature <domain>] | --check-main --base <sha>",
  );
  process.exit(2);
}
