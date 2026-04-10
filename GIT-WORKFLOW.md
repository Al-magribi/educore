# Git Workflow

Panduan ini membedakan branch kerja, branch integrasi, dan branch produk. Jangan gunakan perintah yang sama untuk semua branch.

## Ringkasan Cepat

Gunakan aturan sederhana ini agar tidak salah branch:

- Kerja fitur harian di `feature/*`.
- Perubahan dasar bersama dan perubahan workflow di `main`.
- Jangan kerja manual di `release/*`.
- Jangan kerja manual di `product/*`.

Alur normal tim:

```text
developer commit ke main
  -> sync-main-to-features.yml merge main ke feature/*
  -> publish-cbt-db-lms-finance.yml compose release/cbt-db-lms-finance
  -> publish-cbt-db-lms-finance.yml build dan publish product/cbt-db-lms-finance
```

Alur saat developer kerja di feature:

```text
developer commit ke feature/db | feature/lms | feature/finance
  -> publish-cbt-db-lms-finance.yml compose release/cbt-db-lms-finance
  -> publish-cbt-db-lms-finance.yml build dan publish product/cbt-db-lms-finance
```

## Jenis Branch

- `main`
  Sumber utama pengembangan dan branch basis semua fitur.
- `feature/*`
  Branch kerja fitur seperti `feature/db`, `feature/lms`, `feature/tahfiz`, `feature/finance`.
- `release/*`
  Branch integrasi otomatis untuk menggabungkan beberapa branch sumber sebelum dipublish menjadi branch produk.
- `product/*`
  Branch hasil publish otomatis dari GitHub Actions. Contoh: `product/cbt`, `product/cbt-db-lms-finance`.

## Siapa Mengerjakan Apa

- `main`
  Dipakai untuk perubahan dasar yang harus dimiliki semua branch, termasuk perubahan di `.github/workflows/*`.
- `feature/*`
  Dipakai untuk kerja fitur manual per domain.
- `release/*`
  Dipakai bot GitHub Actions untuk hasil compose beberapa branch sumber.
- `product/*`
  Dipakai bot GitHub Actions untuk hasil build yang siap dipakai deploy.

## Aturan Umum

- Selalu cek status sebelum pindah branch:
  ```bash
  git status
  ```
- Jika ada perubahan lokal yang belum siap di-commit:
  ```bash
  git stash
  ```
- Untuk mengambil ulang perubahan dari stash:
  ```bash
  git stash pop
  ```

## Branch `main`

Yang sebaiknya masuk lewat `main`:

- perubahan shared code yang harus ikut ke semua `feature/*`
- perubahan dokumentasi alur Git
- perubahan `.github/workflows/*`

Catatan penting:

- Workflow `sync-main-to-features.yml` memang jalan saat `main` berubah.
- Tetapi workflow itu sengaja mempertahankan isi `.github/workflows/*` dari branch target.
- Jadi perubahan workflow tetap harus dianggap perubahan yang sumber kebenarannya ada di `main`.

Ambil update:

```bash
git checkout main
git fetch origin
git pull --ff-only origin main
```

Push perubahan:

```bash
git checkout main
git add .
git commit -m "pesan commit"
git push origin main
```

## Branch `feature/*`

Contoh di bawah memakai `feature/lms`. Ganti nama branch sesuai kebutuhan.

Pastikan branch lokal sudah terhubung ke upstream yang benar:

```bash
git branch -vv
```

Jika `feature/lms` belum menunjuk ke `origin/feature/lms`, set sekali:

```bash
git branch --set-upstream-to=origin/feature/lms feature/lms
```

Ambil update branch yang sama dari remote:

```bash
git checkout feature/lms
git fetch origin
git rebase origin/feature/lms
```

Push perubahan:

```bash
git push origin feature/lms
```

Jika upstream branch sudah benar, perintah ini juga boleh:

```bash
git push
```

Tetapi untuk menghindari salah target, tetap disarankan memakai bentuk eksplisit:

