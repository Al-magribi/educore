# CLAUDE.md — Acuan UI & UX EduCore LMS

Berlaku untuk branch `main` dan semua `feature/*` (`feature/db`, `feature/lms`, `feature/finance`, `feature/tahfiz`, dst).

Acuan visual: **Muse Ant Design Dashboard Pro** (Creative Tim) — https://demos.creative-tim.com/muse-ant-design-dashboard-pro
Nilai di bawah diambil dari stylesheet Muse versi open source (`src/assets/styles/main.css`, repo `creativetimofficial/muse-ant-design-dashboard`), yang memakai design system yang sama dengan versi Pro.

## 0. Aturan branch untuk file ini

- File ini **hanya diedit di `main`**. Workflow `sync-main-to-features.yml` akan me-merge `main` ke semua `feature/*`, jadi perubahan otomatis sampai ke sana.
- Jangan mengedit CLAUDE.md di `feature/*` (bikin konflik saat sync). Kalau butuh aturan khusus domain, usulkan lewat `main`.
- Jangan pernah kerja manual di `release/*` atau `product/*`. Lihat [GIT-WORKFLOW.md](GIT-WORKFLOW.md).
- Perubahan **shared UI** (theme, `AppLayout`, `components/ui/*`, `index.css`) masuk lewat `main`. UI khusus modul (CBT, LMS, Finance, Tahfiz, DB) dikerjakan di `feature/*` masing-masing.

### Kepemilikan file (supaya sync main → feature tidak konflik)

Sync konflik bila `main` dan `feature/*` mengedit file yang sama. Karena itu shell punya titik sambung per domain, dan feature **hanya mengisi file domainnya**:

| Kebutuhan feature | Edit file ini (milik feature) | Jangan edit (milik `main`) |
|---|---|---|
| Menu sidebar | `components/layout/menus/<domain>Menus.jsx` | `AppLayout.jsx`, `menus/index.js`, `menus/menuAccess.js`, `coreMenus.jsx` |
| Menu hanya untuk user tertentu | properti `visible: (user) => ...` di item menu | `filterMenuItemsByUser` |
| Preload saat hover menu | `components/layout/preloads/<domain>.js` | `preloads/index.js`, `preloads/core.js` |
| Route halaman | `routes/modules/<domain>Routes.jsx` (satu default export, terima `routeContext`, pasang `RouteProtection` sendiri) | `App.jsx`, `centerRoutes`, `adminRoutes`, `roleRoutes`, `publicRoutes` |
| Halaman domain di area pusat/guru/siswa | route di `<domain>Routes.jsx` dengan `allowedRoles`/`allowedLevels` yang sesuai | route file milik role lain |
| Halaman & service | `module/<domain>/`, `service/<domain>/` | `module/auth/` |

- Daftar lengkap file milik `main` ada di [scripts/ci/shared-paths.js](scripts/ci/shared-paths.js). Workflow `guard-shared-paths.yml` **gagal** kalau `feature/*` mengubahnya, dan compose release memulihkannya dari `main`.
- Butuh perubahan di file milik `main` (prop baru di `RouteProtection`, komponen `ui/` baru, role baru)? Kerjakan di `main` dulu, tunggu sync, baru pakai di feature.
- `module/admin` dan `module/center` dirapikan UI-nya di `main`. Feature boleh mengubah logikanya, tapi merge `main` dulu sebelum mulai agar tidak konflik.
- Restyle module domain (CBT, LMS, Finance, Tahfiz, DB) dikerjakan di branch pemiliknya, bukan di `main`.

### Kepemilikan antar branch (supaya sync dan compose tidak rusak)

Setiap file punya **satu pemilik**. Petanya ada di [scripts/ci/shared-paths.js](scripts/ci/shared-paths.js): `MAIN_OWNED_PATHS` untuk `main`, `FEATURE_OWNED_PATHS` untuk tiap feature. Yang paling sering terlewat:

