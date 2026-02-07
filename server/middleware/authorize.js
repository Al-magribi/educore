import jwt from "jsonwebtoken";
import pool from "../config/connection.js";

export const authorize = (...allowedRolesOrLevels) => {
  return async (req, res, next) => {
    const client = await pool.connect();
    const { token } = req.cookies;

    try {
      // 1. Cek keberadaan token
      if (!token) {
        return res
          .status(401)
          .json({ message: "Akses tidak diizinkan (Token tidak ditemukan)" });
      }

      // 2. Verifikasi Token
      const decode = jwt.verify(token, process.env.JWT);

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
          COALESCE(a.homebase_id, t.homebase_id, s.homebase_id) as homebase_id
        FROM u_users u
        LEFT JOIN u_admin a ON u.id = a.user_id
        LEFT JOIN u_teachers t ON u.id = t.user_id
        LEFT JOIN u_students s ON u.id = s.user_id
        WHERE u.id = $1
      `;

      const foundUser = await client.query(queryText, [decode.id]);

      // 4. Cek apakah user ada di database
      if (foundUser.rows.length === 0) {
        return res.status(401).json({ message: "User tidak ditemukan" });
      }

      const user = foundUser.rows[0];

      // 5. Cek Status Aktif
      if (user.is_active === false) {
        return res
          .status(403)
          .json({ message: "Akun Anda telah dinonaktifkan" });
      }

      // 6. Cek Role DAN Level
      // Logika: Jika parameter kosong, semua boleh masuk.
      // Jika ada parameter, user harus punya Role yang sesuai ATAU Level yang sesuai.
      if (allowedRolesOrLevels.length > 0) {
        // A. Cek apakah Role utama user (student, teacher, admin) ada di daftar izin
        const isRoleAllowed = allowedRolesOrLevels.includes(user.role);

        // B. Cek apakah Level admin (center, dll) ada di daftar izin
        // (Hanya berlaku jika user adalah admin dan punya level)
        const isLevelAllowed =
          user.role === "admin" &&
          user.admin_level &&
          allowedRolesOrLevels.includes(user.admin_level);

        // Jika Role tidak cocok DAN Level juga tidak cocok, maka tolak
        if (!isRoleAllowed && !isLevelAllowed) {
          return res.status(403).json({
            message: `Akses dilarang. Membutuhkan hak akses: ${allowedRolesOrLevels.join(", ")}`,
          });
        }
      }

      // 7. Attach user ke request object
      // req.user sekarang punya properti .role dan .admin_level
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
      client.release();
    }
  };
};
