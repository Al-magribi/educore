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

  Catatan device classroom (1 device banyak kelas):
    - Device TIDAK perlu mengirim class_id.
    - Mapping kelas diatur di LMS (Device RFID → pilih banyak kelas).
    - Server mencocokkan guru + jadwal published + kelas yang terikat device
      untuk menentukan kelas, jam keberapa, dan check-in/check-out.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <time.h>

enum ScanOutcome {
  SCAN_OUTCOME_ACCEPTED = 0,
  SCAN_OUTCOME_DUPLICATE = 1,
  SCAN_OUTCOME_ERROR = 2,
  SCAN_OUTCOME_NETWORK = 3,
};

struct ScanResult {
  bool ok;
  int outcome;
  int httpCode;
  String resultStatus;
  String message;
  String userName;
  String resolvedAction;
  String attendanceStatus;
  String sessionStatus;
  String className;
  String slotLabel;
  String policyName;
  bool hasAttendance;
  bool hasSession;
  bool hasActivity;
};

void resetScanResult(ScanResult& result) {
  result.ok = false;
  result.outcome = SCAN_OUTCOME_NETWORK;
  result.httpCode = 0;
  result.resultStatus = "";
  result.message = "";
  result.userName = "";
  result.resolvedAction = "";
  result.attendanceStatus = "";
  result.sessionStatus = "";
  result.className = "";
  result.slotLabel = "";
  result.policyName = "";
  result.hasAttendance = false;
  result.hasSession = false;
  result.hasActivity = false;
}

// =============================
// WiFi & API Config
// =============================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// Gunakan https jika server menggunakan SSL
// Gunakan http jika server tidak menggunakan SSL
const char* API_URL = "https://YOUR_SERVER_HOST:2310/api/lms/attendance/rfid/scan";

// Samakan dengan Code Device di LMS (tab Device RFID)
const char* DEVICE_CODE = "RFID-GATE-HB-0008";
const char* DEVICE_TOKEN = "PUT_DEVICE_API_TOKEN_HERE";

// "gate"             -> absensi harian (datang/pulang)
// "classroom"        -> absensi sesi guru (1 device boleh banyak kelas di LMS)
// "extracurricular"  -> absensi kegiatan ekstra (policy Silat/dll di LMS)
const char* DEVICE_TYPE = "gate";

// gate: "daily_gate" (server auto datang/pulang)
// classroom / extracurricular: biarkan kosong agar server auto
//   tap 1 = check-in, tap 2 = check-out
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

bool isClassroomDevice() {
  return String(DEVICE_TYPE).equalsIgnoreCase("classroom");
}

bool isExtracurricularDevice() {
  return String(DEVICE_TYPE).equalsIgnoreCase("extracurricular");
}

bool isAutoSessionDevice() {
  return isClassroomDevice() || isExtracurricularDevice();
}

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

bool messageContains(const String& haystack, const char* needle) {
  return haystack.indexOf(needle) >= 0;
}

String jsonStringOrEmpty(JsonObject obj, const char* key) {
  if (obj.isNull() || !obj.containsKey(key) || obj[key].isNull()) {
    return "";
  }
  return obj[key].as<String>();
}

void parseScanResponseBody(const String& body, ScanResult& result) {
  // Response classroom bisa berisi class_name / slot_label / planned times.
  DynamicJsonDocument resp(1536);
  DeserializationError err = deserializeJson(resp, body);
  if (err) {
    return;
  }

  result.resultStatus = resp["result_status"].as<String>();
  result.message = resp["message"].as<String>();

  JsonObject data = resp["data"].as<JsonObject>();
  if (!data.isNull()) {
    result.userName = jsonStringOrEmpty(data, "user_name");
    result.resolvedAction = jsonStringOrEmpty(data, "resolved_scan_action");
    if (result.resolvedAction.length() == 0) {
      result.resolvedAction = jsonStringOrEmpty(data, "scan_action");
    }
    result.attendanceStatus = jsonStringOrEmpty(data, "attendance_status");
    result.sessionStatus = jsonStringOrEmpty(data, "session_status");
    result.className = jsonStringOrEmpty(data, "class_name");
    result.slotLabel = jsonStringOrEmpty(data, "slot_label");
    result.policyName = jsonStringOrEmpty(data, "policy_name");
    result.hasAttendance = !data["attendance_id"].isNull();
    result.hasSession = !data["schedule_entry_id"].isNull();
    result.hasActivity = !data["activity_attendance_id"].isNull();
  }
}

String buildClassroomSuccessLine2(const ScanResult& result) {
  if (!result.hasSession) {
    return "Tdk ada jadwal";
  }

  if (result.sessionStatus == "late") {
    if (result.className.length() > 0) {
      return truncateLcdLine(String("Telat ") + result.className);
    }
    return "Sesi Terlambat";
  }

  if (result.resolvedAction == "teacher_session_checkout") {
    if (result.className.length() > 0) {
      return truncateLcdLine(String("Out ") + result.className);
    }
    return "Sesi Selesai";
  }

  if (result.resolvedAction == "teacher_session_checkin") {
    if (result.className.length() > 0) {
      return truncateLcdLine(String("In ") + result.className);
    }
    if (result.slotLabel.length() > 0) {
      return truncateLcdLine(result.slotLabel);
    }
    return "Sesi Masuk";
  }

  if (result.className.length() > 0) {
    return truncateLcdLine(result.className);
  }
  return "Sesi OK";
}

