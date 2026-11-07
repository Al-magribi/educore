/*
  ESP32 — Uji hardware RFID + LCD (gabungan cek kabel & komponen)
  Upload sketch ini, buka Serial Monitor 115200, tekan EN/RST.

  Wiring MFRC522 (SPI wajib):
    SDA(SS) -> D5    SCK  -> D18   MOSI -> D23
    MISO    -> D19   RST  -> D22   3.3V -> 3V3 (BUKAN 5V!)
    GND     -> GND

  Wiring LCD I2C:
    SDA -> D21   SCL -> D27   VCC -> 5V/VIN   GND -> GND
    Jika layar kosong, coba alamat 0x3F (perintah 'l')

  Base plate extension ESP32 DOIT V1 30-pin (opsional):
    - GPIO sama: signal ke baris S di kolom Dx (bukan V/G)
    - MFRC522 VCC -> header 3V3 (jangan baris V jika jumper 5V)
    - LCD SCL -> D27.S  (JANGAN header I2C default = D22; D22 = RST RFID)
    - Upload firmware lewat USB di board ESP32, bukan USB power base plate
    - Ketik 'b' di Serial untuk panduan base plate lengkap
    Panduan: docs/esp32_rfid_hardware_assembly.md §3

  Pin bantu tes kabel: D4 (jangan pakai buzzer saat mode 'c')
    Base plate: colok ujung bebas ke D4 baris S

  Perintah Serial Monitor:
    l = uji LCD (scan I2C + tampilan tes)
    c = cek kontinuitas 7 kabel MFRC522 (tanpa multimeter)
    p = auto-probe pin SDA/RST MFRC522
    t = tes cepat MFRC522 (SDA=D5, RST=D22)
    r = mode baca kartu RFID (setelah probe/t sukses)
    b = panduan wiring base plate DOIT V1 30P
    h = bantuan
    y/n = lanjut/lewati (saat mode 'c')
*/

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define PIN_SS_DEFAULT   5
#define PIN_RST_DEFAULT 22
#define PIN_SCK          18
#define PIN_MISO         19
#define PIN_MOSI         23
#define TEST_PIN          4

#define LCD_COLS 16
#define LCD_ROWS  2
#define LCD_SDA  21
#define LCD_SCL  27

uint8_t lcdI2cAddr = 0x27;
LiquidCrystal_I2C* lcd = nullptr;

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

enum WireType { WT_3V3, WT_GND, WT_SIGNAL };

struct WireInfo {
  uint8_t id;
  const char* mfrcLabel;
  uint8_t espGpio;
  const char* espLabel;
  WireType type;
};

const WireInfo WIRES[] = {
  {1, "3.3V", 0,        "3V3", WT_3V3},
  {2, "GND",  0,        "GND", WT_GND},
  {3, "SDA",  PIN_SS_DEFAULT,   "D5",  WT_SIGNAL},
  {4, "SCK",  PIN_SCK,  "D18", WT_SIGNAL},
  {5, "MOSI", PIN_MOSI, "D23", WT_SIGNAL},
  {6, "MISO", PIN_MISO, "D19", WT_SIGNAL},
  {7, "RST",  PIN_RST_DEFAULT,  "D22", WT_SIGNAL},
};
const size_t WIRE_COUNT = sizeof(WIRES) / sizeof(WIRES[0]);

MFRC522* mfrc522 = nullptr;
uint8_t activeSs = PIN_SS_DEFAULT;
uint8_t activeRst = PIN_RST_DEFAULT;
bool rfidOk = false;
bool continuityMode = false;
bool rfidReadMode = false;
size_t continuityIndex = 0;
bool wireResults[WIRE_COUNT];

void cleanupMfrc522() {
  if (mfrc522 != nullptr) {
    delete mfrc522;
    mfrc522 = nullptr;
  }
}

void lcdShow(const char* line1, const char* line2 = "") {
  if (lcd == nullptr) return;
  lcd->clear();
  lcd->setCursor(0, 0);
  lcd->print(line1);
  lcd->setCursor(0, 1);
  lcd->print(line2);
}

bool initLcd(uint8_t addr) {
  if (lcd != nullptr) {
    delete lcd;
    lcd = nullptr;
  }
  Wire.begin(LCD_SDA, LCD_SCL);
  lcd = new LiquidCrystal_I2C(addr, LCD_COLS, LCD_ROWS);
  lcd->init();
  lcd->backlight();
  lcdI2cAddr = addr;
  return true;
}

