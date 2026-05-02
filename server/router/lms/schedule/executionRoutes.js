import { authorize } from "../../../middleware/authorize.js";
import { withTransaction } from "../../../utils/wrapper.js";
import {
  FAILURE_LABELS,
  GENERATE_ACTIONS,
  aggregateFailureCodes,
  buildSlotTimeMap,
  dayLabels,
  ensureActivePeriode,
  gapSatisfied,
  getPrimaryFailureCode,
  overlapTime,
  parseMinute,
  resolveScheduleSegment,
  resolveSelectedScheduleConfig,
  splitSessions,
  summarizeFailureStats,
  toInt,
  validateScheduleEntryPlacement,
} from "./shared.js";

export const registerScheduleExecutionRoutes = (router) => {
  router.post(
    "/schedule/generate",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { id: userId, homebase_id } = req.user;
      const action = GENERATE_ACTIONS.has(req.body?.action)
        ? req.body.action
        : "regenerate_generated";
      const dryRun = Boolean(req.body?.dry_run);
      const periodeId = await ensureActivePeriode(
        client,
        homebase_id,
        toInt(req.body?.periode_id, null),
      );

      if (!periodeId) {
        return res.status(400).json({ status: "error", message: "Periode aktif tidak ditemukan." });
      }

      const { activeConfig: config } = await resolveSelectedScheduleConfig({
        executor: client,
        homebaseId: homebase_id,
        periodeId,
      });
      if (!config) {
        return res.status(400).json({
          status: "error",
          message: "Konfigurasi jadwal belum tersedia.",
        });
      }
      if (config.is_active !== true) {
        return res.status(409).json({
          status: "error",
          message: "Tidak ada jadwal aktif untuk periode ini.",
        });
      }

      const [
        loadResult,
        slotResult,
        groupClassResult,
        unavailabilityResult,
        existingEntrySummaryResult,
        activityResult,
        activityTargetResult,
      ] =
        await Promise.all([
          client.query(
            `SELECT *
             FROM lms.l_teaching_load
             WHERE homebase_id = $1
               AND periode_id = $2
               AND is_active = true
             ORDER BY class_id, subject_id, teacher_id`,
            [homebase_id, periodeId],
          ),
          client.query(
            `SELECT *
             FROM lms.l_time_slot
             WHERE config_id = $1
               AND is_break = false
             ORDER BY day_of_week, slot_no`,
            [config.id],
          ),
          client.query(
            `SELECT g.id AS config_group_id, gcc.class_id
             FROM lms.l_schedule_config_group g
             LEFT JOIN lms.l_schedule_config_group_class gcc
               ON gcc.config_group_id = g.id
             WHERE g.config_id = $1`,
            [config.id],
          ),
          client.query(
            `SELECT *
             FROM lms.l_teacher_unavailability
             WHERE periode_id = $1
               AND is_active = true
               AND specific_date IS NULL`,
            [periodeId],
          ),
          client.query(
            `SELECT
               COUNT(*) FILTER (WHERE status <> 'archived')::int AS total_entries,
               COUNT(*) FILTER (
                 WHERE status <> 'archived'
                   AND source_type = 'generated'
                   AND COALESCE(locked, false) = false
                   AND COALESCE(is_manual_override, false) = false
               )::int AS generated_replaceable_entries,
               COUNT(*) FILTER (
                 WHERE status <> 'archived'
                   AND (source_type = 'manual' OR COALESCE(is_manual_override, false) = true)
               )::int AS manual_entries,
               COUNT(*) FILTER (
                 WHERE status <> 'archived'
                   AND COALESCE(locked, false) = true
               )::int AS locked_entries
             FROM lms.l_schedule_entry
             WHERE homebase_id = $1
               AND periode_id = $2
               AND config_id = $3`,
            [homebase_id, periodeId, config.id],
          ),
          client.query(
            `SELECT
               a.id,
               a.scope_type,
               a.day_of_week,
               start_slot.config_group_id,
               slot_agg.slot_ids
             FROM lms.l_schedule_activity a
             JOIN lms.l_time_slot start_slot ON start_slot.id = a.slot_start_id
             LEFT JOIN LATERAL (
               SELECT ARRAY_AGG(ts.id ORDER BY ts.slot_no) AS slot_ids
               FROM lms.l_time_slot ts
               WHERE ts.config_group_id = start_slot.config_group_id
                 AND ts.day_of_week = a.day_of_week
                 AND ts.slot_no BETWEEN start_slot.slot_no AND start_slot.slot_no + a.slot_count - 1
             ) slot_agg ON true
             WHERE a.homebase_id = $1
               AND a.periode_id = $2
               AND a.is_active = true
               AND start_slot.config_id = $3`,
            [homebase_id, periodeId, config.id],
          ),
          client.query(
            `SELECT t.activity_id, t.class_id, t.teacher_id
             FROM lms.l_schedule_activity_target t
             JOIN lms.l_schedule_activity a ON a.id = t.activity_id
             JOIN lms.l_time_slot start_slot ON start_slot.id = a.slot_start_id
             WHERE a.homebase_id = $1
               AND a.periode_id = $2
               AND a.is_active = true
               AND start_slot.config_id = $3`,
            [homebase_id, periodeId, config.id],
          ),
        ]);

      const existingSummary = existingEntrySummaryResult.rows[0] || {
        total_entries: 0,
        generated_replaceable_entries: 0,
        manual_entries: 0,
        locked_entries: 0,
      };

      if (action === "generate_new" && Number(existingSummary.total_entries || 0) > 0) {
        return res.status(409).json({
          status: "error",
          message:
            "Generate baru hanya dapat dijalankan saat periode ini belum memiliki jadwal. Gunakan regenerate atau reset generated schedule.",
          data: {
            action,
            dry_run: dryRun,
            existing_entries: existingSummary,
          },
        });
      }

      const shouldClearGenerated =
        action === "regenerate_generated" || action === "reset_generated";
      const deletableGeneratedCount = Number(existingSummary.generated_replaceable_entries || 0);

      const occupiedClassSlot = new Set();
      const occupiedTeacherIntervals = new Map();
      const slotTimeMap = buildSlotTimeMap(slotResult.rows);
      const classGroupMap = new Map();
      const groupClassMap = new Map();

      groupClassResult.rows.forEach((row) => {
        const groupId = Number(row.config_group_id);
        const classId = toInt(row.class_id, null);
        if (!groupClassMap.has(groupId)) groupClassMap.set(groupId, new Set());
        if (classId) {
          classGroupMap.set(classId, groupId);
          groupClassMap.get(groupId).add(classId);
        }
      });

      const unmappedClassResult = await client.query(
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
      [homebase_id, config.id],
    );

      if (unmappedClassResult.rowCount > 0) {
        return res.status(409).json({
          status: "error",
          message:
            "Masih ada kelas aktif yang belum dipetakan ke group jadwal. Lengkapi mapping group sebelum menjalankan generator.",
          data: {
            action,
            dry_run: dryRun,
            unmapped_group_classes: unmappedClassResult.rows,
          },
        });
      }

      const preservedSlots = await client.query(
        `SELECT ess.day_of_week, ess.slot_id, ess.class_id, ess.teacher_id,
                ts.start_time, ts.end_time
         FROM lms.l_schedule_entry_slot ess
         JOIN lms.l_schedule_entry e ON e.id = ess.schedule_entry_id
         JOIN lms.l_time_slot ts ON ts.id = ess.slot_id
         WHERE e.homebase_id = $1
           AND e.periode_id = $2
           AND e.config_id = $3
           AND e.status <> 'archived'
           AND NOT (
             $4::boolean = true
             AND e.source_type = 'generated'
             AND COALESCE(e.locked, false) = false
             AND COALESCE(e.is_manual_override, false) = false
           )`,
        [homebase_id, periodeId, config.id, shouldClearGenerated],
      );

      for (const item of preservedSlots.rows) {
        occupiedClassSlot.add(`${item.day_of_week}:${item.slot_id}:${item.class_id}`);
        const teacherId = Number(item.teacher_id);
        if (!occupiedTeacherIntervals.has(teacherId)) {
          occupiedTeacherIntervals.set(teacherId, []);
        }
        occupiedTeacherIntervals.get(teacherId).push({
          day_of_week: Number(item.day_of_week),
          start_minute: parseMinute(item.start_time),
          end_minute: parseMinute(item.end_time),
        });
      }

      const activityTargetsByActivity = activityTargetResult.rows.reduce((acc, row) => {
        const key = Number(row.activity_id);
        if (!acc.has(key)) acc.set(key, []);
        acc.get(key).push({
          class_id: Number(row.class_id),
          teacher_id: Number(row.teacher_id),
        });
        return acc;
      }, new Map());

      for (const activity of activityResult.rows) {
        const slotIds = Array.isArray(activity.slot_ids)
          ? activity.slot_ids.map((item) => Number(item))
          : [];
        const day = Number(activity.day_of_week);
        if (!slotIds.length || !day) continue;

        if (activity.scope_type === "all_classes") {
          const classIds = [...(groupClassMap.get(Number(activity.config_group_id)) || new Set())];
          for (const classId of classIds) {
            for (const slotId of slotIds) {
              occupiedClassSlot.add(`${day}:${slotId}:${classId}`);
            }
          }
          continue;
        }

        const targets = activityTargetsByActivity.get(Number(activity.id)) || [];
        for (const target of targets) {
          for (const slotId of slotIds) {
            occupiedClassSlot.add(`${day}:${slotId}:${target.class_id}`);
            const slotTime = slotTimeMap[Number(slotId)];
            if (!slotTime) continue;
            const teacherId = Number(target.teacher_id);
            if (!occupiedTeacherIntervals.has(teacherId)) {
              occupiedTeacherIntervals.set(teacherId, []);
            }
            occupiedTeacherIntervals.get(teacherId).push({
              day_of_week: day,
              start_minute: slotTime.start_minute,
              end_minute: slotTime.end_minute,
            });
          }
        }
      }

      const slotByGroupDay = slotResult.rows.reduce((acc, slot) => {
        const groupId = Number(slot.config_group_id);
        const day = Number(slot.day_of_week);
        if (!acc.has(groupId)) acc.set(groupId, new Map());
        const byDay = acc.get(groupId);
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day).push(slot);
        return acc;
      }, new Map());
      for (const groupSlots of slotByGroupDay.values()) {
        for (const daySlots of groupSlots.values()) {
          daySlots.sort((a, b) => Number(a.slot_no) - Number(b.slot_no));
        }
      }

      const blockedByTeacher = unavailabilityResult.rows.reduce((acc, row) => {
        const key = Number(row.teacher_id);
        if (!acc.has(key)) acc.set(key, []);
        acc.get(key).push({
          day_of_week: row.day_of_week ? Number(row.day_of_week) : null,
          start_minute: row.start_time ? parseMinute(row.start_time) : null,
          end_minute: row.end_time ? parseMinute(row.end_time) : null,
        });
        return acc;
      }, new Map());

      const baseSummary = {
        total_loads: loadResult.rowCount,
        total_slots: slotResult.rowCount,
        weekly_rules: unavailabilityResult.rowCount,
        deleted_generated_entries: shouldClearGenerated ? deletableGeneratedCount : 0,
        existing_entries: {
          total_entries: Number(existingSummary.total_entries || 0),
          generated_replaceable_entries: deletableGeneratedCount,
          manual_entries: Number(existingSummary.manual_entries || 0),
          locked_entries: Number(existingSummary.locked_entries || 0),
        },
        action,
        dry_run: dryRun,
      };

      if (action === "reset_generated") {
        if (!dryRun && deletableGeneratedCount > 0) {
          await client.query(
            `DELETE FROM lms.l_schedule_entry_slot ess
             USING lms.l_schedule_entry e
             WHERE ess.schedule_entry_id = e.id
               AND e.homebase_id = $1
               AND e.periode_id = $2
               AND e.config_id = $3
               AND e.source_type = 'generated'
               AND COALESCE(e.locked, false) = false
               AND COALESCE(e.is_manual_override, false) = false`,
            [homebase_id, periodeId, config.id],
          );

          await client.query(
            `DELETE FROM lms.l_schedule_entry
             WHERE homebase_id = $1
               AND periode_id = $2
               AND config_id = $3
               AND source_type = 'generated'
               AND COALESCE(locked, false) = false
               AND COALESCE(is_manual_override, false) = false`,
            [homebase_id, periodeId, config.id],
          );
        }

        return res.json({
          status: "success",
          message: dryRun
            ? "Simulasi reset jadwal otomatis selesai."
            : "Jadwal otomatis berhasil direset.",
          data: {
            operation: dryRun ? "preview_reset" : "reset_generated",
            action,
            dry_run: dryRun,
            generated_entries: 0,
            failed_items: [],
            failed_summary: [],
            summary: {
              ...baseSummary,
              generated_entries: 0,
              failed_count: 0,
            },
          },
        });
      }

      let run = null;
      if (!dryRun) {
        const runResult = await client.query(
          `INSERT INTO lms.l_schedule_generation_run (config_id, generated_by, strategy, status)
           VALUES ($1, $2, $3, 'running')
           RETURNING *`,
          [config.id, userId, "greedy-first-fit"],
        );
        run = runResult.rows[0];

        if (shouldClearGenerated) {
          await client.query(
            `DELETE FROM lms.l_schedule_entry_slot ess
             USING lms.l_schedule_entry e
             WHERE ess.schedule_entry_id = e.id
               AND e.homebase_id = $1
               AND e.periode_id = $2
               AND e.config_id = $3
               AND e.source_type = 'generated'
               AND COALESCE(e.locked, false) = false
               AND COALESCE(e.is_manual_override, false) = false`,
            [homebase_id, periodeId, config.id],
          );

          await client.query(
            `DELETE FROM lms.l_schedule_entry
             WHERE homebase_id = $1
               AND periode_id = $2
               AND config_id = $3
               AND source_type = 'generated'
               AND COALESCE(locked, false) = false
               AND COALESCE(is_manual_override, false) = false`,
            [homebase_id, periodeId, config.id],
          );
        }
      }

      const failedItems = [];
      let insertedCount = 0;

      for (const load of loadResult.rows) {
        const loadGroupId = classGroupMap.get(Number(load.class_id));
        if (!loadGroupId) {
          failedItems.push({
            teaching_load_id: load.id,
            class_id: load.class_id,
            subject_id: load.subject_id,
            teacher_id: load.teacher_id,
            weekly_sessions: load.weekly_sessions,
            meeting_no: 1,
            chunk_size: Number(load.weekly_sessions || 0),
            failure_code: "no_group_mapping",
            failure_reason: FAILURE_LABELS.no_group_mapping,
            failure_summary: [],
            debug_counts: {},
            reason: "Kelas belum masuk ke group jadwal.",
          });
          continue;
        }

        const chunks = splitSessions(load.weekly_sessions, load.max_sessions_per_meeting);
        const meetingsPlaced = [];

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
          const chunkSize = chunks[chunkIndex];
          let chosen = null;

          const requireDifferentDays =
            Boolean(load.require_different_days) &&
            Number(load.weekly_sessions) > Number(load.max_sessions_per_meeting || 2);
          const allowSameDayWithGap = Boolean(load.allow_same_day_with_gap);
          const effectiveGap = toInt(load.minimum_gap_slots, 0);
          const disallowSameSubjectSameDay = effectiveGap === 0;
          const attemptStats = {
            no_day_slots: 0,
            same_day_rule: 0,
            no_contiguous_segment: 0,
            gap_rule: 0,
            class_conflict: 0,
            teacher_conflict: 0,
            teacher_unavailability: 0,
          };

          for (let day = 1; day <= 7 && !chosen; day += 1) {
            const daySlots = slotByGroupDay.get(loadGroupId)?.get(day) || [];
            if (!daySlots.length) {
              attemptStats.no_day_slots += 1;
              continue;
            }

            const existingSameDayMeetings = meetingsPlaced.filter(
              (meeting) => Number(meeting.day_of_week) === day,
            );

            if (
              existingSameDayMeetings.length > 0 &&
              requireDifferentDays &&
              !allowSameDayWithGap
            ) {
              attemptStats.same_day_rule += 1;
              continue;
            }

            if (existingSameDayMeetings.length > 0 && disallowSameSubjectSameDay) {
              attemptStats.same_day_rule += 1;
              continue;
            }

            for (let startIdx = 0; startIdx <= daySlots.length - chunkSize; startIdx += 1) {
              const segment = daySlots.slice(startIdx, startIdx + chunkSize);
              const contiguous = segment.every((slot, idx) =>
                idx === 0 ? true : Number(slot.slot_no) === Number(segment[idx - 1].slot_no) + 1,
              );
              if (!contiguous) {
                attemptStats.no_contiguous_segment += 1;
                continue;
              }

              const startSlotNo = Number(segment[0].slot_no);
              const endSlotNo = Number(segment[segment.length - 1].slot_no);

              if (existingSameDayMeetings.length > 0) {
                const passGap = existingSameDayMeetings.every((meeting) =>
                  gapSatisfied(
                    startSlotNo,
                    endSlotNo,
                    Number(meeting.start_slot_no),
                    Number(meeting.end_slot_no),
                    effectiveGap,
                  ),
                );
                if (!passGap) {
                  attemptStats.gap_rule += 1;
                  continue;
                }
              }

              const hasClassConflict = segment.some((slot) =>
                occupiedClassSlot.has(`${day}:${slot.id}:${load.class_id}`),
              );
              const teacherIntervals =
                occupiedTeacherIntervals.get(Number(load.teacher_id)) || [];
              const hasTeacherConflict = segment.some((slot) => {
                const slotStart = parseMinute(slot.start_time);
                const slotEnd = parseMinute(slot.end_time);
                return teacherIntervals.some(
                  (interval) =>
                    Number(interval.day_of_week) === day &&
                    overlapTime(
                      slotStart,
                      slotEnd,
                      interval.start_minute,
                      interval.end_minute,
                    ),
                );
              });
              if (hasClassConflict || hasTeacherConflict) {
                if (hasClassConflict) attemptStats.class_conflict += 1;
                if (hasTeacherConflict) attemptStats.teacher_conflict += 1;
                continue;
              }

              const teacherBlocks = blockedByTeacher.get(Number(load.teacher_id)) || [];
              const violatingBlock = segment.some((slot) => {
                const startMinute = parseMinute(slot.start_time);
                const endMinute = parseMinute(slot.end_time);
                return teacherBlocks.some((block) => {
                  if (block.day_of_week && Number(block.day_of_week) !== day) return false;
                  if (block.start_minute === null || block.end_minute === null) return true;
                  return overlapTime(
                    startMinute,
                    endMinute,
                    block.start_minute,
                    block.end_minute,
                  );
                });
              });
              if (violatingBlock) {
                attemptStats.teacher_unavailability += 1;
                continue;
              }

              chosen = { day_of_week: day, segment };
              break;
            }
          }

          if (!chosen) {
            const failureCode = getPrimaryFailureCode(attemptStats);
            failedItems.push({
              teaching_load_id: load.id,
              class_id: load.class_id,
              subject_id: load.subject_id,
              teacher_id: load.teacher_id,
              weekly_sessions: load.weekly_sessions,
              meeting_no: chunkIndex + 1,
              chunk_size: chunkSize,
              failure_code: failureCode,
              failure_reason: FAILURE_LABELS[failureCode] || FAILURE_LABELS.no_available_slot,
              failure_summary: summarizeFailureStats(attemptStats),
              debug_counts: attemptStats,
              reason: `Tidak ada slot tersedia untuk pertemuan ke-${chunkIndex + 1}.`,
            });
            break;
          }

          if (!dryRun && run) {
            const insertedEntry = await client.query(
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
                 status,
                 generated_run_id,
                 created_by
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'generated', 'draft', $12, $13)
               RETURNING *`,
              [
                homebase_id,
                periodeId,
                config.id,
                load.id,
                load.class_id,
                load.subject_id,
                load.teacher_id,
                chosen.day_of_week,
                chosen.segment[0].id,
                chunkSize,
                chunkIndex + 1,
                run.id,
                userId,
              ],
            );
            const entryId = insertedEntry.rows[0].id;

            for (const slot of chosen.segment) {
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
                [entryId, periodeId, chosen.day_of_week, slot.id, load.class_id, load.teacher_id],
              );
            }
          }

          for (const slot of chosen.segment) {
            occupiedClassSlot.add(`${chosen.day_of_week}:${slot.id}:${load.class_id}`);
            const teacherId = Number(load.teacher_id);
            if (!occupiedTeacherIntervals.has(teacherId)) {
              occupiedTeacherIntervals.set(teacherId, []);
            }
            occupiedTeacherIntervals.get(teacherId).push({
              day_of_week: Number(chosen.day_of_week),
              start_minute: parseMinute(slot.start_time),
              end_minute: parseMinute(slot.end_time),
            });
          }

          meetingsPlaced.push({
            day_of_week: chosen.day_of_week,
            start_slot_no: chosen.segment[0].slot_no,
            end_slot_no: chosen.segment[chosen.segment.length - 1].slot_no,
          });
          insertedCount += 1;
        }
      }

      const failedSummary = Object.entries(aggregateFailureCodes(failedItems)).map(
        ([code, count]) => ({
          code,
          count,
          label: FAILURE_LABELS[code] || code,
        }),
      );

      if (!dryRun && run) {
        await client.query(
          `UPDATE lms.l_schedule_generation_run
           SET status = $2,
               notes = $3
           WHERE id = $1`,
          [
            run.id,
            failedItems.length ? "failed" : "success",
            failedItems.length
              ? JSON.stringify({
                  failed_summary: failedSummary,
                  failed_items: failedItems,
                })
              : `Generated ${insertedCount} entries`,
          ],
        );
      }

      return res.json({
        status: "success",
        message: dryRun
          ? failedItems.length
            ? "Simulasi generate selesai dengan beberapa konflik."
            : "Simulasi generate berhasil."
          : failedItems.length
            ? "Generate selesai dengan beberapa konflik."
            : "Generate jadwal berhasil.",
        data: {
          operation: dryRun ? "preview_generate" : action,
          action,
          dry_run: dryRun,
          generated_entries: insertedCount,
          failed_items: failedItems,
          failed_summary: failedSummary,
          summary: {
            ...baseSummary,
            generated_entries: insertedCount,
            failed_count: failedItems.length,
          },
        },
      });
    }),
  );

  router.post(
    "/schedule/entries/manual",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { id: userId, homebase_id } = req.user;
      const periodeId = await ensureActivePeriode(
        client,
        homebase_id,
        toInt(req.body?.periode_id, null),
      );

      if (!periodeId) {
        return res.status(400).json({ status: "error", message: "Periode aktif tidak ditemukan." });
      }

      const teachingLoadId = toInt(req.body?.teaching_load_id, null);
      const nextDay = toInt(req.body?.day_of_week, null);
      const nextSlotStartId = toInt(req.body?.slot_start_id, null);
      const nextSlotCount = toInt(req.body?.slot_count, null);

      if (!teachingLoadId || !nextDay || !nextSlotStartId || !nextSlotCount) {
        return res.status(400).json({
          status: "error",
          message: "Beban ajar, hari, slot mulai, dan jumlah sesi wajib diisi.",
        });
      }

      const loadResult = await client.query(
        `SELECT *
         FROM lms.l_teaching_load
         WHERE id = $1
           AND homebase_id = $2
           AND periode_id = $3
           AND is_active = true
         LIMIT 1`,
        [teachingLoadId, homebase_id, periodeId],
      );
      if (loadResult.rowCount === 0) {
        return res.status(404).json({
          status: "error",
          message: "Beban ajar tidak ditemukan atau tidak aktif.",
        });
      }

      const load = loadResult.rows[0];
      const maxSessionsPerMeeting = Number(load.max_sessions_per_meeting || 1);
      if (Number(nextSlotCount) > maxSessionsPerMeeting) {
        return res.status(409).json({
          status: "error",
          message: "Jumlah sesi melebihi batas maksimal sesi per pertemuan pada beban ajar.",
        });
      }

      const resolvedSegment = await resolveScheduleSegment({
        client,
        homebaseId: homebase_id,
        periodeId,
        dayOfWeek: nextDay,
        slotStartId: nextSlotStartId,
        slotCount: nextSlotCount,
      });
      if (resolvedSegment.error) {
        return res.status(400).json({ status: "error", message: resolvedSegment.error });
      }

      const allocationResult = await client.query(
        `SELECT COALESCE(SUM(slot_count), 0) AS allocated_sessions
         FROM lms.l_schedule_entry
         WHERE config_id = $1
           AND teaching_load_id = $2
           AND status <> 'archived'`,
        [resolvedSegment.configId, teachingLoadId],
      );
      const allocatedSessions = Number(allocationResult.rows[0]?.allocated_sessions || 0);
      const requestedSessions = Number(nextSlotCount || 0);

      if (allocatedSessions + requestedSessions > Number(load.weekly_sessions || 0)) {
        return res.status(409).json({
          status: "error",
          message: "Jumlah sesi manual melebihi target beban sesi per minggu.",
        });
      }

      const segmentRows = resolvedSegment.segmentRows;
      const slotIds = segmentRows.map((row) => Number(row.id));
      const placementValidation = await validateScheduleEntryPlacement({
        client,
        configId: resolvedSegment.configId,
        periodeId,
        homebaseId: homebase_id,
        teacherId: Number(load.teacher_id),
        classId: Number(load.class_id),
        dayOfWeek: nextDay,
        slotIds,
      });
      if (placementValidation.error) {
        return res.status(placementValidation.status || 400).json({
          status: "error",
          message: placementValidation.error,
        });
      }

      const meetingNoResult = await client.query(
        `SELECT COALESCE(MAX(meeting_no), 0) + 1 AS next_meeting_no
         FROM lms.l_schedule_entry
         WHERE config_id = $1
           AND teaching_load_id = $2`,
        [resolvedSegment.configId, teachingLoadId],
      );
      const meetingNo = Number(meetingNoResult.rows[0]?.next_meeting_no || 1);

      const entryResult = await client.query(
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
           status,
           created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'manual', true, 'draft', $12)
         RETURNING *`,
        [
          homebase_id,
          periodeId,
          resolvedSegment.configId,
          teachingLoadId,
          load.class_id,
          load.subject_id,
          load.teacher_id,
          nextDay,
          resolvedSegment.startSlotId,
          nextSlotCount,
          meetingNo,
          userId,
        ],
      );

      const entry = entryResult.rows[0];

      for (const slot of segmentRows) {
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
          [entry.id, periodeId, nextDay, slot.id, load.class_id, load.teacher_id],
        );
      }

      await client.query(
        `INSERT INTO lms.l_schedule_entry_history (
           schedule_entry_id,
           action_type,
           old_data,
           new_data,
           changed_by
         )
         VALUES ($1, 'create', NULL, $2::jsonb, $3)`,
        [
          entry.id,
          JSON.stringify({
            teaching_load_id: teachingLoadId,
            day_of_week: nextDay,
            slot_start_id: resolvedSegment.startSlotId,
            slot_count: nextSlotCount,
            meeting_no: meetingNo,
            source_type: "manual",
          }),
          userId,
        ],
      );

      return res.json({
        status: "success",
        message: "Jadwal manual berhasil ditambahkan.",
        data: entry,
      });
    }),
  );

  router.delete(
    "/schedule/entries/:id",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { id: userId, homebase_id } = req.user;
      const entryId = toInt(req.params.id, null);
      if (!entryId) {
        return res.status(400).json({ status: "error", message: "ID jadwal tidak valid." });
      }

      const existingResult = await client.query(
        `SELECT *
         FROM lms.l_schedule_entry
         WHERE id = $1
           AND homebase_id = $2
         LIMIT 1`,
        [entryId, homebase_id],
      );
      if (existingResult.rowCount === 0) {
        return res.status(404).json({ status: "error", message: "Data jadwal tidak ditemukan." });
      }

      const existing = existingResult.rows[0];
      const isManualEntry =
        existing.source_type === "manual" || Boolean(existing.is_manual_override);

      if (!isManualEntry) {
        return res.status(409).json({
          status: "error",
          message: "Hanya jadwal manual yang dapat dihapus langsung.",
        });
      }

      await client.query(`DELETE FROM lms.l_schedule_entry_slot WHERE schedule_entry_id = $1`, [
        entryId,
      ]);

      await client.query(
        `INSERT INTO lms.l_schedule_entry_history (
           schedule_entry_id,
           action_type,
           old_data,
           new_data,
           changed_by
         )
         VALUES ($1, 'delete', $2::jsonb, NULL, $3)`,
        [
          entryId,
          JSON.stringify(existing),
          userId,
        ],
      );

      await client.query(`DELETE FROM lms.l_schedule_entry WHERE id = $1`, [entryId]);

      return res.json({ status: "success", message: "Jadwal manual dihapus." });
    }),
  );

  router.patch(
    "/schedule/entries/:id",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { id: userId, homebase_id } = req.user;
      const entryId = toInt(req.params.id, null);
      if (!entryId) {
        return res.status(400).json({ status: "error", message: "ID jadwal tidak valid." });
      }

      const existingResult = await client.query(
        `SELECT e.*, ts.config_id, ts.slot_no AS start_slot_no
         FROM lms.l_schedule_entry e
         JOIN lms.l_time_slot ts ON ts.id = e.slot_start_id
         WHERE e.id = $1
           AND e.homebase_id = $2
         LIMIT 1`,
        [entryId, homebase_id],
      );
      if (existingResult.rowCount === 0) {
        return res.status(404).json({ status: "error", message: "Data jadwal tidak ditemukan." });
      }

      const existing = existingResult.rows[0];
      const nextDay = toInt(req.body?.day_of_week, existing.day_of_week);
      const nextSlotStartId = toInt(req.body?.slot_start_id, existing.slot_start_id);
      const nextSlotCount = toInt(req.body?.slot_count, existing.slot_count);

      const allocationResult = await client.query(
        `SELECT COALESCE(SUM(slot_count), 0) AS allocated_sessions
         FROM lms.l_schedule_entry
         WHERE config_id = $1
           AND teaching_load_id = $2
           AND status <> 'archived'
           AND id <> $3`,
        [existing.config_id, existing.teaching_load_id, entryId],
      );
      const maxWeeklyResult = await client.query(
        `SELECT weekly_sessions, max_sessions_per_meeting
         FROM lms.l_teaching_load
         WHERE id = $1
         LIMIT 1`,
        [existing.teaching_load_id],
      );
      const allocatedSessions = Number(allocationResult.rows[0]?.allocated_sessions || 0);
      const maxWeeklySessions = Number(maxWeeklyResult.rows[0]?.weekly_sessions || 0);
      const maxSessionsPerMeeting = Number(
        maxWeeklyResult.rows[0]?.max_sessions_per_meeting || 1,
      );

      if (Number(nextSlotCount) > maxSessionsPerMeeting) {
        return res.status(409).json({
          status: "error",
          message: "Jumlah sesi melebihi batas maksimal sesi per pertemuan pada beban ajar.",
        });
      }

      if (allocatedSessions + Number(nextSlotCount || 0) > maxWeeklySessions) {
        return res.status(409).json({
          status: "error",
          message: "Jumlah sesi melebihi target beban sesi per minggu.",
        });
      }

      const resolvedSegment = await resolveScheduleSegment({
        client,
        homebaseId: homebase_id,
        periodeId: existing.periode_id,
        dayOfWeek: nextDay,
        slotStartId: nextSlotStartId,
        slotCount: nextSlotCount,
      });
      if (resolvedSegment.error) {
        return res.status(400).json({ status: "error", message: resolvedSegment.error });
      }

      const segmentRows = resolvedSegment.segmentRows;
      const slotIds = segmentRows.map((row) => Number(row.id));
      const placementValidation = await validateScheduleEntryPlacement({
        client,
        entryId,
        configId: existing.config_id || resolvedSegment.configId,
        periodeId: existing.periode_id,
        homebaseId: homebase_id,
        teacherId: Number(existing.teacher_id),
        classId: Number(existing.class_id),
        dayOfWeek: nextDay,
        slotIds,
      });
      if (placementValidation.error) {
        return res.status(placementValidation.status || 400).json({
          status: "error",
          message: placementValidation.error,
        });
      }

      await client.query(
        `UPDATE lms.l_schedule_entry
         SET config_id = $2,
             day_of_week = $3,
             slot_start_id = $4,
             slot_count = $5,
             source_type = 'manual',
             is_manual_override = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [
          entryId,
          resolvedSegment.configId,
          nextDay,
          resolvedSegment.startSlotId,
          nextSlotCount,
        ],
      );

      await client.query(`DELETE FROM lms.l_schedule_entry_slot WHERE schedule_entry_id = $1`, [
        entryId,
      ]);

      for (const slot of segmentRows) {
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
            entryId,
            existing.periode_id,
            nextDay,
            slot.id,
            existing.class_id,
            existing.teacher_id,
          ],
        );
      }

      await client.query(
        `INSERT INTO lms.l_schedule_entry_history (
           schedule_entry_id,
           action_type,
           old_data,
           new_data,
           changed_by
         )
         VALUES ($1, 'update', $2::jsonb, $3::jsonb, $4)`,
        [
          entryId,
          JSON.stringify({
            day_of_week: existing.day_of_week,
            slot_start_id: existing.slot_start_id,
            slot_count: existing.slot_count,
          }),
          JSON.stringify({
            day_of_week: nextDay,
            slot_start_id: resolvedSegment.startSlotId,
            slot_count: nextSlotCount,
          }),
          userId,
        ],
      );

      return res.json({
        status: "success",
        message: "Jadwal berhasil diperbarui.",
        data: {
          id: entryId,
          day_of_week: nextDay,
          day_name: dayLabels[nextDay] || String(nextDay),
        },
      });
    }),
  );
};
