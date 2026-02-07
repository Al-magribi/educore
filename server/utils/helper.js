export const getActivePeriode = async (client, homebaseId) => {
  const res = await client.query(
    `SELECT id FROM a_periode WHERE is_active = true AND homebase_id = $1`,
    [homebaseId],
  );
  if (res.rows.length === 0) throw new Error("Tidak ada periode aktif.");
  return res.rows[0].id;
};