| File | Pemilik | Akibat kalau diedit branch lain |
|---|---|---|
| `module/parent/`, `module/student/dashboard/`, `module/teacher/dashboard/` | `feature/lms` | Diedit di `main` → sync `main → feature/lms` konflik. Diedit di feature lain → ditimpa versi lms saat compose. |
| `server/router/auth/` (`RouterAuth.js`, `domainProfiles.js`) | `main` | Guard feature gagal. Data login khusus domain ditaruh di `server/router/<domain>/authProfile.js` (milik feature itu), bukan di `RouterAuth.js`. |
| `server/middleware/authorize.js` | `feature/lms` | Perubahan dari tahfiz/finance **hilang di produk** (compose memakai versi lms). |
| `components/profile/` | `main` | Guard feature gagal. |
| `server/app.js`, `server/utils/wrapper.js`, `.gitignore` | `main` | Guard feature gagal. Middleware domain dimuat opsional dari `app.js` (cek file ada). Error yang pesannya boleh dilihat pengguna wajib diberi `statusCode`: `throw Object.assign(new Error("Pesan"), { statusCode: 400 })`; tanpa itu wrapper membalas "Transaction failed"/"Internal Server Error". |
| `module/<domain>/`, `service/<domain>/`, `server/router/<domain>/`, `<domain>Menus.jsx`, `<domain>Routes.jsx` | `feature/<domain>` | Diedit di `main` → guard main gagal. |
| Stub fallback, mis. `module/finance/assignment/FinanceStaffSlot.jsx` di lms | pemilik asli (finance) | Didaftarkan di `FALLBACK_STUB_PATHS`. Stub kosong agar produk tanpa domain itu tetap bisa di-build; compose memakai versi asli di produk yang membawanya. Isi stub jangan diubah selain menyamakan API-nya. |
| `database/newtable.sql`, `database/oldtable.sql`, `server/router/migration/RouterMigration.js` | bersama | Hanya ubah bagian domain sendiri dan jangan menyimpan salinan lama dari branch lain (salinan lama menimpa versi terbaru saat compose). Tabel/kolom khusus domain sebaiknya di `database/<domain>_schema.sql`. |

Aturan kerja:

1. **Di `main`**: jangan mengedit file milik feature, termasuk untuk restyle. `guard-shared-paths.yml` gagal (job `guard-main`) bila itu terjadi. Restyle dashboard guru/siswa/orang tua dikerjakan di `feature/lms`.
2. **Di `feature/*`**: jangan mengedit file milik `main` (guard gagal) atau milik feature lain (guard memberi peringatan, dan perubahannya tidak sampai ke produk). Kerjakan di branch pemiliknya.
3. **Satu perubahan, satu branch.** Jangan mengerjakan hal yang sama di `main` dan di feature secara paralel (misalnya restyle dashboard di keduanya), karena pasti konflik.
4. **Data login/profil user per domain** (role tambahan seperti tendik, flag seperti `is_musyrif`, `can_manage_finance`, `has_duty_today`): isi `server/router/<domain>/authProfile.js` dengan `roles` dan/atau `enrichProfile`. Bentuknya dijelaskan di [server/router/auth/domainProfiles.js](server/router/auth/domainProfiles.js). Untuk menolak login, lempar `AuthDeniedError`. Jangan menambah query domain (skema `lms.*`, `tahfiz.*`, `finance.*`) ke `RouterAuth.js`, karena produk tanpa domain itu tidak punya skemanya.
5. **Butuh file baru yang dipakai lintas feature?** Taruh di `main` lalu tambahkan ke `MAIN_OWNED_PATHS`. Path milik feature baru harus ditambahkan ke `FEATURE_OWNED_PATHS` **dan** ke fungsi `restore_<domain>_owned_paths` di ketiga `publish-*.yml`, dengan isi yang sama.
6. **Mengubah `.github/workflows/`**: edit di `main`, lalu merge `main` ke keempat `feature/*` secara manual dan push. Bot sync tidak boleh mendorong file workflow (batasan `GITHUB_TOKEN`), jadi perubahan workflow tidak ikut sync otomatis.

