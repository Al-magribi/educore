# Git Workflow

Panduan ini membedakan branch kerja, branch integrasi, dan branch produk. Jangan gunakan perintah yang sama untuk semua branch.

## Jenis Branch

- `main`
  Sumber utama pengembangan dan branch basis semua fitur.
- `feature/*`
  Branch kerja fitur seperti `feature/db`, `feature/lms`, `feature/tahfiz`, `feature/finance`.
- `release/*`
  Branch integrasi otomatis untuk menggabungkan beberapa branch sumber sebelum dipublish menjadi branch produk.
- `product/*`
  Branch hasil publish otomatis dari GitHub Actions. Contoh: `product/cbt`, `product/cbt-db-lms-finance`.

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
  Saat `main` berubah, workflow ini merge `main` ke `feature/db`, `feature/lms`, `feature/tahfiz`, dan `feature/finance`.
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

## Larangan

- Jangan `git pull` biasa di `product/*`.
- Jangan `git pull` atau `git push` manual di `release/*`.
- Jangan `git push` manual ke `product/*`.
- Jangan `git push --force` ke branch kerja kecuali benar-benar perlu.
- Jika perlu force push setelah rebase, gunakan `--force-with-lease`.
