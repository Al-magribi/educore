import { authorize } from "../../../middleware/authorize.js";
import { withQuery, withTransaction } from "../../../utils/wrapper.js";
import {
  ensureActivePeriode,
  getColumnPresence,
  listScheduleConfigs,
  normalizeScheduleConfigName,
  parseMinute,
  resolveSelectedScheduleConfig,
  resolveSelectedScheduleGroup,
  syncOperationalScheduleEntryStatuses,
  toInt,
  toTimeString,
} from "./shared.js";

const SHIFT_MORNING_NAME = "Shift Pagi";
const SHIFT_AFTERNOON_NAME = "Shift Siang";

const normalizeShiftName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const ensureTimeSlotGroupIndexes = async (client) => {
  const indexResult = await client.query(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = 'lms'
       AND indexname IN ('uq_time_slot_slot_no', 'uq_time_slot_range', 'idx_time_slot_config_day')`,
  );

  const indexMap = indexResult.rows.reduce((acc, row) => {
    acc[row.indexname] = String(row.indexdef || "");
    return acc;
  }, {});

  const usesConfigGroup =
    indexMap.uq_time_slot_slot_no?.includes("(config_group_id, day_of_week, slot_no)") &&
    indexMap.uq_time_slot_range?.includes("(config_group_id, day_of_week, start_time, end_time)") &&
    indexMap.idx_time_slot_config_day?.includes("(config_id, config_group_id, day_of_week, slot_no)");

  if (usesConfigGroup) return;

  await client.query("DROP INDEX IF EXISTS lms.uq_time_slot_slot_no");
  await client.query("DROP INDEX IF EXISTS lms.uq_time_slot_range");
  await client.query("DROP INDEX IF EXISTS lms.idx_time_slot_config_day");
  await client.query(
    "CREATE UNIQUE INDEX uq_time_slot_slot_no ON lms.l_time_slot USING btree (config_group_id, day_of_week, slot_no)",
  );
  await client.query(
    "CREATE UNIQUE INDEX uq_time_slot_range ON lms.l_time_slot USING btree (config_group_id, day_of_week, start_time, end_time)",
  );
  await client.query(
    "CREATE INDEX idx_time_slot_config_day ON lms.l_time_slot USING btree (config_id, config_group_id, day_of_week, slot_no)",
  );
};

const ensureScheduleShiftGroups = async ({
  client,
  configId,
}) => {
  if (!configId) return [];

  const existingResult = await client.query(
    `SELECT *
     FROM lms.l_schedule_config_group
     WHERE config_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [configId],
  );

  let groups = existingResult.rows;

  if (!groups.length) {
    const insertResult = await client.query(
      `INSERT INTO lms.l_schedule_config_group (
         config_id,
         name,
         description,
         sort_order,
         is_default
       )
       VALUES
         ($1, $2, $3, 1, true),
         ($1, $4, $5, 2, false)
       RETURNING *`,
      [
        configId,
        SHIFT_MORNING_NAME,
        "Shift belajar pagi.",
        SHIFT_AFTERNOON_NAME,
        "Shift belajar siang.",
      ],
    );
    return insertResult.rows;
  }

  // Legacy one-time rename only: "Semua Kelas" -> "Shift Pagi"
  const legacyDefault = groups.find(
    (item) =>
      normalizeShiftName(item.name) === normalizeShiftName("Semua Kelas"),
  );
  if (legacyDefault) {
    await client.query(
      `UPDATE lms.l_schedule_config_group
       SET name = $1,
           description = COALESCE(NULLIF(description, ''), $2),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [SHIFT_MORNING_NAME, "Shift belajar pagi.", legacyDefault.id],
    );
  }

  // Ensure exactly one default without renaming custom names.
  const defaultGroup =
    groups.find((item) => item.is_default === true) || groups[0];
  if (defaultGroup) {
    await client.query(
      `UPDATE lms.l_schedule_config_group
       SET is_default = CASE WHEN id = $2 THEN true ELSE false END,
           updated_at = CURRENT_TIMESTAMP
       WHERE config_id = $1
         AND (is_default = true OR id = $2)`,
      [configId, defaultGroup.id],
    );
  }

  const refreshedResult = await client.query(
    `SELECT *
     FROM lms.l_schedule_config_group
     WHERE config_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [configId],
  );

  return refreshedResult.rows;
};

const normalizeManualDayConfig = (dayConfig) => {
  const dayOfWeek = toInt(dayConfig?.day_of_week, null);
  if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7) {
    return { error: "Hari tidak valid." };
  }

  const rawSlots = Array.isArray(dayConfig?.slots) ? dayConfig.slots : [];
  const slots = [];
  for (let index = 0; index < rawSlots.length; index += 1) {
    const slot = rawSlots[index];
    const startMinute = parseMinute(slot?.start_time);
    const endMinute = parseMinute(slot?.end_time);
    if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute)) {
      continue;
    }
    if (startMinute >= endMinute) {
      return {
        error: `Jam ke-${index + 1}: selesai harus lebih besar dari mulai.`,
      };
    }
    slots.push({
      slot_no: toInt(slot?.slot_no, index + 1) || index + 1,
      start_minute: startMinute,
      end_minute: endMinute,
      duration_minutes: endMinute - startMinute,
    });
  }

  if (slots.length === 0) {
    return { error: `Hari ${dayOfWeek}: minimal 1 jam pelajaran.` };
  }

  const sortedSlots = [...slots].sort(
    (left, right) =>
      left.start_minute - right.start_minute || left.slot_no - right.slot_no,
  );

  for (let index = 0; index < sortedSlots.length; index += 1) {
    sortedSlots[index] = {
      ...sortedSlots[index],
      slot_no: index + 1,
    };
    if (index === 0) continue;
    const previous = sortedSlots[index - 1];
    const current = sortedSlots[index];
    if (current.start_minute < previous.end_minute) {
      return {
        error: `Hari ${dayOfWeek}: jam ke-${current.slot_no} bentrok dengan jam ke-${previous.slot_no}.`,
      };
    }
  }

  const rawBreaks = Array.isArray(dayConfig?.breaks) ? dayConfig.breaks : [];
  const breaks = [];
  for (const item of rawBreaks) {
    const startMinute = parseMinute(item?.break_start);
    const endMinute = parseMinute(item?.break_end);
    if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute)) {
      continue;
    }
    if (startMinute >= endMinute) {
      return {
        error: "Jam istirahat: selesai harus lebih besar dari mulai.",
      };
    }
    breaks.push({
      break_start: startMinute,
      break_end: endMinute,
      label: String(item?.label || "Istirahat").trim() || "Istirahat",
    });
  }

  const sortedBreaks = [...breaks].sort(
    (left, right) => left.break_start - right.break_start,
  );
  for (let index = 1; index < sortedBreaks.length; index += 1) {
    if (sortedBreaks[index].break_start < sortedBreaks[index - 1].break_end) {
      return { error: `Hari ${dayOfWeek}: waktu istirahat saling bentrok.` };
    }
  }

  for (const restItem of sortedBreaks) {
    const overlapsSlot = sortedSlots.some(
      (slot) =>
        restItem.break_start < slot.end_minute &&
        restItem.break_end > slot.start_minute,
    );
    if (overlapsSlot) {
      return {
        error: `Hari ${dayOfWeek}: istirahat "${restItem.label}" bentrok dengan jam pelajaran.`,
      };
    }
  }

  const allStartMinutes = [
    ...sortedSlots.map((item) => item.start_minute),
    ...sortedBreaks.map((item) => item.break_start),
  ];
  const allEndMinutes = [
    ...sortedSlots.map((item) => item.end_minute),
    ...sortedBreaks.map((item) => item.break_end),
  ];

  return {
    day_of_week: dayOfWeek,
    is_school_day: dayConfig?.is_school_day !== false,
    slots: sortedSlots,
    breaks: sortedBreaks,
    start_minute: Math.min(...allStartMinutes),
    end_minute: Math.max(...allEndMinutes),
    session_minutes: sortedSlots[0].duration_minutes,
  };
};