### Kalau sync main gagal

Job `sync (feature/x)` merah artinya `main` dan `feature/x` mengedit file yang sama. File konflik dan perintahnya ada di summary run. Selesaikan secara lokal:

```bash
git fetch origin && git checkout feature/x && git pull
git merge origin/main
# resolve: file milik main → ambil versi main; file milik feature/x → ambil versi feature,
# lalu bawa perubahan main yang masih dibutuhkan. Jangan memakai -X ours/theirs untuk semua file.
npm run lint --prefix client && npm run build --prefix client
git push origin feature/x
```

Push ke `feature/x` otomatis menjalankan publish produk. Selama sync sebuah feature masih merah, workflow publish yang menunggu sync tidak berjalan untuk branch mana pun.

### Kalau publish (compose) gagal

- **`Compose integration branch` gagal di `git diff --quiet origin/feature/lms`**: isi release untuk path milik lms berbeda dari `feature/lms`. Biasanya karena `main` menambah atau mengedit file di folder milik lms. Pindahkan perubahan itu ke `feature/lms`.
- **`Auto-resolving conflicts from feature/x`** di log: dua feature mengedit file yang sama. Compose memilih versi feature terakhir, dan file milik feature lain dipulihkan dari pemiliknya, jadi perubahan non-pemilik hilang. Pindahkan perubahan ke branch pemilik file.
- **`check-undefined-identifiers` gagal**: ada pemanggilan yang import-nya hilang akibat merge. Perbaiki di branch pemilik file.

## 1. Stack UI

- React 19 + Vite, **Ant Design v6** (`antd`), `@ant-design/plots` untuk grafik, `lucide-react` untuk ikon.
- Pakai komponen antd lebih dulu. Jangan menambah library UI lain (MUI, Tailwind, Bootstrap, dsb.) tanpa persetujuan.
- Warna/spacing ambil dari token (`theme.useToken()`), bukan hex yang ditulis ulang di tiap file.
- Teks UI dalam **Bahasa Indonesia** (label, tombol, pesan error, empty state).

## 2. Design token (target)

Sumber kebenaran: [client/src/config/theme.js](client/src/config/theme.js) (`museTheme`, `museColors`, `museShadow`, `museRadius`). Jangan menyalin nilai ke file lain, import dari sana.

Selama migrasi, theme dipasang **per module** di file routes: bungkus komponen halaman dengan `withMuseTheme` dari [withMuseTheme.js](client/src/components/ui/muse/withMuseTheme.js) (contoh: [adminRoutes.jsx](client/src/routes/modules/adminRoutes.jsx)). Module yang sudah dimigrasi: **center**, **admin**. Setelah semua module selesai, provider dipindah ke level `<App />`.

Ringkasan nilainya:

```js
export const museTheme = {
  token: {
    colorPrimary: "#3730AA",         // indigo brand
    colorSuccess: "#52c41a",
    colorWarning: "#FFC85C",         // amber brand; ikon/teks di atasnya pakai navy, bukan putih
    colorError: "#f5222d",
    colorText: "#141414",            // teks utama
    colorTextHeading: "#16115E",     // judul: navy brand
    colorTextSecondary: "#8c8c8c",   // label, muted, header tabel
    colorTextTertiary: "#595959",
    colorBorder: "#d9d9d9",
    colorBgLayout: "#fafafa",        // latar halaman
    colorBgContainer: "#ffffff",
    fontFamily: '"Open Sans", Helvetica, Arial, sans-serif',
    fontSize: 14,
    lineHeight: 1.6,
    borderRadius: 6,                 // input, button, tag
    borderRadiusLG: 12,              // card, header, panel
    controlHeight: 40,               // input & button default
  },
  components: {
    Card: { bodyPadding: 16 },
    Table: {
      headerBg: "transparent",
      headerColor: "#8c8c8c",
      cellPaddingBlock: 16,
      cellPaddingInline: 25,
    },
    Button: { fontWeight: 600 },
  },
};
```

