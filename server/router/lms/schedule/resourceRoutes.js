import { authorize } from "../../../middleware/authorize.js";
import { withTransaction } from "../../../utils/wrapper.js";
import { ensureActivePeriode, ensureTeachingLoad, getColumnPresence, resolveTeacherAssignment, toInt } from "./shared.js";

export const registerScheduleResourceRoutes = (router) => {
  router.post(
    "/schedule/activity",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { id: userId, homebase_id } = req.user;
      const {
        id,
        periode_id,
        config_group_id,
        name,
        day_of_week,
        slot_start_id,
        slot_count,
        scope_type = "all_classes",
        description = null,
        is_active = true,
        teaching_load_ids = [],
        assignment_keys = [],
      } = req.body || {};

      const periodeId = await ensureActivePeriode(client, homebase_id, toInt(periode_id, null));
      if (!periodeId) {
        return res.status(400).json({
          status: "error",
          message: "Periode aktif tidak ditemukan.",
        });
      }

      const normalizedName = String(name || "").trim();
      if (!normalizedName) {
        return res.status(400).json({
          status: "error",
          message: "Nama kegiatan wajib diisi.",
        });
      }

      const scopeType = ["all_classes", "teaching_load"].includes(scope_type)
        ? scope_type
        : "all_classes";
      const nextConfigGroupId = toInt(config_group_id, null);
      const nextDay = toInt(day_of_week, null);
      const nextSlotStartId = toInt(slot_start_id, null);
      const nextSlotCount = toInt(slot_count, null);

      if (!nextDay || !nextSlotStartId || !nextSlotCount) {
        return res.status(400).json({
          status: "error",
          message: "Hari, slot mulai, dan jumlah slot wajib diisi.",
        });
      }

      const startSlotResult = await client.query(
        `SELECT ts.*, cfg.homebase_id, cfg.periode_id
         FROM lms.l_time_slot ts
         JOIN lms.l_schedule_config cfg ON cfg.id = ts.config_id
         WHERE ts.id = $1
         LIMIT 1`,
        [nextSlotStartId],
      );
      if (startSlotResult.rowCount === 0) {
        return res.status(400).json({
          status: "error",
          message: "slot_start_id tidak valid.",
        });
      }

      const startSlot = startSlotResult.rows[0];
      if (
        Number(startSlot.homebase_id) !== Number(homebase_id) ||
        Number(startSlot.periode_id) !== Number(periodeId)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Slot mulai tidak cocok dengan homebase/periode aktif.",
        });
      }

      if (Number(startSlot.day_of_week) !== Number(nextDay)) {
        return res.status(400).json({
          status: "error",
          message: "Hari tidak sesuai dengan slot mulai yang dipilih.",
        });
      }

      if (
        nextConfigGroupId &&
        Number(startSlot.config_group_id) !== Number(nextConfigGroupId)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Slot mulai tidak sesuai dengan shift jadwal yang sedang dipilih.",
        });
      }

      const startSlotNo = toInt(startSlot.slot_no, 0);
      const segmentResult = await client.query(
        `SELECT id, slot_no
         FROM lms.l_time_slot
         WHERE config_group_id = $1
           AND day_of_week = $2
           AND is_break = false
           AND slot_no BETWEEN $3 AND $4
         ORDER BY slot_no`,
        [startSlot.config_group_id, nextDay, startSlotNo, startSlotNo + nextSlotCount - 1],
      );
      if (segmentResult.rowCount !== nextSlotCount) {
        return res.status(400).json({
          status: "error",
          message: "Slot kegiatan harus berurutan dan tersedia sesuai jumlah slot.",
        });
      }

      let normalizedTeachingLoadIds = [
        ...new Set((teaching_load_ids || []).map((item) => toInt(item, null)).filter(Boolean)),
      ];

      if (scopeType === "teaching_load") {
        const keys = [
          ...new Set(
            (assignment_keys || [])
              .map((item) => String(item || "").trim())
              .filter(Boolean),
          ),
        ];

        if (keys.length > 0) {
          normalizedTeachingLoadIds = [];
          for (const key of keys) {
            const [teacherId, subjectId, classId] = key
              .split(":")
              .map((value) => toInt(value, null));
            if (!teacherId || !subjectId || !classId) {
              return res.status(400).json({
                status: "error",
                message: "Format alokasi mengajar tidak valid.",
              });
            }

            const assignment = await resolveTeacherAssignment({
              client,
              homebaseId: homebase_id,
              teacherId,
              subjectId,
              classId,
            });
            if (!assignment) {
              return res.status(400).json({
                status: "error",
                message:
                  "Salah satu alokasi guru, mapel, dan kelas tidak ditemukan.",
              });
            }

            if (nextConfigGroupId) {
              const classInGroup = await client.query(
                `SELECT 1
                 FROM lms.l_schedule_config_group_class
                 WHERE config_group_id = $1
                   AND class_id = $2
                 LIMIT 1`,
                [nextConfigGroupId, classId],
              );
              if (classInGroup.rowCount === 0) {
                return res.status(400).json({
                  status: "error",
                  message:
                    "Salah satu kelas tidak termasuk shift jadwal yang sedang dipilih.",
                });
              }
            }

            const teachingLoadId = await ensureTeachingLoad({
              client,
              homebaseId: homebase_id,
              periodeId,
              classId,
              subjectId,
              teacherId,
              userId,
            });
            normalizedTeachingLoadIds.push(teachingLoadId);
          }
        }
      }

      let targetRows = [];
      if (scopeType === "teaching_load") {
        if (normalizedTeachingLoadIds.length === 0) {
          return res.status(400).json({
            status: "error",
            message: "Minimal satu alokasi mengajar wajib dipilih untuk kegiatan ini.",
          });
        }

        const loadResult = await client.query(
          `SELECT l.id, l.teacher_id, l.subject_id, l.class_id
           FROM lms.l_teaching_load l
           ${nextConfigGroupId ? "JOIN lms.l_schedule_config_group_class gcc ON gcc.class_id = l.class_id" : ""}
           WHERE l.id = ANY($1::int[])
             AND l.homebase_id = $2
             AND l.periode_id = $3
             AND l.is_active = true
             ${nextConfigGroupId ? "AND gcc.config_group_id = $4" : ""}`,
          nextConfigGroupId
            ? [normalizedTeachingLoadIds, homebase_id, periodeId, nextConfigGroupId]
            : [normalizedTeachingLoadIds, homebase_id, periodeId],
        );
        if (loadResult.rowCount !== normalizedTeachingLoadIds.length) {
          return res.status(400).json({
            status: "error",
            message:
              "Salah satu beban ajar yang dipilih tidak valid, tidak aktif, atau tidak termasuk shift yang sedang dipilih.",
          });
        }
        targetRows = loadResult.rows;
      }

      const activityColumns = await getColumnPresence(client, "l_schedule_activity", ["config_id"]);
      const hasActivityConfigId = Boolean(activityColumns.config_id);

      const isUpdate = Boolean(toInt(id, null));
      const sql = isUpdate
        ? `UPDATE lms.l_schedule_activity
           SET name = $3,
               day_of_week = $4,
               slot_start_id = $5,
               slot_count = $6,
               scope_type = $7,
               description = $8,
               is_active = $9,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $10
             AND homebase_id = $1
             AND periode_id = $2
             ${hasActivityConfigId ? "AND config_id = $11" : ""}
           RETURNING *`
        : `INSERT INTO lms.l_schedule_activity (
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
           VALUES ($1, $2, ${hasActivityConfigId ? "$3, " : ""}${
             hasActivityConfigId ? "$4, $5, $6, $7, $8, $9, $10, $11" : "$3, $4, $5, $6, $7, $8, $9, $10"
           })
           RETURNING *`;

      const params = isUpdate
        ? [
            homebase_id,
            periodeId,
            normalizedName,
            nextDay,
            nextSlotStartId,
            nextSlotCount,
            scopeType,
            description,
            Boolean(is_active),
            toInt(id, null),
            ...(hasActivityConfigId ? [startSlot.config_id] : []),
          ]
        : [
            homebase_id,
            periodeId,
            ...(hasActivityConfigId ? [startSlot.config_id] : []),
            normalizedName,
            nextDay,
            nextSlotStartId,
            nextSlotCount,
            scopeType,
            description,
            Boolean(is_active),
            userId,
          ];

      const activityResult = await client.query(sql, params);

      if (isUpdate && activityResult.rowCount === 0) {
        return res.status(404).json({
          status: "error",
          message: "Kegiatan tidak ditemukan.",
        });
      }

      const activity = activityResult.rows[0];

      await client.query(`DELETE FROM lms.l_schedule_activity_target WHERE activity_id = $1`, [
        activity.id,
      ]);

      for (const target of targetRows) {
        await client.query(
          `INSERT INTO lms.l_schedule_activity_target (
             activity_id,
             teaching_load_id,
             teacher_id,
             subject_id,
             class_id
           )
           VALUES ($1, $2, $3, $4, $5)`,
          [activity.id, target.id, target.teacher_id, target.subject_id, target.class_id],
        );
      }

      return res.json({
        status: "success",
        message: isUpdate ? "Kegiatan berhasil diperbarui." : "Kegiatan berhasil ditambahkan.",
        data: {
          ...activity,
          teaching_load_ids: targetRows.map((item) => item.id),
        },
      });
    }),
  );

  router.delete(
    "/schedule/activity/:id",
    authorize("satuan"),
    withTransaction(async (req, res, client) => {
      const { homebase_id } = req.user;
      const id = toInt(req.params.id, null);
      if (!id) {
        return res.status(400).json({ status: "error", message: "ID kegiatan tidak valid." });
      }

      await client.query(
        `DELETE FROM lms.l_schedule_activity
         WHERE id = $1
           AND homebase_id = $2`,
        [id, homebase_id],
      );

      return res.json({ status: "success", message: "Kegiatan dihapus." });
    }),
  );
};
