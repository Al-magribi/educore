import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jakartaLocalToDate } from "./rfidDailyAttendance.js";
import {
  pickScheduleEntryForCheckin,
  resolveClassroomSessionIntent,
} from "./rfidTeacherSession.js";
import {
  CLASSROOM_LCD_MESSAGE,
  CLASSROOM_RESULT_STATUS,
  resolveClassroomLcdSuccessMessage,
} from "./classroomScanContract.js";

const attendanceDate = "2026-07-21";

const entry8A = {
  id: 101,
  class_id: 8,
  class_name: "8A",
  subject_name: "IPA",
  start_time: "07:00",
  end_time: "08:00",
  first_slot_no: 1,
  last_slot_no: 1,
};

const entry8B = {
  id: 102,
  class_id: 9,
  class_name: "8B",
  subject_name: "IPA",
  start_time: "08:00",
  end_time: "09:00",
  first_slot_no: 2,
  last_slot_no: 2,
};

const entries = [entry8A, entry8B];

const at = (hhmm) => jakartaLocalToDate(attendanceDate, hhmm);

describe("Tahap 2 — multi-class schedule match", () => {
  it("06:50 / 07:10 picks nearest upcoming / current 8A", () => {
    assert.equal(
      pickScheduleEntryForCheckin(entries, at("06:50"), attendanceDate).id,
      101,
    );
    assert.equal(
      pickScheduleEntryForCheckin(entries, at("07:10"), attendanceDate).id,
      101,
    );
  });

  it("08:05 prefers strict current 8B over lingering 8A buffer", () => {
    assert.equal(
      pickScheduleEntryForCheckin(entries, at("08:05"), attendanceDate).id,
      102,
    );
  });

  it("08:05 skips completed 8A and picks 8B", () => {
    assert.equal(
      pickScheduleEntryForCheckin(
        entries,
        at("08:05"),
        attendanceDate,
        new Set([101]),
      ).id,
      102,
    );
  });
});

describe("Tahap 3 — too-early checkout", () => {
  it("07:50 with open 8A → too_early_checkout", () => {
    const requirementsByEntryId = new Map([
      [
        101,
        {
          id: 1,
          schedule_entry_id: 101,
          actual_checkin_at: at("07:10"),
          actual_checkout_at: null,
        },
      ],
    ]);

    const intent = resolveClassroomSessionIntent({
      entries,
      scannedAt: at("07:50"),
      attendanceDate,
      requirementsByEntryId,
      autoResolveSessionAction: true,
    });

    assert.equal(intent.blocked, true);
    assert.equal(
      intent.result_status,
      CLASSROOM_RESULT_STATUS.TOO_EARLY_CHECKOUT,
    );
    assert.equal(intent.message, CLASSROOM_LCD_MESSAGE.TOO_EARLY_CHECKOUT);
    assert.equal(intent.scheduleEntry.id, 101);
  });

  it("08:05 with open 8A → checkout allowed (at/after planned_end)", () => {
    const requirementsByEntryId = new Map([
      [
        101,
        {
          id: 1,
          schedule_entry_id: 101,
          actual_checkin_at: at("07:10"),
          actual_checkout_at: null,
        },
      ],
    ]);

    const intent = resolveClassroomSessionIntent({
      entries,
      scannedAt: at("08:05"),
      attendanceDate,
      requirementsByEntryId,
      autoResolveSessionAction: true,
    });

    assert.equal(intent.blocked, false);
    assert.equal(intent.scheduleEntry.id, 101);
    assert.equal(intent.effectiveScanAction, "teacher_session_checkout");
  });

  it("Anton regression: check-in 10:31 then checkout 10:37 before 11:30 → too_early", () => {
    const antonEntry = {
      id: 105,
      class_id: 8,
      class_name: "8 C",
      subject_name: "B. INGGRIS",
      start_time: "10:20",
      end_time: "11:30",
    };
    const requirementsByEntryId = new Map([
      [
        105,
        {
          id: 1,
          schedule_entry_id: 105,
          actual_checkin_at: new Date("2026-07-21T03:31:23.000Z"),
          actual_checkout_at: null,
          planned_start_at: new Date("2026-07-21T03:20:00.000Z"),
          planned_end_at: new Date("2026-07-21T04:30:00.000Z"),
        },
      ],
    ]);

    const intent = resolveClassroomSessionIntent({
      entries: [antonEntry],
      scannedAt: new Date("2026-07-21T03:37:48.000Z"),
      attendanceDate,
      requirementsByEntryId,
      autoResolveSessionAction: true,
    });

    assert.equal(intent.blocked, true);
    assert.equal(
      intent.result_status,
      CLASSROOM_RESULT_STATUS.TOO_EARLY_CHECKOUT,
    );
    assert.equal(intent.message, CLASSROOM_LCD_MESSAGE.TOO_EARLY_CHECKOUT);
    assert.equal(intent.effectiveScanAction, "teacher_session_checkout");
  });

  it("Anton regression: checkout at/after 11:30 allowed", () => {
    const antonEntry = {
      id: 105,
      class_id: 8,
      class_name: "8 C",
      start_time: "10:20",
      end_time: "11:30",
    };
    const intent = resolveClassroomSessionIntent({
      entries: [antonEntry],
      scannedAt: new Date("2026-07-21T04:30:00.000Z"),
      attendanceDate,
      requirementsByEntryId: new Map([
        [
          105,
          {
            id: 1,
            schedule_entry_id: 105,
            actual_checkin_at: new Date("2026-07-21T03:31:23.000Z"),
            actual_checkout_at: null,
            planned_end_at: new Date("2026-07-21T04:30:00.000Z"),
          },
        ],
      ]),
      autoResolveSessionAction: true,
    });

    assert.equal(intent.blocked, false);
    assert.equal(intent.effectiveScanAction, "teacher_session_checkout");
  });

  it("multi-slot block: schedule end 11:30 wins over stale requirement end 10:55", () => {
    const antonEntry = {
      id: 105,
      class_id: 6,
      class_name: "8 C",
      start_time: "10:20",
      end_time: "11:30", // full block jam 6-7 from fetchTeacherScheduleEntries
    };
    const intent = resolveClassroomSessionIntent({
      entries: [antonEntry],
      scannedAt: new Date("2026-07-21T03:58:51.000Z"), // 10:58 WIB
      attendanceDate,
      requirementsByEntryId: new Map([
        [
          105,
          {
            id: 1,
            schedule_entry_id: 105,
            actual_checkin_at: new Date("2026-07-21T03:31:23.000Z"),
            actual_checkout_at: null,
            // stale/wrong: first-slot-only end
            planned_end_at: new Date("2026-07-21T03:55:00.000Z"),
          },
        ],
      ]),
      autoResolveSessionAction: true,
    });

    assert.equal(intent.blocked, true);
    assert.equal(
      intent.result_status,
      CLASSROOM_RESULT_STATUS.TOO_EARLY_CHECKOUT,
    );
  });
});

