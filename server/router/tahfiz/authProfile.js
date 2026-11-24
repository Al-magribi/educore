// Data login khusus Tahfiz. Dimuat oleh server/router/auth/domainProfiles.js
// (milik main); jangan menambah logika ini ke RouterAuth.js.
//
// Admin yang terdaftar sebagai musyrif mendapat musyrif_id dan is_musyrif.
// Client memakainya untuk menu musyrif (tahfizMenus.jsx) dan
// <RouteProtection requireMusyrif>.

export default {
  enrichProfile: async ({ db, user }) => {
    if (user.role !== "admin") return;

    const result = await db.query(
      `
      SELECT m.id AS musyrif_id
      FROM tahfiz.t_musyrif m
      WHERE m.user_id = $1
      LIMIT 1
      `,
      [user.id],
    );

    const musyrifId = result.rows[0]?.musyrif_id ?? null;
    user.musyrif_id = musyrifId;
    user.is_musyrif = musyrifId !== null;
  },
};
