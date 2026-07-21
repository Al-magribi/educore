export const getActivePeriode = async (client, homebaseId) => {
  const res = await client.query(
    `SELECT id FROM a_periode WHERE is_active = true AND homebase_id = $1`,
    [homebaseId],
  );
  if (res.rows.length === 0) throw new Error("Tidak ada periode aktif.");
  return res.rows[0].id;
};

/**
 * Sinkronkan No RFID user: hard-delete kartu lama, jangan soft-deactivate.
 * - rfidNo kosong → hapus semua kartu user
 * - rfidNo terisi → hapus kartu lain milik user, lalu upsert kartu baru
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export const syncUserRfid = async (client, userId, rfidNo) => {
  const normalizedRfid = `${rfidNo || ""}`.trim();

  if (!normalizedRfid) {
    await client.query(`DELETE FROM attendance.rfid_card WHERE user_id = $1`, [
      userId,
    ]);
    return { ok: true };
  }

  const existingCard = await client.query(
    `SELECT id, user_id FROM attendance.rfid_card WHERE card_uid = $1 LIMIT 1`,
    [normalizedRfid],
  );

  if (
    existingCard.rowCount > 0 &&
    Number(existingCard.rows[0].user_id) !== Number(userId)
  ) {
    return { ok: false, message: "No RFID sudah dipakai user lain." };
  }

  await client.query(
    `DELETE FROM attendance.rfid_card
     WHERE user_id = $1 AND card_uid <> $2`,
    [userId, normalizedRfid],
  );

  if (existingCard.rowCount > 0) {
    await client.query(
      `UPDATE attendance.rfid_card
       SET user_id = $1, is_active = true, is_primary = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [userId, existingCard.rows[0].id],
    );
  } else {
    await client.query(
      `INSERT INTO attendance.rfid_card (user_id, card_uid, card_type, is_primary, is_active)
       VALUES ($1, $2, 'rfid', true, true)`,
      [userId, normalizedRfid],
    );
  }

  return { ok: true };
};

/** Hapus kartu RFID nonaktif, duplikat per user, atau tanpa relasi user yang valid. */
export const purgeUnrelatedRfidCards = async (client) => {
  await client.query(`DELETE FROM attendance.rfid_card WHERE is_active = false`);

  await client.query(`
    DELETE FROM attendance.rfid_card
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY user_id
                 ORDER BY is_primary DESC, id DESC
               ) AS rn
        FROM attendance.rfid_card
      ) ranked
      WHERE rn > 1
    )
  `);

  await client.query(`
    DELETE FROM attendance.rfid_card rc
    WHERE NOT EXISTS (
      SELECT 1 FROM public.u_users u WHERE u.id = rc.user_id
    )
  `);
};