String buildActivitySuccessLine2(const ScanResult& result) {
  if (!result.hasActivity) {
    return "Tdk tercatat";
  }

  if (result.attendanceStatus == "late") {
    if (result.policyName.length() > 0) {
      return truncateLcdLine(String("Telat ") + result.policyName);
    }
    return "Terlambat";
  }

  if (result.resolvedAction == "activity_checkout") {
    if (result.policyName.length() > 0) {
      return truncateLcdLine(String("Out ") + result.policyName);
    }
    return "Ekstra Selesai";
  }

  if (result.resolvedAction == "activity_checkin") {
    if (result.policyName.length() > 0) {
      return truncateLcdLine(String("In ") + result.policyName);
    }
    return "Ekstra Masuk";
  }

  if (result.policyName.length() > 0) {
    return truncateLcdLine(result.policyName);
  }
  return "Ekstra OK";
}

void resolveLcdMessage(const ScanResult& result, String& line1, String& line2) {
  if (result.ok) {
    String name = result.userName.length() > 0 ? result.userName : "Pemegang Kartu";
    line1 = truncateLcdLine(name);

    if (isClassroomDevice()) {
      line2 = buildClassroomSuccessLine2(result);
      return;
    }

    if (isExtracurricularDevice()) {
      line2 = buildActivitySuccessLine2(result);
      return;
    }

    if (result.attendanceStatus == "not_scheduled") {
      line2 = "Tdk ada jadwal";
    } else if (result.attendanceStatus == "late") {
      line2 = "Terlambat";
    } else if (result.resolvedAction == "daily_checkout") {
      line2 = "Pulang OK";
    } else if (result.resolvedAction == "daily_checkin") {
      line2 = "Datang OK";
    } else if (result.resolvedAction == "teacher_session_checkout") {
      line2 = "Sesi Selesai";
    } else if (result.resolvedAction == "teacher_session_checkin") {
      line2 = "Sesi Masuk";
    } else if (result.resolvedAction == "activity_checkout") {
      line2 = "Ekstra Selesai";
    } else if (result.resolvedAction == "activity_checkin") {
      line2 = "Ekstra Masuk";
    } else {
      line2 = "Berhasil";
    }
    return;
  }

  if (result.httpCode == 0) {
    if (WiFi.status() != WL_CONNECTED) {
      line1 = "No WiFi";
      line2 = "Cek Koneksi";
    } else {
      line1 = "Server Error";
      line2 = "Coba Lagi";
    }
    return;
  }

  if (result.httpCode == 404) {
    line1 = "Device Salah";
    line2 = "Cek Kode";
    return;
  }

  const String& status = result.resultStatus;
  const String& msg = result.message;

  if (status == "duplicate") {
    if (messageContains(msg, "Checkin hari ini")) {
      line1 = result.userName.length() > 0 ? truncateLcdLine(result.userName) : "Sudah Tap";
      line2 = "Datang Tercatat";
    } else if (messageContains(msg, "Checkout hari ini")) {
      line1 = "Sudah Tap";
      line2 = "Pulang Tercatat";
    } else if (messageContains(msg, "duplikat dalam")) {
      line1 = "Sudah Tap";
      line2 = "Tunggu Sebentar";
    } else if (messageContains(msg, "terlalu cepat")) {
      line1 = "Terlalu Cepat";
      line2 = "Tunggu 15 Menit";
    } else if (messageContains(msg, "sudah lengkap")) {
      line1 = "Sudah Lengkap";
      line2 = "Datang+Pulang";
    } else {
      line1 = "Sudah Tap";
      line2 = truncateLcdLine(msg.length() > 0 ? msg : "Duplikat");
    }
    return;
  }

  if (status == "out_of_window") {
    line1 = "Di Luar Jam";
    if (messageContains(msg, "mulai")) {
      line2 = "Blm Waktu Masuk";
    } else if (messageContains(msg, "batas")) {
      line2 = "Lewat Bts Waktu";
    } else {
      line2 = "Cek Jam Policy";
    }
    return;
  }

  if (status == "unregistered") {
    line1 = "Kartu Gagal";
    line2 = "Tdk Terdaftar";
    return;
  }

  if (status == "rejected") {
    if (messageContains(msg, "Token")) {
      line1 = "Konfigurasi";
      line2 = "Token Salah";
    } else if (messageContains(msg, "tidak terdaftar")) {
      line1 = "Kartu Gagal";
      line2 = "Tdk Terdaftar";
    } else {
      line1 = "Kartu Gagal";
      line2 = truncateLcdLine(msg.length() > 0 ? msg : "Ditolak");
    }
    return;
  }

  if (status == "device_inactive") {
    line1 = "Device Off";
    line2 = "Hubungi Admin";
    return;
  }

  if (status == "card_inactive") {
    line1 = "Kartu Off";
    line2 = "Hubungi Admin";
    return;
  }

  if (status == "user_inactive") {
    line1 = "Akun Off";
    line2 = "Hubungi Admin";
    return;
  }

  if (status == "policy_missing") {
    line1 = "Policy Kosong";
    line2 = "Hubungi Admin";
    return;
  }

  if (status == "not_scheduled") {
    line1 = "Tdk ada jadwal";
    line2 = "Tap Ditolak";
    return;
  }

  line1 = "Gagal";
  line2 = truncateLcdLine(msg.length() > 0 ? msg : "Tap Kartu");
}

