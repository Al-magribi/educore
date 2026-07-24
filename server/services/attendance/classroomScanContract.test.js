import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLASSROOM_CHECKOUT_EARLIEST,
  CLASSROOM_LCD_MESSAGE,
  CLASSROOM_RESULT_STATUS,
  CLASSROOM_SESSION_SWITCH_COOLDOWN_MINUTES,
  buildClassroomLcdError,
  buildClassroomLcdSuccess,
  getClassroomCooldownRemainingSeconds,
  resolveClassroomLcdSuccessMessage,
} from "./classroomScanContract.js";

describe("classroomScanContract (tahap 0 + 5)", () => {
  it("locks cooldown, checkout earliest, and LCD statuses", () => {
    assert.equal(CLASSROOM_SESSION_SWITCH_COOLDOWN_MINUTES, 2);
    assert.equal(CLASSROOM_CHECKOUT_EARLIEST, "planned_end");
    assert.equal(CLASSROOM_RESULT_STATUS.TOO_EARLY_CHECKOUT, "too_early_checkout");
    assert.equal(CLASSROOM_RESULT_STATUS.COOLDOWN, "cooldown");
    assert.equal(CLASSROOM_LCD_MESSAGE.TOO_EARLY_CHECKOUT, "Belum waktunya keluar");
    assert.equal(CLASSROOM_LCD_MESSAGE.COOLDOWN, "Tunggu 2 menit");
  });

  it("builds cooldown LCD error with retry_after_seconds", () => {
    const body = buildClassroomLcdError({
      resultStatus: CLASSROOM_RESULT_STATUS.COOLDOWN,
      message: CLASSROOM_LCD_MESSAGE.COOLDOWN,
      retryAfterSeconds: 87.2,
      scanLogId: null,
    });

    assert.equal(body.status, "error");
    assert.equal(body.result_status, "cooldown");
    assert.equal(body.message, "Tunggu 2 menit");
    assert.equal(body.retry_after_seconds, 88);
    assert.equal(body.scan_log_id, null);
  });

  it("omits retry_after_seconds for non-cooldown errors", () => {
    const body = buildClassroomLcdError({
      resultStatus: CLASSROOM_RESULT_STATUS.TOO_EARLY_CHECKOUT,
      message: CLASSROOM_LCD_MESSAGE.TOO_EARLY_CHECKOUT,
      retryAfterSeconds: 30,
    });

    assert.equal(body.result_status, "too_early_checkout");
    assert.equal(body.message, "Belum waktunya keluar");
    assert.equal(body.retry_after_seconds, undefined);
  });

  it("computes remaining cooldown seconds from last checkout", () => {
    const lastCheckoutAt = new Date("2026-07-21T01:05:00.000Z");
    const scannedAt = new Date("2026-07-21T01:06:20.000Z");
    assert.equal(
      getClassroomCooldownRemainingSeconds(lastCheckoutAt, scannedAt),
      40,
    );
    assert.equal(
      getClassroomCooldownRemainingSeconds(
        lastCheckoutAt,
        new Date("2026-07-21T01:07:00.000Z"),
      ),
      0,
    );
    assert.equal(getClassroomCooldownRemainingSeconds(null, scannedAt), 0);
  });

  it("resolves LCD success messages for check-in / check-out", () => {
    assert.equal(
      resolveClassroomLcdSuccessMessage("teacher_session_checkin", "8A"),
      "Masuk 8A",
    );
    assert.equal(
      resolveClassroomLcdSuccessMessage("teacher_session_checkout", "8B"),
      "Keluar 8B",
    );
    assert.equal(
      resolveClassroomLcdSuccessMessage("teacher_session_checkin", null),
      "Checkin sesi diterima",
    );
  });

  it("builds LCD success payload with data for firmware", () => {
    const body = buildClassroomLcdSuccess({
      message: "Masuk 8A",
      scanLogId: 55,
      data: {
        class_name: "8A",
        subject_name: "IPA",
        scan_action: "teacher_session_checkin",
        user_name: "Guru A",
      },
    });

    assert.equal(body.status, "success");
    assert.equal(body.result_status, "accepted");
    assert.equal(body.message, "Masuk 8A");
    assert.equal(body.data.scan_log_id, 55);
    assert.equal(body.data.class_name, "8A");
    assert.equal(body.data.subject_name, "IPA");
  });
});
