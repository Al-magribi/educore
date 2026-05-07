import { FEATURES, hasFeature } from "../config/productFeatures";

const isTahfizEnabled = hasFeature(FEATURES.TAHFIZ);
const isFinanceEnabled = hasFeature(FEATURES.FINANCE);

const isFinanceLevel = (level) => level === "finance" || level === "keuangan";

const resolveUserHomePath = (user) => {
  if (!user?.role) {
    return null;
  }

  switch (user.role) {
    case "student":
      return "/siswa-dashboard";
    case "teacher":
      return "/guru-dashboard";
    case "parent":
      return "/orangtua-dashboard";
    case "admin":
    case "center":
      if (user.level === "pusat") {
        return "/center-dashboard";
      }

      if (user.level === "tahfiz") {
        return isTahfizEnabled ? "/tahfiz-dashboard" : "/admin-dashboard";
      }

      if (isFinanceLevel(user.level)) {
        return isFinanceEnabled ? "/finance-dashboard" : "/admin-dashboard";
      }

      if (user.level === "satuan") {
        return "/admin-dashboard";
      }

      return null;
    default:
      return null;
  }
};

export default resolveUserHomePath;