```bash
git push origin feature/lms
```

Jika habis rebase push ditolak:

```bash
git push --force-with-lease origin feature/lms
```

Sinkronkan `main` ke branch fitur:

```bash
git checkout feature/lms
git fetch origin
git merge origin/main
git push origin feature/lms
```

Jika ingin histori lebih rapi dan siap menangani konflik:

```bash
git checkout feature/lms
git fetch origin
git rebase origin/main
git push --force-with-lease origin feature/lms
```

`feature/*` tetap branch kerja manual. Workflow `sync-main-to-features.yml` akan membantu memasukkan perubahan dari `main` ke semua branch fitur saat `main` berubah.

Catatan penting:

- Sinkronisasi otomatis dari `main` ke `feature/*` sengaja tidak ikut menyalin perubahan di `.github/workflows/*`.
- Alasan utamanya: bot GitHub Actions yang dipakai untuk sync tidak memiliki izin `workflows`, sehingga perubahan workflow harus tetap dilakukan dari branch yang memang punya kredensial yang sesuai, biasanya `main`.
- Kalau ada perubahan workflow di `main`, branch feature lokal Anda tidak otomatis berubah file workflow-nya. Itu normal.
- Untuk pekerjaan harian, fokus saja pada kode fitur. Jangan mengedit workflow dari branch feature kecuali memang sedang memperbaiki alur CI dan tahu konsekuensinya.

## Branch `release/*`

`release/*` bukan branch kerja manual. Branch ini dibentuk ulang oleh GitHub Actions sebagai branch integrasi.

Branch integrasi yang dipakai untuk produk gabungan adalah:

- `release/cbt-db-lms-finance`

Workflow `publish-cbt-db-lms-finance.yml` menyusun branch ini dengan urutan tetap:

1. `main`
2. `feature/db`
3. `feature/lms`
4. `feature/finance`

Target hasil akhirnya adalah:

```text
main + feature/db + feature/lms + feature/finance
```

Setelah ada push ke `feature/db`, `feature/lms`, atau `feature/finance`, perubahan tidak langsung muncul di branch produk lokal Anda. Perubahan akan masuk dulu ke `release/cbt-db-lms-finance`, lalu dibuild ulang ke `product/cbt-db-lms-finance` oleh GitHub Actions.

Yang dilakukan workflow publish:

1. checkout `origin/main` sebagai basis
2. merge `feature/db`
3. merge `feature/lms`
4. merge `feature/finance`
5. build hasil compose
6. validasi file router API
7. force-push hasilnya ke `release/cbt-db-lms-finance`

Jika ada konflik merge pada file yang sama, workflow akan memilih isi dari branch yang sedang di-merge. Dengan urutan di atas, prioritas konflik menjadi:

1. `feature/finance`
2. `feature/lms`
3. `feature/db`
4. `main`

Jangan jalankan:

```bash
git pull
git push
```

ke branch `release/*` secara manual.

## Branch `product/*`

`product/*` bukan branch kerja manual. Branch ini diperbarui otomatis oleh workflow publish produk dan bisa mengalami `force push`.

Branch produk yang digunakan:

- `product/cbt`
  Hasil publish otomatis dari `main`.
- `product/cbt-db-lms-finance`
  Hasil build otomatis dari `release/cbt-db-lms-finance`.

Jangan jalankan:

```bash
git pull
```

Gunakan pola deploy ini:

```bash
git checkout product/cbt
git fetch origin
git reset --hard origin/product/cbt
```

Untuk produk gabungan:

```bash
git checkout product/cbt-db-lms-finance
git fetch origin
git reset --hard origin/product/cbt-db-lms-finance
```

Catatan penting:

- `product/cbt-db-lms-finance` selalu mengikuti hasil build terbaru dari `release/cbt-db-lms-finance`.
- Jika branch produk lokal tampak "aneh", jangan diperbaiki manual. Refresh dari `origin/product/...`.
- Branch produk bisa berubah lewat `force push`, jadi wajar kalau histori lokalnya kadang divergen.