Konstanta pendukung di file yang sama:

| Nama | Nilai | Dipakai untuk |
|---|---|---|
| `museShadow.card` | `0 20px 27px rgba(0,0,0,0.05)` | Card, header saat fixed, item menu aktif |
| `museShadow.icon` | `0 4px 6px rgba(0,0,0,0.12)` | Kotak ikon menu sidebar |
| `museRadius` | `base 6` · `item 8` · `card 12` | Input/tag · kotak ikon/item · card |
| `museColors` | `primary`, `primarySoft`, `success`, `warning`, `danger`, `purple`, `cyan`, `female`, `text`, `muted`, `border`, `divider`, `bgLayout`, `bgSoft` | Semua warna di komponen |

Ganti font `Roboto` di [client/src/index.css](client/src/index.css) menjadi `Open Sans` (400/600/700). Font Arab (Amiri, Noto Naskh Arabic, Aref Ruqaa) tetap untuk konten Tahfiz/CBT berbahasa Arab.

### Palet brand

Sumber: https://colorhunt.co/palette/16115e3730aaff653fffc85c (`brandPalette` di theme.js).

| Warna | Hex | Peran (`museColors`) | Teks di atasnya |
|---|---|---|---|
| Navy | `#16115E` | `navy` / `dark`: judul, teks menu aktif, tone gelap | putih |
| Indigo | `#3730AA` | `primary`: tombol utama, link, item menu aktif, progress | putih |
| Coral | `#FF653F` | `accent`: aksen/sorotan sekunder, ikon penanda | putih (hanya ikon/teks besar) |
| Amber | `#FFC85C` | `warning`: status perlu perhatian, tone stat | **navy** (`museOnColor.warning`) |

`success` (`#52c41a`) dan `danger` (`#f5222d`) tetap warna semantik antd; jangan ganti dengan coral, supaya error tetap jelas berbeda dari aksen. Jangan menaruh teks putih kecil di atas coral atau amber (kontras di bawah 4.5:1).

## 3. Layout shell ([AppLayout.jsx](client/src/components/layout/AppLayout.jsx))

Sudah diterapkan untuk semua module. Theme shell: `museShellTheme`; CSS item menu: [sidebar.css](client/src/components/layout/sidebar.css).

- **Sidebar**: lebar `250px` (`museLayout.siderWidth`), latar `#fafafa` menyatu dengan halaman, sticky. Default **terbuka** di ≥992px; tombol di header bisa mengecilkannya jadi rail ikon `80px`. Di bawah 992px jadi drawer dengan overlay navy transparan, tertutup otomatis setelah klik menu.
  - Ikon menu dibungkus otomatis jadi `.muse-menu-icon` oleh `enhanceMenuItems`; file `menus/*.jsx` cukup memberi `icon` biasa.
  - Di bawah menu ada kartu user (gradien indigo ke navy) dengan tombol Keluar.
  - Brand: logo tinggi `30px` + nama aplikasi `font-weight: 600`, lalu `<hr>` 1px `#f5f5f5` margin `18px 0`.
  - Item menu: padding `10px 16px`, radius `8px`, teks `#141414`.
  - Ikon item: kotak `32×32`, latar putih, radius `6px`, `shadowIcon`, jarak kanan `11px`.
  - Item aktif: latar putih + `shadowCard` + `font-weight: 600`; kotak ikonnya berubah ke `colorPrimary` dengan ikon putih.
  - Judul grup menu: `13px`, `700`, uppercase, warna `#8c8c8c`.
