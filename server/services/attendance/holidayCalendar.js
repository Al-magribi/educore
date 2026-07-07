import { getJakartaIsoDow } from "./rfidDailyAttendance.js";

const HOLIDAY_ROLE_OPTIONS = new Set(["all", "student", "teacher"]);

export const getDefaultCalendarConfig = (homebaseId) => ({
  homebase_id: Number(homebaseId),
  skip_saturday: false,
  skip_sunday: true,
  is_default: true,
});

export const getCalendarConfig = async (executor, homebaseId) => {
  const result = await executor.query(
    `SELECT *
     FROM attendance.attendance_calendar_config
     WHERE homebase_id = $1
     LIMIT 1`,
    [homebaseId],
  );

  if (!result.rows[0]) {
    return getDefaultCalendarConfig(homebaseId);
  }

  return {
    ...result.rows[0],
    is_default: false,
  };
};

export const upsertCalendarConfig = async (executor, homebaseId, payload, userId) => {
  const result = await executor.query(
    `INSERT INTO attendance.attendance_calendar_config (
       homebase_id,
       skip_saturday,
       skip_sunday,
       created_by,
       updated_at
     )
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (homebase_id)
     DO UPDATE SET
       skip_saturday = EXCLUDED.skip_saturday,
       skip_sunday = EXCLUDED.skip_sunday,
       updated_at = NOW()
     RETURNING *`,
    [
      homebaseId,
      payload.skip_saturday === true,
      payload.skip_sunday === true,
      userId || null,
    ],
  );

  return result.rows[0];
};

export const listAttendanceHolidays = async (
  executor,
  homebaseId,
  { year, startDate, endDate } = {},
) => {
  const result = await executor.query(
    `SELECT *
     FROM attendance.attendance_holiday
     WHERE homebase_id = $1
       AND ($2::int IS NULL OR EXTRACT(YEAR FROM holiday_date)::int = $2::int)
       AND ($3::date IS NULL OR holiday_date >= $3::date)
       AND ($4::date IS NULL OR holiday_date <= $4::date)
     ORDER BY holiday_date ASC, id ASC`,
    [homebaseId, year || null, startDate || null, endDate || null],
  );

  return result.rows;
};

export const getAttendanceHolidayById = async (executor, homebaseId, holidayId) => {
  const result = await executor.query(
    `SELECT *
     FROM attendance.attendance_holiday
     WHERE id = $1
       AND homebase_id = $2
     LIMIT 1`,
    [holidayId, homebaseId],
  );

  return result.rows[0] || null;
};

export const createAttendanceHoliday = async (executor, homebaseId, payload, userId) => {
  const holidayDate = String(payload.holiday_date || "").trim();
  const name = String(payload.name || "").trim();
  const appliesToRole = String(payload.applies_to_role || "all").trim();

  if (!holidayDate) {
    throw new Error("Tanggal libur wajib diisi.");
  }
  if (!name) {
    throw new Error("Nama libur wajib diisi.");
  }
  if (!HOLIDAY_ROLE_OPTIONS.has(appliesToRole)) {
    throw new Error("applies_to_role tidak valid.");
  }

  const result = await executor.query(
    `INSERT INTO attendance.attendance_holiday (
       homebase_id,
       holiday_date,
       name,
       description,
       applies_to_role,
       is_active,
       created_by,
       updated_at
     )
     VALUES ($1, $2::date, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [
      homebaseId,
      holidayDate,
      name,
      payload.description ? String(payload.description).trim() : null,
      appliesToRole,
      payload.is_active !== false,
      userId || null,
    ],
  );

  return result.rows[0];
};

export const updateAttendanceHoliday = async (
  executor,
  homebaseId,
  holidayId,
  payload,
) => {
  const existing = await getAttendanceHolidayById(executor, homebaseId, holidayId);
  if (!existing) {
    throw new Error("Data libur tidak ditemukan.");
  }

  const holidayDate = payload.holiday_date
    ? String(payload.holiday_date).trim()
    : existing.holiday_date;
  const name = payload.name !== undefined ? String(payload.name || "").trim() : existing.name;
  const appliesToRole =
    payload.applies_to_role !== undefined
      ? String(payload.applies_to_role || "all").trim()
      : existing.applies_to_role;

  if (!name) {
    throw new Error("Nama libur wajib diisi.");
  }
  if (!HOLIDAY_ROLE_OPTIONS.has(appliesToRole)) {
    throw new Error("applies_to_role tidak valid.");
  }

  const result = await executor.query(
    `UPDATE attendance.attendance_holiday
     SET holiday_date = $3::date,
         name = $4,
         description = $5,
         applies_to_role = $6,
         is_active = $7,
         updated_at = NOW()
     WHERE id = $1
       AND homebase_id = $2
     RETURNING *`,
    [
      holidayId,
      homebaseId,
      holidayDate,
      name,
      payload.description !== undefined
        ? payload.description
          ? String(payload.description).trim()
          : null
        : existing.description,
      appliesToRole,
      payload.is_active !== undefined ? payload.is_active === true : existing.is_active,
    ],
  );

  return result.rows[0];
};

export const deleteAttendanceHoliday = async (executor, homebaseId, holidayId) => {
  const result = await executor.query(
    `DELETE FROM attendance.attendance_holiday
     WHERE id = $1
       AND homebase_id = $2
     RETURNING id`,
    [holidayId, homebaseId],
  );

  return result.rows[0]?.id ? Number(result.rows[0].id) : null;
};

export const bulkDeleteAttendanceHolidays = async (executor, homebaseId, ids = []) => {
  const normalizedIds = ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);

  if (normalizedIds.length === 0) {
    return 0;
  }

  const result = await executor.query(
    `DELETE FROM attendance.attendance_holiday
     WHERE homebase_id = $1
       AND id = ANY($2::int[])`,
    [homebaseId, normalizedIds],
  );

  return result.rowCount || 0;
};

const isWeekendHoliday = (attendanceDate, calendarConfig) => {
  if (!calendarConfig) return false;

  const date = new Date(`${attendanceDate}T12:00:00+07:00`);
  const dayOfWeek = getJakartaIsoDow(date);

  if (dayOfWeek === 6 && calendarConfig.skip_saturday === true) {
    return true;
  }
  if (dayOfWeek === 7 && calendarConfig.skip_sunday === true) {
    return true;
  }

  return false;
};

export const isStudentHoliday = async (executor, homebaseId, attendanceDate) => {
  const calendarConfig = await getCalendarConfig(executor, homebaseId);

  if (isWeekendHoliday(attendanceDate, calendarConfig)) {
    return true;
  }

  const result = await executor.query(
    `SELECT 1
     FROM attendance.attendance_holiday
     WHERE homebase_id = $1
       AND holiday_date = $2::date
       AND is_active = true
       AND applies_to_role IN ('all', 'student')
     LIMIT 1`,
    [homebaseId, attendanceDate],
  );

  return result.rows.length > 0;
};
