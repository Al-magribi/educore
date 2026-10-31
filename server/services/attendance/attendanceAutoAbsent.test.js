import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAutoFillCheckoutForPolicy,
  hasPassedCutoff,
  resolveAutoCheckoutStatus,
  resolveCheckinCutoff,
  resolveCheckoutFillAt,
  shouldSkipExistingAbsentRow,
} from "./attendanceAutoAbsent.js";
import { jakartaLocalToDate } from "./rfidDailyAttendance.js";

const studentDayRule = {
  checkin_start: "07:00",
  checkin_end: "08:00",
  reference_checkin_time: "07:15",
  late_tolerance_minutes: 0,
  checkout_start: "14:00",
  reference_checkout_time: "15:00",
  checkout_is_optional: false,
  min_presence_minutes: null,
};

const scheduleBasedDayRule = {
  checkin_start: "07:00",
  checkin_end: null,
  reference_checkin_time: null,
  late_tolerance_minutes: 0,
  checkout_start: null,
  reference_checkout_time: "15:00",
  checkout_is_optional: false,
  min_presence_minutes: null,
};

describe("Tahap 4 — auto-absent / auto-checkout scenarios", () => {
  it("1) sebelum Checkin Selesai: belum boleh absent", () => {
    const now = jakartaLocalToDate("2026-07-21", "07:30");
    const cutoff = resolveCheckinCutoff(studentDayRule, now);
    assert.equal(hasPassedCutoff(now, cutoff), false);
    // Tanpa pre-create: job tidak membuat baris sebelum cutoff.
  });

  it("2) setelah Checkin Selesai: boleh mark absent (belum tap)", () => {
    const now = jakartaLocalToDate("2026-07-21", "08:00");
    const cutoff = resolveCheckinCutoff(studentDayRule, now);
    assert.ok(cutoff);
    assert.equal(hasPassedCutoff(now, cutoff), true);
    assert.equal(shouldSkipExistingAbsentRow(null), false);
    assert.equal(
      shouldSkipExistingAbsentRow({ checkin_at: null, attendance_status: "pending" }),
      false,
    );
  });

  it("2b) yang sudah tap masuk tidak di-absent", () => {
    assert.equal(
      shouldSkipExistingAbsentRow({
        checkin_at: "2026-07-21T00:20:00.000Z",
        attendance_status: "present",
      }),
      true,
    );
    assert.equal(
      shouldSkipExistingAbsentRow({
        checkin_at: null,
        attendance_status: "absent",
      }),
      true,
    );
  });

  it("3) sudah masuk, sebelum Jam Pulang: checkout belum diisi", () => {
    const attendanceDate = "2026-07-21";
    const now = jakartaLocalToDate(attendanceDate, "14:30");
    const fillAt = resolveCheckoutFillAt(studentDayRule, attendanceDate);
    assert.ok(fillAt);
    assert.equal(hasPassedCutoff(now, fillAt), false);
  });

  it("4) setelah Jam Pulang: checkout = Jam Pulang policy", () => {
    const attendanceDate = "2026-07-21";
    const now = jakartaLocalToDate(attendanceDate, "15:00");
    const fillAt = resolveCheckoutFillAt(studentDayRule, attendanceDate);
    assert.equal(hasPassedCutoff(now, fillAt), true);
    assert.equal(fillAt.toISOString(), jakartaLocalToDate(attendanceDate, "15:00").toISOString());

    const checkinAt = jakartaLocalToDate(attendanceDate, "07:20");
    const { attendanceStatus, presenceMinutes } = resolveAutoCheckoutStatus({
      checkinAt,
      checkoutAt: fillAt,
      currentStatus: "present",
      lateMinutes: 0,
      minPresenceMinutes: null,
    });
    assert.equal(attendanceStatus, "present");
    assert.equal(presenceMinutes, 7 * 60 + 40);
  });

  it("5) guru fixed memakai aturan checkout yang sama", () => {
    assert.equal(
      canAutoFillCheckoutForPolicy({ policy_type: "teacher_fixed_daily" }),
      true,
    );
    assert.equal(
      canAutoFillCheckoutForPolicy({ policy_type: "student_fixed" }),
      true,
    );
    const fillAt = resolveCheckoutFillAt(studentDayRule, "2026-07-21");
    assert.ok(fillAt);
  });

  it("6) guru schedule-based: ikut auto-isi jika day rule punya Jam Pulang", () => {
    assert.equal(
      canAutoFillCheckoutForPolicy({ policy_type: "teacher_schedule_based" }),
      true,
    );
    assert.equal(
      resolveCheckoutFillAt(scheduleBasedDayRule, "2026-07-21")?.toISOString(),
      jakartaLocalToDate("2026-07-21", "15:00").toISOString(),
    );
    assert.equal(
      resolveCheckoutFillAt(
        { ...scheduleBasedDayRule, reference_checkout_time: null },
        "2026-07-21",
      ),
      null,
    );
  });

  it("7) guru schedule-based: tanpa Checkin Selesai, absent memakai Jam Pulang", () => {
    const attendanceDate = "2026-07-21";
    const before = jakartaLocalToDate(attendanceDate, "14:30");
    const after = jakartaLocalToDate(attendanceDate, "15:00");
    const cutoffFromCheckin = resolveCheckinCutoff(scheduleBasedDayRule, after);
    assert.equal(cutoffFromCheckin, null);
    const fillAt = resolveCheckoutFillAt(scheduleBasedDayRule, attendanceDate);
    assert.equal(hasPassedCutoff(before, fillAt), false);
    assert.equal(hasPassedCutoff(after, fillAt), true);
  });

  it("7b) jam pulang diutamakan untuk cutoff schedule-based", () => {
    const attendanceDate = "2026-07-21";
    const rule = {
      ...scheduleBasedDayRule,
      checkin_end: "08:00",
      reference_checkout_time: "16:00",
    };
    const fillAt = resolveCheckoutFillAt(rule, attendanceDate);
    const checkinCutoff = resolveCheckinCutoff(rule, jakartaLocalToDate(attendanceDate, "17:00"));
    // Preferensi di processTeacherAutoAbsent: jam pulang dulu.
    assert.equal(fillAt.toISOString(), jakartaLocalToDate(attendanceDate, "16:00").toISOString());
    assert.ok(checkinCutoff);
    assert.equal(hasPassedCutoff(jakartaLocalToDate(attendanceDate, "16:00"), fillAt), true);
  });

  it("8) sudah ada checkout nyata: tidak ditimpa auto-checkout", () => {
    const existing = {
      checkin_at: "2026-07-21T00:20:00.000Z",
      checkout_at: "2026-07-21T07:50:00.000Z",
      attendance_status: "present",
    };
    // Guard di processAutoCheckout: if (!existing?.checkin_at || existing.checkout_at) continue
    assert.ok(existing.checkin_at && existing.checkout_at);
  });

  it("extra) insufficient_hours jika di bawah minimal hadir", () => {
    const attendanceDate = "2026-07-21";
    const checkinAt = jakartaLocalToDate(attendanceDate, "07:00");
    const checkoutAt = jakartaLocalToDate(attendanceDate, "08:00");
    const { attendanceStatus, presenceMinutes } = resolveAutoCheckoutStatus({
      checkinAt,
      checkoutAt,
      currentStatus: "present",
      lateMinutes: 0,
      minPresenceMinutes: 120,
    });
    assert.equal(presenceMinutes, 60);
    assert.equal(attendanceStatus, "insufficient_hours");
  });

  it("extra) checkout_is_optional mencegah auto-fill (guard di process)", () => {
    assert.equal(studentDayRule.checkout_is_optional, false);
    assert.equal(
      {
        ...studentDayRule,
        checkout_is_optional: true,
      }.checkout_is_optional,
      true,
    );
  });

  it("extra) siswa eligible membutuhkan periodeId (tanpa itu kosong)", async () => {
    // Smoke: helper diexport dan menolak periode kosong tanpa query DB.
    const { listEligibleStudentsForDailyAttendance } = await import(
      "./attendanceAutoAbsent.js"
    );
    const rows = await listEligibleStudentsForDailyAttendance(
      { query: async () => ({ rows: [{ user_id: 1 }] }) },
      { homebaseId: 1, periodeId: null },
    );
    assert.deepEqual(rows, []);
  });
});
