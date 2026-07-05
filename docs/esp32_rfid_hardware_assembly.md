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
| 7 | Breadboard (opsional) | — | Memudahkan prototipe |
| 8 | Power supply | USB 5V 1A+ | Via micro-USB ESP32, atau VIN 5V stabil |
| 9 | Casing (opsional) | Box ABS / 3D print | Lindungi modul dari debu & benturan |

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

## 3. Diagram Sambungan

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

## 4. Tabel Wiring Detail

### 4.1 MFRC522 → ESP32

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

### 4.2 LCD I2C 16×2 → ESP32

| Label modul LCD | ESP32 | Keterangan |
|-----------------|-------|------------|
| **VCC** | **5V** atau **VIN** | Modul LCD I2C umumnya butuh 5V |
| **GND** | **GND** | |
| **SDA** | **D21** | I2C data |
| **SCL** | **D27** | I2C clock |

Potensiometer kontras (jika ada di modul LCD) bisa diputar jika karakter samar.

### 4.3 Buzzer Aktif → ESP32

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

## 5. Urutan Perakitan (Disarankan)

Ikuti urutan ini agar mudah debug jika ada masalah.

### Langkah 1 — ESP32 + power saja

1. Colokkan USB ke ESP32.
2. Pastikan LED power ESP32 menyala.
3. Upload sketch kosong atau blink bawaan — pastikan komunikasi USB/Serial OK.

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

## 6. Checklist Sebelum Operasional

| ✓ | Item |
|---|------|
| ☐ | Semua GND modul terhubung ke GND ESP32 (ground bersama) |
| ☐ | MFRC522 ke **3V3**, bukan 5V |
| ☐ | MFRC522 SDA ke **D5**, bukan D21 |
| ☐ | LCD tampil normal (uji perintah `l`) |
| ☐ | Kartu terbaca, UID muncul (uji perintah `r`) |
| ☐ | Buzzer bunyi saat scan (firmware produksi) |
| ☐ | WiFi tersambung, IP server bisa diakses ESP32 |
| ☐ | Device terdaftar & aktif di admin LMS |
| ☐ | Kartu RFID user sudah terdaftar di sistem |

---

## 7. Troubleshooting

| Gejala | Kemungkinan penyebab | Solusi |
|--------|---------------------|--------|
| LCD kosong | Salah alamat I2C / kabel SDA-SCL | Uji `l`, coba 0x27 & 0x3F, putar kontras |
| LCD blok putih penuh | Kontras terlalu tinggi/rendah | Putar potensiometer |
| MFRC522 version 0x00 / 0xFF | Power salah, kabel putus, SDA salah pin | Cek 3.3V, uji perintah `c`, baca label modul |
| MFRC522 0x82 (clone) | Modul clone China | Normal — tetap bisa baca kartu, uji tap |
| Kartu tidak terbaca | Jarak terlalu jauh, kartu 125 kHz | Dekatkan kartu MIFARE 13.56 MHz ke antena |
| Buzzer tidak bunyi | Polarity aktif LOW | Invert `BUZZER_ON` / `BUZZER_OFF` di sketch |
| Buzzer tidak bunyi | Pin bentrok dengan uji kabel | Cabut buzzer saat mode `c`, pasang kembali untuk produksi |
| WiFi gagal | SSID/password salah | Cek `WIFI_SSID` / `WIFI_PASS` |
| Scan HTTP gagal | Server mati / token salah | Cek URL, port, `DEVICE_CODE`, `DEVICE_TOKEN` |
| Scan ditolak duplicate | Tap terlalu cepat | Tunggu beberapa detik antar tap |

---

## 8. Catatan Desain Casing

- Antena MFRC522 harus **tidak tertutup logam** — plastik tipis di depan antena OK.
- Beri lubang akses USB atau gunakan power 5V permanen ke VIN.
- Label device (kode gate/kelas) tempel di luar casing agar teknisi mudah identifikasi.
- Kabel jumper di dalam casing: kencangkan dengan tie-wrap, hindari tarikan ke pin header.

---

## 9. Ringkasan Pin (Cetak & Tempel)

```
ESP32 RFID Presensi — EduCore LMS
─────────────────────────────────
MFRC522:  3.3V→3V3  GND→GND  SDA→D5
          SCK→D18   MOSI→D23  MISO→D19  RST→D22
LCD I2C:  VCC→5V    GND→GND  SDA→D21   SCL→D27
Buzzer:   (+)→D4    (-)→GND
─────────────────────────────────
Uji: esp32_rfid_hardware_test.ino
Prod: esp32_rfid_attendance_mfrc522.ino
```
