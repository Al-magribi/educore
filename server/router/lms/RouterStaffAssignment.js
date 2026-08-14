import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  ensureStaffAssignmentTable,
  getAssignmentTypes,
  normalizeAssignments,
} from "../../utils/staffAssignment.js";

const router = Router();

const ASSIGNMENT_LABELS = {
  cbt: "CBT",
  kurikulum: "Kurikulum",
  kesiswaan: "Kesiswaan",
};

router.get(
  "/staff-assignments",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    await ensureStaffAssignmentTable();
    const homebaseId = req.user.homebase_id;

    const [teachersResult, assignmentsResult] = await Promise.all([
      pool.query(
        `
          SELECT
            u.id,
            u.full_name,
            u.is_active,
            t.nip,
            t.is_homeroom
          FROM public.u_users u
          JOIN public.u_teachers t ON t.user_id = u.id
          WHERE t.homebase_id = $1
            AND u.role = 'teacher'
          ORDER BY lower(u.full_name) ASC
        `,
        [homebaseId],
      ),
      pool.query(
        `
          SELECT
            teacher_id,
            assignment_type,
            assigned_by,
            updated_at
          FROM public.u_staff_assignment
          WHERE homebase_id = $1
            AND is_active = true
        `,
        [homebaseId],
      ),
    ]);

    const assignmentsByTeacher = new Map();
    assignmentsResult.rows.forEach((row) => {
      const current = assignmentsByTeacher.get(row.teacher_id) || [];
      current.push(row.assignment_type);
      assignmentsByTeacher.set(row.teacher_id, current);
    });

    const data = teachersResult.rows.map((teacher) => ({
      ...teacher,
      assignments: normalizeAssignments(
        assignmentsByTeacher.get(teacher.id) || [],
      ),
    }));

    return res.json({
      status: "success",
      data,
      meta: {
        assignment_types: getAssignmentTypes().map((type) => ({
          value: type,
          label: ASSIGNMENT_LABELS[type],
        })),
      },
    });
  }),
);

router.put(
  "/staff-assignments/:teacherId",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    await ensureStaffAssignmentTable();

    const homebaseId = req.user.homebase_id;
    const actorId = req.user.id;
    const teacherId = Number.parseInt(req.params.teacherId, 10);
    const nextTypes = normalizeAssignments(req.body?.assignment_types);

    if (!Number.isInteger(teacherId) || teacherId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Guru tidak valid.",
      });
    }

    if (teacherId === actorId) {
      return res.status(400).json({
        status: "error",
        message: "Admin satuan tidak menugaskan akun sendiri.",
      });
    }

    const teacherCheck = await client.query(
      `
        SELECT u.id
        FROM public.u_users u
        JOIN public.u_teachers t ON t.user_id = u.id
        WHERE u.id = $1
          AND u.role = 'teacher'
          AND t.homebase_id = $2
        LIMIT 1
      `,
      [teacherId, homebaseId],
    );

    if (teacherCheck.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Guru tidak ditemukan di satuan ini.",
      });
    }

    await client.query(
      `
        UPDATE public.u_staff_assignment
        SET is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE homebase_id = $1
          AND teacher_id = $2
          AND is_active = true
      `,
      [homebaseId, teacherId],
    );

    for (const assignmentType of nextTypes) {
      await client.query(
        `
          INSERT INTO public.u_staff_assignment (
            homebase_id,
            teacher_id,
            assignment_type,
            assigned_by,
            is_active
          )
          VALUES ($1, $2, $3, $4, true)
        `,
        [homebaseId, teacherId, assignmentType, actorId],
      );
    }

    const current = await client.query(
      `
        SELECT assignment_type
        FROM public.u_staff_assignment
        WHERE homebase_id = $1
          AND teacher_id = $2
          AND is_active = true
        ORDER BY assignment_type ASC
      `,
      [homebaseId, teacherId],
    );

    return res.json({
      status: "success",
      message: "Penugasan wewenang berhasil disimpan.",
      data: {
        teacher_id: teacherId,
        assignments: current.rows.map((row) => row.assignment_type),
      },
    });
  }),
);

export default router;