- **Mobile/tablet (<992px)**: sidebar menjadi drawer dengan overlay gelap, tertutup otomatis setelah klik menu (perilaku ini sudah ada, pertahankan).
- **Header**: sticky, transparan, radius `12px`. Saat halaman di-scroll (>8px) menjadi putih + `museShadow.card` (kelas `.muse-header.is-scrolled`).
  - Kiri: breadcrumb (link `#8c8c8c`, item terakhir `#141414`) + judul halaman `16px/700`.
  - Kanan: avatar & dropdown user, notifikasi, toggle sidebar di mobile.
- **Content**: latar `colorBgLayout` (`#fafafa`) polos. Tidak ada gradien radial di latar konten; kartu yang memberi struktur.
- **Footer**: kecil, `12px`, `#8c8c8c`, rata tengah.

## 4. Komponen

Komponen siap pakai ada di [client/src/components/ui/muse/index.jsx](client/src/components/ui/muse/index.jsx). Pakai ini dulu sebelum menulis style sendiri:

| Komponen | Kegunaan |
|---|---|
| `MuseCard` | Card criclebox. `flush` untuk card berisi tabel (body padding 0). |
| `CardTitle` | Judul card / modal: ikon opsional + judul 16/600 + deskripsi muted. |
| `StatCard` | Kartu statistik (label, angka, `suffix`, `note`, ikon, `tone`, `compact`). |
| `IconBox` | Kotak ikon solid; `tone` = kunci `museColors` atau hex. |
| `MuseThemeProvider` | Pasang `museTheme` untuk satu subtree. |
| `PageTabs` | Halaman multi-bagian: judul + navigasi `Segmented`; tab aktif disimpan di `?tab=`. |

Di [DataSection.jsx](client/src/components/ui/muse/DataSection.jsx):

| Komponen | Kegunaan |
|---|---|
| `DataListCard` | Card daftar data: judul + jumlah, `searchProps` (Input.Search), `extra`, tombol tambah (`onAdd`). |
| `DataRow` | Satu baris data: IconBox, judul, subjudul, tag, aksi. Dipakai di dalam `DataListCard` / `InfiniteScrollList` (`grid={{ gutter: [0, 0], xs: 24 }}`). |
| `EditDeleteActions` | Tombol edit + hapus (Popconfirm) standar, bisa dinonaktifkan dengan alasan. |
| `FormModal` | Modal form standar: `CardTitle` di judul, footer Batal/Simpan bawaan, `onOk={form.submit}`. |

Di [ImportKit.jsx](client/src/components/ui/muse/ImportKit.jsx): `ImportDrawer` (drawer impor Excel dengan status + aksi di header), `UploadDropzone`, `ImportStats` (total / valid / perlu cek).

Judul halaman memakai [PageHeader.jsx](client/src/components/ui/PageHeader.jsx), dengan pencarian dan tombol aksi utama di prop `extra`.

### Card ("criclebox")
- `variant="borderless"`, radius `12px`, `shadowCard`, body padding `16px`.
- Judul card: `16–20px`, `600`. Card berisi tabel: body padding `0` (kelas `tablespace`), judul `20px/600`, header tanpa garis bawah.
- Hindari radius 22, latar semi-transparan, atau gradien warna-warni di card baru.

### Kartu statistik (dashboard)
- Label `14px/600` `#8c8c8c`, angka `30px/700` `#141414`, delta kecil `14px/600` hijau (`#52c41a`) atau merah (`#f5222d`).
- Ikon di kanan: kotak `48×48`, latar `colorPrimary`, ikon putih `24px`, radius `8px`.
- Grid: `Row gutter={[24, 24]}`, `Col xs={24} sm={12} xl={6}`.

### Tabel
- Header: transparan, `12px`, `700`, `#8c8c8c`, tanpa pemisah kolom, teks judul kolom **UPPERCASE** (`'NAMA GURU'`).
- Sel: padding `16px 25px`, `white-space: nowrap`; bungkus dengan scroll horizontal (`scroll={{ x: true }}`).
- Kolom pertama biasanya avatar + nama (judul `14px/600`) + subjudul muted.
- Status pakai `Tag`; aksi di kolom terakhir pakai tombol `type="link"`/ikon.

