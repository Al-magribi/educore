/**
 * Classroom RFID scan contract (device_type = "classroom") — locked for LCD/firmware.
 *
 * Debounce:
 * - gate / extracurricular: 5-minute duplicate debounce (rfidDailyAttendance)
 * - classroom: NO 5-minute debounce; use inter-class cooldown instead
 *
 * Cooldown:
 * - 2 minutes, counted from previous session CHECKOUT
 * - only when the same teacher switches to a different class/session
 * - other teachers on the same device are not blocked
 *
 * Checkout earliest (option A):
 * - checkout allowed only at/after planned_end of the open session
 * - earlier tap → too_early_checkout ("Belum waktunya keluar")
 *
 * Multi-class device matching:
 * - open session (checked-in, not checked-out) always takes priority
 * - otherwise prefer strict current period over ±15m buffer overlap
 *
 * Success/error payload shape for devices:
 * {
 *   status: "success" | "error",
 *   result_status: string,
 *   message: string,                 // LCD primary text
 *   retry_after_seconds?: number,    // cooldown only
 *   scan_log_id?: number | null,
 *   data?: { class_name, subject_name, slot_label, ... }
 * }
 */

export const CLASSROOM_SESSION_SWITCH_COOLDOWN_MINUTES = 2;

/** Checkout may start at planned session end (not before). */
export const CLASSROOM_CHECKOUT_EARLIEST = "planned_end";

export const CLASSROOM_RESULT_STATUS = Object.freeze({
  ACCEPTED: "accepted",
  TOO_EARLY_CHECKOUT: "too_early_checkout",
  COOLDOWN: "cooldown",
  DUPLICATE: "duplicate",
  REJECTED: "rejected",
});

export const CLASSROOM_LCD_MESSAGE = Object.freeze({
  TOO_EARLY_CHECKOUT: "Belum waktunya keluar",
  COOLDOWN: "Tunggu 2 menit",
  SESSION_COMPLETE: "Sesi mengajar sudah lengkap (masuk dan keluar tercatat).",
  CHECKIN_OK: (className) =>
    className ? `Masuk ${className}` : "Checkin sesi diterima",
  CHECKOUT_OK: (className) =>
    className ? `Keluar ${className}` : "Checkout sesi diterima",
});

export const resolveClassroomLcdSuccessMessage = (
  scanAction,
  className = null,
) => {
  if (scanAction === "teacher_session_checkout") {
    return CLASSROOM_LCD_MESSAGE.CHECKOUT_OK(className);
  }
  return CLASSROOM_LCD_MESSAGE.CHECKIN_OK(className);
};

/**
 * Build a stable LCD-oriented success body for classroom scans.
 */
export const buildClassroomLcdSuccess = ({
  message,
  scanLogId = null,
  data = null,
}) => {
  const body = {
    status: "success",
    result_status: CLASSROOM_RESULT_STATUS.ACCEPTED,
    message,
  };

  if (data && typeof data === "object") {
    body.data = {
      ...data,
      scan_log_id: data.scan_log_id ?? scanLogId,
    };
  } else if (scanLogId != null) {
    body.data = { scan_log_id: scanLogId };
  }

  return body;
};

/**
 * Build a stable LCD-oriented error body for classroom scans.
 */
export const buildClassroomLcdError = ({
  resultStatus,
  message,
  retryAfterSeconds = null,
  scanLogId = null,
  data = null,
}) => {
  const body = {
    status: "error",
    result_status: resultStatus,
    message,
    scan_log_id: scanLogId,
  };

  if (
    resultStatus === CLASSROOM_RESULT_STATUS.COOLDOWN &&
    retryAfterSeconds != null
  ) {
    body.retry_after_seconds = Math.max(0, Math.ceil(Number(retryAfterSeconds) || 0));
  }

  if (data && typeof data === "object") {
    body.data = data;
  }

  return body;
};

/**
 * Remaining seconds until classroom inter-class cooldown ends.
 * @param {Date|string|null} lastCheckoutAt
 * @param {Date} scannedAt
 * @param {number} [cooldownMinutes]
 */
export const getClassroomCooldownRemainingSeconds = (
  lastCheckoutAt,
  scannedAt,
  cooldownMinutes = CLASSROOM_SESSION_SWITCH_COOLDOWN_MINUTES,
) => {
  if (!lastCheckoutAt) return 0;
  const checkoutMs = new Date(lastCheckoutAt).getTime();
  const scannedMs = scannedAt.getTime();
  if (!Number.isFinite(checkoutMs) || !Number.isFinite(scannedMs)) return 0;

  const unlockAt = checkoutMs + cooldownMinutes * 60 * 1000;
  const remainingMs = unlockAt - scannedMs;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 1000);
};
