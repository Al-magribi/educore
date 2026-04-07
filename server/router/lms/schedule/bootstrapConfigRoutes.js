import { authorize } from "../../../middleware/authorize.js";
import { withQuery, withTransaction } from "../../../utils/wrapper.js";
import {
  ensureActivePeriode,
  getColumnPresence,
  listScheduleConfigs,
  normalizeScheduleConfigName,
  overlapTime,
  parseMinute,
  resolveSelectedScheduleConfig,
  resolveSelectedScheduleGroup,
  toInt,
  toTimeString,
} from "./shared.js";

export const registerScheduleBootstrapConfigRoutes = (router) => {
  router.get(
    "/schedule/bootstrap",
    authorize("satuan", "teacher", "student"),
    withQuery(async (req, res, pool) => {
      const { id: userId, role, homebase_id, admin_level } = req.user;
      const requestedPeriodeId = toInt(req.query.periode_id, null);
      const requestedConfigId = toInt(req.query.config_id, null);
      const requestedGroupId = toInt(req.query.group_id, null);
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

      const [groupClassResult, dayTemplateResult, breakResult, slotResult] =
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
            ])
          : [{ rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }];

      const unmappedGroupClassResult = configId
        ? await pool.query(
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
          )
        : { rows: [] };

      const [loadResult, unavailabilityResult, activityResult, activityTargetResult] =
        await Promise.all([
          pool.query(
            `SELECT
               l.*,
               c.name AS class_name,
               s.name AS subject_name,
               u.full_name AS teacher_name
             FROM lms.l_teaching_load l
             JOIN public.a_class c ON c.id = l.class_id
             JOIN public.a_subject s ON s.id = l.subject_id
             JOIN public.u_users u ON u.id = l.teacher_id
             WHERE l.periode_id = $1
               AND l.homebase_id = $2
             ORDER BY c.name, s.name, u.full_name`,
            [periodeId, homebase_id],
          ),
          pool.query(
            `SELECT
               ua.*,
               u.full_name AS teacher_name
             FROM lms.l_teacher_unavailability ua
             JOIN public.u_users u ON u.id = ua.teacher_id
             WHERE ua.periode_id = $1
               AND u.id IN (
                 SELECT user_id
                 FROM public.u_teachers
                 WHERE homebase_id = $2
               )
             ORDER BY ua.teacher_id, ua.day_of_week, ua.start_time`,
            [periodeId, homebase_id],
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
           g.name AS grade_name,
           l.id AS teaching_load_id,
           l.weekly_sessions,
           l.max_sessions_per_meeting,
           l.require_different_days,
           l.allow_same_day_with_gap,
           l.minimum_gap_slots,
           l.is_active
         FROM base_assignment b
         JOIN public.a_class c ON c.id = b.class_id
         JOIN public.u_users u ON u.id = b.teacher_id
         JOIN public.a_subject s ON s.id = b.subject_id
         LEFT JOIN public.a_grade g ON g.id = c.grade_id
         LEFT JOIN lms.l_teaching_load l
           ON l.homebase_id = $1
          AND l.periode_id = $2
          AND l.class_id = b.class_id
          AND l.subject_id = b.subject_id
          AND l.teacher_id = b.teacher_id
         WHERE c.homebase_id = $1
           AND COALESCE(c.is_active, true) = true
         ORDER BY u.full_name, s.name, g.name, c.name`,
        [homebase_id, periodeId],
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
          active_config: activeConfig,
          active_config_id: activeConfig?.id || null,
          selected_config: config,
          selected_config_id: configId,
          config_groups: configGroups,
          selected_group: selectedGroup,
          selected_group_id: selectedGroupId,
          selected_group_classes: groupClassResult.rows,
          unmapped_group_classes: unmappedGroupClassResult.rows,
          group_coverage_complete: unmappedGroupClassResult.rows.length === 0,
          config,
          day_templates: dayTemplateResult.rows,
          breaks: breakResult.rows,
          slots: slotResult.rows,
          loads: loadResult.rows,
          teacher_assignments: assignmentResult.rows,
          unavailability: unavailabilityResult.rows,
          activities: activityResult.rows,
          activity_targets: activityTargetResult.rows,
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

      const normalizedDays = hasDaysPayload
        ? days
            .map((dayConfig) => {
              const dayOfWeek = toInt(dayConfig.day_of_week, null);
              const startMinute = parseMinute(dayConfig.start_time);
              const endMinute = parseMinute(dayConfig.end_time);
              const daySessionMinutes = toInt(
                dayConfig.session_minutes ?? session_minutes,
                null,
              );

              if (
                !dayOfWeek ||
                !Number.isFinite(startMinute) ||
                !Number.isFinite(endMinute)
              ) {
                return null;
              }

              return {
                ...dayConfig,
                day_of_week: dayOfWeek,
                start_minute: startMinute,
                end_minute: endMinute,
                session_minutes: daySessionMinutes,
              };
            })
            .filter(Boolean)
        : [];

      if (hasDaysPayload && normalizedDays.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Template hari valid tidak ditemukan.",
        });
      }

      if (
        hasDaysPayload &&
        normalizedDays.some(
          (dayConfig) =>
            !dayConfig.session_minutes || Number(dayConfig.session_minutes) <= 0,
        )
      ) {
        return res.status(400).json({
          status: "error",
          message: "session_minutes per hari wajib lebih dari 0.",
        });
      }

      const currentActiveConfig =
        existingConfigs.find((item) => item.is_active === true) || null;
      const shouldActivate =
        typeof is_active === "boolean"
          ? is_active
          : existingConfig?.is_active ?? existingConfigs.length === 0;

      if (
        shouldActivate &&
        currentActiveConfig &&
        Number(currentActiveConfig.id) !== Number(existingConfig?.id || 0)
      ) {
        const existingEntryResult = await client.query(
          `SELECT 1
           FROM lms.l_schedule_entry
           WHERE homebase_id = $1
             AND periode_id = $2
             AND status <> 'archived'
           LIMIT 1`,
          [homebase_id, periodeId],
        );
        if (existingEntryResult.rowCount > 0) {
          return res.status(409).json({
            status: "error",
            message:
              "Jadwal aktif tidak dapat diganti karena periode ini sudah memiliki jadwal final. Arsipkan atau reset jadwal final terlebih dahulu.",
          });
        }
      }

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
      if (defaultGroupResult.rowCount === 0) {
        defaultGroupResult = await client.query(
          `INSERT INTO lms.l_schedule_config_group (config_id, name, description, sort_order, is_default)
           VALUES ($1, $2, $3, 1, true)
           RETURNING id`,
          [config.id, "Semua Kelas", "Group default hasil migrasi tahap 1."],
        );
      }

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

      await client.query(
        `INSERT INTO lms.l_schedule_config_group_class (config_group_id, class_id)
         SELECT $1, c.id
         FROM public.a_class c
         WHERE c.homebase_id = $2
           AND COALESCE(c.is_active, true) = true
           AND NOT EXISTS (
             SELECT 1
             FROM lms.l_schedule_config_group_class gcc
             WHERE gcc.config_group_id = $1
               AND gcc.class_id = c.id
           )`,
        [defaultGroupResult.rows[0].id, homebase_id],
      );

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
      }

      if (hasDaysPayload) {
        const existingEntryResult = await client.query(
          `SELECT 1
           FROM lms.l_schedule_entry
           WHERE homebase_id = $1
             AND periode_id = $2
             AND status <> 'archived'
           LIMIT 1`,
          [homebase_id, periodeId],
        );
        if (config.is_active === true && existingEntryResult.rowCount > 0) {
          return res.status(409).json({
            status: "error",
            message:
              "Konfigurasi slot jadwal aktif tidak dapat diubah karena jadwal final sudah dibuat. Kosongkan atau arsipkan jadwal periode ini terlebih dahulu.",
          });
        }

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

        if (activityUsageCount > 0 || entryUsageCount > 0) {
          return res.status(409).json({
            status: "error",
            message:
              activityUsageCount > 0 && entryUsageCount > 0
                ? "Jadwal hari pada group ini belum bisa diubah karena masih dipakai oleh kegiatan jadwal dan jadwal final/manual. Hapus atau sesuaikan data tersebut terlebih dahulu."
                : activityUsageCount > 0
                  ? "Jadwal hari pada group ini belum bisa diubah karena masih dipakai oleh kegiatan jadwal. Hapus atau sesuaikan kegiatan yang memakai group ini terlebih dahulu."
                  : "Jadwal hari pada group ini belum bisa diubah karena masih dipakai oleh jadwal final/manual. Kosongkan atau arsipkan jadwal pada group ini terlebih dahulu.",
          });
        }

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
          const dayOfWeek = dayConfig.day_of_week;
          const startMinute = dayConfig.start_minute;
          const endMinute = dayConfig.end_minute;
          const daySessionMinutes = Number(dayConfig.session_minutes);

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
              dayOfWeek,
              toTimeString(startMinute),
              toTimeString(endMinute),
              daySessionMinutes,
              dayConfig.is_school_day !== false,
            ],
          );
          const dayTemplate = dayTemplateResult.rows[0];

          const breakRows = Array.isArray(dayConfig.breaks) ? dayConfig.breaks : [];
          const normalizedBreaks = breakRows
            .map((item) => {
              const start = parseMinute(item.break_start);
              const end = parseMinute(item.break_end);
              if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
                return null;
              }
              return {
                break_start: start,
                break_end: end,
                label: item.label || "Istirahat",
              };
            })
            .filter(Boolean)
            .sort((a, b) => a.break_start - b.break_start);

          for (const restItem of normalizedBreaks) {
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

          let cursorMinute = startMinute;
          let slotNo = 1;
          while (cursorMinute < endMinute) {
            const matchingBreak = normalizedBreaks.find(
              (rest) =>
                cursorMinute >= rest.break_start &&
                cursorMinute < rest.break_end,
            );
            if (matchingBreak) {
              cursorMinute = matchingBreak.break_end;
              continue;
            }

            const nextMinute = cursorMinute + daySessionMinutes;
            if (nextMinute > endMinute) break;

            const overlapBreak = normalizedBreaks.find((rest) =>
              overlapTime(
                cursorMinute,
                nextMinute,
                rest.break_start,
                rest.break_end,
              ),
            );
            if (overlapBreak) {
              cursorMinute = overlapBreak.break_end;
              continue;
            }

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
                dayOfWeek,
                slotNo,
                toTimeString(cursorMinute),
                toTimeString(nextMinute),
              ],
            );
            slotNo += 1;
            cursorMinute = nextMinute;
          }
        }
      }

      return res.json({
        status: "success",
        message: hasDaysPayload
          ? "Konfigurasi jadwal berhasil disimpan."
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

      const currentActiveConfigResult = await client.query(
        `SELECT id
         FROM lms.l_schedule_config
         WHERE homebase_id = $1
           AND periode_id = $2
           AND is_active = true
         LIMIT 1`,
        [homebase_id, periodeId],
      );
      const currentActiveConfigId = toInt(currentActiveConfigResult.rows[0]?.id, null);

      if (currentActiveConfigId && currentActiveConfigId !== configId) {
        const existingEntryResult = await client.query(
          `SELECT 1
           FROM lms.l_schedule_entry
           WHERE homebase_id = $1
             AND periode_id = $2
             AND status <> 'archived'
           LIMIT 1`,
          [homebase_id, periodeId],
        );
        if (existingEntryResult.rowCount > 0) {
          return res.status(409).json({
            status: "error",
            message:
              "Jadwal aktif tidak dapat diganti karena periode ini sudah memiliki jadwal final. Arsipkan atau reset jadwal final terlebih dahulu.",
          });
        }
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

      return res.json({
        status: "success",
        message: "Jadwal aktif berhasil diperbarui.",
        data: activatedResult.rows[0],
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
            "Master jadwal ini belum bisa dihapus karena masih memiliki kegiatan, jadwal final/manual, atau riwayat generate.",
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
             AND id = ANY($2::int[])`,
          [homebase_id, normalizedClassIds],
        );
        if (classValidation.rowCount !== normalizedClassIds.length) {
          return res.status(400).json({
            status: "error",
            message: "Ada kelas yang tidak valid untuk group ini.",
          });
        }

        await client.query(
          `DELETE FROM lms.l_schedule_config_group_class gcc
           USING lms.l_schedule_config_group g
           WHERE gcc.config_group_id = g.id
             AND g.config_id = $1
             AND g.id <> $2
             AND gcc.class_id = ANY($3::int[])`,
          [configId, group.id, normalizedClassIds],
        );

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

      if (group.is_default === true) {
        return res.status(409).json({
          status: "error",
          message: "Group default tidak dapat dihapus.",
        });
      }

      const [activityUsageResult, entryUsageResult, defaultGroupResult, classMembershipResult] =
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
               AND is_default = true
             LIMIT 1`,
            [group.config_id],
          ),
          client.query(
            `SELECT class_id
             FROM lms.l_schedule_config_group_class
             WHERE config_group_id = $1`,
            [groupId],
          ),
        ]);

      const activityUsage = Number(activityUsageResult.rows[0]?.total || 0);
      const entryUsage = Number(entryUsageResult.rows[0]?.total || 0);
      const defaultGroupId = toInt(defaultGroupResult.rows[0]?.id, null);

      if (activityUsage > 0 || entryUsage > 0) {
        return res.status(409).json({
          status: "error",
          message:
            "Group waktu ini belum bisa dihapus karena masih dipakai oleh kegiatan atau jadwal final/manual.",
        });
      }

      if (!defaultGroupId) {
        return res.status(409).json({
          status: "error",
          message:
            "Group default tidak ditemukan. Hapus group dibatalkan untuk mencegah kelas kehilangan mapping.",
        });
      }

      for (const row of classMembershipResult.rows) {
        await client.query(
          `INSERT INTO lms.l_schedule_config_group_class (config_group_id, class_id)
           VALUES ($1, $2)
           ON CONFLICT (config_group_id, class_id) DO NOTHING`,
          [defaultGroupId, row.class_id],
        );
      }

      await client.query(
        `DELETE FROM lms.l_schedule_config_group
         WHERE id = $1`,
        [groupId],
      );

      return res.json({
        status: "success",
        message: "Group jadwal berhasil dihapus.",
        data: {
          fallback_group_id: defaultGroupId,
        },
      });
    }),
  );
};