void scanI2cBus() {
  Serial.println("[LCD] Scan I2C (SDA=D21, SCL=D27)...");
  uint8_t found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("  -> perangkat di 0x%02X\n", addr);
      found++;
    }
  }
  if (found == 0) {
    Serial.println("  -> TIDAK ADA perangkat I2C!");
    Serial.println("     Cek: VCC LCD, GND, SDA=D21, SCL=D27");
    Serial.println("     Base plate: SCL ke D27.S (bukan header I2C D22); VCC ke [5V]");
  }
  Serial.println();
}

void testLcd() {
  Serial.println("========================================");
  Serial.println("[LCD] Uji komponen LCD I2C");
  Serial.println("========================================");

  scanI2cBus();

  const uint8_t candidates[] = {0x27, 0x3F};
  bool lcdFound = false;

  for (size_t i = 0; i < sizeof(candidates); i++) {
    uint8_t addr = candidates[i];
    Serial.printf("[LCD] Coba alamat 0x%02X...\n", addr);
    initLcd(addr);
    lcdShow("LCD Test", "0x27 / 0x3F");
    delay(800);
    lcdShow("Baris 1 OK?", "Baris 2 OK?");
    delay(1500);
    lcdShow("1234567890123456", "ABCDEFGHIJKLMNOP");
    delay(1500);
    lcdShow("LCD OK!", "Addr 0x??");
    char buf[17];
    snprintf(buf, sizeof(buf), "Addr 0x%02X", addr);
    lcdShow("LCD OK!", buf);
    Serial.printf("[LCD] Tampilan tes di 0x%02X — lihat layar fisik\n", addr);
    lcdFound = true;
    break;
  }

  if (!lcdFound) {
    lcdShow("LCD ERROR", "Scan I2C gagal");
    Serial.println("[LCD] GAGAL — tidak ada modul I2C terdeteksi.");
  } else {
    Serial.printf("[LCD] SUKSES di alamat 0x%02X\n", lcdI2cAddr);
  }
  Serial.println("========================================");
  Serial.println();
}

bool testSignalWire(uint8_t gpioPin) {
  pinMode(gpioPin, OUTPUT);
  pinMode(TEST_PIN, INPUT);

  digitalWrite(gpioPin, HIGH);
  delay(30);
  bool highOk = digitalRead(TEST_PIN) == HIGH;

  digitalWrite(gpioPin, LOW);
  delay(30);
  bool lowOk = digitalRead(TEST_PIN) == LOW;

  pinMode(gpioPin, INPUT);
  pinMode(TEST_PIN, INPUT);
  return highOk && lowOk;
}

bool testWireContinuity(const WireInfo& w) {
  switch (w.type) {
    case WT_3V3:
      pinMode(TEST_PIN, INPUT);
      delay(50);
      return digitalRead(TEST_PIN) == HIGH;

    case WT_GND:
      pinMode(TEST_PIN, INPUT_PULLUP);
      delay(50);
      return digitalRead(TEST_PIN) == LOW;

    case WT_SIGNAL:
      return testSignalWire(w.espGpio);
  }
  return false;
}

void printContinuityInstruction(const WireInfo& w) {
  Serial.println();
  Serial.println("----------------------------------------");
  Serial.printf("[CEK %d/7] MFRC522 %s -> ESP32 %s\n", w.id, w.mfrcLabel, w.espLabel);
  Serial.println();
  Serial.println("  1. Lepas ujung kabel dari MFRC522 saja");
  if (w.type == WT_SIGNAL) {
    Serial.printf("  2. Ujung ESP32 tetap di %s (base plate: kolom %s baris S)\n",
                  w.espLabel, w.espLabel);
  } else {
    Serial.printf("  2. Ujung ESP32 tetap di %s (base plate: header %s / G)\n",
                  w.espLabel, w.espLabel);
  }
  Serial.println("  3. Colok ujung bebas kabel ke pin D4 (TEST)");
  Serial.println("     Base plate: D4 baris S");
  Serial.println("  4. Ketik 'y' untuk tes, 'n' untuk lewati");
  Serial.println("----------------------------------------");

  char line1[17];
  char line2[17];
  snprintf(line1, sizeof(line1), "Cek %d/7: %s", w.id, w.mfrcLabel);
  snprintf(line2, sizeof(line2), "Ujung ke D4");
  lcdShow(line1, line2);
}

