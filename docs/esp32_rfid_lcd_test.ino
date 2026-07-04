/*
  ESP32 — Uji RFID + LCD dengan auto-probe pin MFRC522
  Upload sketch ini, buka Serial Monitor 115200, tekan EN/RST.

  Wiring SPI (WAJIB ke pin ini):
    MFRC522 SCK  -> D18
    MFRC522 MOSI -> D23
    MFRC522 MISO -> D19
    MFRC522 3.3V -> 3V3  (BUKAN 5V!)
    MFRC522 GND  -> GND

  Wiring kontrol (uji otomatis beberapa kombinasi):
    MFRC522 SDA -> salah satu dari D5, D4, D15, D16
    MFRC522 RST -> salah satu dari D22, D27, D4, D26

  LCD I2C: SDA=D21, SCL=D27, VCC=5V, GND=GND
*/

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define SPI_SCK  18
#define SPI_MISO 19
#define SPI_MOSI 23

#define LCD_I2C_ADDR 0x27
#define LCD_COLS     16
#define LCD_ROWS      2
#define LCD_SDA      21
#define LCD_SCL      27
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

struct PinPair {
  uint8_t ss;
  uint8_t rst;
  const char* label;
};

const PinPair PIN_PROFILES[] = {
  { 5, 22, "SDA=D5  RST=D22 (default)"},
  { 5, 27, "SDA=D5  RST=D27"},
  { 5,  4, "SDA=D5  RST=D4"},
  { 4, 22, "SDA=D4  RST=D22"},
  {15, 22, "SDA=D15 RST=D22"},
  {16, 22, "SDA=D16 RST=D22"},
  {15, 27, "SDA=D15 RST=D27"},
};
const size_t PIN_PROFILE_COUNT = sizeof(PIN_PROFILES) / sizeof(PIN_PROFILES[0]);

MFRC522* mfrc522 = nullptr;
uint8_t activeSs = 0;
uint8_t activeRst = 0;
bool rfidOk = false;

void lcdShow(const char* line1, const char* line2 = "") {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

String uidToHexString(MFRC522::Uid* uid) {
  String hex = "";
  for (byte i = 0; i < uid->size; i++) {
    if (uid->uidByte[i] < 0x10) hex += "0";
    hex += String(uid->uidByte[i], HEX);
  }
  hex.toUpperCase();
  return hex;
}

void cleanupMfrc522() {
  if (mfrc522 != nullptr) {
    delete mfrc522;
    mfrc522 = nullptr;
  }
}

bool versionUsable(byte version) {
  // 0x91/0x92 = standar, 0x82/0x88 = clone China yang umum
  return (version == 0x92 || version == 0x91 ||
          version == 0x82 || version == 0x88);
}

const char* versionNote(byte version) {
  if (version == 0x92 || version == 0x91) return "OK (standar)";
  if (version == 0x82 || version == 0x88) return "OK (clone, coba baca kartu)";
  if (version == 0xFF) return "gagal (tidak ada respon)";
  if (version == 0x00) return "gagal (short GND)";
  return "gagal (tidak dikenal)";
}

bool probeMfrc522(uint8_t ssPin, uint8_t rstPin, byte* outVersion) {
  cleanupMfrc522();

  pinMode(rstPin, OUTPUT);
  digitalWrite(rstPin, LOW);
  delay(50);
  digitalWrite(rstPin, HIGH);
  delay(50);

  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI, ssPin);
  mfrc522 = new MFRC522(ssPin, rstPin);
  mfrc522->PCD_Init();
  delay(50);

  *outVersion = mfrc522->PCD_ReadRegister(mfrc522->VersionReg);
  return versionUsable(*outVersion);
}

