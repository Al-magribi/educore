export const dayLabels = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

export const toInt = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseMinute = (timeValue) => {
  if (!timeValue) return null;
  const [hour, minute] = String(timeValue).split(":").map((item) => toInt(item));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
};

export const toTimeString = (minutes) => {
  const safeMinutes = Math.max(0, Math.min(1439, minutes));
  const hour = String(Math.floor(safeMinutes / 60)).padStart(2, "0");
  const minute = String(safeMinutes % 60).padStart(2, "0");
  return `${hour}:${minute}:00`;
};

export const splitSessions = (weeklySessions, maxPerMeeting) => {
  const chunks = [];
  let remaining = Math.max(0, toInt(weeklySessions, 0));
  const maxChunk = Math.max(1, toInt(maxPerMeeting, 2));
  while (remaining > 0) {
    const nextChunk = Math.min(maxChunk, remaining);
    chunks.push(nextChunk);
    remaining -= nextChunk;
  }
  return chunks;
};

export const ensureActivePeriode = async (executor, homebaseId, requestedPeriodeId) => {
  if (requestedPeriodeId) return requestedPeriodeId;
  const activePeriode = await executor.query(
    `SELECT id
     FROM public.a_periode
     WHERE homebase_id = $1
       AND is_active = true
     ORDER BY id DESC
     LIMIT 1`,
    [homebaseId],
  );
  return activePeriode.rows[0]?.id || null;
};

export const listScheduleConfigs = async (executor, homebaseId, periodeId) => {
  const result = await executor.query(
    `SELECT *
     FROM lms.l_schedule_config
     WHERE homebase_id = $1
       AND periode_id = $2
     ORDER BY is_active DESC, created_at ASC, id ASC`,
    [homebaseId, periodeId],
  );
  return result.rows;
};

export const resolveSelectedScheduleConfig = async ({
  executor,
  homebaseId,
  periodeId,
  requestedConfigId = null,
}) => {
  const configs = await listScheduleConfigs(executor, homebaseId, periodeId);
  const numericRequestedConfigId = toInt(requestedConfigId, null);
  const selectedConfig =
    configs.find((item) => Number(item.id) === numericRequestedConfigId) ||
    configs.find((item) => item.is_active === true) ||
    configs[0] ||
    null;

  return {
    configs,
    selectedConfig,
    activeConfig:
      configs.find((item) => item.is_active === true) || selectedConfig || null,
  };
};

export const normalizeScheduleConfigName = (value, fallbackIndex = 1) => {
  const rawValue = String(value || "").trim();
  if (rawValue) return rawValue;
  return fallbackIndex <= 1 ? "Jadwal Utama" : `Jadwal ${fallbackIndex}`;
};

