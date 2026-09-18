import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isWeekendHoliday } from "./holidayCalendar.js";

describe("attendance holiday helpers", () => {
  it("weekend mengikuti skip_saturday / skip_sunday", () => {
    // 2026-07-25 = Sabtu, 2026-07-26 = Minggu (WIB)
    assert.equal(
      isWeekendHoliday("2026-07-25", {
        skip_saturday: true,
        skip_sunday: true,
      }),
      true,
    );
    assert.equal(
      isWeekendHoliday("2026-07-25", {
        skip_saturday: false,
        skip_sunday: true,
      }),
      false,
    );
    assert.equal(
      isWeekendHoliday("2026-07-26", {
        skip_saturday: false,
        skip_sunday: true,
      }),
      true,
    );
    assert.equal(
      isWeekendHoliday("2026-07-21", {
        skip_saturday: true,
        skip_sunday: true,
      }),
      false,
    );
  });
});