bool sendScanToServer(const String& cardUid, ScanResult& resultOut) {
  resetScanResult(resultOut);

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

  // Gate: kirim daily_gate.
  // Classroom / extracurricular: JANGAN kirim scan_action (atau kosong) agar server
  // auto resolve check-in lalu check-out.
  String scanAction = String(SCAN_ACTION);
  scanAction.trim();
  if (isAutoSessionDevice()) {
    if (scanAction.length() > 0 &&
        scanAction != "daily_gate" &&
        !scanAction.startsWith("daily_")) {
      doc["scan_action"] = scanAction;
    }
    // else: omit scan_action → server auto-resolve
  } else if (scanAction.length() > 0) {
    doc["scan_action"] = scanAction;
  } else {
    doc["scan_action"] = "daily_gate";
  }

  String scannedAt = getIso8601NowUtc();
  if (scannedAt.length() > 0) {
    doc["scanned_at"] = scannedAt;
  }

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  String body = http.getString();
  http.end();

  resultOut.httpCode = httpCode;
  parseScanResponseBody(body, resultOut);

  Serial.printf("[RFID] HTTP %d | UID=%s | type=%s\n", httpCode, cardUid.c_str(), DEVICE_TYPE);
  Serial.println(body);

  if (httpCode >= 200 && httpCode < 300) {
    resultOut.ok = true;
    resultOut.outcome = SCAN_OUTCOME_ACCEPTED;
    if (resultOut.userName.length() == 0) {
      resultOut.userName = "Pemegang Kartu";
    }
    return true;
  }

  if (resultOut.resultStatus == "duplicate") {
    resultOut.outcome = SCAN_OUTCOME_DUPLICATE;
  } else {
    resultOut.outcome = SCAN_OUTCOME_ERROR;
  }
  return false;
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

  Serial.printf("[RFID] Device ready | code=%s | type=%s\n", DEVICE_CODE, DEVICE_TYPE);
  if (isClassroomDevice()) {
    lcdShow("Tap Kartu", "Mode Kelas");
    Serial.println("[RFID] Classroom mode: class_id tidak dikirim; server resolve dari jadwal.");
  } else if (isExtracurricularDevice()) {
    lcdShow("Tap Kartu", "Mode Ekstra");
    Serial.println("[RFID] Extracurricular mode: policy peserta diatur di LMS.");
  } else {
    lcdShow("Tap Kartu", "Mode Gerbang");
  }
  delay(1200);
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
    lcdShow("Tunggu...", "");
    delay(800);
    lcdShow("Tap Kartu", "");
  } else {
    Serial.printf("[RFID] Card UID: %s\n", uidHex.c_str());
    lcdShow("Memproses...", uidHex.c_str());
    ScanResult result;
    resetScanResult(result);
    bool ok = sendScanToServer(uidHex, result);
    String line1;
    String line2;
    resolveLcdMessage(result, line1, line2);

    if (ok) {
      Serial.printf(
        "[RFID] Scan accepted action=%s class=%s slot=%s policy=%s session=%s\n",
        result.resolvedAction.c_str(),
        result.className.c_str(),
        result.slotLabel.c_str(),
        result.policyName.c_str(),
        result.sessionStatus.c_str());
      lcdShow(line1.c_str(), line2.c_str());
      // Classroom tanpa jadwal / ekstra tanpa record: accepted di log, tapi nada error ringan.
      if ((isClassroomDevice() && !result.hasSession) ||
          (isExtracurricularDevice() && !result.hasActivity)) {
        buzzerError();
      } else {
        buzzerSuccess();
      }
      delay(3000);
    } else if (result.outcome == SCAN_OUTCOME_DUPLICATE) {
      Serial.printf("[RFID] Scan duplicate: %s\n", result.message.c_str());
      lcdShow(line1.c_str(), line2.c_str());
      buzzerSuccess();
      delay(2000);
    } else {
      Serial.printf(
        "[RFID] Scan failed: %s | %s\n",
        result.resultStatus.c_str(),
        result.message.c_str());
      lcdShow(line1.c_str(), line2.c_str());
      buzzerError();
      delay(2000);
    }
    lastUid = uidHex;
    lastScanMillis = now;
    lcdShow("Tap Kartu", "");
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(200);
}