export const registerScheduleBootstrapConfigRoutes = (router) => {
  router.get(
    "/schedule/bootstrap",
    authorize("satuan", "teacher", "student"),
    withQuery(async (req, res, pool) => {
      const { id: userId, role, homebase_id, admin_level } = req.user;
      const requestedPeriodeId = toInt(req.query.periode_id, null);
      const requestedConfigId = toInt(req.query.config_id, null);
      const requestedGroupId = toInt(req.query.group_id, null);
      await ensureTimeSlotGroupIndexes(pool);
      const periodeId = await ensureActivePeriode(pool, homebase_id, requestedPeriodeId);

      if (!periodeId) {
        return res.status(400).json({
          status: "error",
          message: "Periode aktif tidak ditemukan.",
        });
      }

      const {
        configs,
        selectedConfig: config,
        activeConfig,
      } = await resolveSelectedScheduleConfig({
        executor: pool,
        homebaseId: homebase_id,
        periodeId,
        requestedConfigId,
      });
      const configId = config?.id || null;
      if (configId) {
        await ensureScheduleShiftGroups({
          client: pool,
          configId,
        });
      }
      const {
        groups: configGroups,
        selectedGroup,
      } = await resolveSelectedScheduleGroup({
        executor: pool,
        configId,
        requestedGroupId,
      });
      const selectedGroupId = selectedGroup?.id || null;
      const [activityColumns, entryColumns, timeSlotColumns] = await Promise.all([
        getColumnPresence(pool, "l_schedule_activity", ["config_id"]),
        getColumnPresence(pool, "l_schedule_entry", ["config_id"]),
        getColumnPresence(pool, "l_time_slot", ["config_group_id"]),
      ]);
      const hasActivityConfigId = Boolean(activityColumns.config_id);
      const hasEntryConfigId = Boolean(entryColumns.config_id);
      const hasTimeSlotConfigGroupId = Boolean(timeSlotColumns.config_group_id);

      const activityGroupSelect = hasTimeSlotConfigGroupId
        ? "start_slot.config_group_id,"
        : "NULL::integer AS config_group_id,";
      const activitySlotAggregateConfigFilter = hasTimeSlotConfigGroupId
        ? "ts.config_group_id = start_slot.config_group_id"
        : "ts.config_id = start_slot.config_id";
      const activityConfigFilter = hasActivityConfigId
        ? "AND a.config_id = $3"
        : "";
      const activityGroupFilter = hasTimeSlotConfigGroupId
        ? `AND ($${hasActivityConfigId ? 4 : 3}::int IS NULL OR start_slot.config_group_id = $${hasActivityConfigId ? 4 : 3})`
        : "";
      const activityParams = hasActivityConfigId
        ? [periodeId, homebase_id, configId, selectedGroupId]
        : [periodeId, homebase_id, selectedGroupId];
      const activityTargetConfigFilter = hasActivityConfigId
        ? "AND a.config_id = $3"
        : "";
      const activityTargetGroupFilter = hasTimeSlotConfigGroupId
        ? `AND ($${hasActivityConfigId ? 4 : 3}::int IS NULL OR start_slot.config_group_id = $${hasActivityConfigId ? 4 : 3})`
        : "";
      const entryConfigFilter = hasEntryConfigId
        ? `AND e.config_id = ${role === "teacher" ? "$4" : "$3"}`
        : "";
      const entryGroupFilter = hasTimeSlotConfigGroupId
        ? role === "teacher"
          ? `AND ($${hasEntryConfigId ? 5 : 4}::int IS NULL OR start_slot.config_group_id = $${hasEntryConfigId ? 5 : 4})`
          : `AND ($${hasEntryConfigId ? 4 : 3}::int IS NULL OR start_slot.config_group_id = $${hasEntryConfigId ? 4 : 3})`
        : "";
      const entryParams =
        role === "teacher"
          ? hasEntryConfigId
            ? [periodeId, homebase_id, userId, configId, selectedGroupId]
            : [periodeId, homebase_id, userId, selectedGroupId]
          : hasEntryConfigId
            ? [periodeId, homebase_id, configId, selectedGroupId]
            : [periodeId, homebase_id, selectedGroupId];

      const [groupClassResult, dayTemplateResult, breakResult, slotResult, allSlotResult] =
        selectedGroupId
          ? await Promise.all([
              pool.query(
                `SELECT
                   gcc.id,
                   gcc.config_group_id,
                   gcc.class_id,
                   c.name AS class_name,
                   c.grade_id,
                   g.name AS grade_name
                 FROM lms.l_schedule_config_group_class gcc
                 JOIN public.a_class c ON c.id = gcc.class_id
                 LEFT JOIN public.a_grade g ON g.id = c.grade_id
                 WHERE gcc.config_group_id = $1
                   AND COALESCE(c.is_active, true) = true
                 ORDER BY g.name ASC NULLS LAST, c.name ASC`,
                [selectedGroupId],
              ),
              pool.query(
                `SELECT *
                 FROM lms.l_schedule_day_template
                 WHERE config_group_id = $1
                 ORDER BY day_of_week`,
                [selectedGroupId],
              ),
              pool.query(
                `SELECT b.*, d.day_of_week
                 FROM lms.l_schedule_break b
                 JOIN lms.l_schedule_day_template d ON d.id = b.day_template_id
                 WHERE d.config_group_id = $1
                 ORDER BY d.day_of_week, b.break_start`,
                [selectedGroupId],
              ),
              pool.query(
                `SELECT *
                 FROM lms.l_time_slot
                 WHERE config_group_id = $1
                 ORDER BY day_of_week, slot_no`,
                [selectedGroupId],
              ),
              configId
                ? pool.query(
                    `SELECT *
                     FROM lms.l_time_slot
                     WHERE config_id = $1
                     ORDER BY config_group_id, day_of_week, slot_no`,
                    [configId],
                  )
                : { rows: [] },
            ])
          : [{ rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }];

      const [unmappedGroupClassResult, allGroupClassResult] = configId
        ? await Promise.all([
            pool.query(
              `SELECT
                 c.id,
                 c.name,
                 c.grade_id,
                 g.name AS grade_name
               FROM public.a_class c
               LEFT JOIN public.a_grade g ON g.id = c.grade_id
               WHERE c.homebase_id = $1
                 AND COALESCE(c.is_active, true) = true
                 AND NOT EXISTS (
                   SELECT 1
                   FROM lms.l_schedule_config_group_class gcc
                   JOIN lms.l_schedule_config_group scg ON scg.id = gcc.config_group_id
                   WHERE scg.config_id = $2
                     AND gcc.class_id = c.id
                 )
               ORDER BY g.id NULLS LAST, c.name`,
              [homebase_id, configId],
            ),
            pool.query(
              `SELECT
                 gcc.config_group_id,
                 gcc.class_id,
                 c.name AS class_name,
                 g.name AS grade_name,
                 scg.name AS group_name
               FROM lms.l_schedule_config_group_class gcc
               JOIN lms.l_schedule_config_group scg ON scg.id = gcc.config_group_id
               JOIN public.a_class c ON c.id = gcc.class_id
               LEFT JOIN public.a_grade g ON g.id = c.grade_id
               WHERE scg.config_id = $1
                 AND COALESCE(c.is_active, true) = true
               ORDER BY scg.sort_order ASC, g.name ASC NULLS LAST, c.name ASC`,
              [configId],
            ),
          ])
        : [{ rows: [] }, { rows: [] }];

      const [activityResult, activityTargetResult, allActivityResult, allActivityTargetResult] =
        await Promise.all([
          pool.query(
            `SELECT
               a.*,
               ${activityGroupSelect}
               slot_agg.start_time,
               slot_agg.end_time,
               slot_agg.slot_nos,
               slot_agg.slot_ids
             FROM lms.l_schedule_activity a
             JOIN lms.l_time_slot start_slot ON start_slot.id = a.slot_start_id
             LEFT JOIN LATERAL (
               SELECT
                 MIN(ts.start_time) AS start_time,
                 MAX(ts.end_time) AS end_time,
                 ARRAY_AGG(ts.slot_no ORDER BY ts.slot_no) AS slot_nos,
                 ARRAY_AGG(ts.id ORDER BY ts.slot_no) AS slot_ids
               FROM lms.l_time_slot ts
               WHERE ${activitySlotAggregateConfigFilter}
                 AND ts.day_of_week = a.day_of_week
                 AND ts.slot_no BETWEEN start_slot.slot_no AND start_slot.slot_no + a.slot_count - 1
             ) slot_agg ON true
             WHERE a.periode_id = $1
               AND a.homebase_id = $2
               ${activityConfigFilter}
               ${activityGroupFilter}
             ORDER BY a.day_of_week, slot_agg.start_time NULLS LAST, a.name`,
            activityParams,
          ),
          pool.query(
            `SELECT
               t.*,
               a.name AS activity_name,
               u.full_name AS teacher_name,
               s.name AS subject_name,
               c.name AS class_name
             FROM lms.l_schedule_activity_target t
             JOIN lms.l_schedule_activity a ON a.id = t.activity_id
             JOIN public.u_users u ON u.id = t.teacher_id
             JOIN public.a_subject s ON s.id = t.subject_id
             JOIN public.a_class c ON c.id = t.class_id
             JOIN lms.l_time_slot start_slot ON start_slot.id = a.slot_start_id
             WHERE a.periode_id = $1
               AND a.homebase_id = $2
               ${activityTargetConfigFilter}
               ${activityTargetGroupFilter}
             ORDER BY a.id, u.full_name, s.name, c.name`,
            activityParams,
          ),
          pool.query(
            `SELECT
               a.*,
               ${activityGroupSelect}
               slot_agg.start_time,
               slot_agg.end_time,
               slot_agg.slot_nos,
               slot_agg.slot_ids
             FROM lms.l_schedule_activity a
             JOIN lms.l_time_slot start_slot ON start_slot.id = a.slot_start_id
             LEFT JOIN LATERAL (
               SELECT
                 MIN(ts.start_time) AS start_time,
                 MAX(ts.end_time) AS end_time,
                 ARRAY_AGG(ts.slot_no ORDER BY ts.slot_no) AS slot_nos,
                 ARRAY_AGG(ts.id ORDER BY ts.slot_no) AS slot_ids
               FROM lms.l_time_slot ts
               WHERE ${activitySlotAggregateConfigFilter}
                 AND ts.day_of_week = a.day_of_week
                 AND ts.slot_no BETWEEN start_slot.slot_no AND start_slot.slot_no + a.slot_count - 1
             ) slot_agg ON true
             WHERE a.periode_id = $1
               AND a.homebase_id = $2
               ${activityConfigFilter}
             ORDER BY a.day_of_week, slot_agg.start_time NULLS LAST, a.name`,
            hasActivityConfigId
              ? [periodeId, homebase_id, configId]
              : [periodeId, homebase_id],
          ),
          pool.query(
            `SELECT
               t.*,
               a.name AS activity_name,
               u.full_name AS teacher_name,
               s.name AS subject_name,
               c.name AS class_name
             FROM lms.l_schedule_activity_target t
             JOIN lms.l_schedule_activity a ON a.id = t.activity_id
             JOIN public.u_users u ON u.id = t.teacher_id
             JOIN public.a_subject s ON s.id = t.subject_id
             JOIN public.a_class c ON c.id = t.class_id
             JOIN lms.l_time_slot start_slot ON start_slot.id = a.slot_start_id
             WHERE a.periode_id = $1
               AND a.homebase_id = $2
               ${activityTargetConfigFilter}
             ORDER BY a.id, u.full_name, s.name, c.name`,
            hasActivityConfigId
              ? [periodeId, homebase_id, configId]
              : [periodeId, homebase_id],
          ),
        ]);

      const assignmentResult = await pool.query(
        `WITH base_assignment AS (
           SELECT DISTINCT
             ats.teacher_id,
             ats.subject_id,
             ats.class_id
           FROM public.at_subject ats
           JOIN public.u_teachers t ON t.user_id = ats.teacher_id
           JOIN public.a_subject s ON s.id = ats.subject_id
           WHERE t.homebase_id = $1
             AND s.homebase_id = $1
         )
         SELECT
           b.teacher_id,
           b.subject_id,
           c.id AS class_id,
           c.grade_id,
           u.full_name AS teacher_name,
           s.name AS subject_name,
           COALESCE(NULLIF(s.code, ''), s.name) AS subject_code,
           c.name AS class_name,
           g.name AS grade_name
         FROM base_assignment b
         JOIN public.a_class c ON c.id = b.class_id
         JOIN public.u_users u ON u.id = b.teacher_id
         JOIN public.a_subject s ON s.id = b.subject_id
         LEFT JOIN public.a_grade g ON g.id = c.grade_id
         WHERE c.homebase_id = $1
           AND COALESCE(c.is_active, true) = true
         ORDER BY u.full_name, s.name, g.name, c.name`,
        [homebase_id],
      );

      const teacherFilterClause = role === "teacher" ? "AND e.teacher_id = $3" : "";

      const entryResult = await pool.query(
        `SELECT
           e.id,
           e.day_of_week,
           e.slot_count,
           e.meeting_no,
           e.source_type,
           e.is_manual_override,
           e.locked,
           e.status,
           e.teacher_id,
           e.class_id,
           e.subject_id,
           e.slot_start_id,
           c.name AS class_name,
           s.name AS subject_name,
           COALESCE(NULLIF(s.code, ''), s.name) AS subject_code,
           u.full_name AS teacher_name,
           slot_agg.start_time,
           slot_agg.end_time,
           slot_agg.slot_nos
         FROM lms.l_schedule_entry e
         JOIN lms.l_time_slot start_slot ON start_slot.id = e.slot_start_id
         JOIN public.a_class c ON c.id = e.class_id
         JOIN public.a_subject s ON s.id = e.subject_id
         JOIN public.u_users u ON u.id = e.teacher_id
         LEFT JOIN LATERAL (
           SELECT
             MIN(ts.start_time) AS start_time,
             MAX(ts.end_time) AS end_time,
             ARRAY_AGG(ts.slot_no ORDER BY ts.slot_no) AS slot_nos
           FROM lms.l_schedule_entry_slot es
           JOIN lms.l_time_slot ts ON ts.id = es.slot_id
           WHERE es.schedule_entry_id = e.id
         ) slot_agg ON true
         WHERE e.periode_id = $1
           AND e.homebase_id = $2
           ${entryConfigFilter}
           AND e.status <> 'archived'
           ${entryGroupFilter}
           ${teacherFilterClause}
         ORDER BY e.day_of_week, slot_agg.start_time NULLS LAST, c.name`,
        entryParams,
      );

      const configStatsResult = await pool.query(
        `SELECT
           cfg.id AS config_id,
           (SELECT COUNT(*)::int
            FROM lms.l_schedule_config_group g
            WHERE g.config_id = cfg.id) AS group_count,
           ${
             hasEntryConfigId
               ? `(SELECT COUNT(*)::int
                   FROM lms.l_schedule_entry e
                   WHERE e.config_id = cfg.id
                     AND e.status <> 'archived') AS entry_count`
               : "0::int AS entry_count"
           }
         FROM lms.l_schedule_config cfg
         WHERE cfg.homebase_id = $1
           AND cfg.periode_id = $2`,
        [homebase_id, periodeId],
      );

      const [classResult, subjectResult, teacherResult, gradeResult] = await Promise.all([
        pool.query(
          `SELECT c.id, c.name, c.grade_id, c.is_active, g.name AS grade_name
           FROM public.a_class c
           LEFT JOIN public.a_grade g ON g.id = c.grade_id
           WHERE c.homebase_id = $1
             AND COALESCE(c.is_active, true) = true
           ORDER BY g.name ASC NULLS LAST, c.name ASC`,
          [homebase_id],
        ),
        pool.query(
          `SELECT id, name
           FROM public.a_subject
           WHERE homebase_id = $1
           ORDER BY name ASC`,
          [homebase_id],
        ),
        pool.query(
          `SELECT u.id, u.full_name
           FROM public.u_teachers t
           JOIN public.u_users u ON u.id = t.user_id
           WHERE t.homebase_id = $1
           ORDER BY u.full_name ASC`,
          [homebase_id],
        ),
        pool.query(
          `SELECT id, name
           FROM public.a_grade
           WHERE homebase_id = $1
           ORDER BY id ASC`,
          [homebase_id],
        ),
      ]);

      return res.json({
        status: "success",
        data: {
          periode_id: periodeId,
          configs,
          config_stats: configStatsResult.rows,
          active_config: activeConfig,
          active_config_id: activeConfig?.id || null,
          selected_config: config,
          selected_config_id: configId,
          config_groups: configGroups,
          selected_group: selectedGroup,
          selected_group_id: selectedGroupId,
          selected_group_classes: groupClassResult.rows,
          all_group_classes: allGroupClassResult.rows,
          unmapped_group_classes: unmappedGroupClassResult.rows,
          group_coverage_complete: unmappedGroupClassResult.rows.length === 0,
          config,
          day_templates: dayTemplateResult.rows,
          breaks: breakResult.rows,
          slots: slotResult.rows,
          all_slots: allSlotResult.rows,
          teacher_assignments: assignmentResult.rows,
          activities: activityResult.rows,
          activity_targets: activityTargetResult.rows,
          all_activities: allActivityResult.rows,
          all_activity_targets: allActivityTargetResult.rows,
          entries: entryResult.rows,
          classes: classResult.rows,
          subjects: subjectResult.rows,
          teachers: teacherResult.rows,
          grades: gradeResult.rows,
          can_manage: role === "admin" && admin_level === "satuan",
        },
      });
    }),
  );

  router.put(
    "/schedule/config",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { id: userId, homebase_id } = req.user;
      await ensureTimeSlotGroupIndexes(client);
      const {
        id,
        periode_id,
        config_group_id,
        name,
        description = null,
        is_active,
        session_minutes,
        max_sessions_per_meeting = 2,
        require_different_days_if_over_max = true,
        allow_same_day_multiple_meetings = true,
        minimum_gap_slots = 4,
        days,
      } = req.body || {};

      const periodeId = await ensureActivePeriode(client, homebase_id, toInt(periode_id, null));
      if (!periodeId) {
        return res.status(400).json({
          status: "error",
          message: "Periode aktif tidak ditemukan.",
        });
      }

      const configId = toInt(id, null);
      const configGroupId = toInt(config_group_id, null);
      const hasDaysPayload = Array.isArray(days);
      const existingConfigs = await listScheduleConfigs(client, homebase_id, periodeId);
      const existingConfig =
        existingConfigs.find((item) => Number(item.id) === configId) || null;

      if (configId && !existingConfig) {
        return res.status(404).json({
          status: "error",
          message: "Konfigurasi jadwal tidak ditemukan.",
        });
      }

      if (hasDaysPayload && days.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Template hari wajib diisi minimal 1 hari.",
        });
      }

      const normalizedDays = [];
      if (hasDaysPayload) {
        const seenDays = new Set();
        for (const dayConfig of days) {
          const normalized = normalizeManualDayConfig(dayConfig);
          if (normalized.error) {
            return res.status(400).json({
              status: "error",
              message: normalized.error,
            });
          }
          if (seenDays.has(normalized.day_of_week)) {
            return res.status(400).json({
              status: "error",
              message: `Hari ke-${normalized.day_of_week} duplikat dalam payload.`,
            });
          }
          seenDays.add(normalized.day_of_week);
          normalizedDays.push(normalized);
        }
      }

      if (hasDaysPayload && normalizedDays.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Template hari valid tidak ditemukan.",
        });
      }

      const currentActiveConfig =
        existingConfigs.find((item) => item.is_active === true) || null;
      const shouldActivate =
        typeof is_active === "boolean"
          ? is_active
          : existingConfig?.is_active ?? existingConfigs.length === 0;

      if (
        existingConfig?.is_active === true &&
        typeof is_active === "boolean" &&
        is_active === false &&
        existingConfigs.filter((item) => item.is_active === true).length <= 1
      ) {
        return res.status(400).json({
          status: "error",
          message: "Periode harus memiliki satu jadwal aktif.",
        });
      }

      const fallbackIndex =
        existingConfig?.id ? existingConfigs.length : existingConfigs.length + 1;
      const resolvedName = normalizeScheduleConfigName(
        name ?? existingConfig?.name,
        fallbackIndex,
      );

      let config;
      const persistActiveOnUpsert =
        shouldActivate &&
        (!currentActiveConfig ||
          Number(currentActiveConfig.id) === Number(existingConfig?.id || 0));
      if (existingConfig) {
        const updateResult = await client.query(
          `UPDATE lms.l_schedule_config
           SET name = $1,
               description = $2,
               session_minutes = $3,
               max_sessions_per_meeting = $4,
               require_different_days_if_over_max = $5,
               allow_same_day_multiple_meetings = $6,
               minimum_gap_slots = $7,
               is_active = $8,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $9
             AND homebase_id = $10
             AND periode_id = $11
           RETURNING *`,
          [
            resolvedName,
            description ?? existingConfig.description ?? null,
            toInt(
              normalizedDays[0]?.session_minutes ??
                session_minutes ??
                existingConfig.session_minutes,
              40,
            ),
            toInt(
              max_sessions_per_meeting ?? existingConfig.max_sessions_per_meeting,
              2,
            ),
            typeof require_different_days_if_over_max === "boolean"
              ? require_different_days_if_over_max
              : existingConfig.require_different_days_if_over_max,
            typeof allow_same_day_multiple_meetings === "boolean"
              ? allow_same_day_multiple_meetings
              : existingConfig.allow_same_day_multiple_meetings,
            toInt(minimum_gap_slots ?? existingConfig.minimum_gap_slots, 4),
            persistActiveOnUpsert,
            existingConfig.id,
            homebase_id,
            periodeId,
          ],
        );
        config = updateResult.rows[0];
      } else {
        const insertResult = await client.query(
          `INSERT INTO lms.l_schedule_config (
             homebase_id,
             periode_id,
             name,
             description,
             is_active,
             session_minutes,
             max_sessions_per_meeting,
             require_different_days_if_over_max,
             allow_same_day_multiple_meetings,
             minimum_gap_slots,
             created_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            homebase_id,
            periodeId,
            resolvedName,
            description,
            persistActiveOnUpsert,
            toInt(normalizedDays[0]?.session_minutes ?? session_minutes, 40),
            toInt(max_sessions_per_meeting, 2),
            Boolean(require_different_days_if_over_max),
            Boolean(allow_same_day_multiple_meetings),
            toInt(minimum_gap_slots, 4),
            userId,
          ],
        );
        config = insertResult.rows[0];
      }

      let defaultGroupResult = await client.query(
        `SELECT id
         FROM lms.l_schedule_config_group
         WHERE config_id = $1
           AND is_default = true
         LIMIT 1`,
        [config.id],
      );
      const ensuredGroups = await ensureScheduleShiftGroups({
        client,
        configId: config.id,
      });
      defaultGroupResult = {
        rowCount: ensuredGroups.length ? 1 : 0,
        rows: [{ id: ensuredGroups.find((item) => item.is_default === true)?.id }],
      };

      const resolvedConfigGroupId =
        configGroupId || toInt(defaultGroupResult.rows[0]?.id, null);
      const configGroupResult = await client.query(
        `SELECT *
         FROM lms.l_schedule_config_group
         WHERE id = $1
           AND config_id = $2
         LIMIT 1`,
        [resolvedConfigGroupId, config.id],
      );
      const configGroup = configGroupResult.rows[0] || null;

      if (!configGroup) {
        return res.status(404).json({
          status: "error",
          message: "Group jadwal tidak ditemukan.",
        });
      }

      if (shouldActivate && config.is_active !== true) {
        await client.query(
          `UPDATE lms.l_schedule_config
           SET is_active = false,
               updated_at = CURRENT_TIMESTAMP
           WHERE homebase_id = $1
             AND periode_id = $2
             AND id <> $3
             AND is_active = true`,
          [homebase_id, periodeId, config.id],
        );

        const activatedConfigResult = await client.query(
          `UPDATE lms.l_schedule_config
           SET is_active = true,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [config.id],
        );
        config = activatedConfigResult.rows[0];
        await syncOperationalScheduleEntryStatuses(client, {
          homebaseId: homebase_id,
          periodeId,
          activeConfigId: config.id,
        });
      }

      if (hasDaysPayload) {
        const [existingActivityUsageResult, existingGroupEntryUsageResult] =
          await Promise.all([
            client.query(
              `SELECT COUNT(*)::int AS total
               FROM lms.l_schedule_activity a
               JOIN lms.l_time_slot ts ON ts.id = a.slot_start_id
               WHERE a.homebase_id = $1
                 AND a.periode_id = $2
                 AND ts.config_group_id = $3`,
              [homebase_id, periodeId, configGroup.id],
            ),
            client.query(
              `SELECT COUNT(*)::int AS total
               FROM lms.l_schedule_entry e
               JOIN lms.l_time_slot ts ON ts.id = e.slot_start_id
               WHERE e.homebase_id = $1
                 AND e.periode_id = $2
                 AND e.status <> 'archived'
                 AND ts.config_group_id = $3`,
              [homebase_id, periodeId, configGroup.id],
            ),
          ]);

        const activityUsageCount = Number(
          existingActivityUsageResult.rows[0]?.total || 0,
        );
        const entryUsageCount = Number(
          existingGroupEntryUsageResult.rows[0]?.total || 0,
        );

        if (activityUsageCount > 0) {
          await client.query(
            `DELETE FROM lms.l_schedule_activity_target
             WHERE activity_id IN (
               SELECT a.id
               FROM lms.l_schedule_activity a
               JOIN lms.l_time_slot ts ON ts.id = a.slot_start_id
               WHERE a.homebase_id = $1
                 AND a.periode_id = $2
                 AND ts.config_group_id = $3
             )`,
            [homebase_id, periodeId, configGroup.id],
          );
          await client.query(
            `DELETE FROM lms.l_schedule_activity
             WHERE id IN (
               SELECT a.id
               FROM lms.l_schedule_activity a
               JOIN lms.l_time_slot ts ON ts.id = a.slot_start_id
               WHERE a.homebase_id = $1
                 AND a.periode_id = $2
                 AND ts.config_group_id = $3
             )`,
            [homebase_id, periodeId, configGroup.id],
          );
        }

        if (entryUsageCount > 0) {
          const [existingTemplatesResult, existingSlotsResult] =
            await Promise.all([
              client.query(
                `SELECT *
                 FROM lms.l_schedule_day_template
                 WHERE config_group_id = $1`,
                [configGroup.id],
              ),
              client.query(
                `SELECT *
                 FROM lms.l_time_slot
                 WHERE config_group_id = $1
                   AND COALESCE(is_break, false) = false`,
                [configGroup.id],
              ),
            ]);

          const templateByDay = new Map(
            existingTemplatesResult.rows.map((row) => [
              Number(row.day_of_week),
              row,
            ]),
          );
          const slotByKey = new Map(
            existingSlotsResult.rows.map((row) => [
              `${Number(row.day_of_week)}:${Number(row.slot_no)}`,
              row,
            ]),
          );
          const keptDays = new Set();
          const keptSlotKeys = new Set();

          for (const dayConfig of normalizedDays) {
            keptDays.add(Number(dayConfig.day_of_week));
            let dayTemplate = templateByDay.get(Number(dayConfig.day_of_week));

            if (dayTemplate) {
              const updatedTemplateResult = await client.query(
                `UPDATE lms.l_schedule_day_template
                 SET start_time = $1::time,
                     end_time = $2::time,
                     session_minutes = $3,
                     is_school_day = $4,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $5
                 RETURNING *`,
                [
                  toTimeString(dayConfig.start_minute),
                  toTimeString(dayConfig.end_minute),
                  dayConfig.session_minutes,
                  dayConfig.is_school_day !== false,
                  dayTemplate.id,
                ],
              );
              dayTemplate = updatedTemplateResult.rows[0];
            } else {
              const dayTemplateResult = await client.query(
                `INSERT INTO lms.l_schedule_day_template (
                   config_id,
                   config_group_id,
                   day_of_week,
                   start_time,
                   end_time,
                   session_minutes,
                   is_school_day
                 )
                 VALUES ($1, $2, $3, $4::time, $5::time, $6, $7)
                 RETURNING *`,
                [
                  config.id,
                  configGroup.id,
                  dayConfig.day_of_week,
                  toTimeString(dayConfig.start_minute),
                  toTimeString(dayConfig.end_minute),
                  dayConfig.session_minutes,
                  dayConfig.is_school_day !== false,
                ],
              );
              dayTemplate = dayTemplateResult.rows[0];
              templateByDay.set(Number(dayConfig.day_of_week), dayTemplate);
            }

            await client.query(
              `DELETE FROM lms.l_schedule_break WHERE day_template_id = $1`,
              [dayTemplate.id],
            );

            for (const restItem of dayConfig.breaks) {
              await client.query(
                `INSERT INTO lms.l_schedule_break (day_template_id, break_start, break_end, label)
                 VALUES ($1, $2::time, $3::time, $4)`,
                [
                  dayTemplate.id,
                  toTimeString(restItem.break_start),
                  toTimeString(restItem.break_end),
                  restItem.label,
                ],
              );
            }

            for (const slot of dayConfig.slots) {
              const slotKey = `${Number(dayConfig.day_of_week)}:${Number(slot.slot_no)}`;
              keptSlotKeys.add(slotKey);
              const existingSlot = slotByKey.get(slotKey);

              if (existingSlot) {
                await client.query(
                  `UPDATE lms.l_time_slot
                   SET config_id = $1,
                       start_time = $2::time,
                       end_time = $3::time,
                       is_break = false,
                       updated_at = CURRENT_TIMESTAMP
                   WHERE id = $4`,
                  [
                    config.id,
                    toTimeString(slot.start_minute),
                    toTimeString(slot.end_minute),
                    existingSlot.id,
                  ],
                );
              } else {
                const insertedSlotResult = await client.query(
                  `INSERT INTO lms.l_time_slot (
                     config_id,
                     config_group_id,
                     day_of_week,
                     slot_no,
                     start_time,
                     end_time,
                     is_break
                   )
                   VALUES ($1, $2, $3, $4, $5::time, $6::time, false)
                   RETURNING *`,
                  [
                    config.id,
                    configGroup.id,
                    dayConfig.day_of_week,
                    slot.slot_no,
                    toTimeString(slot.start_minute),
                    toTimeString(slot.end_minute),
                  ],
                );
                slotByKey.set(slotKey, insertedSlotResult.rows[0]);
              }
            }
          }

          let preservedDayCount = 0;
          let preservedSlotCount = 0;

          for (const [dayOfWeek, dayTemplate] of templateByDay.entries()) {
            if (keptDays.has(Number(dayOfWeek))) continue;

            const referencedDayResult = await client.query(
              `SELECT 1
               WHERE EXISTS (
                 SELECT 1
                 FROM lms.l_schedule_entry e
                 JOIN lms.l_time_slot ts ON ts.id = e.slot_start_id
                 WHERE ts.config_group_id = $1
                   AND ts.day_of_week = $2
                   AND e.status <> 'archived'
               )
               OR EXISTS (
                 SELECT 1
                 FROM lms.l_schedule_entry_slot ess
                 JOIN lms.l_time_slot ts ON ts.id = ess.slot_id
                 WHERE ts.config_group_id = $1
                   AND ts.day_of_week = $2
               )
               LIMIT 1`,
              [configGroup.id, dayOfWeek],
            );
            if (referencedDayResult.rowCount > 0) {
              preservedDayCount += 1;
              continue;
            }

            await client.query(
              `DELETE FROM lms.l_schedule_break WHERE day_template_id = $1`,
              [dayTemplate.id],
            );
            await client.query(
              `DELETE FROM lms.l_time_slot
               WHERE config_group_id = $1
                 AND day_of_week = $2`,
              [configGroup.id, dayOfWeek],
            );
            await client.query(
              `DELETE FROM lms.l_schedule_day_template WHERE id = $1`,
              [dayTemplate.id],
            );
          }

          for (const [slotKey, existingSlot] of slotByKey.entries()) {
            if (keptSlotKeys.has(slotKey)) continue;

            const referencedSlotResult = await client.query(
              `SELECT 1
               WHERE EXISTS (
                 SELECT 1
                 FROM lms.l_schedule_entry
                 WHERE slot_start_id = $1
                   AND status <> 'archived'
               )
               OR EXISTS (
                 SELECT 1
                 FROM lms.l_schedule_entry_slot
                 WHERE slot_id = $1
               )
               OR EXISTS (
                 SELECT 1
                 FROM lms.l_duty_assignment
                 WHERE slot_id = $1
               )
               LIMIT 1`,
              [existingSlot.id],
            );
            if (referencedSlotResult.rowCount > 0) {
              preservedSlotCount += 1;
              continue;
            }

            await client.query(`DELETE FROM lms.l_time_slot WHERE id = $1`, [
              existingSlot.id,
            ]);
          }

          res.locals.scheduleConfigAdjustmentSummary = {
            activityUsageCount,
            removedActivityCount: activityUsageCount,
            preservedFinalEntries: true,
            preservedDayCount,
            preservedSlotCount,
          };
        } else {
          await client.query(
            `DELETE FROM lms.l_schedule_break
             WHERE day_template_id IN (
               SELECT id
               FROM lms.l_schedule_day_template
               WHERE config_group_id = $1
             )`,
            [configGroup.id],
          );

          await client.query(
            `DELETE FROM lms.l_time_slot WHERE config_group_id = $1`,
            [configGroup.id],
          );

          await client.query(
            `DELETE FROM lms.l_schedule_day_template WHERE config_group_id = $1`,
            [configGroup.id],
          );

          for (const dayConfig of normalizedDays) {
            const dayTemplateResult = await client.query(
              `INSERT INTO lms.l_schedule_day_template (
                 config_id,
                 config_group_id,
                 day_of_week,
                 start_time,
                 end_time,
                 session_minutes,
                 is_school_day
               )
               VALUES ($1, $2, $3, $4::time, $5::time, $6, $7)
               RETURNING *`,
              [
                config.id,
                configGroup.id,
                dayConfig.day_of_week,
                toTimeString(dayConfig.start_minute),
                toTimeString(dayConfig.end_minute),
                dayConfig.session_minutes,
                dayConfig.is_school_day !== false,
              ],
            );
            const dayTemplate = dayTemplateResult.rows[0];

            for (const restItem of dayConfig.breaks) {
              await client.query(
                `INSERT INTO lms.l_schedule_break (day_template_id, break_start, break_end, label)
                 VALUES ($1, $2::time, $3::time, $4)`,
                [
                  dayTemplate.id,
                  toTimeString(restItem.break_start),
                  toTimeString(restItem.break_end),
                  restItem.label,
                ],
              );
            }

            for (const slot of dayConfig.slots) {
              await client.query(
                `INSERT INTO lms.l_time_slot (
                   config_id,
                   config_group_id,
                   day_of_week,
                   slot_no,
                   start_time,
                   end_time,
                   is_break
                 )
                 VALUES ($1, $2, $3, $4, $5::time, $6::time, false)`,
                [
                  config.id,
                  configGroup.id,
                  dayConfig.day_of_week,
                  slot.slot_no,
                  toTimeString(slot.start_minute),
                  toTimeString(slot.end_minute),
                ],
              );
            }
          }

          res.locals.scheduleConfigAdjustmentSummary = {
            activityUsageCount,
            removedActivityCount: activityUsageCount,
            preservedFinalEntries: false,
          };
        }
      }

      return res.json({
        status: "success",
        message: hasDaysPayload
          ? (() => {
              const summary = res.locals.scheduleConfigAdjustmentSummary;
              const parts = ["Konfigurasi jadwal berhasil disimpan."];
              if (summary?.removedActivityCount) {
                parts.push(
                  `${summary.removedActivityCount} kegiatan dihapus karena slot diganti ulang.`,
                );
              }
              if (summary?.preservedFinalEntries) {
                parts.push(
                  "Jadwal final tetap disimpan; kosongkan lewat tab Jadwal Final bila perlu disusun ulang.",
                );
              }
              if (summary?.preservedDayCount) {
                parts.push(
                  `${summary.preservedDayCount} hari tetap dipertahankan karena masih dipakai jadwal final.`,
                );
              }
              return parts.join(" ");
            })()
          : "Master jadwal berhasil disimpan.",
        data: {
          ...config,
          selected_group_id: configGroup.id,
        },
      });
    }),
  );

  router.patch(
    "/schedule/config/:id/activate",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { homebase_id } = req.user;
      const configId = toInt(req.params.id, null);
      const periodeId = await ensureActivePeriode(
        client,
        homebase_id,
        toInt(req.body?.periode_id, null),
      );

      if (!configId || !periodeId) {
        return res.status(400).json({
          status: "error",
          message: "Konfigurasi atau periode tidak valid.",
        });
      }

      const configResult = await client.query(
        `SELECT *
         FROM lms.l_schedule_config
         WHERE id = $1
           AND homebase_id = $2
           AND periode_id = $3
         LIMIT 1`,
        [configId, homebase_id, periodeId],
      );
      const config = configResult.rows[0];

      if (!config) {
        return res.status(404).json({
          status: "error",
          message: "Konfigurasi jadwal tidak ditemukan.",
        });
      }

      await client.query(
        `UPDATE lms.l_schedule_config
         SET is_active = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE homebase_id = $1
           AND periode_id = $2
           AND is_active = true`,
        [homebase_id, periodeId],
      );

      const activatedResult = await client.query(
        `UPDATE lms.l_schedule_config
         SET is_active = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND homebase_id = $2
           AND periode_id = $3
         RETURNING *`,
        [configId, homebase_id, periodeId],
      );

      await syncOperationalScheduleEntryStatuses(client, {
        homebaseId: homebase_id,
        periodeId,
        activeConfigId: configId,
      });

      return res.json({
        status: "success",
        message: "Jadwal aktif berhasil diperbarui.",
        data: activatedResult.rows[0],
      });
    }),
  );

  router.post(
    "/schedule/config/:id/duplicate",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { id: userId, homebase_id } = req.user;
      const sourceConfigId = toInt(req.params.id, null);
      const periodeId = await ensureActivePeriode(
        client,
        homebase_id,
        toInt(req.body?.periode_id, null),
      );

      if (!sourceConfigId || !periodeId) {
        return res.status(400).json({
          status: "error",
          message: "Konfigurasi atau periode tidak valid.",
        });
      }

      const sourceConfigResult = await client.query(
        `SELECT *
         FROM lms.l_schedule_config
         WHERE id = $1
           AND homebase_id = $2
           AND periode_id = $3
         LIMIT 1`,
        [sourceConfigId, homebase_id, periodeId],
      );
      const sourceConfig = sourceConfigResult.rows[0] || null;
      if (!sourceConfig) {
        return res.status(404).json({
          status: "error",
          message: "Versi jadwal sumber tidak ditemukan.",
        });
      }

      const requestedName = String(req.body?.name || "").trim();
      const newName = requestedName || `${sourceConfig.name} (Salinan)`;

      const newConfigResult = await client.query(
        `INSERT INTO lms.l_schedule_config (
           homebase_id,
           periode_id,
           name,
           description,
           is_active,
           session_minutes,
           max_sessions_per_meeting,
           require_different_days_if_over_max,
           allow_same_day_multiple_meetings,
           minimum_gap_slots,
           created_by
         )
         VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          homebase_id,
          periodeId,
          newName,
          sourceConfig.description,
          sourceConfig.session_minutes,
          sourceConfig.max_sessions_per_meeting,
          sourceConfig.require_different_days_if_over_max,
          sourceConfig.allow_same_day_multiple_meetings,
          sourceConfig.minimum_gap_slots,
          userId,
        ],
      );
      const newConfig = newConfigResult.rows[0];

      const sourceGroupsResult = await client.query(
        `SELECT *
         FROM lms.l_schedule_config_group
         WHERE config_id = $1
         ORDER BY sort_order ASC, id ASC`,
        [sourceConfigId],
      );

      const groupIdMap = new Map();
      for (const group of sourceGroupsResult.rows) {
        const insertedGroupResult = await client.query(
          `INSERT INTO lms.l_schedule_config_group (
             config_id,
             name,
             description,
             sort_order,
             is_default
           )
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            newConfig.id,
            group.name,
            group.description,
            group.sort_order,
            group.is_default,
          ],
        );
        groupIdMap.set(Number(group.id), Number(insertedGroupResult.rows[0].id));
      }

      for (const [oldGroupId, newGroupId] of groupIdMap.entries()) {
        await client.query(
          `INSERT INTO lms.l_schedule_config_group_class (config_group_id, class_id)
           SELECT $1, class_id
           FROM lms.l_schedule_config_group_class
           WHERE config_group_id = $2`,
          [newGroupId, oldGroupId],
        );
      }

      const sourceTemplatesResult = await client.query(
        `SELECT *
         FROM lms.l_schedule_day_template
         WHERE config_id = $1
         ORDER BY id ASC`,
        [sourceConfigId],
      );

      const templateIdMap = new Map();
      for (const template of sourceTemplatesResult.rows) {
        const newGroupId = groupIdMap.get(Number(template.config_group_id));
        if (!newGroupId) continue;
        const insertedTemplateResult = await client.query(
          `INSERT INTO lms.l_schedule_day_template (
             config_id,
             config_group_id,
             day_of_week,
             start_time,
             end_time,
             session_minutes,
             is_school_day
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            newConfig.id,
            newGroupId,
            template.day_of_week,
            template.start_time,
            template.end_time,
            template.session_minutes,
            template.is_school_day,
          ],
        );
        templateIdMap.set(
          Number(template.id),
          Number(insertedTemplateResult.rows[0].id),
        );
      }

      for (const [oldTemplateId, newTemplateId] of templateIdMap.entries()) {
        await client.query(
          `INSERT INTO lms.l_schedule_break (day_template_id, break_start, break_end, label)
           SELECT $1, break_start, break_end, label
           FROM lms.l_schedule_break
           WHERE day_template_id = $2`,
          [newTemplateId, oldTemplateId],
        );
      }

      const sourceSlotsResult = await client.query(
        `SELECT *
         FROM lms.l_time_slot
         WHERE config_id = $1
         ORDER BY id ASC`,
        [sourceConfigId],
      );

      const slotIdMap = new Map();
      for (const slot of sourceSlotsResult.rows) {
        const newGroupId = groupIdMap.get(Number(slot.config_group_id));
        if (!newGroupId) continue;
        const insertedSlotResult = await client.query(
          `INSERT INTO lms.l_time_slot (
             config_id,
             config_group_id,
             day_of_week,
             slot_no,
             start_time,
             end_time,
             is_break
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            newConfig.id,
            newGroupId,
            slot.day_of_week,
            slot.slot_no,
            slot.start_time,
            slot.end_time,
            slot.is_break,
          ],
        );
        slotIdMap.set(Number(slot.id), Number(insertedSlotResult.rows[0].id));
      }

      const activityColumns = await getColumnPresence(
        client,
        "l_schedule_activity",
        ["config_id"],
      );
      const hasActivityConfigId = Boolean(activityColumns.config_id);

      const sourceActivitiesResult = await client.query(
        hasActivityConfigId
          ? `SELECT a.*
             FROM lms.l_schedule_activity a
             WHERE a.homebase_id = $1
               AND a.periode_id = $2
               AND a.config_id = $3
             ORDER BY a.id ASC`
          : `SELECT a.*
             FROM lms.l_schedule_activity a
             JOIN lms.l_time_slot ts ON ts.id = a.slot_start_id
             WHERE a.homebase_id = $1
               AND a.periode_id = $2
               AND ts.config_id = $3
             ORDER BY a.id ASC`,
        [homebase_id, periodeId, sourceConfigId],
      );

      let copiedActivityCount = 0;
      for (const activity of sourceActivitiesResult.rows) {
        const newSlotStartId = slotIdMap.get(Number(activity.slot_start_id));
        if (!newSlotStartId) continue;
        const insertedActivityResult = await client.query(
          `INSERT INTO lms.l_schedule_activity (
             homebase_id,
             periode_id,
             ${hasActivityConfigId ? "config_id," : ""}
             name,
             day_of_week,
             slot_start_id,
             slot_count,
             scope_type,
             description,
             is_active,
             created_by
           )
           VALUES ($1, $2, ${
             hasActivityConfigId
               ? "$3, $4, $5, $6, $7, $8, $9, $10, $11"
               : "$3, $4, $5, $6, $7, $8, $9, $10"
           })
           RETURNING id`,
          [
            homebase_id,
            periodeId,
            ...(hasActivityConfigId ? [newConfig.id] : []),
            activity.name,
            activity.day_of_week,
            newSlotStartId,
            activity.slot_count,
            activity.scope_type,
            activity.description,
            activity.is_active,
            userId,
          ],
        );
        const newActivityId = insertedActivityResult.rows[0].id;
        copiedActivityCount += 1;

        await client.query(
          `INSERT INTO lms.l_schedule_activity_target (
             activity_id,
             teaching_load_id,
             teacher_id,
             subject_id,
             class_id
           )
           SELECT $1, teaching_load_id, teacher_id, subject_id, class_id
           FROM lms.l_schedule_activity_target
           WHERE activity_id = $2`,
          [newActivityId, activity.id],
        );
      }

      const sourceEntriesResult = await client.query(
        `SELECT *
         FROM lms.l_schedule_entry
         WHERE homebase_id = $1
           AND periode_id = $2
           AND config_id = $3
           AND status <> 'archived'
         ORDER BY id ASC`,
        [homebase_id, periodeId, sourceConfigId],
      );

      let copiedEntryCount = 0;
      for (const entry of sourceEntriesResult.rows) {
        const newSlotStartId = slotIdMap.get(Number(entry.slot_start_id));
        if (!newSlotStartId) continue;
        const insertedEntryResult = await client.query(
          `INSERT INTO lms.l_schedule_entry (
             homebase_id,
             periode_id,
             config_id,
             teaching_load_id,
             class_id,
             subject_id,
             teacher_id,
             day_of_week,
             slot_start_id,
             slot_count,
             meeting_no,
             source_type,
             is_manual_override,
             locked,
             status,
             created_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft', $15)
           RETURNING id`,
          [
            homebase_id,
            periodeId,
            newConfig.id,
            entry.teaching_load_id,
            entry.class_id,
            entry.subject_id,
            entry.teacher_id,
            entry.day_of_week,
            newSlotStartId,
            entry.slot_count,
            entry.meeting_no,
            entry.source_type,
            entry.is_manual_override,
            entry.locked,
            userId,
          ],
        );
        const newEntryId = insertedEntryResult.rows[0].id;
        copiedEntryCount += 1;

        const sourceEntrySlotsResult = await client.query(
          `SELECT *
           FROM lms.l_schedule_entry_slot
           WHERE schedule_entry_id = $1`,
          [entry.id],
        );
        for (const entrySlot of sourceEntrySlotsResult.rows) {
          const newSlotId = slotIdMap.get(Number(entrySlot.slot_id));
          if (!newSlotId) continue;
          await client.query(
            `INSERT INTO lms.l_schedule_entry_slot (
               schedule_entry_id,
               periode_id,
               day_of_week,
               slot_id,
               class_id,
               teacher_id
             )
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              newEntryId,
              periodeId,
              entrySlot.day_of_week,
              newSlotId,
              entrySlot.class_id,
              entrySlot.teacher_id,
            ],
          );
        }
      }

      return res.json({
        status: "success",
        message: `Versi jadwal "${newName}" berhasil dibuat dari "${sourceConfig.name}". ${copiedEntryCount} entri final dan ${copiedActivityCount} kegiatan ikut tersalin sebagai draft.`,
        data: newConfig,
      });
    }),
  );

  router.delete(
    "/schedule/config/:id",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { homebase_id } = req.user;
      const configId = toInt(req.params.id, null);
      const periodeId = await ensureActivePeriode(
        client,
        homebase_id,
        toInt(req.query?.periode_id ?? req.body?.periode_id, null),
      );

      if (!configId || !periodeId) {
        return res.status(400).json({
          status: "error",
          message: "Konfigurasi atau periode tidak valid.",
        });
      }

      const configResult = await client.query(
        `SELECT *
         FROM lms.l_schedule_config
         WHERE id = $1
           AND homebase_id = $2
           AND periode_id = $3
         LIMIT 1`,
        [configId, homebase_id, periodeId],
      );
      const config = configResult.rows[0] || null;
      if (!config) {
        return res.status(404).json({
          status: "error",
          message: "Konfigurasi jadwal tidak ditemukan.",
        });
      }

      if (config.is_active === true) {
        return res.status(409).json({
          status: "error",
          message:
            "Jadwal aktif tidak dapat dihapus. Aktifkan jadwal lain terlebih dahulu.",
        });
      }

      const [activityUsageResult, entryUsageResult, runUsageResult] =
        await Promise.all([
          client.query(
            `SELECT COUNT(*)::int AS total
             FROM lms.l_schedule_activity
             WHERE config_id = $1`,
            [configId],
          ),
          client.query(
            `SELECT COUNT(*)::int AS total
             FROM lms.l_schedule_entry
             WHERE config_id = $1
               AND status <> 'archived'`,
            [configId],
          ),
          client.query(
            `SELECT COUNT(*)::int AS total
             FROM lms.l_schedule_generation_run
             WHERE config_id = $1`,
            [configId],
          ),
        ]);

      const activityUsage = Number(activityUsageResult.rows[0]?.total || 0);
      const entryUsage = Number(entryUsageResult.rows[0]?.total || 0);
      const runUsage = Number(runUsageResult.rows[0]?.total || 0);

      if (activityUsage > 0 || entryUsage > 0 || runUsage > 0) {
        return res.status(409).json({
          status: "error",
          message:
            "Master jadwal ini belum bisa dihapus karena masih memiliki kegiatan, jadwal final/manual, atau riwayat proses jadwal sebelumnya.",
        });
      }

      await client.query(
        `DELETE FROM lms.l_schedule_config
         WHERE id = $1`,
        [configId],
      );

      return res.json({
        status: "success",
        message: "Master jadwal berhasil dihapus.",
      });
    }),
  );

  router.post(
    "/schedule/config-group",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { homebase_id } = req.user;
      const {
        id,
        periode_id,
        config_id,
        name,
        description = null,
        sort_order = 1,
        class_ids = [],
      } = req.body || {};

      const periodeId = await ensureActivePeriode(
        client,
        homebase_id,
        toInt(periode_id, null),
      );
      const configId = toInt(config_id, null);
      const groupId = toInt(id, null);
      const normalizedName = String(name || "").trim();
      const normalizedClassIds = [...new Set((class_ids || []).map((item) => toInt(item, null)).filter(Boolean))];

      if (!periodeId || !configId || !normalizedName) {
        return res.status(400).json({
          status: "error",
          message: "config_id, periode_id, dan nama group wajib diisi.",
        });
      }

      const configResult = await client.query(
        `SELECT *
         FROM lms.l_schedule_config
         WHERE id = $1
           AND homebase_id = $2
           AND periode_id = $3
         LIMIT 1`,
        [configId, homebase_id, periodeId],
      );
      if (configResult.rowCount === 0) {
        return res.status(404).json({
          status: "error",
          message: "Konfigurasi jadwal tidak ditemukan.",
        });
      }

      const currentGroupResult = groupId
        ? await client.query(
            `SELECT *
             FROM lms.l_schedule_config_group
             WHERE id = $1
               AND config_id = $2
             LIMIT 1`,
            [groupId, configId],
          )
        : { rowCount: 0, rows: [] };

      const currentGroup = currentGroupResult.rows[0] || null;
      if (groupId && !currentGroup) {
        return res.status(404).json({
          status: "error",
          message: "Group jadwal tidak ditemukan.",
        });
      }

      let group;
      if (currentGroup) {
        const updateResult = await client.query(
          `UPDATE lms.l_schedule_config_group
           SET name = $1,
               description = $2,
               sort_order = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4
           RETURNING *`,
          [
            normalizedName,
            description,
            Math.max(1, toInt(sort_order, currentGroup.sort_order || 1)),
            currentGroup.id,
          ],
        );
        group = updateResult.rows[0];
      } else {
        const nextOrderResult = await client.query(
          `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
           FROM lms.l_schedule_config_group
           WHERE config_id = $1`,
          [configId],
        );
        const insertResult = await client.query(
          `INSERT INTO lms.l_schedule_config_group (
             config_id,
             name,
             description,
             sort_order,
             is_default
           )
           VALUES ($1, $2, $3, $4, false)
           RETURNING *`,
          [
            configId,
            normalizedName,
            description,
            Math.max(1, toInt(sort_order, nextOrderResult.rows[0]?.next_order || 1)),
          ],
        );
        group = insertResult.rows[0];
      }

      await client.query(
        `DELETE FROM lms.l_schedule_config_group_class
         WHERE config_group_id = $1`,
        [group.id],
      );

      if (normalizedClassIds.length > 0) {
        const classValidation = await client.query(
          `SELECT id
           FROM public.a_class
           WHERE homebase_id = $1
             AND id = ANY($2::int[])
             AND COALESCE(is_active, true) = true`,
          [homebase_id, normalizedClassIds],
        );
        if (classValidation.rowCount !== normalizedClassIds.length) {
          return res.status(400).json({
            status: "error",
            message:
              "Ada kelas yang tidak valid atau tidak aktif untuk shift ini.",
          });
        }

        const conflictResult = await client.query(
          `SELECT
             c.name AS class_name,
             g.name AS group_name
           FROM lms.l_schedule_config_group_class gcc
           JOIN lms.l_schedule_config_group g ON g.id = gcc.config_group_id
           JOIN public.a_class c ON c.id = gcc.class_id
           WHERE g.config_id = $1
             AND g.id <> $2
             AND gcc.class_id = ANY($3::int[])
           ORDER BY c.name ASC
           LIMIT 5`,
          [configId, group.id, normalizedClassIds],
        );
        if (conflictResult.rowCount > 0) {
          const conflictLabel = conflictResult.rows
            .map((row) => `${row.class_name} (sudah di ${row.group_name})`)
            .join(", ");
          return res.status(409).json({
            status: "error",
            message: `Kelas tidak dipindahkan otomatis antar shift. Lepas dulu dari shift asalnya: ${conflictLabel}.`,
          });
        }

        for (const classId of normalizedClassIds) {
          await client.query(
            `INSERT INTO lms.l_schedule_config_group_class (config_group_id, class_id)
             VALUES ($1, $2)`,
            [group.id, classId],
          );
        }
      }

      return res.json({
        status: "success",
        message: currentGroup ? "Group jadwal diperbarui." : "Group jadwal ditambahkan.",
        data: group,
      });
    }),
  );

  router.delete(
    "/schedule/config-group/:id",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { homebase_id } = req.user;
      const groupId = toInt(req.params.id, null);

      if (!groupId) {
        return res.status(400).json({
          status: "error",
          message: "Group jadwal tidak valid.",
        });
      }

      const groupResult = await client.query(
        `SELECT
           g.*,
           cfg.homebase_id,
           cfg.periode_id
         FROM lms.l_schedule_config_group g
         JOIN lms.l_schedule_config cfg ON cfg.id = g.config_id
         WHERE g.id = $1
           AND cfg.homebase_id = $2
         LIMIT 1`,
        [groupId, homebase_id],
      );
      const group = groupResult.rows[0] || null;
      if (!group) {
        return res.status(404).json({
          status: "error",
          message: "Group jadwal tidak ditemukan.",
        });
      }

      const [activityUsageResult, entryUsageResult, fallbackGroupResult] =
        await Promise.all([
          client.query(
            `SELECT COUNT(*)::int AS total
             FROM lms.l_schedule_activity a
             JOIN lms.l_time_slot ts ON ts.id = a.slot_start_id
             WHERE ts.config_group_id = $1`,
            [groupId],
          ),
          client.query(
            `SELECT COUNT(*)::int AS total
             FROM lms.l_schedule_entry e
             JOIN lms.l_time_slot ts ON ts.id = e.slot_start_id
             WHERE ts.config_group_id = $1
               AND e.status <> 'archived'`,
            [groupId],
          ),
          client.query(
            `SELECT id
             FROM lms.l_schedule_config_group
             WHERE config_id = $1
               AND id <> $2
             ORDER BY is_default DESC, sort_order ASC, id ASC
             LIMIT 1`,
            [group.config_id, groupId],
          ),
        ]);

      const activityUsage = Number(activityUsageResult.rows[0]?.total || 0);
      const entryUsage = Number(entryUsageResult.rows[0]?.total || 0);
      const fallbackGroupId = toInt(fallbackGroupResult.rows[0]?.id, null);

      if (activityUsage > 0 || entryUsage > 0) {
        return res.status(409).json({
          status: "error",
          message:
            "Shift ini belum bisa dihapus karena masih dipakai oleh kegiatan atau jadwal final/manual.",
        });
      }

      await client.query(
        `DELETE FROM lms.l_schedule_config_group_class
         WHERE config_group_id = $1`,
        [groupId],
      );

      await client.query(
        `DELETE FROM lms.l_schedule_config_group
         WHERE id = $1`,
        [groupId],
      );

      if (fallbackGroupId && group.is_default === true) {
        await client.query(
          `UPDATE lms.l_schedule_config_group
           SET is_default = true,
               sort_order = 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [fallbackGroupId],
        );
      }

      return res.json({
        status: "success",
        message: "Shift jadwal berhasil dihapus.",
        data: {
          fallback_group_id: fallbackGroupId,
        },
      });
    }),
  );
};