void printContinuityResult(const WireInfo& w, bool ok) {
  Serial.printf("  Hasil: %s\n", ok ? "OK  (kabel hidup)" : "GAGAL (putus/salah kabel)");
  if (!ok) {
    Serial.printf("  >> Perbaiki: MFRC522 %s -> ESP32 %s\n", w.mfrcLabel, w.espLabel);
  }
  Serial.println();

  char line2[17];
  snprintf(line2, sizeof(line2), "%s: %s", w.mfrcLabel, ok ? "OK" : "GAGAL");
  lcdShow("Hasil cek:", line2);
  delay(1200);
}

void printContinuitySummary() {
  Serial.println();
  Serial.println("========================================");
  Serial.println("  HASIL CEK KABEL");
  Serial.println("  ESP32  <----kabel---->  MFRC522");
  Serial.println("========================================");

  uint8_t failCount = 0;
  for (size_t i = 0; i < WIRE_COUNT; i++) {
    const WireInfo& w = WIRES[i];
    const char* status = wireResults[i] ? "OK   " : "GAGAL";
    Serial.printf("  [%d] %-5s -> %-4s : %s\n",
                  w.id, w.mfrcLabel, w.espLabel, status);
    if (!wireResults[i]) failCount++;
  }

  Serial.println("========================================");
  if (failCount == 0) {
    Serial.println("  SEMUA KABEL OK");
    Serial.println("  Sambung kembali ke MFRC522, ketik 't' atau 'p'");
    lcdShow("Semua OK!", "Ketik t / p");
  } else {
    Serial.printf("  %d kabel GAGAL — perbaiki yang GAGAL\n", failCount);
    Serial.println("  Setelah perbaikan, ketik 'c' ulang");
    lcdShow("Ada GAGAL", "Ketik c ulang");
  }
  Serial.println("========================================");
  Serial.println();
}

void startContinuityCheck() {
  rfidReadMode = false;
  SPI.end();
  cleanupMfrc522();
  rfidOk = false;
  continuityMode = true;
  continuityIndex = 0;

  Serial.println();
  Serial.println("########################################");
  Serial.println("#  CEK KONTINUITAS KABEL MFRC522       #");
  Serial.println("#  Ganti multimeter beep -> Serial OK  #");
  Serial.println("########################################");
  Serial.println("LCD tetap terpasang. MFRC522 dicabut per kabel.");
  Serial.println("Base plate: signal di baris S; TEST di D4.S; cabut buzzer dari D4.");
  Serial.println();

  for (size_t i = 0; i < WIRE_COUNT; i++) {
    wireResults[i] = false;
  }

  printContinuityInstruction(WIRES[0]);
}

void advanceContinuityCheck() {
  const WireInfo& w = WIRES[continuityIndex];
  bool ok = testWireContinuity(w);
  wireResults[continuityIndex] = ok;
  printContinuityResult(w, ok);

  continuityIndex++;
  if (continuityIndex < WIRE_COUNT) {
    printContinuityInstruction(WIRES[continuityIndex]);
  } else {
    continuityMode = false;
    printContinuitySummary();
  }
}

void skipContinuityWire() {
  wireResults[continuityIndex] = false;
  Serial.println("  Dilewati -> dicatat GAGAL");
  continuityIndex++;
  if (continuityIndex < WIRE_COUNT) {
    printContinuityInstruction(WIRES[continuityIndex]);
  } else {
    continuityMode = false;
    printContinuitySummary();
  }
}

bool versionUsable(byte version) {
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

  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, ssPin);
  mfrc522 = new MFRC522(ssPin, rstPin);
  mfrc522->PCD_Init();
  delay(50);

  *outVersion = mfrc522->PCD_ReadRegister(mfrc522->VersionReg);
  return versionUsable(*outVersion);
}

