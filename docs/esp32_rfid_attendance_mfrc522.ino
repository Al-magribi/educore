/*
  ESP32 DevKit V1 + MFRC522 + LCD I2C + Buzzer
  RFID Attendance Client — EduCore LMS

  Wiring MFRC522:
    SDA(SS) -> D5    SCK  -> D18   MOSI -> D23
    MISO    -> D19   RST  -> D22   3.3V -> 3V3
    GND     -> GND

  Wiring LCD I2C:
    SDA -> D21   SCL -> D27   VCC -> 5V/VIN   GND -> GND

  Wiring Buzzer (active):
    (+) -> D4    (-) -> GND
    Jika tidak bunyi, ubah BUZZER_ON ke LOW dan BUZZER_OFF ke HIGH
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <time.h>

// =============================
// WiFi & API Config
// =============================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

const char* API_URL = "http://YOUR_SERVER_HOST:2310/api/lms/attendance/rfid/scan";

const char* DEVICE_CODE = "RFID-GATE-HB-0008";
const char* DEVICE_TOKEN = "PUT_DEVICE_API_TOKEN_HERE";

// daily_gate untuk datang / pulang
// teacher_session_checkin untuk absen masuk kelas

const char* SCAN_ACTION = "daily_gate";

// =============================
// MFRC522 Pins (sesuai hasil uji)
// =============================
#define SS_PIN   5
#define RST_PIN 22
#define SPI_SCK  18
#define SPI_MISO 19
#define SPI_MOSI 23
MFRC522 mfrc522(SS_PIN, RST_PIN);

// =============================
// Buzzer
// =============================
#define BUZZER_PIN  4
#define BUZZER_ON   HIGH
#define BUZZER_OFF  LOW

// =============================
// LCD 16x2 I2C (ubah alamat jika layar kosong: coba 0x3F)
// =============================
#define LCD_I2C_ADDR 0x27
#define LCD_COLS     16
#define LCD_ROWS      2
#define LCD_SDA      21
#define LCD_SCL      27
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

String lastUid = "";
unsigned long lastScanMillis = 0;
const unsigned long dedupeWindowMs = 2500;

bool mfrc522VersionOk(byte version) {
  return (version == 0x91 || version == 0x92 ||
          version == 0x82 || version == 0x88);
}

void buzzerOff() {
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
}

void buzzerBeep(uint16_t durationMs) {
  digitalWrite(BUZZER_PIN, BUZZER_ON);
  delay(durationMs);
  buzzerOff();
}

void buzzerSuccess() {
  buzzerBeep(150);
}

void buzzerError() {
  buzzerBeep(100);
  delay(80);
  buzzerBeep(100);
}

void buzzerInit() {
  pinMode(BUZZER_PIN, OUTPUT);
  buzzerOff();
}

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
  lcdShow("EduCore RFID", "Memulai...");
}

bool initMfrc522() {
  pinMode(RST_PIN, OUTPUT);
  digitalWrite(RST_PIN, LOW);
  delay(50);
  digitalWrite(RST_PIN, HIGH);
  delay(50);

  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI, SS_PIN);
  mfrc522.PCD_Init();
  delay(50);

  byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  Serial.printf("[RFID] Version 0x%02X\n", version);
  return mfrc522VersionOk(version);
}

String getIso8601NowUtc() {
  struct tm timeInfo;
  if (!getLocalTime(&timeInfo, 2000)) {
    return "";
  }
  char buff[25];
  strftime(buff, sizeof(buff), "%Y-%m-%dT%H:%M:%SZ", &timeInfo);
  return String(buff);
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

String truncateLcdLine(const String& text) {
  if (text.length() <= (size_t)LCD_COLS) {
    return text;
  }
  return text.substring(0, LCD_COLS);
}

bool sendScanToServer(const String& cardUid, String& userNameOut) {
  userNameOut = "";

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[RFID] WiFi tidak tersambung.");
    return false;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

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

  if (httpCode < 200 || httpCode >= 300) {
    return false;
  }

  DynamicJsonDocument resp(768);
  DeserializationError err = deserializeJson(resp, body);
  if (!err) {
    userNameOut = resp["data"]["user_name"].as<String>();
  }
  if (userNameOut.length() == 0) {
    userNameOut = "Pemegang Kartu";
  }
  return true;
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.println("Menyambungkan Wifi ....");
  lcdShow("Menyambungkan", "Wifi ....");

  uint8_t dotCount = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    dotCount = (uint8_t)((dotCount + 1) % 4);
    lcd.setCursor(5, 1);
    for (uint8_t i = 0; i < dotCount; i++) {
      lcd.print(".");
    }
    for (uint8_t i = dotCount; i < 3; i++) {
      lcd.print(" ");
    }
  }
  Serial.println();
  Serial.println("Wifi Terhubung");
  Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  lcdShow("Wifi Terhubung", WiFi.localIP().toString().c_str());
  delay(1500);
}

void setupNtpUtc() {
  configTzTime("UTC0", "pool.ntp.org", "time.nist.gov");

  struct tm timeInfo;
  Serial.print("Sync NTP");
  int retry = 0;
  while (!getLocalTime(&timeInfo) && retry < 20) {
    Serial.print(".");
    delay(500);
    retry++;
  }
  Serial.println();
  if (retry >= 20) {
    Serial.println("NTP belum sinkron. Scan tetap berjalan tanpa scanned_at.");
  } else {
    Serial.println("NTP sinkron.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  buzzerInit();
  lcdInit();
  connectWifi();
  setupNtpUtc();

  if (!initMfrc522()) {
    Serial.println("[RFID] MFRC522 tidak terdeteksi. Cek kabel.");
    lcdShow("MFRC522 ERROR", "Cek kabel");
    buzzerError();
    while (true) {
      delay(1000);
    }
  }

  Serial.println("Tap Kartu");
  lcdShow("Tap Kartu", "");
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent()) {
    delay(30);
    return;
  }
  if (!mfrc522.PICC_ReadCardSerial()) {
    delay(30);
    return;
  }

  String uidHex = uidToHexString(&mfrc522.uid);
  unsigned long now = millis();

  if (uidHex == lastUid && (now - lastScanMillis) < dedupeWindowMs) {
    Serial.printf("[RFID] Duplicate ignored: %s\n", uidHex.c_str());
  } else {
    Serial.printf("[RFID] Card UID: %s\n", uidHex.c_str());
    lcdShow("Memproses...", uidHex.c_str());
    String userName;
    bool ok = sendScanToServer(uidHex, userName);
    if (ok) {
      Serial.println("[RFID] Scan accepted.");
      lcdShow(truncateLcdLine(userName).c_str(), "Berhasil");
      buzzerSuccess();
      delay(3000);
    } else {
      Serial.println("[RFID] Scan failed/rejected.");
      lcdShow("Gagal", "Tap Kartu");
      buzzerError();
      delay(1500);
    }
    lastUid = uidHex;
    lastScanMillis = now;
    lcdShow("Tap Kartu", "");
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(200);
}
