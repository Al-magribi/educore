# Panduan Perakitan Hardware — ESP32 + MFRC522 + LCD + Buzzer

Dokumentasi ini menjelaskan cara merakit unit reader RFID presensi EduCore LMS dari nol: daftar komponen, urutan sambungan kabel, dan langkah uji sebelum upload firmware produksi.

**Firmware terkait:**

| File | Kegunaan |
|------|----------|
| [`esp32_rfid_hardware_test.ino`](./esp32_rfid_hardware_test.ino) | Uji LCD, kabel MFRC522, dan baca kartu |
| [`esp32_rfid_attendance_mfrc522.ino`](./esp32_rfid_attendance_mfrc522.ino) | Firmware produksi (WiFi + API presensi) |

Untuk konfigurasi server, device admin, dan policy absensi, lihat [`rfid_attendance_panduan.md`](./rfid_attendance_panduan.md).

---

## 1. Daftar Komponen

| No | Komponen | Spesifikasi | Catatan |
|----|----------|-------------|---------|
| 1 | ESP32 DevKit V1 | 30 pin, WiFi + Bluetooth | Atau papan ESP32 kompatibel dengan pin GPIO sama |
| 2 | Modul MFRC522 | 13.56 MHz, SPI | **Wajib 3.3V** — jangan sambung ke 5V |
| 3 | LCD I2C 16×2 | Modul dengan chip PCF8574 | Alamat I2C umum: `0x27` atau `0x3F` |
| 4 | Buzzer aktif | 5V atau 3.3V, 1 pin sinyal | Modul dengan transistor sudah cukup |
| 5 | Kartu/tag RFID | MIFARE 13.56 MHz | Untuk uji baca UID |
| 6 | Kabel jumper | Female–female / male–female | Ganti jika sering putus kontak |
| 7 | Breadboard (opsional) | — | Memudahkan prototipe — bisa diganti base plate |
| 8 | Base plate extension (opsional) | ESP32 DOIT V1 **30 pin** | Shield expander GVS + power; lihat [§3](#3-base-plate-extension-esp32-doit-v1-30-pin) |
| 9 | Power supply | USB 5V 1A+ | Via micro-USB ESP32, base plate, atau VIN 5V stabil |
| 10 | Casing (opsional) | Box ABS / 3D print | Lindungi modul dari debu & benturan |

**Library Arduino IDE** (install via Library Manager):

- `MFRC522` by GithubCommunity
- `LiquidCrystal I2C` by Frank de Brabander
- `ArduinoJson` by Benoit Blanchon (v6+) — untuk firmware produksi
- Board package: **esp32** by Espressif Systems

---

## 2. Peta Pin ESP32 (DevKit V1)

Pin berikut dipakai oleh sketch referensi EduCore:

| GPIO | Fungsi | Komponen |
|------|--------|----------|
| **D4** (GPIO 4) | Output digital | Buzzer (+) |
| **D5** (GPIO 5) | SPI SS / SDA | MFRC522 SDA |
| **D18** (GPIO 18) | SPI SCK | MFRC522 SCK |
| **D19** (GPIO 19) | SPI MISO | MFRC522 MISO |
| **D21** (GPIO 21) | I2C SDA | LCD SDA |
| **D22** (GPIO 22) | Output digital | MFRC522 RST |
| **D23** (GPIO 23) | SPI MOSI | MFRC522 MOSI |
| **D27** (GPIO 27) | I2C SCL | LCD SCL |
| **3V3** | Power 3.3V | MFRC522 VCC |
| **5V / VIN** | Power 5V | LCD VCC |
| **GND** | Ground | Semua modul (satu titik GND bersama) |

> **Penting:** MFRC522 **SDA** (chip select SPI) **bukan** I2C SDA. Jangan sambungkan MFRC522 SDA ke D21 — itu pin LCD.

---

## 3. Base Plate Extension (ESP32 DOIT V1 30-pin)

Jika memakai **base plate extension / expansion shield** khusus **ESP32 DOIT DevKit V1 30 pin** (bukan 38 pin), perakitan lebih rapi tanpa breadboard. Mapping GPIO **sama** dengan tabel di §2 — yang berubah hanya cara mengambil pin (header GVS di shield).

### 3.1 Cocokkan versi papan

| Cek | Keterangan |
|-----|------------|
| Jumlah pin ESP32 | **30 pin** (15 per sisi) — base plate 30P **tidak** cocok untuk DevKit 38 pin |
| Arah pasang | Pin ESP32 harus sejajar dengan soket shield; jangan dipaksa jika macet |
| Label pin | Ikuti label **GPIO / Dx** di silkscreen base plate, bukan hanya urutan fisik |

### 3.2 Pasang ESP32 ke base plate

1. **Matikan semua power** (cabut USB / adaptor DC).
2. Sejajarkan ESP32 ke female header base plate (biasanya micro-USB ESP32 menghadap sisi yang sama dengan port power shield).
3. Tekan merata kedua sisi sampai duduk penuh — jangan miring (bisa bengkokkan pin).
4. Pastikan LED power menyala setelah colok USB **di ESP32** (untuk upload sketch) atau power di base plate (untuk operasional).

> **Upload firmware:** tetap gunakan port USB **di board ESP32** (chip USB-UART). Port USB/Type-C di base plate biasanya **hanya power**, bukan programming.

### 3.3 Layout header GVS

Kebanyakan base plate memecah tiap GPIO menjadi 3 baris:

| Baris | Arti | Dipakai untuk |
|-------|------|----------------|
| **G** | GND | Semua modul (−) |
| **V** | VCC (3.3V atau 5V, sesuai jumper/switch) | Power modul |
| **S** | Signal (GPIO) | Sinyal: SDA, SCK, MOSI, MISO, RST, SCL, buzzer, dll. |

Contoh: MFRC522 **SDA** → colok jumper ke baris **S** di kolom pin **D5** (GPIO 5), bukan ke baris V atau G.

### 3.4 Power & jumper tegangan (penting)

Base plate biasanya punya:

- Input: **Type-C**, **Micro USB**, dan/atau **jack DC** (sering 5–12V / adaptor 9V)
- Header power terpisah: **3V3**, **5V**, **GND**
- **Jumper / switch** memilih tegangan baris **V** (3.3V ↔ 5V)

Aturan untuk unit RFID EduCore:

| Modul | Ambil VCC dari | Catatan |
|-------|----------------|---------|
| **MFRC522** | Header **3V3** tetap, atau baris **V** hanya jika jumper di **3.3V** | ⚠️ **Jangan 5V** — modul bisa rusak |
| **LCD I2C** | Header **5V** atau baris **V** saat jumper **5V** | Umumnya butuh 5V |
| **Buzzer** | Sesuai label modul (3.3V/5V) + sinyal ke **S** di **D4** | GND ke **G** |

Jika jumper **V** global hanya satu posisi:

1. Set jumper ke **3.3V** → ambil power MFRC522 dari baris **V** / 3V3.
2. Ambil power LCD dari pin **5V** khusus di base plate (bukan dari baris V).
3. Atau sebaliknya: jumper **V** = 5V untuk LCD/buzzer, power MFRC522 **wajib** dari pin **3V3** terpisah.

**Adaptor DC (mis. 9V):** boleh untuk operasional permanen via jack base plate. Saat upload sketch, colok juga USB ke ESP32 (atau unplug adaptor dulu jika port bentrok di PC Anda).

### 3.5 Diagram wiring base plate

#### Susunan fisik (tampak samping)

```
     USB programming ──► ┌──────────────────┐
                         │  ESP32 DOIT V1   │  ◄── 30 pin
                         │    (30P)         │
                         └────────┬─────────┘
                                  │ duduk di female header
                         ┌────────▼─────────────────────────┐
                         │   BASE PLATE EXTENSION 30P       │
                         │  Type-C / Micro / Jack DC 9V     │
                         │  Jumper V: 3.3V ⟷ 5V             │
                         │  Header GVS per GPIO + 3V3 / 5V  │
                         └──────────────────────────────────┘
```

#### Header GVS (satu kolom GPIO)

Setiap pin GPIO di base plate biasanya seperti ini (baca label di PCB):

```
        kolom D5 (contoh)
        ┌───┐
   S ── │ ■ │  ← Signal (GPIO 5)  → ke SDA MFRC522
   V ── │ ■ │  ← VCC (3.3V/5V)    → HATI-HATI: MFRC522 jangan 5V
   G ── │ ■ │  ← GND
        └───┘
```

#### Diagram lengkap modul → base plate

```
                    ┌──────────────────────────────────────────────┐
                    │         BASE PLATE + ESP32 DOIT V1 30P       │
                    │                                              │
                    │   Power tetap:                               │
                    │     [3V3]  [5V]  [GND]                       │
                    │       │     │      │                         │
                    │       │     │      └──────┬──────────┐       │
                    │       │     │             │          │       │
                    │   GVS kolom (baris S = signal):              │
                    │                                              │
                    │   D4.S  ◄────────────────────────────┐       │
                    │   D5.S  ◄──────────────┐             │       │
                    │  D18.S  ◄──────────┐   │             │       │
                    │  D19.S  ◄────────┐ │   │             │       │
                    │  D21.S  ◄──────┐ │ │   │             │       │
                    │  D22.S  ◄────┐ │ │ │   │             │       │
                    │  D23.S  ◄──┐ │ │ │ │   │             │       │
                    │  D27.S  ◄┐ │ │ │ │ │   │             │       │
                    └──────────┼─┼─┼─┼─┼─┼───┼─────────────┼───────┘
                               │ │ │ │ │ │   │             │
        ┌──────────────────────┘ │ │ │ │ │   │             │
        │  ┌─────────────────────┘ │ │ │ │   │             │
        │  │  ┌────────────────────┘ │ │ │   │             │
        │  │  │  ┌───────────────────┘ │ │   │             │
        │  │  │  │  ┌──────────────────┘ │   │             │
        │  │  │  │  │  ┌─────────────────┘   │             │
        │  │  │  │  │  │  ┌──────────────────┘             │
        │  │  │  │  │  │  │                                │
   ┌────▼──▼──▼──▼──▼──▼──▼────┐     ┌──────────────┐     │
   │         MFRC522           │     │  LCD I2C     │     │
   │  RST  SCK MOSI MISO SDA   │     │ 16×2         │     │
   │   ▲    ▲   ▲    ▲    ▲    │     │              │     │
   │   │    │   │    │    │    │     │ SDA◄── D21.S │     │
   │   └──D22  D18 D23  D19 D5 │     │ SCL◄── D27.S │◄────┤
   │                           │     │              │  (bukan D22!)
   │  3.3V ◄── [3V3] base      │     │ VCC ◄── [5V] │
   │  GND  ◄── [GND] / G       │     │ GND ◄── [GND]│
   └───────────────────────────┘     └──────────────┘

   ┌─────────────┐
   │   BUZZER    │
   │  (+) ◄── D4.S
   │  (-) ◄── GND / G
   │  VCC ◄── 3V3 atau 5V (sesuai label modul)
   └─────────────┘
```

#### Ringkasan jalur (cetak cepat)

```
MFRC522 ──3.3V──► [3V3] base plate          (jangan ke 5V / V=5V)
MFRC522 ──GND───► [GND] atau G sembarang
MFRC522 ──SDA───► D5  baris S
MFRC522 ──SCK───► D18 baris S
MFRC522 ──MOSI──► D23 baris S
MFRC522 ──MISO──► D19 baris S
MFRC522 ──RST───► D22 baris S

LCD     ──VCC───► [5V] base plate
LCD     ──GND───► [GND]
LCD     ──SDA───► D21 baris S
LCD     ──SCL───► D27 baris S     ← wajib D27 (bukan header I2C D22)

Buzzer  ──(+)───► D4  baris S
Buzzer  ──(-)───► [GND]

Upload sketch   ──► USB di ESP32 (bukan USB power base plate)
Operasional     ──► USB ESP32 / Type-C base / Jack DC + adaptor
```

```
        ❌ SALAH                         ✅ BENAR
   LCD SCL ──► I2C header             LCD SCL ──► D27.S
              (sering = D22)          MFRC522 RST ──► D22.S
   MFRC522 VCC ──► V jumper 5V        MFRC522 VCC ──► [3V3]
```

### 3.6 Wiring ringkas di base plate

Pin signal (**S**) mengikuti §2 / §5 — tidak berubah:

| Modul | Pin **S** (GPIO) | Power | GND |
|-------|------------------|-------|-----|
| MFRC522 SDA | **D5** | 3V3 | G |
| MFRC522 SCK | **D18** | — | — |
| MFRC522 MOSI | **D23** | — | — |
| MFRC522 MISO | **D19** | — | — |
| MFRC522 RST | **D22** | — | — |
| LCD SDA | **D21** | 5V | G |
| LCD SCL | **D27** | — | — |
| Buzzer (+) | **D4** | sesuai modul | G |

> **Jangan pakai header I2C “default” di shield tanpa dicek.** Banyak base plate melabeli I2C sebagai **SDA=D21 / SCL=D22**. Firmware EduCore memakai **SCL = D27** dan **D22 = RST MFRC522**. Sambungkan LCD SCL ke kolom **D27**, bukan ke header I2C bawaan shield.

### 3.7 Tips & kesalahan umum

- Breadboard **tidak wajib** jika sudah pakai base plate.
- Pakai jumper pendek; longgar di header GVS sering menyebabkan MFRC522 baca `0x00` / `0xFF`.
- Jangan colok power USB base plate + adaptor DC bersamaan jika tidak yakin desain board mengizinkan (cek silkscreen / dokumentasi produsen).
- Setelah wiring, lanjut uji seperti biasa: [`esp32_rfid_hardware_test.ino`](./esp32_rfid_hardware_test.ino) → perintah `b` (panduan base plate), lalu `l`, `c`, `t`/`p`, `r`.

---

## 4. Diagram Sambungan

> Diagram di bawah untuk wiring **langsung ke pin ESP32** (tanpa base plate). Jika memakai base plate, pakai [§3.5](#35-diagram-wiring-base-plate).

```
                    ┌─────────────────────────────────┐
                    │         ESP32 DevKit V1         │
                    │                                 │
   MFRC522 3.3V ────┤ 3V3                             │
   MFRC522 GND  ────┤ GND ◄── LCD GND ◄── Buzzer (-)  │
   MFRC522 SDA  ────┤ D5  (SS)                         │
   MFRC522 SCK  ────┤ D18                             │
   MFRC522 MOSI ────┤ D23                             │
   MFRC522 MISO ────┤ D19                             │
   MFRC522 RST  ────┤ D22                             │
                    │                                 │
   LCD SDA      ────┤ D21 (I2C)                       │
   LCD SCL      ────┤ D27 (I2C)                       │
   LCD VCC      ────┤ 5V / VIN                        │
                    │                                 │
   Buzzer (+)   ────┤ D4                              │
                    │                                 │
                    │         USB / VIN (power)       │
                    └─────────────────────────────────┘
```

---

## 5. Tabel Wiring Detail

### 5.1 MFRC522 → ESP32

| Label modul MFRC522 | ESP32 | Keterangan |
|---------------------|-------|------------|
| **3.3V** | **3V3** | ⚠️ **Jangan ke 5V** — modul bisa rusak |
| **GND** | **GND** | |
| **SDA** | **D5** | Chip Select (SS), bukan I2C |
| **SCK** | **D18** | Clock SPI — pin tetap |
| **MOSI** | **D23** | Data ESP32 → modul |
| **MISO** | **D19** | Data modul → ESP32 |
| **RST** | **D22** | Reset modul |
| **IRQ** | *(kosongkan)* | Tidak dipakai sketch ini |

**Layout pin di PCB modul** bisa berbeda antar produsen. Selalu baca **label cetak** di modul, jangan tebak dari urutan fisik.

Layout umum A:
```
SDA | SCK | MOSI | MISO | IRQ | GND | RST | 3.3V
```

Layout umum B (sering terbalik):
```
3.3V | RST | GND | IRQ | MISO | MOSI | SCK | SDA
```

### 5.2 LCD I2C 16×2 → ESP32

| Label modul LCD | ESP32 | Keterangan |
|-----------------|-------|------------|
| **VCC** | **5V** atau **VIN** | Modul LCD I2C umumnya butuh 5V |
| **GND** | **GND** | |
| **SDA** | **D21** | I2C data |
| **SCL** | **D27** | I2C clock |

Potensiometer kontras (jika ada di modul LCD) bisa diputar jika karakter samar.

### 5.3 Buzzer Aktif → ESP32

| Buzzer | ESP32 | Keterangan |
|--------|-------|------------|
| **(+)** / **S** / **SIG** | **D4** | Pin sinyal |
| **(-)** / **G** | **GND** | |

- Gunakan **buzzer aktif** (berbunyi saat pin HIGH).
- Jika modul buzzer 3 pin (VCC, GND, S): VCC ke 5V/3V3 sesuai label modul, S ke D4, GND ke GND.
- Jika tidak bunyi setelah upload firmware, ubah di sketch:
  ```cpp
  #define BUZZER_ON   LOW   // coba invert
  #define BUZZER_OFF  HIGH
  ```

> Saat menjalankan sketch **uji kabel** (`esp32_rfid_hardware_test.ino` perintah `c`), **cabut buzzer dari D4** — pin D4 dipakai sebagai pin bantu tes kontinuitas.

---

## 6. Urutan Perakitan (Disarankan)

Ikuti urutan ini agar mudah debug jika ada masalah.

### Langkah 1 — ESP32 + power saja

1. Jika memakai base plate: pasang ESP32 ke shield dulu (lihat [§3](#3-base-plate-extension-esp32-doit-v1-30-pin)).
2. Colokkan USB ke **port ESP32** (bukan hanya USB/Type-C di base plate).
3. Pastikan LED power ESP32 menyala.
4. Upload sketch kosong atau blink bawaan — pastikan komunikasi USB/Serial OK.

### Langkah 2 — Sambung LCD

1. Sambungkan VCC, GND, SDA (D21), SCL (D27).
2. Upload [`esp32_rfid_hardware_test.ino`](./esp32_rfid_hardware_test.ino).
3. Buka Serial Monitor **115200**.
4. Ketik **`l`** → layar harus menampilkan teks tes.
5. Jika layar kosong:
   - Putar potensiometer kontras.
   - Coba ganti alamat I2C ke `0x3F` (sketch uji mencoba keduanya).
   - Cek SDA/SCL tidak tertukar.

### Langkah 3 — Sambung MFRC522

1. **Matikan power** sebelum menyambung kabel.
2. Sambungkan **3.3V dan GND** dulu, lalu kabel SPI (SDA, SCK, MOSI, MISO, RST).
3. Nyalakan kembali.
4. Di Serial Monitor ketik **`c`** untuk cek kontinuitas kabel (opsional, tanpa multimeter).
5. Ketik **`t`** (tes pin default) atau **`p`** (auto-probe).
6. Ketik **`r`** → tempelkan kartu → UID muncul di Serial dan LCD.

### Langkah 4 — Sambung Buzzer

1. Sambungkan (+) ke D4, (-) ke GND.
2. Upload [`esp32_rfid_attendance_mfrc522.ino`](./esp32_rfid_attendance_mfrc522.ino) (sudah dikonfigurasi).
3. Tap kartu → buzzer bunyi singkat saat scan berhasil/gagal.

### Langkah 5 — Firmware produksi

1. Salin `esp32_rfid_attendance_mfrc522.ino` ke folder sketch Arduino.
2. Isi konstanta:
   ```cpp
   const char* WIFI_SSID = "...";
   const char* WIFI_PASS = "...";
   const char* API_URL = "http://IP_SERVER:PORT/api/lms/attendance/rfid/scan";
   const char* DEVICE_CODE = "...";      // dari admin → Device RFID
   const char* DEVICE_TOKEN = "...";     // token device
   const char* SCAN_ACTION = "daily_gate"; // gate
   // atau "teacher_session_checkin" untuk device classroom
   ```
3. Upload dan verifikasi di admin → **Log Scan**.

---

## 7. Checklist Sebelum Operasional

| ✓ | Item |
|---|------|
| ☐ | Semua GND modul terhubung ke GND ESP32 (ground bersama) |
| ☐ | (Jika base plate) ESP32 30-pin terpasang benar; jumper V 3.3V/5V sesuai modul |
| ☐ | MFRC522 ke **3V3**, bukan 5V |
| ☐ | LCD SCL ke **D27** (bukan header I2C default shield yang sering = D22) |
| ☐ | MFRC522 SDA ke **D5**, bukan D21 |
| ☐ | LCD tampil normal (uji perintah `l`) |
| ☐ | Kartu terbaca, UID muncul (uji perintah `r`) |
| ☐ | Buzzer bunyi saat scan (firmware produksi) |
| ☐ | WiFi tersambung, IP server bisa diakses ESP32 |
| ☐ | Device terdaftar & aktif di admin LMS |
| ☐ | Kartu RFID user sudah terdaftar di sistem |

---

## 8. Troubleshooting

| Gejala | Kemungkinan penyebab | Solusi |
|--------|---------------------|--------|
| LCD kosong | Salah alamat I2C / kabel SDA-SCL | Uji `l`, coba 0x27 & 0x3F, putar kontras |
| LCD kosong (pakai base plate) | SCL ke header I2C default (D22) | Pindah SCL ke kolom **D27**; D22 dipakai RST RFID |
| LCD blok putih penuh | Kontras terlalu tinggi/rendah | Putar potensiometer |
| MFRC522 version 0x00 / 0xFF | Power salah, kabel putus, SDA salah pin | Cek 3.3V, uji perintah `c`, baca label modul |
| MFRC522 rusak / aneh setelah pasang | V jumper base plate di 5V | Cabut, set V=3.3V atau ambil VCC dari pin 3V3 |
| MFRC522 0x82 (clone) | Modul clone China | Normal — tetap bisa baca kartu, uji tap |
| Kartu tidak terbaca | Jarak terlalu jauh, kartu 125 kHz | Dekatkan kartu MIFARE 13.56 MHz ke antena |
| Buzzer tidak bunyi | Polarity aktif LOW | Invert `BUZZER_ON` / `BUZZER_OFF` di sketch |
| Buzzer tidak bunyi | Pin bentrok dengan uji kabel | Cabut buzzer saat mode `c`, pasang kembali untuk produksi |
| WiFi gagal | SSID/password salah | Cek `WIFI_SSID` / `WIFI_PASS` |
| Scan HTTP gagal | Server mati / token salah | Cek URL, port, `DEVICE_CODE`, `DEVICE_TOKEN` |
| Scan ditolak duplicate | Tap terlalu cepat | Tunggu beberapa detik antar tap |
| Upload gagal / port tidak muncul | USB hanya ke base plate | Colok USB ke **port ESP32** (programming), bukan hanya Type-C/Micro di shield |

---

## 9. Catatan Desain Casing

- Antena MFRC522 harus **tidak tertutup logam** — plastik tipis di depan antena OK.
- Beri lubang akses USB atau gunakan power 5V permanen ke VIN / jack DC base plate.
- Jika pakai base plate di dalam casing: pastikan soket USB ESP32 tetap bisa diakses untuk update firmware.
- Label device (kode gate/kelas) tempel di luar casing agar teknisi mudah identifikasi.
- Kabel jumper di dalam casing: kencangkan dengan tie-wrap, hindari tarikan ke pin header.

---

## 10. Ringkasan Pin (Cetak & Tempel)

```
ESP32 RFID Presensi — EduCore LMS
─────────────────────────────────
MFRC522:  3.3V→3V3  GND→GND  SDA→D5
          SCK→D18   MOSI→D23  MISO→D19  RST→D22
LCD I2C:  VCC→5V    GND→GND  SDA→D21   SCL→D27
Buzzer:   (+)→D4    (-)→GND
─────────────────────────────────
Base plate DOIT V1 30P: signal di baris S;
  MFRC522 power 3V3 saja; LCD SCL = D27 (bukan D22)
Uji: esp32_rfid_hardware_test.ino
Prod: esp32_rfid_attendance_mfrc522.ino
```
