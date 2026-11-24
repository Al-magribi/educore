// Data login khusus LMS. Dimuat oleh server/router/auth/domainProfiles.js
// (milik main); jangan menambah logika ini ke RouterAuth.js.
//
// - Tendik (role "staff"): profil u_staff; hanya boleh masuk bila aktif dan
//   punya penugasan keuangan.
// - Guru: status piket hari ini, penugasan wewenang (cbt/kurikulum/...), dan
//   flag meja keuangan bila modul finance terpasang.
// - Siswa: flag petugas presensi kelas.

import { AuthDeniedError } from "../auth/domainProfiles.js";
import { isClassAttendanceOfficer } from "../../services/attendance/classAttendanceAccess.js";
import {
  attachAssignmentFlags,
  fetchTeacherAssignments,
} from "../../utils/staffAssignment.js";

const STAFF_INACTIVE_MESSAGE = "Akun dinonaktifkan. Hubungi admin.";
const STAFF_WITHOUT_ASSIGNMENT_MESSAGE =
  "Akun tendik ini belum memiliki penugasan. Hubungi admin satuan.";

// Modul finance opsional: produk tanpa finance tidak punya file ini.
const attachOptionalFinanceStaff = async (db, user) => {
  if (!user || !["teacher", "staff"].includes(user.role)) return user;

  try {
    const mod = await import("../finance/financeStaffAccess.js");
    return await mod.attachFinanceStaffFlag(db, user);
  } catch (error) {
    const code = error?.code || error?.cause?.code;
    if (code !== "ERR_MODULE_NOT_FOUND") {
      console.error("[finance-staff] gagal memuat penugasan", error);
    }
    user.can_manage_finance = false;
    return user;
  }
};

const loadTeacherDuty = async (db, teacherId, homebaseId) => {
  const result = await db.query(
    `
    SELECT COUNT(*)::int AS duty_today_count
    FROM lms.l_duty_assignment d
    WHERE d.duty_teacher_id = $1
      AND d.homebase_id = $2
      AND d.date = CURRENT_DATE
      AND d.status <> 'cancelled'
    `,
    [teacherId, homebaseId],
  );
  const count = result.rows[0]?.duty_today_count || 0;
  return { has_duty_today: count > 0, duty_today_count: count };
};

const requireFinanceDesk = async (db, user) => {
  await attachOptionalFinanceStaff(db, user);
  if (user.can_manage_finance !== true) {
    throw new AuthDeniedError(STAFF_WITHOUT_ASSIGNMENT_MESSAGE);
  }
};

export default {
  roles: {
    staff: {
      detailTable: "u_staff",

      loadSigninProfile: async (db, userId) => {
        const result = await db.query(
          `
          SELECT
            s.id AS staff_id, s.nip, s.phone, s.email, s.is_active AS staff_active,
            s.homebase_id,
            hb.name AS homebase_name
          FROM u_staff s
          LEFT JOIN a_homebase hb ON s.homebase_id = hb.id
          WHERE s.user_id = $1
          LIMIT 1
          `,
          [userId],
        );
        const staff = result.rows[0];
        if (!staff || staff.staff_active === false || !staff.homebase_id) {
          throw new AuthDeniedError(STAFF_INACTIVE_MESSAGE);
        }
        delete staff.staff_active;
        return staff;
      },

      loadUserProfile: async (db, userId) => {
        const result = await db.query(
          `
          SELECT
            u.id, u.username, u.full_name, u.role, u.img_url, u.gender,
            s.id AS staff_id, s.nip, s.phone, s.email,
            s.homebase_id,
            hb.name AS homebase_name
          FROM u_users u
          JOIN u_staff s ON s.user_id = u.id
          LEFT JOIN a_homebase hb ON s.homebase_id = hb.id
          WHERE u.id = $1
          `,
          [userId],
        );
        return result.rows[0] || null;
      },
    },
  },

  enrichProfile: async ({ db, user }) => {
    if (user.role === "student") {
      user.is_attendance_officer = await isClassAttendanceOfficer(db, user.id);
      return;
    }

    if (user.role === "teacher") {
      Object.assign(user, await loadTeacherDuty(db, user.id, user.homebase_id));
      const assignments = await fetchTeacherAssignments(db, user.id, user.homebase_id);
      Object.assign(user, attachAssignmentFlags(user, assignments));
      await attachOptionalFinanceStaff(db, user);
      return;
    }

    if (user.role === "staff") {
      await requireFinanceDesk(db, user);
    }
  },
};
