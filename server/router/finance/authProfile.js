// Data login khusus Finance. Dimuat oleh server/router/auth/domainProfiles.js
// (milik main); jangan menambah logika ini ke RouterAuth.js.
//
// Guru/tendik yang ditugasi meja keuangan mendapat can_manage_finance = true.
// Bila LMS terpasang, server/router/lms/authProfile.js sudah mengisinya lebih
// dulu (dan memakainya untuk menolak tendik tanpa penugasan), jadi tidak
// dihitung ulang.

import { attachFinanceStaffFlag } from "./financeStaffAccess.js";

export default {
  enrichProfile: async ({ db, user }) => {
    if (user.can_manage_finance !== undefined) return;
    await attachFinanceStaffFlag(db, user);
  },
};
