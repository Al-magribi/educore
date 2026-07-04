/*
  ESP32 — Cek kabel ESP32 ke MFRC522
  LCD boleh tetap terpasang (SDA=D21, SCL=D27, VCC=5V, GND=GND)

  Perintah Serial Monitor (115200, Newline):
    c = cek kontinuitas kabel (ganti multimeter beep) -> hasil di Serial
    t = tes MFRC522 setelah semua kabel tersambung
    h = bantuan

  Cara tes kontinuitas (perintah 'c'):
    Untuk setiap kabel:
      1. Lepas ujung kabel dari MFRC522 (ujung ESP32 tetap)
      2. Colok ujung bebas ke pin D4 di ESP32
      3. Ketik 'y' di Serial
    Hasil OK/GAGAL muncul di Serial + LCD
*/

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define PIN_SS   5
#define PIN_RST 22
#define PIN_SCK  18
#define PIN_MISO 19
#define PIN_MOSI 23
#define TEST_PIN 4   // pin bantu tes kabel (D4), tidak dipakai LCD/MFRC522

#define LCD_I2C_ADDR 0x27
#define LCD_COLS     16
#define LCD_ROWS      2
#define LCD_SDA      21
#define LCD_SCL      27
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

MFRC522 mfrc522(PIN_SS, PIN_RST);

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
  {3, "SDA",  PIN_SS,   "D5",  WT_SIGNAL},
  {4, "SCK",  PIN_SCK,  "D18", WT_SIGNAL},
  {5, "MOSI", PIN_MOSI, "D23", WT_SIGNAL},
  {6, "MISO", PIN_MISO, "D19", WT_SIGNAL},
  {7, "RST",  PIN_RST,  "D22", WT_SIGNAL},
};
const size_t WIRE_COUNT = sizeof(WIRES) / sizeof(WIRES[0]);

bool wireResults[WIRE_COUNT];
bool continuityMode = false;
size_t continuityIndex = 0;

void lcdShow(const char* line1, const char* line2 = "") {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

void lcdInit() {
  Wire.begin(LCD_SDA, LCD_SCL);
  lcd.init();
  lcd.backlight();
  lcdShow("Cek Kabel", "Ketik c/h");
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
  Serial.printf("  2. Ujung ESP32 tetap di %s\n", w.espLabel);
  Serial.println("  3. Colok ujung bebas kabel ke pin D4 (TEST)");
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
  Serial.println("  HASIL CEK KABEL (tanpa multimeter)");
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
    Serial.println("  Sambung kembali ke MFRC522, ketik 't'");
    lcdShow("Semua OK!", "Ketik t");
  } else {
    Serial.printf("  %d kabel GAGAL — perbaiki yang GAGAL\n", failCount);
    Serial.println("  Setelah perbaikan, ketik 'c' ulang");
    lcdShow("Ada GAGAL", "Ketik c ulang");
  }
  Serial.println("========================================");
  Serial.println();
}

void startContinuityCheck() {
  SPI.end();
  continuityMode = true;
  continuityIndex = 0;

  Serial.println();
  Serial.println("########################################");
  Serial.println("#  CEK KONTINUITAS KABEL (MODE 4)      #");
  Serial.println("#  Ganti multimeter beep -> Serial OK  #");
  Serial.println("########################################");
  Serial.println("LCD tetap terpasang. MFRC522 dicabut per kabel.");
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

byte readMfrcVersion() {
  pinMode(PIN_RST, OUTPUT);
  digitalWrite(PIN_RST, LOW);
  delay(20);
  digitalWrite(PIN_RST, HIGH);
  delay(20);

  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_SS);
  mfrc522.PCD_Init();
  delay(10);
  return mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
}

void testMfrc522() {
  Serial.println("========================================");
  Serial.println("[TES MFRC522] Pastikan semua kabel sudah");
  Serial.println("              tersambung ke modul.");
  lcdShow("Tes MFRC522", "Tunggu...");

  byte v = readMfrcVersion();
  Serial.printf("  Version = 0x%02X", v);

  if (v == 0x92 || v == 0x91) {
    Serial.println(" -> SUKSES");
    lcdShow("MFRC522 OK!", "Siap baca kartu");
  } else {
    Serial.println(" -> GAGAL");
    Serial.println("  Ketik 'c' untuk cek kabel yang putus");
    lcdShow("MFRC522 GAGAL", "Ketik c");
  }
  Serial.println("========================================");
  Serial.println();
}

void printHelp() {
  Serial.println();
  Serial.println("=== PERINTAH ===");
  Serial.println("  c = cek kontinuitas 7 kabel (hasil OK/GAGAL di Serial)");
  Serial.println("  y = lanjut tes kabel (saat mode c)");
  Serial.println("  n = lewati kabel ini (saat mode c)");
  Serial.println("  t = tes MFRC522 (semua kabel tersambung)");
  Serial.println("  h = bantuan");
  Serial.println();
  Serial.println("=== TABEL KABEL ===");
  for (size_t i = 0; i < WIRE_COUNT; i++) {
    const WireInfo& w = WIRES[i];
    Serial.printf("  [%d] MFRC522 %-5s -> ESP32 %s\n", w.id, w.mfrcLabel, w.espLabel);
  }
  Serial.println("==================");
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  delay(1500);

  lcdInit();

  Serial.println();
  Serial.println("########################################");
  Serial.println("#  CEK KABEL ESP32 -> MFRC522          #");
  Serial.println("#  LCD boleh tetap terpasang            #");
  Serial.println("########################################");
  printHelp();
  Serial.println("Ketik 'c' untuk cek kabel (tanpa multimeter)");
}

void loop() {
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
    case 'c':
    case 'C':
      startContinuityCheck();
      break;
    case 't':
    case 'T':
      testMfrc522();
      break;
    case 'h':
    case 'H':
      printHelp();
      break;
    default:
      Serial.println("Ketik 'c' cek kabel, 't' tes MFRC522, 'h' bantuan.");
      break;
  }
}