export const getColumnPresence = async (executor, tableName, columnNames = []) => {
  if (!columnNames.length) return {};
  const result = await executor.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'lms'
       AND table_name = $1
       AND column_name = ANY($2::text[])`,
    [tableName, columnNames],
  );
  const existing = new Set(result.rows.map((row) => String(row.column_name)));
  return columnNames.reduce((acc, columnName) => {
    acc[columnName] = existing.has(columnName);
    return acc;
  }, {});
};

export const listScheduleConfigGroups = async (executor, configId) => {
  if (!configId) return [];
  const result = await executor.query(
    `SELECT
       g.*,
       COUNT(gcc.id)::int AS class_count
     FROM lms.l_schedule_config_group g
     LEFT JOIN lms.l_schedule_config_group_class gcc
       ON gcc.config_group_id = g.id
     WHERE g.config_id = $1
     GROUP BY g.id
     ORDER BY g.sort_order ASC, g.id ASC`,
    [configId],
  );
  return result.rows;
};

export const resolveSelectedScheduleGroup = async ({
  executor,
  configId,
  requestedGroupId = null,
}) => {
  const groups = await listScheduleConfigGroups(executor, configId);
  const numericRequestedGroupId = toInt(requestedGroupId, null);
  const selectedGroup =
    groups.find((item) => Number(item.id) === numericRequestedGroupId) ||
    groups.find((item) => item.is_default === true) ||
    groups[0] ||
    null;

  return {
    groups,
    selectedGroup,
  };
};

export const overlapTime = (slotStart, slotEnd, blockStart, blockEnd) =>
  slotStart < blockEnd && slotEnd > blockStart;

export const buildSlotTimeMap = (slotRows = []) =>
  slotRows.reduce((acc, item) => {
    acc[Number(item.id)] = {
      id: Number(item.id),
      day_of_week: Number(item.day_of_week),
      start_minute: parseMinute(item.start_time),
      end_minute: parseMinute(item.end_time),
      config_group_id: toInt(item.config_group_id, null),
      slot_no: toInt(item.slot_no, null),
    };
    return acc;
  }, {});

export const gapSatisfied = (
  candidateStart,
  candidateEnd,
  existingStart,
  existingEnd,
  minGap,
) => {
  if (!Number.isFinite(minGap) || minGap <= 0) return true;
  if (candidateStart > existingEnd) return candidateStart - existingEnd >= minGap;
  if (existingStart > candidateEnd) return existingStart - candidateEnd >= minGap;
  return false;
};

export const GENERATE_ACTIONS = new Set([
  "generate_new",
  "regenerate_generated",
  "reset_generated",
]);

export const FAILURE_LABELS = {
  no_day_slots: "Tidak ada slot tersedia pada hari sekolah aktif.",
  same_day_rule: "Aturan hari yang berbeda untuk mapel yang sama tidak terpenuhi.",
  no_contiguous_segment: "Tidak ditemukan slot berurutan sesuai kebutuhan sesi.",
  gap_rule: "Jarak minimal antarsesi mapel yang sama tidak terpenuhi.",
  class_conflict: "Slot kelas sudah terisi.",
  teacher_conflict: "Slot guru sudah terisi.",
  teacher_unavailability: "Guru tidak tersedia pada slot tersebut.",
  no_group_mapping: "Kelas belum memiliki group jadwal aktif.",
  no_available_slot: "Tidak ada kombinasi slot yang dapat dipakai.",
};

export const summarizeFailureStats = (stats = {}) =>
  Object.entries(stats)
    .filter(([, count]) => Number(count) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .map(([code, count]) => ({
      code,
      count: Number(count),
      label: FAILURE_LABELS[code] || code,
    }));

export const getPrimaryFailureCode = (stats = {}) => {
  const sorted = summarizeFailureStats(stats);
  return sorted[0]?.code || "no_available_slot";
};

export const aggregateFailureCodes = (failedItems = []) =>
  failedItems.reduce((acc, item) => {
    const code = item.failure_code || "no_available_slot";
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

export const resolveScheduleSegment = async ({
  client,
  homebaseId,
  periodeId,
  dayOfWeek,
  slotStartId,
  slotCount,
}) => {
  const startSlotResult = await client.query(
    `SELECT ts.*, cfg.homebase_id, cfg.periode_id
     FROM lms.l_time_slot ts
     JOIN lms.l_schedule_config cfg ON cfg.id = ts.config_id
     WHERE ts.id = $1
     LIMIT 1`,
    [slotStartId],
  );
  if (startSlotResult.rowCount === 0) {
    return { error: "slot_start_id tidak valid." };
  }

  const startSlot = startSlotResult.rows[0];
  if (
    Number(startSlot.homebase_id) !== Number(homebaseId) ||
    Number(startSlot.periode_id) !== Number(periodeId)
  ) {
    return { error: "Slot mulai tidak cocok dengan homebase/periode aktif." };
  }

  if (Number(startSlot.day_of_week) !== Number(dayOfWeek)) {
    return { error: "Hari tidak sesuai dengan slot mulai yang dipilih." };
  }

  const startSlotNo = toInt(startSlot.slot_no, 0);
  const segmentResult = await client.query(
    `SELECT id, slot_no, start_time, end_time
     FROM lms.l_time_slot
     WHERE config_group_id = $1
       AND day_of_week = $2
       AND is_break = false
       AND slot_no BETWEEN $3 AND $4
     ORDER BY slot_no`,
    [startSlot.config_group_id, dayOfWeek, startSlotNo, startSlotNo + slotCount - 1],
  );
  if (segmentResult.rowCount !== slotCount) {
    return {
      error: "Slot harus berurutan dan tersedia sesuai jumlah sesi yang diminta.",
    };
  }

  const segmentRows = segmentResult.rows.map((row) => ({
    ...row,
    slot_no: toInt(row.slot_no, 0),
  }));
  const contiguous = segmentRows.every((row, index) =>
    index === 0 ? true : row.slot_no === segmentRows[index - 1].slot_no + 1,
  );
  if (!contiguous) {
    return { error: "Slot harus berurutan tanpa jeda." };
  }

  return {
    ok: true,
    startSlotId: Number(startSlot.id),
    configId: Number(startSlot.config_id),
    configGroupId: Number(startSlot.config_group_id),
    segmentRows,
  };
};

export const validateScheduleEntryPlacement = async ({
  client,
  entryId = null,
  configId,
  periodeId,
  homebaseId,
  teacherId,
  classId,
  dayOfWeek,
  slotIds,
  enforceTeacherUnavailability = true,
}) => {
  const candidateSlotResult = await client.query(
    `SELECT id, day_of_week, start_time, end_time, config_group_id
     FROM lms.l_time_slot
     WHERE id = ANY($1::int[])`,
    [slotIds],
  );
  const candidateSlots = candidateSlotResult.rows.map((slot) => ({
    ...slot,
    start_minute: parseMinute(slot.start_time),
    end_minute: parseMinute(slot.end_time),
    config_group_id: toInt(slot.config_group_id, null),
  }));

  const classConflictResult = await client.query(
    `SELECT ess.id
     FROM lms.l_schedule_entry_slot ess
     JOIN lms.l_schedule_entry e ON e.id = ess.schedule_entry_id
     WHERE e.periode_id = $1
       AND e.config_id = $2
       AND ($3::int IS NULL OR e.id <> $3)
       AND ess.day_of_week = $4
       AND ess.slot_id = ANY($5::int[])
       AND ess.class_id = $6
     LIMIT 1`,
    [periodeId, configId, entryId, dayOfWeek, slotIds, classId],
  );
  if (classConflictResult.rowCount > 0) {
    return { error: "Jadwal bentrok dengan jadwal kelas lain.", status: 409 };
  }

  const teacherSlotResult = await client.query(
    `SELECT ts.start_time, ts.end_time
     FROM lms.l_schedule_entry_slot ess
     JOIN lms.l_schedule_entry e ON e.id = ess.schedule_entry_id
     JOIN lms.l_time_slot ts ON ts.id = ess.slot_id
     WHERE e.periode_id = $1
       AND e.config_id = $2
       AND ($3::int IS NULL OR e.id <> $3)
       AND ess.day_of_week = $4
       AND ess.teacher_id = $5`,
    [periodeId, configId, entryId, dayOfWeek, teacherId],
  );
  const hasTeacherConflict = teacherSlotResult.rows.some((existingSlot) => {
    const existingStart = parseMinute(existingSlot.start_time);
    const existingEnd = parseMinute(existingSlot.end_time);
    return candidateSlots.some((candidateSlot) =>
      overlapTime(
        candidateSlot.start_minute,
        candidateSlot.end_minute,
        existingStart,
        existingEnd,
      ),
    );
  });
  if (hasTeacherConflict) {
    return { error: "Jadwal bentrok dengan jadwal guru lain.", status: 409 };
  }

  const activityConflictResult = await client.query(
    `SELECT
       a.id,
       a.name,
       a.scope_type,
       activity_slot.start_time,
       activity_slot.end_time,
       activity_slot.config_group_id,
       t.class_id,
       t.teacher_id
     FROM lms.l_schedule_activity a
     JOIN lms.l_time_slot start_slot ON start_slot.id = a.slot_start_id
     JOIN lms.l_time_slot activity_slot
       ON activity_slot.config_group_id = start_slot.config_group_id
      AND activity_slot.day_of_week = a.day_of_week
      AND activity_slot.is_break = false
      AND activity_slot.slot_no BETWEEN start_slot.slot_no AND start_slot.slot_no + a.slot_count - 1
     LEFT JOIN lms.l_schedule_activity_target t ON t.activity_id = a.id
     WHERE a.homebase_id = $1
       AND a.periode_id = $2
       AND a.config_id = $3
       AND a.is_active = true
       AND a.day_of_week = $4`,
    [homebaseId, periodeId, configId, dayOfWeek],
  );
  const hasActivityConflict = activityConflictResult.rows.find((activityRow) => {
    const activityStart = parseMinute(activityRow.start_time);
    const activityEnd = parseMinute(activityRow.end_time);
    const overlaps = candidateSlots.some((candidateSlot) =>
      overlapTime(
        candidateSlot.start_minute,
        candidateSlot.end_minute,
        activityStart,
        activityEnd,
      ),
    );
    if (!overlaps) return false;

    if (activityRow.scope_type === "all_classes") {
      return candidateSlots.some(
        (candidateSlot) =>
          Number(candidateSlot.config_group_id) ===
          Number(activityRow.config_group_id),
      );
    }

    return (
      Number(activityRow.class_id) === Number(classId) ||
      Number(activityRow.teacher_id) === Number(teacherId)
    );
  });
  if (hasActivityConflict) {
    return {
      error: `Jadwal bentrok dengan kegiatan ${hasActivityConflict.name}.`,
      status: 409,
    };
  }

  if (!enforceTeacherUnavailability) {
    return { ok: true };
  }

  const teacherBlockResult = await client.query(
    `SELECT day_of_week, start_time, end_time
     FROM lms.l_teacher_unavailability
     WHERE teacher_id = $1
       AND periode_id = $2
       AND is_active = true
       AND specific_date IS NULL`,
    [teacherId, periodeId],
  );

  const violating = candidateSlots.some((slot) =>
    teacherBlockResult.rows.some((block) => {
      const blockDay = toInt(block.day_of_week, null);
      if (blockDay && blockDay !== dayOfWeek) return false;
      const blockStart = block.start_time ? parseMinute(block.start_time) : null;
      const blockEnd = block.end_time ? parseMinute(block.end_time) : null;
      if (blockStart === null || blockEnd === null) return true;
      return overlapTime(slot.start_minute, slot.end_minute, blockStart, blockEnd);
    }),
  );

  if (violating) {
    return { error: "Perubahan melanggar ketentuan waktu guru.", status: 409 };
  }

  return { ok: true };
};