Jika `git fetch` gagal karena branch `release/*` atau `product/*` di-`force push` oleh workflow, hapus ref remote-tracking yang bentrok lalu fetch ulang:

```bash
git update-ref -d refs/remotes/origin/product/cbt-db-lms-finance
git update-ref -d refs/remotes/origin/release/cbt-db-lms-finance
git fetch origin --prune
git reset --hard origin/product/cbt-db-lms-finance
```

Setelah itu restart service aplikasi:

```bash
npm install
pm2 restart asdh
```

Sesuaikan nama service `pm2` dengan server yang dipakai.

Jika sebelumnya sempat membuat stash di branch produk, lihat dulu:

```bash
git stash list
```

Kalau stash itu hanya sisa deploy lama dan tidak dibutuhkan:

```bash
git stash drop
```

## Clone Awal

Clone source kerja:

```bash
git clone -b main https://github.com/Al-magribi/educore .
```

Clone branch produk:

```bash
git clone -b product/cbt https://github.com/Al-magribi/educore .
```

Clone branch produk gabungan:

```bash
git clone -b product/cbt-db-lms-finance https://github.com/Al-magribi/educore .
```

## Workflow Otomatis

Workflow yang aktif:

- `sync-main-to-features.yml`
  Saat `main` berubah, workflow ini merge `main` ke `feature/db`, `feature/lms`, `feature/tahfiz`, dan `feature/finance`, tetapi tetap mempertahankan isi `.github/workflows/*` milik branch target.
- `build-main.yml`
  Saat `main` berubah, workflow ini build dan publish `product/cbt`.
- `publish-cbt-db-lms-finance.yml`
  Workflow ini akan:
  - jalan saat `feature/db`, `feature/lms`, atau `feature/finance` berubah
  - jalan setelah `sync-main-to-features.yml` selesai dengan status sukses
  - menyusun `release/cbt-db-lms-finance`
  - build hasil gabungan
  - publish ke `product/cbt-db-lms-finance`

Alur produknya:

```text
main
  -> sync ke feature/db, feature/lms, feature/finance
  -> compose release/cbt-db-lms-finance
  -> publish product/cbt-db-lms-finance
```

Versi pendeknya:

- mau perubahan dasar tersebar ke semua feature: push ke `main`
- mau produk gabungan ikut update dari feature: push ke `feature/db`, `feature/lms`, atau `feature/finance`
- mau deploy produk gabungan: refresh dari `origin/product/cbt-db-lms-finance`

## Jika Perubahan Feature Belum Masuk Ke Product

Urutan cek yang benar:

1. Pastikan commit sudah masuk ke remote feature:
   ```bash
   git checkout feature/lms
   git fetch origin
   git log --oneline origin/feature/lms -n 5
   ```
2. Pastikan workflow `Publish Product CBT + DB + LMS + Finance` di GitHub Actions sukses.
3. Refresh branch produk lokal:
   ```bash
   git checkout product/cbt-db-lms-finance
   git fetch origin --prune
   git reset --hard origin/product/cbt-db-lms-finance
   ```

Jika setelah langkah di atas perubahan masih belum muncul, periksa apakah konflik merge otomatis memilih isi branch lain pada file yang sama.

Urutan diagnosis yang paling aman:

1. cek commit sudah ada di remote branch sumber
2. cek `release/cbt-db-lms-finance` sudah bergerak
3. cek `product/cbt-db-lms-finance` sudah build ulang
4. baru refresh branch produk lokal

## Larangan

- Jangan `git pull` biasa di `product/*`.
- Jangan `git pull` atau `git push` manual di `release/*`.
- Jangan `git push` manual ke `product/*`.
- Jangan `git push --force` ke branch kerja kecuali benar-benar perlu.
- Jika perlu force push setelah rebase, gunakan `--force-with-lease`.
