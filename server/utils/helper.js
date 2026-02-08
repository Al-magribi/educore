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
export const uploadFile = () => {};
