# Penyimpanan gambar

Semua gambar CMS diunggah ke server aplikasi (bukan URL eksternal).

## Lokasi file

| Lingkungan | Path default |
|------------|----------------|
| Development | `{project}/public/uploads/` |
| Production VPS | sama, atau `UPLOAD_DIR` kustom |

URL publik: `/uploads/{kategori}/{tahun}/{bulan}/{file}`

Contoh: `/uploads/cms/2026/05/1748420000-a1b2c3d4.jpg`

File dilayani oleh route `app/uploads/[...path]/route.js` (bukan static Next.js semata). Route ini diperlukan karena di App Router handler `/uploads/*` menimpa file di `public/uploads`, dan file yang diunggah setelah build harus tetap bisa dibaca.

## Variabel lingkungan

```env
# Opsional. Default: ./public/uploads
# Gunakan path absolut di VPS jika ingin volume terpisah (disarankan production):
# UPLOAD_DIR=/var/www/educore/data/uploads
UPLOAD_DIR=
```

Jika `UPLOAD_DIR` di luar folder `public/`, file tetap dilayani lewat route yang sama.

## VPS (production)

1. Pastikan folder upload ada dan bisa ditulis proses Node:

   ```bash
   mkdir -p public/uploads
   chmod 755 public/uploads
   ```

2. **Penting:** backup atau mount volume ke `public/uploads` (atau set `UPLOAD_DIR` di luar folder deploy) agar file tidak hilang saat redeploy.

   ```yaml
   # contoh docker-compose volume
   volumes:
     - ./data/uploads:/app/public/uploads
   ```

3. Jalankan `npm run build && npm start` — script `ensure-upload-dir` membuat folder otomatis.

4. Workflow CI mengecualikan `public/uploads` dari bundle deploy dan memulihkan folder upload yang sudah ada di VPS.

## API upload

`POST /api/upload` — `multipart/form-data`

| Field | Nilai |
|-------|--------|
| `file` | File gambar (max 5 MB saat unggah) |
| `category` | `cms`, `school`, `spmb`, `spmb_docs` |

Memerlukan login sesuai role. Semua gambar dioptimasi otomatis dengan **Sharp** (resize + WebP) sehingga file tersimpan **di bawah 1 MB**.

Komponen publik memakai `AppImage` yang melewati optimizer `/_next/image` untuk URL `/uploads/*` (sudah WebP), sehingga `src` tetap `/uploads/...`.

## Format yang didukung

JPEG, PNG, WebP, GIF