bool autoProbe() {
  Serial.println("[RFID] Memindai kombinasi pin SS/RST...");
  Serial.println("       (SCK=D18 MOSI=D23 MISO=D19 harus sudah benar)");
  Serial.println();

  byte bestVersion = 0;
  uint8_t bestSs = 0;
  uint8_t bestRst = 0;
  bool found = false;

  for (size_t i = 0; i < PIN_PROFILE_COUNT; i++) {
    const PinPair& p = PIN_PROFILES[i];
    byte version = 0;
    bool ok = probeMfrc522(p.ss, p.rst, &version);
    Serial.printf("  %-28s -> 0x%02X %s\n", p.label, version, versionNote(version));

    if (ok) {
      activeSs = p.ss;
      activeRst = p.rst;
      found = true;
      bestVersion = version;
      bestSs = p.ss;
      bestRst = p.rst;
      if (version == 0x92 || version == 0x91) break;
    } else if (version == 0x82 || version == 0x88) {
      if (!found) {
        bestVersion = version;
        bestSs = p.ss;
        bestRst = p.rst;
        found = true;
      }
    }
  }

  if (found) {
    activeSs = bestSs;
    activeRst = bestRst;
    probeMfrc522(activeSs, activeRst, &bestVersion);
    Serial.println();
    Serial.printf("[RFID] SUKSES! SDA=D%d  RST=D%d  version=0x%02X\n",
                  activeSs, activeRst, bestVersion);
    if (bestVersion == 0x82) {
      Serial.println("[RFID] 0x82 = modul clone terdeteksi. Kabel SDA=D5 sudah benar.");
      Serial.println("       Tempelkan kartu untuk uji baca UID.");
    }
    return true;
  }

  cleanupMfrc522();
  return false;
}

void printModulePinGuide() {
  Serial.println();
  Serial.println("=== URUTAN PIN DI MODUL MFRC522 ===");
  Serial.println("Baca LABEL di PCB modul, jangan tebak dari posisi.");
  Serial.println();
  Serial.println("Layout A (umum):");
  Serial.println("  SDA | SCK | MOSI | MISO | IRQ | GND | RST | 3.3V");
  Serial.println();
  Serial.println("Layout B (sering terbalik):");
  Serial.println("  3.3V | RST | GND | IRQ | MISO | MOSI | SCK | SDA");
  Serial.println();
  Serial.println("=== CEK WAJIB ===");
  Serial.println("  1. MFRC522 3.3V -> ESP32 3V3 (bukan VIN/5V)");
  Serial.println("  2. MFRC522 GND  -> ESP32 GND");
  Serial.println("  3. SCK/MOSI/MISO ke D18/D23/D19");
  Serial.println("  4. MFRC522 SDA BUKAN ke D21 (itu LCD!)");
  Serial.println("  5. Coba cabut LCD sementara, reset ESP32");
  Serial.println("  6. Ganti kabel jumper (sering kabel rusak)");
  Serial.println("===================================");
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println();
  Serial.println("========================================");
  Serial.println("  ESP32 RFID TEST + AUTO PIN PROBE");
  Serial.println("========================================");

  Wire.begin(LCD_SDA, LCD_SCL);
  lcd.init();
  lcd.backlight();
  lcdShow("RFID Probe", "Tunggu...");
  Serial.println("[LCD] OK");

  rfidOk = autoProbe();

  if (!rfidOk) {
    printModulePinGuide();
    lcdShow("MFRC522 ERROR", "Baca Serial");
    Serial.println("[STATUS] GAGAL semua kombinasi pin.");
    Serial.println("         Masalah di: power 3.3V, GND, SCK, MOSI, atau MISO.");
    return;
  }

  char buf[17];
  snprintf(buf, sizeof(buf), "SDA=D%d RST=D%d", activeSs, activeRst);
  lcdShow("RFID OK", buf);
  Serial.println("[STATUS] SUKSES — tempelkan kartu");
  delay(1500);
  lcdShow("Tap Kartu", "");
}

void loop() {
  if (!rfidOk || mfrc522 == nullptr) {
    delay(5000);
    Serial.println("[RFID] Probe ulang...");
    rfidOk = autoProbe();
    if (!rfidOk) {
      printModulePinGuide();
      lcdShow("MFRC522 ERROR", "Baca Serial");
    }
    return;
  }

  if (!mfrc522->PICC_IsNewCardPresent()) {
    delay(30);
    return;
  }
  if (!mfrc522->PICC_ReadCardSerial()) {
    delay(30);
    return;
  }

  String uidHex = uidToHexString(&mfrc522->uid);
  Serial.println("----------------------------------------");
  Serial.print("[RFID] UID: ");
  Serial.println(uidHex);
  Serial.println("----------------------------------------");
  lcdShow("UID:", uidHex.c_str());

  mfrc522->PICC_HaltA();
  mfrc522->PCD_StopCrypto1();
  delay(2000);
  lcdShow("Tap Kartu", "");
}
