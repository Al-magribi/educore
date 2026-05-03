/*
  ESP32 DevKit V1 + MFRC522
  RFID Attendance Client

  Wiring (SPI default ESP32):
  - MFRC522 SDA(SS) -> GPIO 5
  - MFRC522 SCK     -> GPIO 18
  - MFRC522 MOSI    -> GPIO 23
  - MFRC522 MISO    -> GPIO 19
  - MFRC522 RST     -> GPIO 22
  - MFRC522 3.3V    -> 3V3
  - MFRC522 GND     -> GND
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>

// =============================
// WiFi & API Config
// =============================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// Contoh endpoint lokal:
// http://192.168.1.10:2310/api/lms/attendance/rfid/scan
const char* API_URL = "http://YOUR_SERVER_HOST:2310/api/lms/attendance/rfid/scan";

// Harus sama dengan data di tabel attendance.rfid_device
const char* DEVICE_CODE = "RFID-GATE-HB-0008";
const char* DEVICE_TOKEN = "PUT_DEVICE_API_TOKEN_HERE";
const char* SCAN_ACTION = "daily_checkin"; // atau daily_checkout, teacher_session_checkin, teacher_session_checkout

// =============================
// MFRC522 Pins
// =============================
#define SS_PIN   5
#define RST_PIN 22
MFRC522 mfrc522(SS_PIN, RST_PIN);

// Anti-double scan sederhana
String lastUid = "";
unsigned long lastScanMillis = 0;
const unsigned long dedupeWindowMs = 2500;

String getIso8601NowUtc() {
  struct tm timeInfo;
  if (!getLocalTime(&timeInfo, 2000)) {
    return "";
  }
  char buff[25];
  // format UTC ISO-8601: 2026-05-01T10:20:30Z
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

bool sendScanToServer(const String& cardUid) {
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

  // Jika NTP sudah aktif, kirim waktu scan dari device
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

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.printf("Connecting WiFi to %s", WIFI_SSID);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.printf("WiFi connected: %s\n", WiFi.localIP().toString().c_str());
}

void setupNtpUtc() {
  // Timezone UTC agar string ISO Z tetap konsisten
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

  connectWifi();
  setupNtpUtc();

  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("MFRC522 ready. Tempel kartu RFID...");
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
    bool ok = sendScanToServer(uidHex);
    if (ok) {
      Serial.println("[RFID] Scan accepted.");
    } else {
      Serial.println("[RFID] Scan failed/rejected.");
    }
    lastUid = uidHex;
    lastScanMillis = now;
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(200);
}

