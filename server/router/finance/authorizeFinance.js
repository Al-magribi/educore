import { authorize as authorizeBase } from "../../middleware/authorize.js";
import {
  lockFinanceStaffHomebase,
  teacherHasFinanceDesk,
} from "./financeStaffAccess.js";

const FINANCE_DESK_LEVELS = new Set(["satuan", "keuangan", "finance", "pusat"]);

export const authorize = (...allowedRolesOrLevels) => {
  const opensFinanceDesk = allowedRolesOrLevels.some((item) =>
    FINANCE_DESK_LEVELS.has(item),
  );
  const alreadyAllowsTeacher = allowedRolesOrLevels.includes("teacher");

  if (!opensFinanceDesk || alreadyAllowsTeacher) {
    return authorizeBase(...allowedRolesOrLevels);
  }

  const guard = authorizeBase(...allowedRolesOrLevels, "teacher");

  return (req, res, next) =>
    guard(req, res, () => {
      if (req.user?.role !== "teacher") {
        next();
        return;
      }

      teacherHasFinanceDesk(req.user)
        .then((allowed) => {
          if (!allowed || !lockFinanceStaffHomebase(req)) {
            if (!res.headersSent) {
              res.status(403).json({
                message:
                  "Akses dilarang. Akun guru ini belum ditugaskan sebagai admin keuangan satuan ini.",
              });
            }
            return;
          }

          req.user.can_manage_finance = true;
          next();
        })
        .catch((error) => {
          console.error("[finance-staff] gagal memeriksa penugasan", error);
          if (!res.headersSent) {
            res.status(500).json({ message: "Internal server error." });
          }
        });
    });
};
