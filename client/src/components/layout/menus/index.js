import {
  FEATURES,
  hasFeature,
  isProductProfile,
} from "../../../config/productFeatures";

import buildCoreMenus from "./coreMenus";
import buildDbMenus from "./dbMenus";
import buildCbtMenus from "./cbtMenus";
import buildFinanceMenus from "./financeMenus";
import buildLmsMenus from "./lmsMenus";
import buildTahfizMenus from "./tahfizMenus";

const roleKeys = [
  "center",
  "admin",
  "finance",
  "teacher",
  "student",
  "parent",
  "tahfiz",
];

const buildEmptyMenus = () =>
  roleKeys.reduce((accumulator, role) => {
    accumulator[role] = [];
    return accumulator;
  }, {});

const mergeMenus = (...menuGroups) => {
  const merged = buildEmptyMenus();

  menuGroups.forEach((group) => {
    roleKeys.forEach((role) => {
      const items = group[role] || [];
      merged[role].push(...items);
    });
  });

  return merged;
};

const SPECIAL_FINANCE_MENU_PROFILES = [
  "educore-cbt-db-lms-finance",
  "educore-cbt-db-lms-finance-tahfiz",
];

const isSpecialFinanceMenuProfile = () =>
  isProductProfile(...SPECIAL_FINANCE_MENU_PROFILES);

const buildFeatureGroups = (user = {}) => ({
  core: buildCoreMenus(user),
  cbt: hasFeature(FEATURES.CBT) ? buildCbtMenus(user) : buildEmptyMenus(),
  db: hasFeature(FEATURES.DB) ? buildDbMenus(user) : buildEmptyMenus(),
  finance: hasFeature(FEATURES.FINANCE)
    ? buildFinanceMenus(user)
    : buildEmptyMenus(),
  tahfiz: hasFeature(FEATURES.TAHFIZ)
    ? buildTahfizMenus(user)
    : buildEmptyMenus(),
  lms: hasFeature(FEATURES.LMS) ? buildLmsMenus(user) : buildEmptyMenus(),
});

const mergeRoleMenus = (groups, role, groupOrder) =>
  groupOrder.flatMap((groupKey) => groups[groupKey]?.[role] || []);

const applySpecialOrdering = (groups) => {
  const merged = buildEmptyMenus();

  merged.center = mergeRoleMenus(groups, "center", [
    "core",
    "db",
    "cbt",
    "lms",
    "finance",
    "tahfiz",
  ]);
  merged.admin = mergeRoleMenus(groups, "admin", ["core", "db", "cbt", "lms"]);
  merged.finance = mergeRoleMenus(groups, "finance", ["core", "finance"]);
  merged.teacher = mergeRoleMenus(groups, "teacher", [
    "core",
    "db",
    "finance",
    "cbt",
    "lms",
    "tahfiz",
  ]);
  merged.student = mergeRoleMenus(groups, "student", [
    "core",
    "finance",
    "cbt",
    "lms",
    "tahfiz",
    "db",
  ]);
  merged.parent = mergeRoleMenus(groups, "parent", [
    "core",
    "finance",
    "db",
    "cbt",
    "lms",
    "tahfiz",
  ]);
  merged.tahfiz = mergeRoleMenus(groups, "tahfiz", [
    "core",
    "tahfiz",
    "finance",
    "db",
    "cbt",
    "lms",
  ]);

  return merged;
};

const getCombinedMenus = (user = {}) => {
  const groups = buildFeatureGroups(user);

  if (isSpecialFinanceMenuProfile()) {
    return applySpecialOrdering(groups);
  }

  return mergeMenus(
    groups.core,
    groups.cbt,
    groups.db,
    groups.finance,
    groups.tahfiz,
    groups.lms,
  );
};

const combinedMenus = getCombinedMenus();

export { getCombinedMenus };
export const CenterMenus = combinedMenus.center;
export const AdminMenus = combinedMenus.admin;
export const FinanceMenus = combinedMenus.finance;
export const TeacherMenus = combinedMenus.teacher;
export const StudentMenus = combinedMenus.student;
export const ParentMenus = combinedMenus.parent;
export const TahfizMenus = hasFeature(FEATURES.TAHFIZ)
  ? combinedMenus.tahfiz
  : [];
