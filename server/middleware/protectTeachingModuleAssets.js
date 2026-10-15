import pool from "../config/connection.js";
import { authorize } from "./authorize.js";
import { canManageKurikulum } from "../utils/staffAssignment.js";

// File & gambar modul ajar (/assets/lms/:teacherId/modul/*) hanya untuk guru
// pemiliknya serta admin satuan / kurikulum di satuan yang sama.
const checkTeachingModuleAssetAccess = async (req, res, next) => {
  const teacherId = Number(req.params.teacherId);
  const user = req.user;

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return res.status(403).json({ message: "Akses dilarang." });
  }

  if (user.role === "teacher" && Number(user.id) === teacherId) {
    return next();
  }

  try {
    if (canManageKurikulum(user)) {
      const result = await pool.query(
        `SELECT 1 FROM u_teachers WHERE user_id = $1 AND homebase_id = $2 LIMIT 1`,
        [teacherId, user.homebase_id],
      );
      if (result.rowCount > 0) return next();
    }
  } catch (error) {
    console.error("[Teaching Module Asset Error]", error);
    return res.status(500).json({ message: "Internal server error." });
  }

  return res.status(403).json({ message: "Akses dilarang." });
};

export const protectTeachingModuleAssets = [
  authorize("satuan", "teacher"),
  checkTeachingModuleAssetAccess,
];
