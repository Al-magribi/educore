import jwt from "jsonwebtoken";
import pool from "../config/connection.js";
import {
  fetchTeacherAssignments,
  parseAssignmentToken,
} from "../utils/staffAssignment.js";

export const authorize = (...allowedRolesOrLevels) => {
  return async (req, res, next) => {
    const { token } = req.cookies;
    let client;

    try {
      // 1. Cek keberadaan token
      if (!token) {
        return res
          .status(401)
          .json({ message: "Akses tidak diizinkan (Token tidak ditemukan)" });
      }

      // 2. Verifikasi Token
      const decode = jwt.verify(token, process.env.JWT);

      // 3. Ambil koneksi DB setelah token valid
      client = await pool.connect();

      // 3. Query ke u_users DAN JOIN ke u_admin untuk ambil level
      // Kita gunakan LEFT JOIN agar user non-admin tetap bisa login
      const queryText = `
        SELECT 
          u.id, 
          u.username, 
          u.full_name, 
          u.role, 
          u.is_active,
          a.level as admin_level,
          COALESCE(a.homebase_id, t.homebase_id, s.homebase_id, m.homebase_id) as homebase_id,
          COALESCE(m.is_active, false) as is_musyrif
        FROM u_users u
        LEFT JOIN u_admin a ON u.id = a.user_id
        LEFT JOIN u_teachers t ON u.id = t.user_id
        LEFT JOIN u_students s ON u.id = s.user_id
        LEFT JOIN tahfiz.t_musyrif m ON u.id = m.user_id
        WHERE u.id = $1
      `;

      const foundUser = await client.query(queryText, [decode.id]);

      // 4. Cek apakah user ada di database
      if (foundUser.rows.length === 0) {
        return res.status(401).json({ message: "User tidak ditemukan" });
      }

      const user = foundUser.rows[0];
      user.assignments =
        user.role === "teacher"
          ? await fetchTeacherAssignments(client, user.id, user.homebase_id)
          : [];

      // 5. Cek Status Aktif
      if (user.is_active === false) {
        return res
          .status(403)
          .json({ message: "Akun Anda telah dinonaktifkan" });
      }

      // 6. Cek Role, Level, atau penugasan wewenang
      if (allowedRolesOrLevels.length > 0) {
        const allowedAssignments = allowedRolesOrLevels
          .map(parseAssignmentToken)
          .filter(Boolean);
        const plainAllowed = allowedRolesOrLevels.filter(
          (item) => !parseAssignmentToken(item),
        );

        const isRoleAllowed = plainAllowed.includes(user.role);
        const isLevelAllowed =
          user.role === "admin" &&
          user.admin_level &&
          plainAllowed.includes(user.admin_level);
        const isAssignmentAllowed =
          user.role === "teacher" &&
          allowedAssignments.some((type) => user.assignments.includes(type));

        if (!isRoleAllowed && !isLevelAllowed && !isAssignmentAllowed) {
          return res.status(403).json({
            message: `Akses dilarang. Membutuhkan hak akses: ${allowedRolesOrLevels.join(", ")}`,
          });
        }
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Token tidak valid." });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token kadaluarsa." });
      }
      console.error("[Auth Error]", error);
      return res.status(500).json({ message: "Internal server error." });
    } finally {
      if (client) {
        client.release();
      }
    }
  };
};