describe("Tahap 4 — inter-class cooldown (same teacher)", () => {
  it("check-in 8B within 2 minutes of 8A checkout → cooldown", () => {
    const requirementsByEntryId = new Map([
      [
        101,
        {
          id: 1,
          schedule_entry_id: 101,
          actual_checkin_at: at("07:10"),
          actual_checkout_at: at("08:05"),
        },
      ],
    ]);

    const intent = resolveClassroomSessionIntent({
      entries,
      scannedAt: at("08:06"),
      attendanceDate,
      requirementsByEntryId,
      lastCheckout: {
        schedule_entry_id: 101,
        actual_checkout_at: at("08:05"),
      },
      autoResolveSessionAction: true,
    });

    assert.equal(intent.blocked, true);
    assert.equal(intent.result_status, CLASSROOM_RESULT_STATUS.COOLDOWN);
    assert.equal(intent.message, CLASSROOM_LCD_MESSAGE.COOLDOWN);
    assert.ok(intent.retry_after_seconds > 0);
    assert.ok(intent.retry_after_seconds <= 120);
    assert.equal(intent.scheduleEntry.id, 102);
  });

  it("08:07 after 08:05 checkout → check-in 8B allowed", () => {
    const intent = resolveClassroomSessionIntent({
      entries,
      scannedAt: at("08:07"),
      attendanceDate,
      requirementsByEntryId: new Map([
        [
          101,
          {
            id: 1,
            schedule_entry_id: 101,
            actual_checkin_at: at("07:10"),
            actual_checkout_at: at("08:05"),
          },
        ],
      ]),
      lastCheckout: {
        schedule_entry_id: 101,
        actual_checkout_at: at("08:05"),
      },
      autoResolveSessionAction: true,
    });

    assert.equal(intent.blocked, false);
    assert.equal(intent.scheduleEntry.id, 102);
    assert.equal(intent.effectiveScanAction, "teacher_session_checkin");
  });

  it("different previous session only: no cooldown when lastCheckout is null", () => {
    const intent = resolveClassroomSessionIntent({
      entries,
      scannedAt: at("08:05"),
      attendanceDate,
      requirementsByEntryId: new Map(),
      lastCheckout: null,
      autoResolveSessionAction: true,
    });

    assert.equal(intent.blocked, false);
    assert.equal(intent.scheduleEntry.id, 102);
  });
});