### Form & input
- Tinggi input `40px`, radius `6px`, border `#d9d9d9`, teks input `600`.
- Label di atas field (`layout="vertical"`). Tombol utama di kanan bawah form/modal.
- Validasi lewat `Form.Item rules`, pesan dalam Bahasa Indonesia.

### Tombol
- `font-weight: 600`. Satu tombol `type="primary"` per area aksi; lainnya `default`/`text`.
- Aksi berbahaya: `danger` + `Popconfirm` / `Modal.confirm`.

### Tab
- **Tab halaman** (`PageTabs`, `Segmented`): `size="middle"` (tinggi item 32px) di semua lebar layar, **jangan** `size="large"`. Label: ikon `14px` + teks `14px/600`, jarak ikon–teks `6px`, padding label `0 4px`, track padding `3px`. Ukuran ini sudah diatur di `PageTabs`; ikon `item.icon` otomatis dikecilkan ke 14.
- **Tab bertingkat** (`Tabs` di dalam bagian/drawer): pakai ukuran default (`middle`), `small` untuk tab di dalam card/drawer sempit atau di bawah 768px. Jangan `size="large"` dan jangan `tabBarGutter`/padding tambahan.
- Label tab satu baris (`nowrap`), tanpa caption/deskripsi di bawah label; deskripsi bagian taruh di prop `description` item `PageTabs`.
- Bila tab lebih lebar dari layar, biarkan scroll horizontal di wadah tab (sudah ada di `PageTabs`), jangan diperkecil di bawah ukuran di atas.

### Grafik (`@ant-design/plots`)
- Grafik utama boleh di dalam card berlatar gradien `colorPrimary` (gaya "bar chart" Muse) dengan teks putih; grafik sekunder di card putih.
- Garis/area tipis, grid samar, tanpa border chart. Progress bar tinggi `3px`.

### Ikon
- `lucide-react` untuk ikon konten & menu (ukuran 16–18 di menu, 24 di icon-box).
- `@ant-design/icons` hanya untuk ikon bawaan komponen antd (toggle sidebar, caret, dsb). Jangan campur dua set di satu baris.

### Typography
- `h3`/`h4` `700` `#141414`. Judul halaman via [PageHeader.jsx](client/src/components/ui/PageHeader.jsx).
- Teks muted: `#8c8c8c`. Teks body: `rgba(0,0,0,0.65)`.

### Pola halaman

Pilih salah satu pola ini sebelum menulis halaman baru (contoh nyata di module admin):

1. **Dashboard**: `PageHeader` (+ `meta` tag status) → grid `StatCard` (`repeat(auto-fit, minmax(200px, 1fr))`) → `Row` 2 kolom (ringkasan + akses cepat | tabel aktivitas). Contoh: [AdminDash.jsx](client/src/module/admin/dashboard/AdminDash.jsx).
2. **Halaman multi-bagian**: `PageTabs` di level halaman; tiap bagian dirender langsung di latar halaman, **bukan** Tabs di dalam card. Tab bertingkat di dalam bagian memakai `Tabs` biasa + query param sendiri (contoh `?sub=`). Contoh: [AdminMain.jsx](client/src/module/admin/main/AdminMain.jsx), [Subject.jsx](client/src/module/admin/academic/subject/Subject.jsx).
3. **Data master sederhana** (periode, tingkat, jurusan, kategori): `StatCard` hanya jika angkanya bermakna → `DataListCard` berisi `DataRow` → `FormModal`. Jangan tampilkan statistik yang hanya mencerminkan status scroll ("data dimuat", "sisa data").
4. **Tabel data besar** (guru, siswa, tendik): `DataListCard flush` berisi `Table` (header UPPERCASE); di mobile ganti `List` dengan kartu ber-border. Aksi Template/Import/Download di `extra`, tambah di `onAdd`.
5. **Impor Excel**: `ImportDrawer` → `ImportStats` → `Collapse` panduan → `UploadDropzone` atau card review berisi tabel.
6. **Form panjang**: `Drawer` dengan `title={<CardTitle/>}`, isi dibagi beberapa `MuseCard`, tombol Simpan di `footer` drawer agar selalu terlihat.

