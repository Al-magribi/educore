/*
  NodeMCU ESP8266 + MFRC522
  RFID Attendance Client (EduCore LMS)

  Kabel tersolder permanen: firmware otomatis mencari kombinasi bus SPI
  (SCK/MISO/MOSI/SS/RST) yang cocok dengan PCB Anda.

  Board: NodeMCU 1.0 (ESP-12E)
  Libraries: MFRC522, ArduinoJson v6+, ESP8266 core, Wire, LiquidCrystal_I2C
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <time.h>

extern "C" {
#include "user_interface.h"
}

// =============================
// WiFi & API Config
// =============================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* API_URL = "http://YOUR_SERVER_HOST:2310/api/lms/attendance/rfid/scan";
const char* DEVICE_CODE = "RFID-GATE-HB-0008";
const char* DEVICE_TOKEN = "PUT_DEVICE_API_TOKEN_HERE";
const char* SCAN_ACTION = "daily_checkin";

const float WIFI_TX_POWER_DBM = 10.5f;

// =============================
// Buzzer
// =============================
const uint8_t BUZZER_PIN = 16;
const uint8_t BUZZER_ACTIVE = LOW;
const uint8_t BUZZER_IDLE = HIGH;

// =============================
// SPI / MFRC522 (diisi otomatis oleh probe)
// =============================
uint8_t spiSck = 14;
uint8_t spiMiso = 12;
uint8_t spiMosi = 13;
uint8_t activeSsPin = 15;
uint8_t activeRstPin = 2;
uint32_t activeSpiHz = 250000;
MFRC522* mfrc522 = nullptr;

// ESP8266: pin SPI hardware tetap SCK=14(D5) MISO=12(D6) MOSI=13(D7)
const uint8_t HW_SPI_SCK = 14;
const uint8_t HW_SPI_MISO = 12;
const uint8_t HW_SPI_MOSI = 13;

struct SpiPinProfile {
  uint8_t ss;
  uint8_t rst;
  const char* label;
};

// Uji kombinasi SS/RST (MISO/MOSI tidak bisa di-remap di ESP8266)
const SpiPinProfile SPI_PIN_PROFILES[] = {
  {15,  2, "SS D8  RST D4 (default)"},
  {15, 16, "SS D8  RST D0"},
  {15,  5, "SS D8  RST D1"},
  {16,  2, "SS D0  RST D4"},
  { 2, 15, "SS D4  RST D8 (swap ctrl)"},
  { 5,  2, "SS D1  RST D4"},
};
const size_t SPI_PIN_PROFILE_COUNT = sizeof(SPI_PIN_PROFILES) / sizeof(SPI_PIN_PROFILES[0]);

const uint32_t SPI_FREQ_OPTIONS[] = {100000, 250000, 500000, 1000000};
const size_t SPI_FREQ_COUNT = sizeof(SPI_FREQ_OPTIONS) / sizeof(SPI_FREQ_OPTIONS[0]);

// =============================
// LCD 16x2 I2C
// =============================
#define LCD_I2C_ADDR 0x27
#define LCD_COLS 16
#define LCD_ROWS 2
#define LCD_SDA 4
#define LCD_SCL 5
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

WiFiClient wifiClient;

String lastUid = "";
unsigned long lastScanMillis = 0;
const unsigned long dedupeWindowMs = 2500;

bool ntpReady = false;
bool rfidReady = false;
unsigned long lastRfidHealthCheck = 0;
unsigned long lastRfidProbeAttempt = 0;
const unsigned long rfidHealthIntervalMs = 30000;
const unsigned long rfidProbeRetryMs = 30000;

bool isValidMfrc522Version(byte version) {
  return (version == 0x91 || version == 0x92);
}

void buzzerOff() {
  digitalWrite(BUZZER_PIN, BUZZER_IDLE);
}

void buzzerOn() {
  if (BUZZER_PIN == activeRstPin) {
    return;
  }
  digitalWrite(BUZZER_PIN, BUZZER_ACTIVE);
}

void buzzerInit() {
  pinMode(BUZZER_PIN, OUTPUT);
  buzzerOff();
}

void buzzerBeep(uint16_t durationMs) {
  buzzerOn();
  delay(durationMs);
  buzzerOff();
}

void buzzerSuccess() {
  buzzerBeep(100);
  delay(60);
  buzzerBeep(100);
}

void buzzerError() {
  for (uint8_t i = 0; i < 3; i++) {
    buzzerBeep(60);
    delay(80);
  }
}

void lcdShow(const char* line1, const char* line2) {
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
}

void holdRstHigh(uint8_t rstPin) {
  if (rstPin == BUZZER_PIN) {
    return;
  }
  pinMode(rstPin, OUTPUT);
  digitalWrite(rstPin, HIGH);
}

void stabilizeRstPin(uint8_t rstPin) {
  if (rstPin == BUZZER_PIN) {
    return;
  }
  pinMode(rstPin, INPUT);
}

void hardResetRfidChip(uint8_t rstPin) {
  if (rstPin == BUZZER_PIN) {
    return;
  }
  pinMode(rstPin, OUTPUT);
  digitalWrite(rstPin, LOW);
  delay(50);
  digitalWrite(rstPin, HIGH);
  delay(100);
  holdRstHigh(rstPin);
}

void beginSpiBus() {
  SPI.begin();
  SPI.setFrequency(activeSpiHz);
  SPI.setDataMode(SPI_MODE0);
}

// Bit-bang SPI untuk deteksi pin saat hardware SPI gagal
uint8_t softSpiTransfer(uint8_t sck, uint8_t mosi, uint8_t miso, uint8_t outByte) {
  pinMode(sck, OUTPUT);
  pinMode(mosi, OUTPUT);
  pinMode(miso, INPUT);

  uint8_t inByte = 0;
  for (int8_t bit = 7; bit >= 0; bit--) {
    digitalWrite(mosi, (outByte >> bit) & 0x01);
    digitalWrite(sck, LOW);
    delayMicroseconds(4);
    inByte = (uint8_t)(inByte << 1);
    if (digitalRead(miso)) {
      inByte |= 0x01;
    }
    digitalWrite(sck, HIGH);
    delayMicroseconds(4);
  }
  return inByte;
}

byte softReadMfrc522Version(uint8_t ss, uint8_t rst, uint8_t miso, uint8_t mosi) {
  if (ss == BUZZER_PIN || rst == BUZZER_PIN) {
    return 0x00;
  }

  hardResetRfidChip(rst);

  pinMode(ss, OUTPUT);
  digitalWrite(ss, HIGH);
  delay(5);

  digitalWrite(ss, LOW);
  delayMicroseconds(10);
  softSpiTransfer(HW_SPI_SCK, mosi, miso, (byte)(0x80 | (0x37 << 1)));
  byte version = softSpiTransfer(HW_SPI_SCK, mosi, miso, 0x00);
  digitalWrite(ss, HIGH);
  stabilizeRstPin(rst);
  return version;
}

byte readMfrc522VersionHw(const SpiPinProfile& profile, bool doHardReset) {
  if (profile.ss == BUZZER_PIN || profile.rst == BUZZER_PIN) {
    return 0x00;
  }

  spiSck = HW_SPI_SCK;
  spiMiso = HW_SPI_MISO;
  spiMosi = HW_SPI_MOSI;
  activeSsPin = profile.ss;
  activeRstPin = profile.rst;

  if (doHardReset) {
    hardResetRfidChip(activeRstPin);
  } else {
    holdRstHigh(activeRstPin);
  }

  pinMode(activeSsPin, OUTPUT);
  digitalWrite(activeSsPin, HIGH);
  delay(10);

  beginSpiBus();

  MFRC522 trial(activeSsPin, activeRstPin);
  trial.PCD_Init();
  delay(100);

  byte version = 0x00;
  for (uint8_t attempt = 0; attempt < 3; attempt++) {
    byte v = trial.PCD_ReadRegister(trial.VersionReg);
    if (isValidMfrc522Version(v)) {
      return v;
    }
    version = v;
    delay(30);
  }

  holdRstHigh(activeRstPin);
  return version;
}

bool trySpiProfile(const SpiPinProfile& profile, byte& versionOut) {
  for (size_t f = 0; f < SPI_FREQ_COUNT; f++) {
    activeSpiHz = SPI_FREQ_OPTIONS[f];

    byte version = readMfrc522VersionHw(profile, true);
    if (isValidMfrc522Version(version)) {
      versionOut = version;
      return true;
    }

    version = readMfrc522VersionHw(profile, false);
    if (isValidMfrc522Version(version)) {
      versionOut = version;
      return true;
    }
  }
  return false;
}

void probeSwappedMisoDiagnostic() {
  byte version = softReadMfrc522Version(15, 2, 13, 12);
  if (isValidMfrc522Version(version)) {
    Serial.printf("[RFID] Deteksi soft-SPI swap MISO/MOSI: 0x%02X\n", version);
    Serial.println(F("[RFID] PCB kemungkinan tertukar D6/D7 - perlu perbaikan hardware."));
  }
}

bool probeMfrc522Pins() {
  Serial.println(F("[RFID] Scan SS/RST (SPI hardware D5/D6/D7)..."));

  for (size_t i = 0; i < SPI_PIN_PROFILE_COUNT; i++) {
    const SpiPinProfile& profile = SPI_PIN_PROFILES[i];
    byte version = 0x00;

    if (profile.ss == BUZZER_PIN || profile.rst == BUZZER_PIN) {
      Serial.printf("[RFID] Lewati %s (pin dipakai buzzer)\n", profile.label);
      continue;
    }

    Serial.printf("[RFID] Uji %s ... ", profile.label);
    if (trySpiProfile(profile, version)) {
      Serial.printf("OK (0x%02X @ %uHz)\n", version, activeSpiHz);
      Serial.printf("[RFID] Pin aktif: SS=D%d RST=D%d\n", activeSsPin, activeRstPin);
      return true;
    }

    byte hwVersion = readMfrc522VersionHw(profile, true);
    Serial.printf("gagal (0x%02X)\n", hwVersion);
    delay(50);
  }

  probeSwappedMisoDiagnostic();
  return false;
}

void destroyMfrc522() {
  if (mfrc522 != nullptr) {
    delete mfrc522;
    mfrc522 = nullptr;
  }
}

bool initMfrc522() {
  destroyMfrc522();
  mfrc522 = new MFRC522(activeSsPin, activeRstPin);

  hardResetRfidChip(activeRstPin);

  pinMode(activeSsPin, OUTPUT);
  digitalWrite(activeSsPin, HIGH);

  beginSpiBus();

  mfrc522->PCD_Init();
  delay(100);
  mfrc522->PCD_SetAntennaGain(mfrc522->RxGain_max);
  mfrc522->PCD_AntennaOn();
  holdRstHigh(activeRstPin);

  byte version = mfrc522->PCD_ReadRegister(mfrc522->VersionReg);
  Serial.printf("[RFID] Firmware version: 0x%02X\n", version);

  rfidReady = isValidMfrc522Version(version);
  return rfidReady;
}

void checkRfidHealth() {
  if (!rfidReady || mfrc522 == nullptr) {
    return;
  }
  if (millis() - lastRfidHealthCheck < rfidHealthIntervalMs) {
    return;
  }
  lastRfidHealthCheck = millis();

  beginSpiBus();
  byte version = mfrc522->PCD_ReadRegister(mfrc522->VersionReg);
  if (!isValidMfrc522Version(version)) {
    Serial.println(F("[RFID] Reader tidak responsif, re-init..."));
    rfidReady = initMfrc522();
  }
}

void retryRfidProbeIfNeeded() {
  if (rfidReady) {
    return;
  }
  if (millis() - lastRfidProbeAttempt < rfidProbeRetryMs) {
    return;
  }
  lastRfidProbeAttempt = millis();

  Serial.println(F("[RFID] Coba deteksi ulang reader..."));
  if (probeMfrc522Pins() && initMfrc522()) {
    lcd.backlight();
    lcdShow("Tap Kartu", "");
    buzzerBeep(60);
    Serial.println(F("Tap Kartu (WiFi aktif saat scan)."));
  }
}

String getIso8601NowUtc() {
  time_t now = time(nullptr);
  if (now < 100000) {
    return "";
  }

  struct tm* timeInfo = gmtime(&now);
  if (timeInfo == nullptr) {
    return "";
  }

  char buff[25];
  strftime(buff, sizeof(buff), "%Y-%m-%dT%H:%M:%SZ", timeInfo);
  return String(buff);
}

String uidToHexString(MFRC522::Uid* uid) {
  String hex = "";
  for (byte i = 0; i < uid->size; i++) {
    if (uid->uidByte[i] < 0x10) {
      hex += "0";
    }
    hex += String(uid->uidByte[i], HEX);
  }
  hex.toUpperCase();
  return hex;
}

void disconnectWifi() {
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  delay(100);
  yield();
  Serial.println(F("[WiFi] Dimatikan (hemat daya)."));
}

bool sendScanToServer(const String& cardUid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[RFID] WiFi tidak tersambung."));
    return false;
  }

  HTTPClient http;
  http.begin(wifiClient, API_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  DynamicJsonDocument doc(512);
  doc["device_code"] = DEVICE_CODE;
  doc["device_token"] = DEVICE_TOKEN;
  doc["card_uid"] = cardUid;
  doc["scan_action"] = SCAN_ACTION;

  String scannedAt = getIso8601NowUtc();
  if (scannedAt.length() > 0) {
    doc["scanned_at"] = scannedAt;
  }

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  String body = http.getString();
  http.end();

  Serial.printf("[RFID] HTTP %d | UID=%s\n", httpCode, cardUid.c_str());
  Serial.println(body);

  return (httpCode >= 200 && httpCode < 300);
}

bool connectWifi() {
  buzzerOff();

  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setOutputPower(WIFI_TX_POWER_DBM);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.println(F("Menyambungkan Wifi ...."));
  lcdShow("Menyambungkan", "Wifi ....");

  uint8_t dotCount = 0;
  uint8_t attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    delay(500);
    yield();
    Serial.print('.');
    dotCount = (uint8_t)((dotCount + 1) % 4);
    lcd.setCursor(5, 1);
    for (uint8_t i = 0; i < dotCount; i++) {
      lcd.print('.');
    }
    for (uint8_t i = dotCount; i < 3; i++) {
      lcd.print(' ');
    }
    attempts++;
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WiFi] Gagal terhubung."));
    lcdShow("Wifi Gagal", "Tap Kartu");
    buzzerError();
    delay(1500);
    disconnectWifi();
    return false;
  }

  Serial.println(F("Wifi Terhubung"));
  Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  lcdShow("Wifi Terhubung", WiFi.localIP().toString().c_str());
  delay(800);
  return true;
}

void setupNtpUtc() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  Serial.print(F("Sync NTP"));
  int retry = 0;
  time_t now = time(nullptr);
  while (now < 100000 && retry < 20) {
    delay(500);
    yield();
    Serial.print('.');
    now = time(nullptr);
    retry++;
  }
  Serial.println();

  if (retry >= 20) {
    Serial.println(F("NTP belum sinkron. Scan tetap berjalan tanpa scanned_at."));
  } else {
    Serial.println(F("NTP sinkron."));
  }
}

bool ensureWifiReady() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  lcd.noBacklight();
  bool ok = connectWifi();
  lcd.backlight();

  if (!ok) {
    return false;
  }

  if (!ntpReady) {
    setupNtpUtc();
    ntpReady = true;
  }

  if (rfidReady) {
    initMfrc522();
  }
  return true;
}

void setup() {
  buzzerInit();
  WiFi.mode(WIFI_OFF);
  system_update_cpu_freq(80);

  Serial.begin(115200);
  delay(1000);

  // GPIO15 (D8/SS) harus HIGH sebelum SPI
  pinMode(15, OUTPUT);
  digitalWrite(15, HIGH);

  if (probeMfrc522Pins()) {
    initMfrc522();
  } else {
    Serial.println(F("[RFID] Reader tidak ditemukan di semua profil SS/RST."));
    Serial.println(F("[RFID] 0xFF=tidak ada respon, 0x00=sinyal SPI salah/3.3V lemah."));
    holdRstHigh(activeRstPin);
  }

  lcdInit();
  if (rfidReady) {
    lcdShow("Tap Kartu", "");
    buzzerBeep(60);
    Serial.println(F("Tap Kartu (WiFi aktif saat scan)."));
  } else {
    lcdShow("Reader error", "Tunggu/reset");
    buzzerOff();
    stabilizeRstPin(activeRstPin);
    lcd.noBacklight();
    Serial.println(F("Reader error - firmware akan coba deteksi ulang tiap 30 detik."));
  }

  buzzerOff();
  lastRfidProbeAttempt = millis();
}

void loop() {
  buzzerOff();

  if (!rfidReady || mfrc522 == nullptr) {
    stabilizeRstPin(activeRstPin);
    retryRfidProbeIfNeeded();
    delay(500);
    yield();
    return;
  }

  checkRfidHealth();

  if (!mfrc522->PICC_IsNewCardPresent()) {
    delay(50);
    yield();
    return;
  }
  if (!mfrc522->PICC_ReadCardSerial()) {
    delay(50);
    yield();
    return;
  }

  String uidHex = uidToHexString(&mfrc522->uid);
  unsigned long now = millis();

  if (uidHex == lastUid && (now - lastScanMillis) < dedupeWindowMs) {
    Serial.printf("[RFID] Duplicate ignored: %s\n", uidHex.c_str());
  } else {
    Serial.printf("[RFID] Card UID: %s\n", uidHex.c_str());
    lcdShow("Memproses...", uidHex.c_str());

    bool ok = false;
    if (ensureWifiReady()) {
      ok = sendScanToServer(uidHex);
    }

    if (ok) {
      Serial.println(F("[RFID] Scan accepted."));
      lcdShow("Berhasil", "Tap Kartu");
      buzzerSuccess();
    } else {
      Serial.println(F("[RFID] Scan failed/rejected."));
      lcdShow("Gagal", "Tap Kartu");
      buzzerError();
    }

    lastUid = uidHex;
    lastScanMillis = now;
    delay(1200);

    disconnectWifi();
    initMfrc522();
    buzzerOff();
    lcdShow("Tap Kartu", "");
  }

  mfrc522->PICC_HaltA();
  mfrc522->PCD_StopCrypto1();
  delay(200);
}