bool autoProbeMfrc522() {
  rfidReadMode = false;
  Serial.println("[RFID] Auto-probe kombinasi pin SDA/RST...");
  Serial.println("       (SCK=D18 MOSI=D23 MISO=D19 harus sudah benar)");
  Serial.println();
  lcdShow("RFID Probe", "Tunggu...");

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
      bestVersion = version;
      bestSs = p.ss;
      bestRst = p.rst;
      found = true;
      if (version == 0x92 || version == 0x91) break;
    } else if ((version == 0x82 || version == 0x88) && !found) {
      bestVersion = version;
      bestSs = p.ss;
      bestRst = p.rst;
      found = true;
    }
  }

  if (found) {
    activeSs = bestSs;
    activeRst = bestRst;
    probeMfrc522(activeSs, activeRst, &bestVersion);
    rfidOk = true;
    Serial.println();
    Serial.printf("[RFID] SUKSES! SDA=D%d  RST=D%d  version=0x%02X\n",
                  activeSs, activeRst, bestVersion);
    char buf[17];
    snprintf(buf, sizeof(buf), "SDA=D%d RST=D%d", activeSs, activeRst);
    lcdShow("RFID OK", buf);
    return true;
  }

  cleanupMfrc522();
  rfidOk = false;
  printModulePinGuide();
  lcdShow("MFRC522 ERROR", "Baca Serial");
  return false;
}

bool testMfrc522Default() {
  rfidReadMode = false;
  Serial.println("========================================");
  Serial.println("[TES MFRC522] Pin default SDA=D5 RST=D22");
  lcdShow("Tes MFRC522", "D5 / D22");

  byte version = 0;
  activeSs = PIN_SS_DEFAULT;
  activeRst = PIN_RST_DEFAULT;
  rfidOk = probeMfrc522(activeSs, activeRst, &version);
  Serial.printf("  Version = 0x%02X %s\n", version, versionNote(version));

  if (rfidOk) {
    Serial.println("  -> SUKSES");
    lcdShow("MFRC522 OK!", "Ketik r");
  } else {
    Serial.println("  -> GAGAL — coba 'c' atau 'p'");
    lcdShow("MFRC522 GAGAL", "Ketik c / p");
  }
  Serial.println("========================================");
  Serial.println();
  return rfidOk;
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
  Serial.println("  7. Base plate? Ketik 'b' — cek V=3.3V & SCL=D27");
  Serial.println("===================================");
  Serial.println();
}