Deep-link ke bagian tertentu lewat URL, misalnya `/admin-data-pokok?tab=class` atau `/admin-data-akademik?tab=subject&sub=categories`.

## 5. Spacing

- Skala: `4 / 8 / 12 / 16 / 24 / 25 / 33` px (kelipatan 8 untuk gap umum; 25 & 33 khusus Muse).
- Jarak antar section di halaman: `24px`. Gutter grid: `24` (desktop), `16` (mobile).
- Breakpoint ikuti antd (`xs <576`, `sm`, `md ≥768`, `lg ≥992`, `xl ≥1200`). Gunakan `Grid.useBreakpoint()`.

## 6. Pola UX

- **Loading**: `Skeleton` untuk konten halaman/card, `Spin` hanya untuk aksi kecil. Jangan layar putih kosong.
- **Empty state**: `Empty` dengan kalimat yang menjelaskan langkah berikutnya + tombol aksi bila ada.
- **Error**: `Alert type="error"` di dalam card, dengan pesan dari server bila ada (`error?.data?.message`). Di antd v6 pakai `title=`, bukan `message=` (deprecated).
- **Modal**: judul pakai `<CardTitle>` di prop `title`. Jangan ada hero gradien atau card bertumpuk di dalam modal; form langsung di body, catatan/tips pakai `Alert type="info"`.
- **Tab**: pakai prop `icon` + `label` teks biasa, ukuran ikuti §4 "Tab". Jangan membuat kotak ikon bergradien di label tab.
- **Feedback aksi**: `message.success` / `message.error` (lebih baik lewat `App.useApp()` agar ikut theme), kalimat singkat: "Data siswa berhasil disimpan".
- **Konfirmasi**: hapus/reset/publish wajib dikonfirmasi; sebutkan objek yang terdampak.
- **Responsif**: setiap halaman harus bisa dipakai di lebar 360px tanpa scroll horizontal halaman (tabel boleh scroll di dalam card).
- **Aksesibilitas**: kontras teks minimal 4.5:1, semua tombol ikon diberi `aria-label`/`Tooltip`, fokus keyboard terlihat.
- **Halaman ujian CBT siswa** boleh layout khusus (tanpa sidebar) demi fokus, tapi tetap memakai token yang sama.

## 7. Aturan migrasi

UI lama belum sepenuhnya mengikuti Muse (sidebar gelap `#001529`, card radius 22, gradien di latar konten, font Roboto, hex tersebar per file). Status: shell (sidebar, header, latar konten), module **center**, dan module **admin** sudah dimigrasi dan bisa jadi contoh; module lain (cbt, lms, finance, tahfiz, teacher, student) belum. Aturannya:

1. Halaman/komponen **baru** wajib mengikuti dokumen ini.
2. Saat **menyentuh** halaman lama, rapikan bagian yang disentuh saja (ganti hex jadi token, card jadi gaya criclebox). Jangan refactor besar di dalam PR fitur.
3. Perubahan shell (sidebar, header, theme global, font) dikerjakan sekali di `main` dalam PR terpisah, lalu disebar oleh sync workflow.
4. Jangan menyalin aset, logo, ilustrasi, atau kode berlisensi dari Muse Pro. Yang diacu adalah gaya visual dan nilai desainnya.

## 8. Checklist sebelum commit UI

- [ ] Warna, radius, shadow dari token/konstanta theme, tidak ada hex baru yang hardcode.
- [ ] Card, tabel, form mengikuti §4.
- [ ] Ada state loading, kosong, dan error.
- [ ] Dicek di lebar 360px, 768px, dan ≥1200px.
- [ ] Teks UI Bahasa Indonesia dan konsisten.
- [ ] `npm run lint` di `client/` lolos.
