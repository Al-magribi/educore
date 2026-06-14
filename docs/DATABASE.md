# Database PostgreSQL — EduCore CMS

## Setup

1. Buat database PostgreSQL:

```sql
CREATE DATABASE educore_cms;
```

2. Salin environment:

```bash
cp .env.example .env
```

Edit `DATABASE_URL` di `.env`, contoh:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/educore_cms?schema=public"
```

3. Jalankan migrasi & seed:

```bash
npm run db:migrate
npm run db:seed
```

Atau tanpa migration history (prototipe cepat):

```bash
npm run db:push
npm run db:seed
```

## Scripts

| Perintah | Fungsi |
|----------|--------|
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Migrasi development |
| `npm run db:push` | Sync schema ke DB |
| `npm run db:seed` | Data awal + akun admin |
| `npm run db:studio` | Prisma Studio UI |
| `npm run db:reset` | Reset DB + migrate + seed |

## Akun seed (development)

| Email | Password | Role |
|-------|----------|------|
| admin@educore.local | Admin123! | super_admin |
| spmb@educore.local | Spmb123! | spmb_admin |

## Skema ringkas

- **Auth:** `users`, `sessions`, `accounts`, `email_verification_codes`, `password_reset_tokens`
- **CMS:** `school_settings`, `theme_settings`, `home_sections`, `home_section_items`, `about_pages`, `news_posts`
- **SPMB:** `spmb_landing_content`, `admission_periods`, `form_definitions`, `questionnaires`, `applications`, `payments`, `payment_settings`, `smtp_settings`

### Pengaturan Midtrans & SMTP (database)

| Tabel | Field penting |
|-------|----------------|
| `payment_settings` | `midtrans_enabled`, `midtrans_server_key`, `midtrans_client_key`, `manual_enabled`, `manual_instructions`, rekening bank |
| `smtp_settings` | `enabled`, `host`, `port`, `user`, `password`, `from_email` |

Admin: `/spmb-admin/pembayaran` dan `/spmb-admin/smtp`  
API: `PUT /api/spmb-admin/payment-settings`, `PUT /api/spmb-admin/smtp-settings`

Server key & password SMTP dienkripsi jika `SETTINGS_ENCRYPTION_KEY` di `.env`.

Gunakan `getDb()` atau `prisma` dari `src/lib/db.js`.  
Modul: `getPaymentSettingsForServer()`, `getSmtpSettingsForServer()` dari `src/modules/payment` dan `src/modules/mail`.
