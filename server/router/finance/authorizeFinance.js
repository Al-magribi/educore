import { authorize as authorizeBase } from "../../middleware/authorize.js";
import {
  FINANCE_DESK_ROLES,
  lockFinanceStaffHomebase,
  userHasFinanceDesk,
} from "./financeStaffAccess.js";

const FINANCE_DESK_LEVELS = new Set(["satuan", "keuangan", "finance", "pusat"]);

const denyDesk = (res) => {
  if (!res.headersSent) {
    res.status(403).json({
      message:
        "Akses dilarang. Akun ini belum ditugaskan sebagai admin keuangan satuan ini.",
    });
  }
};

const failDeskCheck = (res, error) => {
  console.error("[finance-staff] gagal memeriksa penugasan", error);
  if (!res.headersSent) {
    res.status(500).json({ message: "Internal server error." });
  }
};

export const authorize = (...allowedRolesOrLevels) => {
  const opensFinanceDesk = allowedRolesOrLevels.some((item) =>
    FINANCE_DESK_LEVELS.has(item),
  );

  if (!opensFinanceDesk) {
    return authorizeBase(...allowedRolesOrLevels);
  }

  // Role yang memang diizinkan endpoint (mis. guru wali kelas di tabungan)
  // tidak dikunci ke meja keuangan, tapi tetap diberi flag can_manage_finance.
  const nativeRoles = new Set(
    FINANCE_DESK_ROLES.filter((role) => allowedRolesOrLevels.includes(role)),
  );
  const guard = authorizeBase(
    ...new Set([...allowedRolesOrLevels, ...FINANCE_DESK_ROLES]),
  );

  return (req, res, next) =>
    guard(req, res, () => {
      const role = req.user?.role;
      if (!FINANCE_DESK_ROLES.includes(role)) {
        next();
        return;
      }

      userHasFinanceDesk(req.user)
        .then((allowed) => {
          req.user.can_manage_finance = allowed;

          if (nativeRoles.has(role)) {
            next();
            return;
          }

          if (!allowed || !lockFinanceStaffHomebase(req)) {
            denyDesk(res);
            return;
          }

          next();
        })
        .catch((error) => failDeskCheck(res, error));
    });
};