describe("Tahap 6 — full Blok A scenario walkthrough", () => {
  it("simulates taps 07:10 → 07:50 → 08:05 → 08:06 → 08:07 → 09:10", () => {
    const requirementsByEntryId = new Map();
    let lastCheckout = null;

    const run = (hhmm) =>
      resolveClassroomSessionIntent({
        entries,
        scannedAt: at(hhmm),
        attendanceDate,
        requirementsByEntryId,
        lastCheckout,
        autoResolveSessionAction: true,
      });

    let intent = run("07:10");
    assert.equal(intent.blocked, false);
    assert.equal(intent.scheduleEntry.id, 101);
    assert.equal(intent.effectiveScanAction, "teacher_session_checkin");
    assert.equal(
      resolveClassroomLcdSuccessMessage(
        intent.effectiveScanAction,
        intent.scheduleEntry.class_name,
      ),
      "Masuk 8A",
    );
    requirementsByEntryId.set(101, {
      id: 1,
      schedule_entry_id: 101,
      actual_checkin_at: at("07:10"),
      actual_checkout_at: null,
    });

    intent = run("07:50");
    assert.equal(intent.blocked, true);
    assert.equal(
      intent.result_status,
      CLASSROOM_RESULT_STATUS.TOO_EARLY_CHECKOUT,
    );

    intent = run("08:05");
    assert.equal(intent.blocked, false);
    assert.equal(intent.effectiveScanAction, "teacher_session_checkout");
    assert.equal(
      resolveClassroomLcdSuccessMessage(
        intent.effectiveScanAction,
        intent.scheduleEntry.class_name,
      ),
      "Keluar 8A",
    );
    requirementsByEntryId.set(101, {
      id: 1,
      schedule_entry_id: 101,
      actual_checkin_at: at("07:10"),
      actual_checkout_at: at("08:05"),
    });
    lastCheckout = {
      schedule_entry_id: 101,
      actual_checkout_at: at("08:05"),
    };

    intent = run("08:06");
    assert.equal(intent.blocked, true);
    assert.equal(intent.result_status, CLASSROOM_RESULT_STATUS.COOLDOWN);

    intent = run("08:07");
    assert.equal(intent.blocked, false);
    assert.equal(intent.scheduleEntry.id, 102);
    assert.equal(intent.effectiveScanAction, "teacher_session_checkin");
    assert.equal(
      resolveClassroomLcdSuccessMessage(
        intent.effectiveScanAction,
        intent.scheduleEntry.class_name,
      ),
      "Masuk 8B",
    );
    requirementsByEntryId.set(102, {
      id: 2,
      schedule_entry_id: 102,
      actual_checkin_at: at("08:07"),
      actual_checkout_at: null,
    });

    intent = run("09:10");
    assert.equal(intent.blocked, false);
    assert.equal(intent.scheduleEntry.id, 102);
    assert.equal(intent.effectiveScanAction, "teacher_session_checkout");
    assert.equal(
      resolveClassroomLcdSuccessMessage(
        intent.effectiveScanAction,
        intent.scheduleEntry.class_name,
      ),
      "Keluar 8B",
    );
  });

  it("open session wins over next-class window at 08:05", () => {
    const intent = resolveClassroomSessionIntent({
      entries,
      scannedAt: at("08:05"),
      attendanceDate,
      requirementsByEntryId: new Map([
        [
          101,
          {
            id: 1,
            schedule_entry_id: 101,
            actual_checkin_at: at("07:10"),
            actual_checkout_at: null,
          },
        ],
      ]),
      autoResolveSessionAction: true,
    });

    assert.equal(intent.scheduleEntry.id, 101);
    assert.equal(intent.effectiveScanAction, "teacher_session_checkout");
  });

  it("complete 8A then open 8B at 09:10 → checkout 8B", () => {
    const intent = resolveClassroomSessionIntent({
      entries,
      scannedAt: at("09:10"),
      attendanceDate,
      requirementsByEntryId: new Map([
        [
          101,
          {
            id: 1,
            schedule_entry_id: 101,
            actual_checkin_at: at("07:10"),
            actual_checkout_at: at("08:05"),
          },
        ],
        [
          102,
          {
            id: 2,
            schedule_entry_id: 102,
            actual_checkin_at: at("08:07"),
            actual_checkout_at: null,
          },
        ],
      ]),
      lastCheckout: {
        schedule_entry_id: 101,
        actual_checkout_at: at("08:05"),
      },
      autoResolveSessionAction: true,
    });

    assert.equal(intent.blocked, false);
    assert.equal(intent.scheduleEntry.id, 102);
    assert.equal(intent.effectiveScanAction, "teacher_session_checkout");
  });
});
