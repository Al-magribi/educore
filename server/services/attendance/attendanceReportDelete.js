const collectRelatedScanLogIds = async (client, attendanceId) => {
  const result = await client.query(
    `SELECT DISTINCT scan_id AS id
     FROM (
       SELECT id AS scan_id
       FROM attendance.rfid_scan_log
       WHERE attendance_id = $1
       UNION ALL
       SELECT first_gate_scan_id AS scan_id
       FROM attendance.daily_attendance
       WHERE id = $1
         AND first_gate_scan_id IS NOT NULL
       UNION ALL
       SELECT last_gate_scan_id AS scan_id
       FROM attendance.daily_attendance
       WHERE id = $1
         AND last_gate_scan_id IS NOT NULL
       UNION ALL
       SELECT scan_log_id AS scan_id
       FROM attendance.daily_attendance_event
       WHERE attendance_id = $1
         AND scan_log_id IS NOT NULL
     ) AS related
     WHERE scan_id IS NOT NULL`,
    [attendanceId],
  );

  return result.rows.map((row) => Number(row.id));
};

const collectAttendanceIdsForScanLogs = async (
  client,
  { homebaseId, scanLogIds },
) => {
  const result = await client.query(
    `SELECT DISTINCT attendance_ref AS id
     FROM (
       SELECT sl.attendance_id AS attendance_ref
       FROM attendance.rfid_scan_log sl
       WHERE sl.homebase_id = $1
         AND sl.id = ANY($2::bigint[])
         AND sl.attendance_id IS NOT NULL
       UNION ALL
       SELECT da.id AS attendance_ref
       FROM attendance.daily_attendance da
       WHERE da.homebase_id = $1
         AND (
           da.first_gate_scan_id = ANY($2::bigint[])
           OR da.last_gate_scan_id = ANY($2::bigint[])
         )
     ) AS refs
     WHERE attendance_ref IS NOT NULL`,
    [homebaseId, scanLogIds],
  );

  return result.rows.map((row) => Number(row.id));
};

export const deleteDailyAttendanceCascade = async (
  client,
  { homebaseId, attendanceId },
) => {
  const existing = await client.query(
    `SELECT id
     FROM attendance.daily_attendance
     WHERE id = $1
       AND homebase_id = $2
     LIMIT 1`,
    [attendanceId, homebaseId],
  );
  if (existing.rowCount === 0) {
    return { deleted: false, attendance_id: attendanceId, deleted_scan_log_ids: [] };
  }

  const scanLogIds = await collectRelatedScanLogIds(client, attendanceId);

  await client.query(
    `DELETE FROM attendance.daily_attendance
     WHERE id = $1
       AND homebase_id = $2`,
    [attendanceId, homebaseId],
  );

  let deletedScanLogIds = [];
  if (scanLogIds.length > 0) {
    const deletedScans = await client.query(
      `DELETE FROM attendance.rfid_scan_log
       WHERE homebase_id = $1
         AND id = ANY($2::bigint[])
       RETURNING id`,
      [homebaseId, scanLogIds],
    );
    deletedScanLogIds = deletedScans.rows.map((row) => row.id);
  }

  return {
    deleted: true,
    attendance_id: attendanceId,
    deleted_scan_log_ids: deletedScanLogIds,
  };
};

export const deleteDailyAttendanceCascadeBulk = async (
  client,
  { homebaseId, attendanceIds },
) => {
  const uniqueAttendanceIds = [...new Set(attendanceIds)];
  const results = [];

  for (const attendanceId of uniqueAttendanceIds) {
    const result = await deleteDailyAttendanceCascade(client, {
      homebaseId,
      attendanceId,
    });
    if (result.deleted) {
      results.push(result);
    }
  }

  const deletedAttendanceIds = results.map((item) => item.attendance_id);
  const deletedScanLogIds = [
    ...new Set(results.flatMap((item) => item.deleted_scan_log_ids)),
  ];

  return {
    deleted_count: deletedAttendanceIds.length,
    deleted_attendance_ids: deletedAttendanceIds,
    deleted_scan_log_ids: deletedScanLogIds,
  };
};

export const deleteScanLogsCascade = async (
  client,
  { homebaseId, scanLogIds },
) => {
  const uniqueScanIds = [...new Set(scanLogIds)];
  const attendanceIds = await collectAttendanceIdsForScanLogs(client, {
    homebaseId,
    scanLogIds: uniqueScanIds,
  });

  const cascadeResult = await deleteDailyAttendanceCascadeBulk(client, {
    homebaseId,
    attendanceIds,
  });

  const deletedScans = await client.query(
    `DELETE FROM attendance.rfid_scan_log
     WHERE homebase_id = $1
       AND id = ANY($2::bigint[])
     RETURNING id`,
    [homebaseId, uniqueScanIds],
  );

  const deletedScanLogIds = [
    ...new Set([
      ...cascadeResult.deleted_scan_log_ids.map((id) => Number(id)),
      ...deletedScans.rows.map((row) => Number(row.id)),
    ]),
  ];

  return {
    deleted_scan_log_count: deletedScanLogIds.length,
    deleted_scan_log_ids: deletedScanLogIds,
    deleted_attendance_ids: cascadeResult.deleted_attendance_ids,
  };
};