void printBasePlateGuide() {
  Serial.println();
  Serial.println("########################################");
  Serial.println("#  BASE PLATE ESP32 DOIT V1 30-PIN     #");
  Serial.println("########################################");
  Serial.println("GPIO mapping sama dengan wiring tanpa base plate.");
  Serial.println("Ambil signal di baris S (G=GND, V=VCC jumper).");
  Serial.println();
  Serial.println("=== POWER ===");
  Serial.println("  MFRC522 VCC -> header [3V3]  (JANGAN 5V / V jumper 5V)");
  Serial.println("  LCD VCC     -> header [5V]");
  Serial.println("  Semua GND  -> [GND] atau baris G");
  Serial.println("  Upload     -> USB di board ESP32 (bukan USB power shield)");
  Serial.println();
  Serial.println("=== SIGNAL (baris S) ===");
  Serial.println("  MFRC522 SDA  -> D5.S");
  Serial.println("  MFRC522 SCK  -> D18.S");
  Serial.println("  MFRC522 MOSI -> D23.S");
  Serial.println("  MFRC522 MISO -> D19.S");
  Serial.println("  MFRC522 RST  -> D22.S");
  Serial.println("  LCD SDA      -> D21.S");
  Serial.println("  LCD SCL      -> D27.S   << wajib D27");
  Serial.println("  Buzzer (+)   -> D4.S    (cabut saat mode 'c')");
  Serial.println();
  Serial.println("=== SALAH vs BENAR ===");
  Serial.println("  SALAH: LCD SCL ke header I2C default (sering = D22)");
  Serial.println("  BENAR: LCD SCL ke D27.S | RST RFID ke D22.S");
  Serial.println("  SALAH: MFRC522 ke baris V saat jumper 5V");
  Serial.println("  BENAR: MFRC522 ke [3V3] tetap");
  Serial.println();
  Serial.println("=== URUTAN UJI ===");
  Serial.println("  1. 'l'  — LCD harus tampil");
  Serial.println("  2. 'c'  — cek kabel (TEST di D4.S)");
  Serial.println("  3. 't'  — tes MFRC522 default D5/D22");
  Serial.println("  4. 'r'  — baca UID kartu");
  Serial.println("Docs: esp32_rfid_hardware_assembly.md §3");
  Serial.println("########################################");
  Serial.println();
  lcdShow("Base Plate", "Cek Serial");
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

void startRfidReadMode() {
  if (!rfidOk || mfrc522 == nullptr) {
    Serial.println("[RFID] Belum OK. Ketik 't' atau 'p' dulu.");
    lcdShow("RFID belum OK", "Ketik t / p");
    return;
  }
  rfidReadMode = true;
  Serial.println("[RFID] Mode baca kartu aktif. Tempelkan kartu.");
  lcdShow("Tap Kartu", "");
}

void loopRfidRead() {
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

void printHelp() {
  Serial.println();
  Serial.println("=== PERINTAH ===");
  Serial.println("  l = uji LCD (scan I2C + tampilan tes)");
  Serial.println("  c = cek kontinuitas 7 kabel MFRC522");
  Serial.println("  y = lanjut tes kabel (saat mode c)");
  Serial.println("  n = lewati kabel ini (saat mode c)");
  Serial.println("  p = auto-probe pin SDA/RST MFRC522");
  Serial.println("  t = tes cepat MFRC522 (SDA=D5, RST=D22)");
  Serial.println("  r = mode baca kartu RFID");
  Serial.println("  b = panduan base plate DOIT V1 30P");
  Serial.println("  h = bantuan");
  Serial.println();
  Serial.println("=== TABEL KABEL MFRC522 ===");
  for (size_t i = 0; i < WIRE_COUNT; i++) {
    const WireInfo& w = WIRES[i];
    Serial.printf("  [%d] MFRC522 %-5s -> ESP32 %s\n", w.id, w.mfrcLabel, w.espLabel);
  }
  Serial.println();
  Serial.println("=== BASE PLATE (opsional) ===");
  Serial.println("  Signal di baris S | MFRC522 power [3V3] | LCD SCL=D27.S");
  Serial.println("  Ketik 'b' untuk panduan lengkap");
  Serial.println("============================");
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println();
  Serial.println("########################################");
  Serial.println("#  ESP32 UJI HARDWARE RFID + LCD       #");
  Serial.println("########################################");
  Serial.println("Base plate DOIT V1 30P? Ketik 'b' untuk panduan wiring.");

  initLcd(0x27);
  lcdShow("Hardware Test", "Ketik h");
  Serial.println("[LCD] Inisialisasi 0x27 (ketik 'l' jika layar kosong)");
  printHelp();
  Serial.println("Mulai: 'l' LCD | 'c' kabel | 't'/'p' RFID | 'b' base plate");
}

void loop() {
  if (rfidReadMode && rfidOk && mfrc522 != nullptr) {
    if (Serial.available()) {
      char cmd = Serial.read();
      while (Serial.available()) Serial.read();
      if (cmd == 'h' || cmd == 'H') {
        rfidReadMode = false;
        printHelp();
        lcdShow("Hardware Test", "Ketik h");
        return;
      }
    }
    loopRfidRead();
    return;
  }

  if (!Serial.available()) return;

  char cmd = Serial.read();
  while (Serial.available()) Serial.read();

  if (continuityMode) {
    if (cmd == 'y' || cmd == 'Y') {
      advanceContinuityCheck();
    } else if (cmd == 'n' || cmd == 'N') {
      skipContinuityWire();
    } else {
      Serial.println("Mode cek kabel aktif. Ketik 'y' (tes) atau 'n' (lewati).");
    }
    return;
  }

  switch (cmd) {
    case 'l':
    case 'L':
      testLcd();
      break;
    case 'c':
    case 'C':
      startContinuityCheck();
      break;
    case 'p':
    case 'P':
      autoProbeMfrc522();
      break;
    case 't':
    case 'T':
      testMfrc522Default();
      break;
    case 'r':
    case 'R':
      startRfidReadMode();
      break;
    case 'b':
    case 'B':
      printBasePlateGuide();
      break;
    case 'h':
    case 'H':
      printHelp();
      lcdShow("Hardware Test", "Ketik h");
      break;
    default:
      Serial.println("Perintah tidak dikenal. Ketik 'h' untuk bantuan.");
      break;
  }
}
