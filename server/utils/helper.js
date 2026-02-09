import fs from "fs";
import path from "path";

export const getActivePeriode = async (client, homebaseId) => {
  const res = await client.query(
    `SELECT id FROM a_periode WHERE is_active = true AND homebase_id = $1`,
    [homebaseId],
  );
  if (res.rows.length === 0) throw new Error("Tidak ada periode aktif.");
  return res.rows[0].id;
};

// File yang diupload simpan di ./server/assets/lms
// dalam folder lms, buat folder untuk masing masing guru, baru simpan filenya
// Ketika file dihapus, hapus juga file fisiknya
export const getLmsTeacherDir = (teacherId) => {
  return path.join(process.cwd(), "server", "assets", "lms", String(teacherId));
};

export const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const resolveLmsAssetPath = (assetUrl) => {
  if (!assetUrl || typeof assetUrl !== "string") return null;
  const cleanUrl = assetUrl.split("?")[0];
  if (!cleanUrl.startsWith("/assets/lms/")) return null;
  const relativePath = cleanUrl.replace("/assets/", "");
  return path.join(process.cwd(), "server", "assets", relativePath);
};

export const safeUnlink = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // ignore delete error to avoid breaking request flow
  }
};
