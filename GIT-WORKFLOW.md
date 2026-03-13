# Git Workflow

Panduan ini membedakan branch kerja dan branch produk. Jangan gunakan perintah yang sama untuk semua branch.

## Jenis Branch

- `main`
  Sumber utama pengembangan dan branch basis semua fitur.
- `feature/*`
  Branch kerja fitur seperti `feature/db`, `feature/lms`, `feature/tahfiz`, `feature/finance`.
- `product/*`
  Branch hasil publish otomatis dari GitHub Actions. Contoh: `product/cbt`.

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

## Branch `product/*`

`product/*` bukan branch kerja manual. Branch ini diperbarui otomatis oleh workflow publish produk dan bisa mengalami `force push`.

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

## Larangan

- Jangan `git pull` biasa di `product/*`.
- Jangan `git push` manual ke `product/*`.
- Jangan `git push --force` ke branch kerja kecuali benar-benar perlu.
- Jika perlu force push setelah rebase, gunakan `--force-with-lease`.
